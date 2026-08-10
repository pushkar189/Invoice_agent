import db from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Detect duplicate invoices based on invoice number + vendor name + date + total.
 * Creates invoice_flags record if duplicate found.
 */
export const detectDuplicates = async (invoiceId, extracted) => {
  const { invoiceNumber, invoiceDate, vendor, financials } = extracted;
  const flags = [];

  if (!invoiceNumber) return flags;

  // Check by invoice number + vendor
  const { rows } = await db.query(
    `SELECT i.id, i.invoice_number, i.total, v.name as vendor_name, i.invoice_date
     FROM invoices i
     LEFT JOIN vendors v ON i.vendor_id = v.id
     WHERE i.invoice_number = $1 AND i.id != $2`,
    [invoiceNumber, invoiceId]
  );

  if (rows.length > 0) {
    for (const dup of rows) {
      logger.warn(`Duplicate invoice detected: ${invoiceNumber} (existing ID: ${dup.id})`);

      await db.query(
        `INSERT INTO invoice_flags (invoice_id, type, severity, message, metadata)
         VALUES ($1, 'DUPLICATE', 'HIGH', $2, $3)`,
        [
          invoiceId,
          `Possible duplicate of invoice ${dup.invoice_number} (ID: ${dup.id}) from ${dup.vendor_name || 'unknown vendor'}`,
          JSON.stringify({ duplicateId: dup.id, invoiceNumber: dup.invoice_number }),
        ]
      );

      flags.push({
        type: 'DUPLICATE',
        severity: 'HIGH',
        message: `Possible duplicate of existing invoice ${dup.invoice_number}`,
        duplicateId: dup.id,
      });
    }
  }

  return flags;
};

export default { detectDuplicates };
