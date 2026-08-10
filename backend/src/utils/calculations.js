/**
 * Financial calculation utilities.
 * NEVER trust AI for financial correctness — always recalculate here.
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Recalculate subtotal from line items.
 */
export const calculateSubtotal = (items) => {
  return round2(
    items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      return sum + (qty * price - discount);
    }, 0)
  );
};

/**
 * Calculate total tax from line items.
 */
export const calculateItemTax = (items) => {
  return round2(
    items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      const base = qty * price - discount;
      return sum + (base * taxRate) / 100;
    }, 0)
  );
};

/**
 * Validate financial totals from extracted invoice data.
 * Returns validation result with calculated vs reported values.
 */
export const validateFinancials = (extracted, tolerance = 0.01) => {
  const items = extracted.items || [];
  const financials = extracted.financials || {};

  const calculatedSubtotal = calculateSubtotal(items);
  const calculatedTax = calculateItemTax(items);
  const invoiceDiscount = round2(parseFloat(financials.discount) || 0);
  const cgst = round2(parseFloat(financials.cgst) || 0);
  const sgst = round2(parseFloat(financials.sgst) || 0);
  const igst = round2(parseFloat(financials.igst) || 0);

  // Use reported tax values if items don't have tax rates
  const reportedTax = round2(cgst + sgst + igst);
  const usedTax = calculatedTax > 0 ? calculatedTax : reportedTax;

  const calculatedTotal = round2(calculatedSubtotal + usedTax - invoiceDiscount);
  const reportedTotal = round2(parseFloat(financials.total) || 0);
  const difference = round2(Math.abs(calculatedTotal - reportedTotal));

  const isValid = difference <= tolerance || reportedTotal === 0;

  return {
    calculatedSubtotal,
    calculatedTax: usedTax,
    calculatedTotal,
    reportedSubtotal: round2(parseFloat(financials.subtotal) || 0),
    reportedTotal,
    difference,
    isValid,
    status: reportedTotal === 0
      ? 'REVIEW_REQUIRED'
      : isValid
        ? 'VALID'
        : difference < 1
          ? 'WARNING'
          : 'INVALID',
    message: isValid
      ? 'Calculated totals match invoice totals'
      : `Total mismatch: calculated ₹${calculatedTotal} vs invoice ₹${reportedTotal} (diff: ₹${difference})`,
  };
};

export default { calculateSubtotal, calculateItemTax, validateFinancials };
