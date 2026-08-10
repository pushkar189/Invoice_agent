import { logger } from './logger.js';

/**
 * Attempt to extract valid JSON from a potentially messy AI response.
 * Handles cases where Gemma wraps JSON in markdown code blocks.
 */
export const extractJSON = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch {}

  // Strip markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Find first { ... } block
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Find first [ ... ] block
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(text.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  logger.warn('Could not extract JSON from AI response');
  return null;
};

/**
 * Safe JSON stringify that won't throw.
 */
export const safeStringify = (obj, indent = 2) => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return '{}';
  }
};

export default { extractJSON, safeStringify };
