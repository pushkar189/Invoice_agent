import { generate } from './ollama.service.js';
import { extractJSON } from '../utils/jsonParser.js';
import { ExtractedInvoiceSchema } from '../validators/invoice.schema.js';
import { logger } from '../utils/logger.js';

const EXTRACTION_PROMPT = `You are an expert invoice data extraction system.

Your task is to extract structured information from the supplied invoice text and return it as JSON.

RULES (follow strictly):
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Never invent or guess information not present in the invoice
3. Use null for fields that are not found in the invoice
4. Preserve invoice numbers exactly as they appear
5. Preserve dates in their original format or convert to YYYY-MM-DD
6. Extract ALL line items found
7. Extract vendor and customer information separately
8. Extract GSTIN wherever present
9. Extract subtotal, discounts, CGST, SGST, IGST, and total
10. Extract currency (default to INR if Indian invoice)
11. Do not perform financial calculations - extract only what is printed
12. Backend will independently verify all calculations

Return this exact JSON structure:
{
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "vendor": {
    "name": "string or null",
    "gstin": "string or null",
    "address": "string or null",
    "email": "string or null",
    "phone": "string or null"
  },
  "customer": {
    "name": "string or null",
    "gstin": "string or null",
    "address": "string or null",
    "email": "string or null",
    "phone": "string or null"
  },
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "taxRate": number,
      "taxAmount": number,
      "discount": number,
      "total": number
    }
  ],
  "financials": {
    "subtotal": number,
    "discount": number,
    "cgst": number,
    "sgst": number,
    "igst": number,
    "total": number
  },
  "currency": "INR"
}

INVOICE TEXT TO EXTRACT:
`;

/**
 * Extract structured invoice data from text using Gemma.
 * Returns validated extraction result with confidence score.
 */
export const extractInvoiceData = async (invoiceText) => {
  if (!invoiceText || invoiceText.trim().length < 10) {
    throw Object.assign(new Error('Invoice text is too short to extract data from'), {
      errorCode: 'INSUFFICIENT_TEXT',
      statusCode: 422,
    });
  }

  const prompt = EXTRACTION_PROMPT + invoiceText.slice(0, 8000); // Limit to 8K chars for context

  let rawResponse = '';
  let processingTimeMs = 0;

  try {
    const result = await generate(prompt, { temperature: 0.05 });
    rawResponse = result.text;
    processingTimeMs = result.processingTimeMs;
  } catch (err) {
    throw err;
  }

  // Parse JSON from response
  const parsed = extractJSON(rawResponse);
  if (!parsed) {
    logger.error('Gemma returned unparseable response:', rawResponse.slice(0, 500));
    throw Object.assign(new Error('AI model returned malformed JSON. Please retry.'), {
      errorCode: 'MALFORMED_AI_RESPONSE',
      statusCode: 502,
    });
  }

  // Validate against schema (with defaults for missing fields)
  const validated = ExtractedInvoiceSchema.parse(parsed);

  // Calculate confidence score based on completeness
  const confidence = calculateConfidence(validated);

  logger.info(`Extraction complete. Confidence: ${(confidence * 100).toFixed(1)}% | Time: ${processingTimeMs}ms`);

  return {
    structured: validated,
    rawResponse,
    confidenceScore: confidence,
    processingTimeMs,
  };
};

/**
 * Calculate a confidence score (0-1) based on completeness of extraction.
 */
const calculateConfidence = (data) => {
  const checks = [
    !!data.invoiceNumber,
    !!data.invoiceDate,
    !!data.vendor?.name,
    !!data.customer?.name,
    data.items?.length > 0,
    (data.financials?.total || 0) > 0,
    !!data.currency,
    !!data.vendor?.gstin || !!data.customer?.gstin,
    !!data.dueDate,
    data.items?.every(i => i.description && i.total > 0),
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100) / 100;
};

/**
 * Generate a natural language response from structured data using Gemma.
 */
export const generateNaturalLanguage = async (systemContext, userQuestion, toolResults) => {
  const prompt = `You are an AI assistant for an invoice management system.

Context about the user's invoice data:
${systemContext}

Tool results (from database queries):
${JSON.stringify(toolResults, null, 2)}

User question: ${userQuestion}

Instructions:
- Answer the question based ONLY on the provided tool results
- Format currency amounts with ₹ symbol and Indian number formatting
- Be concise and professional
- If the data is empty, say so clearly
- Do not make up invoice details
- Highlight important numbers and dates

Answer:`;

  const result = await generate(prompt, { temperature: 0.3, num_predict: 1024 });
  return result.text.trim();
};

export default { extractInvoiceData, generateNaturalLanguage };
