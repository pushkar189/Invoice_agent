import db from '../config/database.js';
import { logger } from '../utils/logger.js';

const LARGE_INVOICE_THRESHOLD = 1000000; // ₹10 lakh
const UNUSUAL_TAX_RATE_MAX = 30; // 30%

/**
 * Run rule-based anomaly detection on extracted invoice data.
 * Creates invoice_flags for each detected anomaly.
 */
export const detectAnomalies = async (invoiceId, extracted, validationResult) => {
  const { invoiceNumber, invoiceDate, dueDate, vendor, customer, items, financials } = extracted;
  const flags = [];

  const addFlag = async (type, severity, message, metadata = {}) => {
    await db.query(
      `INSERT INTO invoice_flags (invoice_id, type, severity, message, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [invoiceId, type, severity, message, JSON.stringify(metadata)]
    );
    flags.push({ type, severity, message });
    logger.warn(`Anomaly detected for invoice ${invoiceId}: [${type}] ${message}`);
  };

  // 1. Missing invoice number
  if (!invoiceNumber) {
    await addFlag('MISSING_FIELD', 'MEDIUM', 'Invoice number is missing');
  }

  // 2. Missing invoice date
  if (!invoiceDate) {
    await addFlag('MISSING_FIELD', 'MEDIUM', 'Invoice date is missing');
  }

  // 3. Missing vendor GSTIN (for Indian invoices)
  if (!vendor?.gstin && financials?.total > 0) {
    await addFlag('INVALID_GSTIN', 'LOW', 'Vendor GSTIN is missing from the invoice');
  }

  // 4. Unusually large invoice
  if (financials?.total > LARGE_INVOICE_THRESHOLD) {
    await addFlag('ANOMALY', 'MEDIUM', `Invoice total ₹${financials.total} exceeds ₹${LARGE_INVOICE_THRESHOLD} threshold`, {
      total: financials.total, threshold: LARGE_INVOICE_THRESHOLD,
    });
  }

  // 5. Negative values
  if (financials?.total < 0) {
    await addFlag('ANOMALY', 'HIGH', `Invoice total is negative: ₹${financials.total}`);
  }
  if (financials?.subtotal < 0) {
    await addFlag('ANOMALY', 'HIGH', `Invoice subtotal is negative: ₹${financials.subtotal}`);
  }

  // 6. Zero total
  if (financials?.total === 0 && items?.length > 0) {
    await addFlag('ANOMALY', 'MEDIUM', 'Invoice total is zero despite having line items');
  }

  // 7. Items with negative values
  for (const item of items || []) {
    if (item.total < 0 || item.unitPrice < 0 || item.quantity < 0) {
      await addFlag('ANOMALY', 'MEDIUM', `Line item "${item.description}" has negative values`);
      break; // Only flag once
    }
  }

  // 8. Total mismatch from validation
  if (validationResult && (validationResult.status === 'INVALID' || validationResult.status === 'REVIEW_REQUIRED')) {
    await addFlag('TOTAL_MISMATCH', 'HIGH',
      `Calculated total (₹${validationResult.calculatedTotal}) does not match invoice total (₹${validationResult.reportedTotal})`,
      { difference: validationResult.difference }
    );
  }

  // 9. Suspicious tax rate
  for (const item of items || []) {
    if (item.taxRate > UNUSUAL_TAX_RATE_MAX) {
      await addFlag('ANOMALY', 'MEDIUM', `Unusually high tax rate ${item.taxRate}% on item "${item.description}"`);
      break;
    }
  }

  // 10. Item total inconsistency
  for (const item of items || []) {
    if (item.quantity > 0 && item.unitPrice > 0) {
      const expectedTotal = item.quantity * item.unitPrice - (item.discount || 0);
      const diff = Math.abs(expectedTotal - item.total);
      if (diff > 1 && item.total > 0) {
        await addFlag('ANOMALY', 'LOW', `Line item total inconsistency: "${item.description}" expected ₹${expectedTotal.toFixed(2)} got ₹${item.total}`);
        break;
      }
    }
  }

  return flags;
};

export default { detectAnomalies };
