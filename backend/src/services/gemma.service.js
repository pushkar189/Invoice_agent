import { generate } from './ollama.service.js';
import { extractJSON } from '../utils/jsonParser.js';
import { ExtractedInvoiceSchema } from '../validators/invoice.schema.js';
import { logger } from '../utils/logger.js';

const EXTRACTION_PROMPT = `You are an invoice data extraction engine. Extract data from the invoice text below and output ONLY a single valid JSON object. No explanations, no markdown, no code fences.

RULES:
- Output ONLY JSON. Start with { and end with }.
- Use null (not the string "null") for any field not found in the invoice.
- Numbers must be numeric (not quoted strings). Use 0 if a number is not found.
- Dates must be in YYYY-MM-DD format or null.
- Extract ALL line items from the invoice.
- Default currency to "INR" for Indian invoices.
- Do not calculate — extract only what is printed.

Output this exact structure (replace example values with real extracted values):
{
  "invoiceNumber": "INV-001",
  "invoiceDate": "2024-01-15",
  "dueDate": null,
  "vendor": {
    "name": "Vendor Company Name",
    "gstin": "29ABCDE1234F1Z5",
    "address": "123 Street, City, State",
    "email": null,
    "phone": null
  },
  "customer": {
    "name": "Customer Company Name",
    "gstin": null,
    "address": "456 Avenue, City, State",
    "email": null,
    "phone": null
  },
  "items": [
    {
      "description": "Product or Service Name",
      "quantity": 2,
      "unitPrice": 500.00,
      "taxRate": 18,
      "taxAmount": 180.00,
      "discount": 0,
      "total": 1180.00
    }
  ],
  "financials": {
    "subtotal": 1000.00,
    "discount": 0,
    "cgst": 90.00,
    "sgst": 90.00,
    "igst": 0,
    "total": 1180.00
  },
  "currency": "INR"
}

INVOICE TEXT:
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

  const promptText = trimInvoiceText(invoiceText);
  const prompt = EXTRACTION_PROMPT + promptText;

  let rawResponse = '';
  let processingTimeMs = 0;

  try {
    // Use default num_predict (4096) from ollama.service to avoid truncating large invoice JSON
    const result = await generate(prompt, { temperature: 0.05, top_p: 0.9 });
    rawResponse = result.text;
    processingTimeMs = result.processingTimeMs;
    logger.debug(`Raw Gemma response (first 800 chars): ${rawResponse.slice(0, 800)}`);
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
  // Truncate tool results to avoid bloating the prompt (keep max 3000 chars)
  const toolResultsStr = JSON.stringify(toolResults).slice(0, 3000);

  const prompt = `You are a concise AI assistant for an invoice management system.

Data: ${toolResultsStr}

Context: ${systemContext}

Question: ${userQuestion}

Rules:
- Answer in 2-4 sentences max. Be direct and concise.
- Use ₹ symbol for Indian Rupee amounts.
- Only use the data provided above. Do not guess.
- If data is empty or null, say so clearly.

Answer:`;

  // Lower num_predict for faster chat responses; 512 is enough for concise answers
  const result = await generate(prompt, { temperature: 0.1, num_predict: 512 });
  return result.text.trim();
};

const trimInvoiceText = (invoiceText) => {
  // Rather than aggressively filtering lines which destroys context, 
  // we simply limit the text length to ensure fast processing while keeping the structure intact.
  return invoiceText.slice(0, 6000);
};

export default { extractInvoiceData, generateNaturalLanguage };
