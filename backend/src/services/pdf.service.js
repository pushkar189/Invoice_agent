import { createRequire } from 'module';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);

/**
 * Extract text from a PDF file.
 * Uses pdfjs-dist for reliable text extraction from modern PDFs.
 * Returns { text, pageCount, isScanned }
 */
export const extractTextFromPDF = async (filePath) => {
  logger.info(`Extracting text from PDF: ${filePath}`);
  try {
    const fs = await import('fs');
    const dataBuffer = fs.readFileSync(filePath);
    const data = new Uint8Array(dataBuffer);
    
    // Import pdfjs-dist using the legacy build for Node.js compatibility
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Use the standard font data url to avoid warnings
    const doc = await pdfjs.getDocument({
      data,
      standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/'
    }).promise;
    
    const pageCount = doc.numPages || 1;
    let text = '';
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    
    text = text.trim();

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
