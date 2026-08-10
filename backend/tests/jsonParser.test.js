/**
 * JSON Parser tests
 */

import { extractJSON } from '../src/utils/jsonParser.js';

describe('extractJSON', () => {
  test('parses clean JSON', () => {
    const result = extractJSON('{"invoiceNumber": "INV-001"}');
    expect(result).toEqual({ invoiceNumber: 'INV-001' });
  });

  test('strips markdown code blocks', () => {
    const text = '```json\n{"invoiceNumber": "INV-001"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ invoiceNumber: 'INV-001' });
  });

  test('extracts JSON from messy text', () => {
    const text = 'Sure! Here is the JSON: {"invoiceNumber": "INV-001"} Hope that helps!';
    const result = extractJSON(text);
    expect(result).toEqual({ invoiceNumber: 'INV-001' });
  });

  test('returns null for invalid input', () => {
    expect(extractJSON('this is not json')).toBeNull();
    expect(extractJSON('')).toBeNull();
    expect(extractJSON(null)).toBeNull();
  });
});
