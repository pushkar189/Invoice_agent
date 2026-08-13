import { logger } from './logger.js';

/**
 * Attempt to extract valid JSON from a potentially messy AI response.
 * Handles cases where Gemma wraps JSON in markdown code blocks.
 */
export const extractJSON = (text) => {
  if (!text || typeof text !== 'string') return null;

  // Helper to parse with logging on failure
  const tryParse = (str) => {
    try {
      return JSON.parse(str.trim());
    } catch (e) {
      logger.warn(`Failed to parse JSON: ${e.message}. Raw content: ${str.substring(0, 100)}...`);
      return null;
    }
  };

  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch {}

  // Strip markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const parsed = tryParse(codeBlockMatch[1]);
    if (parsed) return parsed;
  }

  // Find balanced blocks using a depth scanner
  const findBalanced = (input, openChar, closeChar) => {
    let depth = 0;
    let start = -1;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === openChar) {
        if (depth === 0) start = i;
        depth++;
      } else if (input[i] === closeChar) {
        depth--;
        if (depth === 0 && start !== -1) {
          const content = input.slice(start, i + 1);
          const parsed = tryParse(content);
          if (parsed) return parsed;
        }
      }
    }
    return null;
  };

  const objectResult = findBalanced(text, '{', '}');
  if (objectResult) return objectResult;

  const arrayResult = findBalanced(text, '[', ']');
  if (arrayResult) return arrayResult;

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
