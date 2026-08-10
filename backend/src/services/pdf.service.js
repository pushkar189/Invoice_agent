import { createRequire } from 'module';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);

/**
 * Extract text from a PDF file.
 * Uses pdf-parse for text-based PDFs.
 * Returns { text, pageCount, isScanned }
 */
export const extractTextFromPDF = async (filePath) => {
  logger.info(`Extracting text from PDF: ${filePath}`);
  try {
    const pdfParse = require('pdf-parse');
    const fs = await import('fs');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    const text = data.text?.trim() || '';
    const pageCount = data.numpages || 1;

    // Heuristic: if less than 50 chars per page on average, it's likely scanned
    const avgCharsPerPage = text.length / pageCount;
    const isScanned = avgCharsPerPage < 50;

    logger.info(`PDF extracted: ${pageCount} pages, ${text.length} chars, scanned: ${isScanned}`);
    return { text, pageCount, isScanned };
  } catch (err) {
    logger.error(`PDF extraction failed: ${err.message}`);
    throw Object.assign(new Error(`Failed to extract text from PDF: ${err.message}`), {
      errorCode: 'PDF_EXTRACTION_FAILED',
      statusCode: 422,
    });
  }
};

export default { extractTextFromPDF };
