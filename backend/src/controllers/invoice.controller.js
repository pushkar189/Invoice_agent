import path from 'path';
import fs from 'fs';
import { processInvoice, createPlaceholderInvoiceRecord, getInvoices, getInvoiceById } from '../services/invoice.service.js';
import db from '../config/database.js';
import { config } from '../config/env.js';
import { createError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';

export const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(createError('No invoice file provided', 400, 'NO_FILE'));
    }

    logger.info(`Invoice upload received: ${req.file.originalname} (${req.file.size} bytes)`);
    const invoiceId = await createPlaceholderInvoiceRecord(req.file);
    processInvoice(req.file, invoiceId).catch((err) => {
      logger.error(`Background invoice processing failed for ${invoiceId}: ${err.message}`);
    });

    res.status(202).json({
      success: true,
      message: 'Invoice uploaded successfully. Processing has started in the background.',
      data: { invoiceId },
    });
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const { search, status, vendorId, page, limit, sortBy, sortDir } = req.query;
    const result = await getInvoices({
      search,
      status,
      vendorId,
      page: parseInt(page || 1),
      limit: parseInt(limit || 20),
      sortBy: sortBy || 'created_at',
      sortDir: sortDir || 'desc',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) return next(createError('Invoice not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, due_date } = req.body;
    const updates = [];
    const params = [];

    if (status) { params.push(status); updates.push(`status = $${params.length}`); }
    if (due_date) { params.push(due_date); updates.push(`due_date = $${params.length}`); }

    if (!updates.length) return next(createError('No fields to update', 400, 'NO_UPDATES'));

    params.push(id);
    await db.query(`UPDATE invoices SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);

    const updated = await getInvoiceById(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT stored_file_name, file_path FROM invoices WHERE id = $1', [id]);
    if (!rows.length) return next(createError('Invoice not found', 404, 'NOT_FOUND'));

    await db.query('DELETE FROM invoices WHERE id = $1', [id]);
    logger.info(`Invoice ${id} deleted`);

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};

export const download = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT original_file_name, file_path FROM invoices WHERE id = $1', [id]);
    if (!rows.length) return next(createError('Invoice not found', 404, 'NOT_FOUND'));

    const { original_file_name, file_path } = rows[0];
    if (!file_path || !fs.existsSync(file_path)) {
      return next(createError('Invoice file not found on disk', 404, 'FILE_NOT_FOUND'));
    }

    res.download(file_path, original_file_name);
  } catch (err) {
    next(err);
  }
};

export const getFlags = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM invoice_flags WHERE invoice_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const resolveFlag = async (req, res, next) => {
  try {
    const { id, flagId } = req.params;
    await db.query('UPDATE invoice_flags SET resolved = true WHERE id = $1 AND invoice_id = $2', [flagId, id]);
    res.json({ success: true, message: 'Flag resolved' });
  } catch (err) {
    next(err);
  }
};

export default { upload, list, getById, update, remove, download, getFlags, resolveFlag };
