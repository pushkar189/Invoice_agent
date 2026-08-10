/**
 * Unit tests for financial calculations
 * Mocks Ollama — does NOT require a real Gemma connection
 */

import { validateFinancials, calculateSubtotal, calculateItemTax } from '../src/utils/calculations.js';

describe('calculateSubtotal', () => {
  test('calculates correct subtotal from items', () => {
    const items = [
      { quantity: 2, unitPrice: 1000, discount: 0 },
      { quantity: 1, unitPrice: 500, discount: 50 },
    ];
    expect(calculateSubtotal(items)).toBe(2450);
  });

  test('returns 0 for empty items', () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  test('handles items with missing fields', () => {
    expect(calculateSubtotal([{ quantity: 1 }])).toBe(0);
  });
});

describe('calculateItemTax', () => {
  test('calculates GST correctly', () => {
    const items = [{ quantity: 1, unitPrice: 1000, taxRate: 18, discount: 0 }];
    expect(calculateItemTax(items)).toBe(180);
  });

  test('returns 0 for zero tax rate', () => {
    const items = [{ quantity: 1, unitPrice: 1000, taxRate: 0, discount: 0 }];
    expect(calculateItemTax(items)).toBe(0);
  });
});

describe('validateFinancials', () => {
  test('returns VALID for matching totals', () => {
    const extracted = {
      items: [{ quantity: 1, unitPrice: 10000, taxRate: 18, taxAmount: 1800, discount: 0, total: 11800 }],
      financials: { subtotal: 10000, discount: 0, cgst: 0, sgst: 0, igst: 0, total: 11800 },
    };
    const result = validateFinancials(extracted, 0.01);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
  });

  test('returns INVALID for mismatched totals', () => {
    const extracted = {
      items: [{ quantity: 1, unitPrice: 10000, taxRate: 18, taxAmount: 1800, discount: 0, total: 11800 }],
      financials: { subtotal: 10000, discount: 0, cgst: 0, sgst: 0, igst: 0, total: 15000 },
    };
    const result = validateFinancials(extracted, 0.01);
    expect(result.isValid).toBe(false);
    expect(result.difference).toBeGreaterThan(0);
  });

  test('returns REVIEW_REQUIRED for zero total', () => {
    const extracted = {
      items: [],
      financials: { subtotal: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    };
    const result = validateFinancials(extracted, 0.01);
    expect(result.status).toBe('REVIEW_REQUIRED');
  });

  test('respects tolerance', () => {
    const extracted = {
      items: [{ quantity: 1, unitPrice: 10000, taxRate: 18, taxAmount: 1800, discount: 0, total: 11800 }],
      financials: { subtotal: 10000, discount: 0, cgst: 0, sgst: 0, igst: 0, total: 11800.005 },
    };
    const result = validateFinancials(extracted, 0.01);
    expect(result.isValid).toBe(true);
  });
});
