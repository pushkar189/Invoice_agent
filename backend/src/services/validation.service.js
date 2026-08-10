import { validateFinancials } from '../utils/calculations.js';
import db from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Validate extracted invoice financials independently of AI output.
 * Persists validation record to invoice_validations table.
 */
export const validateAndPersist = async (invoiceId, extractedData, tolerance) => {
  const result = validateFinancials(extractedData, tolerance);

  logger.info(`Financial validation for invoice ${invoiceId}: ${result.status} (diff: ₹${result.difference})`);

  await db.query(
    `INSERT INTO invoice_validations
      (invoice_id, calculated_subtotal, calculated_tax, calculated_total, invoice_total, difference, validation_status, validation_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      invoiceId,
      result.calculatedSubtotal,
      result.calculatedTax,
      result.calculatedTotal,
      result.reportedTotal,
      result.difference,
      result.status,
      result.message,
    ]
  );

  // Update invoice validation_status
  await db.query(
    `UPDATE invoices SET validation_status = $1 WHERE id = $2`,
    [result.status === 'VALID' ? 'VALID' : result.status === 'WARNING' ? 'WARNING' : 'REVIEW_REQUIRED', invoiceId]
  );

  return result;
};

export default { validateAndPersist };
