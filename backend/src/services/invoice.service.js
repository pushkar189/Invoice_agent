import path from 'path';
import db from '../config/database.js';
import { extractTextFromPDF } from './pdf.service.js';
import { extractInvoiceData } from './gemma.service.js';
import { detectAnomalies } from './anomaly.service.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * STEP 1: Extract text from file (PDF).
 */
const extractTextFromFile = async (filePath, mimeType) => {
  const ext = path.extname(filePath).toLowerCase();
  logger.info(`Extracting text from file (${ext}): ${filePath}`);

  if (ext === '.pdf') {
    const { text, isScanned } = await extractTextFromPDF(filePath);
    if (isScanned || text.length < 100) {
      logger.info('PDF appears scanned or has insufficient text — AI might struggle.');
    }
    return text;
  }

  throw Object.assign(new Error(`Unsupported file type: ${ext}`), {
    errorCode: 'UNSUPPORTED_FILE_TYPE',
    statusCode: 422,
  });
};

/**
 * STEP 2: Upsert vendor from extracted data.
 */
const upsertVendor = async (vendorData) => {
  if (!vendorData?.name) return null;
  const { rows } = await db.query(
    `INSERT INTO vendors (name, gstin, address, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET
       gstin = COALESCE(EXCLUDED.gstin, vendors.gstin),
       address = COALESCE(EXCLUDED.address, vendors.address),
       email = COALESCE(EXCLUDED.email, vendors.email),
       phone = COALESCE(EXCLUDED.phone, vendors.phone),
       updated_at = NOW()
     RETURNING id`,
    [vendorData.name, vendorData.gstin, vendorData.address, vendorData.email, vendorData.phone]
  );
  return rows[0]?.id || null;
};

/**
 * STEP 3: Upsert customer from extracted data.
 */
const upsertCustomer = async (customerData) => {
  if (!customerData?.name) return null;
  const { rows } = await db.query(
    `INSERT INTO customers (name, gstin, address, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET
       gstin = COALESCE(EXCLUDED.gstin, customers.gstin),
       address = COALESCE(EXCLUDED.address, customers.address),
       email = COALESCE(EXCLUDED.email, customers.email),
       phone = COALESCE(EXCLUDED.phone, customers.phone),
       updated_at = NOW()
     RETURNING id`,
    [customerData.name, customerData.gstin, customerData.address, customerData.email, customerData.phone]
  );
  return rows[0]?.id || null;
};

/**
 * STEP 4: Create invoice record in DB.
 */
const createInvoiceRecord = async (invoiceData) => {
  const { rows } = await db.query(
    `INSERT INTO invoices
      (invoice_number, vendor_id, customer_id, invoice_date, due_date,
       subtotal, discount, cgst, sgst, igst, total, currency,
       status, original_file_name, stored_file_name, file_path,
       extraction_status, validation_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING id`,
    [
      invoiceData.invoiceNumber,
      invoiceData.vendorId,
      invoiceData.customerId,
      invoiceData.invoiceDate,
      invoiceData.dueDate,
      invoiceData.financials.subtotal,
      invoiceData.financials.discount,
      invoiceData.financials.cgst,
      invoiceData.financials.sgst,
      invoiceData.financials.igst,
      invoiceData.financials.total,
      invoiceData.currency || 'INR',
      'PENDING',
      invoiceData.originalFileName,
      invoiceData.storedFileName,
      invoiceData.filePath,
      'COMPLETED',
      'REVIEW_REQUIRED',
    ]
  );
  return rows[0].id;
};

export const createPlaceholderInvoiceRecord = async (file) => {
  const { rows } = await db.query(
    `INSERT INTO invoices
      (invoice_number, vendor_id, customer_id, invoice_date, due_date,
       subtotal, discount, cgst, sgst, igst, total, currency,
       status, original_file_name, stored_file_name, file_path,
       extraction_status, validation_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING id`,
    [
      null,
      null,
      null,
      null,
      null,
      0,
      0,
      0,
      0,
      0,
      0,
      'INR',
      'PENDING',
      file.originalname,
      file.filename,
      file.path,
      'PROCESSING',
      'REVIEW_REQUIRED',
    ]
  );
  return rows[0].id;
};

/**
 * STEP 5: Insert line items.
 */
const insertInvoiceItems = async (invoiceId, items) => {
  for (const item of items) {
    await db.query(
      `INSERT INTO invoice_items
        (invoice_id, description, quantity, unit_price, tax_rate, tax_amount, discount, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [invoiceId, item.description, item.quantity, item.unitPrice, item.taxRate, item.taxAmount, item.discount, item.total]
    );
  }
};

/**
 * STEP 6: Save AI extraction record.
 */
const saveExtractionRecord = async (invoiceId, extractionResult) => {
  await db.query(
    `INSERT INTO ai_extractions
      (invoice_id, model_name, raw_response, structured_response, confidence_score, processing_time_ms)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      invoiceId,
      config.ollama.modelName,
      extractionResult.rawResponse,
      JSON.stringify(extractionResult.structured),
      extractionResult.confidenceScore,
      extractionResult.processingTimeMs,
    ]
  );
};

/**
 * Determine final invoice status based on flags, validation, confidence.
 */
const determineStatus = (allFlags, confidenceScore) => {
  const hasHighFlags = allFlags.some(f => f.severity === 'HIGH');

  if (hasHighFlags) {
    return { invoiceStatus: 'REVIEW', validationStatus: 'REVIEW_REQUIRED' };
  }
  if (confidenceScore < 0.6) {
    return { invoiceStatus: 'PENDING', validationStatus: 'WARNING' };
  }
  return { invoiceStatus: 'PENDING', validationStatus: 'VALID' };
};

/**
 * Main invoice processing pipeline.
 * upload → extract text → OCR if needed → Gemma → validate → duplicate detect → anomaly detect → persist
 */
export const processInvoice = async (file, existingInvoiceId = null) => {
  const filePath = file.path;
  const originalFileName = file.originalname;
  const storedFileName = file.filename;
  let invoiceId = existingInvoiceId;

  logger.info(`=== Starting invoice processing pipeline for: ${originalFileName} ===`);

  try {
    // STEP 1: Extract text
    logger.info('[1/7] Extracting text from file...');
    const invoiceText = await extractTextFromFile(filePath, file.mimetype);
    if (!invoiceText || invoiceText.trim().length < 30) {
      throw Object.assign(new Error(
        `Could not extract any readable text from the invoice. Only ${invoiceText?.trim().length || 0} characters were read. ` +
        'Please upload a higher-resolution image or a text-based PDF.'
      ), {
        errorCode: 'TEXT_EXTRACTION_FAILED',
        statusCode: 422,
      });
    }

    // OCR quality check — warn but continue; AI will extract what it can
    const alphaCount = (invoiceText.match(/[a-zA-Z0-9]/g) || []).length;
    const qualityRatio = alphaCount / invoiceText.trim().length;
    if (qualityRatio < 0.3) {
      logger.warn(`Low OCR quality (${(qualityRatio * 100).toFixed(1)}% alphanumeric) — AI will attempt extraction on best-effort basis.`);
    }
    logger.info(`[1/7] Extracted ${invoiceText.trim().length} chars (quality: ${(qualityRatio * 100).toFixed(0)}%) from file.`);

    // STEP 2: AI Extraction via Gemma
    logger.info('[2/7] Sending to Gemma for AI extraction...');
    const extractionResult = await extractInvoiceData(invoiceText);
    const { structured } = extractionResult;

    // STEP 3: Upsert vendor/customer
    logger.info('[3/7] Persisting vendor and customer...');
    const vendorId = await upsertVendor(structured.vendor);
    const customerId = await upsertCustomer(structured.customer);

    if (!invoiceId) {
      // STEP 4: Create invoice record
      logger.info('[4/7] Creating invoice record...');
      invoiceId = await createInvoiceRecord({
        ...structured,
        vendorId,
        customerId,
        originalFileName,
        storedFileName,
        filePath,
      });
    } else {
      logger.info('[4/7] Updating placeholder invoice record...');
      await db.query(
        `UPDATE invoices SET
           invoice_number = $1,
           vendor_id = $2,
           customer_id = $3,
           invoice_date = $4,
           due_date = $5,
           subtotal = $6,
           discount = $7,
           cgst = $8,
           sgst = $9,
           igst = $10,
           total = $11,
           currency = $12,
           updated_at = NOW()
         WHERE id = $13`,
        [
          structured.invoiceNumber,
          vendorId,
          customerId,
          structured.invoiceDate,
          structured.dueDate,
          structured.financials.subtotal,
          structured.financials.discount,
          structured.financials.cgst,
          structured.financials.sgst,
          structured.financials.igst,
          structured.financials.total,
          structured.currency || 'INR',
          invoiceId,
        ]
      );
    }

    // STEP 5: Insert items
    logger.info('[5/7] Inserting line items...');
    if (structured.items?.length > 0) {
      await insertInvoiceItems(invoiceId, structured.items);
    }

    // STEP 6: Save AI extraction record
    await saveExtractionRecord(invoiceId, extractionResult);

    // STEP 7: Anomaly detection
    logger.info('[6/6] Running anomaly detection...');
    const anomalyFlags = await detectAnomalies(invoiceId, structured, null);
    const allFlags = [...anomalyFlags];

    // Add LOW_CONFIDENCE flag if needed
    if (extractionResult.confidenceScore < 0.5) {
      await db.query(
        `INSERT INTO invoice_flags (invoice_id, type, severity, message, metadata)
         VALUES ($1, 'LOW_CONFIDENCE', 'MEDIUM', $2, $3)`,
        [invoiceId, `AI extraction confidence is low: ${(extractionResult.confidenceScore * 100).toFixed(1)}%`,
         JSON.stringify({ confidence: extractionResult.confidenceScore })]
      );
      allFlags.push({ type: 'LOW_CONFIDENCE', severity: 'MEDIUM' });
    }

    // Determine final status
    const { invoiceStatus, validationStatus } = determineStatus(allFlags, extractionResult.confidenceScore);

    // Update final statuses
    await db.query(
      `UPDATE invoices SET status = $1, validation_status = $2, extraction_status = 'COMPLETED' WHERE id = $3`,
      [invoiceStatus, validationStatus, invoiceId]
    );

    logger.info(`=== Pipeline complete for invoice ID: ${invoiceId} | Status: ${invoiceStatus} | Flags: ${allFlags.length} ===`);

    return {
      invoiceId,
      invoiceNumber: structured.invoiceNumber,
      vendor: structured.vendor?.name,
      total: structured.financials?.total,
      status: invoiceStatus,
      validationStatus,
      confidenceScore: extractionResult.confidenceScore,
      flagCount: allFlags.length,
      flags: allFlags,
    };
  } catch (err) {
    // Mark invoice as failed and store the reason
    if (invoiceId) {
      await db.query(
        `UPDATE invoices SET extraction_status = 'FAILED', updated_at = NOW() WHERE id = $1`,
        [invoiceId]
      ).catch(() => {});
    }
    logger.error(`Invoice processing pipeline FAILED for ${originalFileName}: [${err.errorCode || 'ERROR'}] ${err.message}`);
    logger.debug(err.stack);
    throw err;
  }
};

/**
 * Get all invoices with filters.
 */
export const getInvoices = async (filters = {}) => {
  const { search, status, vendorId, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc' } = filters;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(i.invoice_number ILIKE $${params.length} OR v.name ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }
  if (vendorId) {
    params.push(vendorId);
    conditions.push(`i.vendor_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = `ORDER BY i.${sortBy} ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;

  const countQuery = `
    SELECT COUNT(*) FROM invoices i
    LEFT JOIN vendors v ON i.vendor_id = v.id
    ${whereClause}
  `;

  const dataQuery = `
    SELECT i.*, v.name as vendor_name, v.gstin as vendor_gstin, c.name as customer_name,
           (SELECT COUNT(*) FROM invoice_flags f WHERE f.invoice_id = i.id AND f.resolved = false) as flag_count
    FROM invoices i
    LEFT JOIN vendors v ON i.vendor_id = v.id
    LEFT JOIN customers c ON i.customer_id = c.id
    ${whereClause}
    ${orderClause}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, [...params, limit, offset]),
  ]);

  return {
    invoices: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page,
    limit,
    pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
  };
};

/**
 * Get a single invoice with full details.
 */
export const getInvoiceById = async (id) => {
  const { rows: invoiceRows } = await db.query(
    `SELECT i.*, v.name as vendor_name, v.gstin as vendor_gstin, v.email as vendor_email,
            v.phone as vendor_phone, v.address as vendor_address,
            c.name as customer_name, c.gstin as customer_gstin, c.email as customer_email,
            c.phone as customer_phone, c.address as customer_address
     FROM invoices i
     LEFT JOIN vendors v ON i.vendor_id = v.id
     LEFT JOIN customers c ON i.customer_id = c.id
     WHERE i.id = $1`,
    [id]
  );

  if (!invoiceRows.length) return null;

  const invoice = invoiceRows[0];
  const [itemsResult, flagsResult, validationResult, extractionResult, paymentsResult] = await Promise.all([
    db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at', [id]),
    db.query('SELECT * FROM invoice_flags WHERE invoice_id = $1 ORDER BY created_at', [id]),
    db.query('SELECT * FROM invoice_validations WHERE invoice_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
    db.query('SELECT model_name, confidence_score, processing_time_ms, created_at FROM ai_extractions WHERE invoice_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
    db.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC', [id]),
  ]);

  return {
    ...invoice,
    items: itemsResult.rows,
    flags: flagsResult.rows,
    validation: validationResult.rows[0] || null,
    extraction: extractionResult.rows[0] || null,
    payments: paymentsResult.rows,
  };
};

export default { processInvoice, createPlaceholderInvoiceRecord, getInvoices, getInvoiceById };
