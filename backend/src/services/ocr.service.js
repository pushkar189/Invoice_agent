import { createWorker } from 'tesseract.js';
import { logger } from '../utils/logger.js';

/**
 * Extract text from an image or scanned document using Tesseract.js OCR.
 * This is pure JavaScript — no Python dependency.
 *
 * @param {string} filePath - Absolute path to the image file
 * @returns {Promise<string>} - Extracted text
 */
export const extractTextFromImage = async (filePath) => {
  logger.info(`Starting OCR on file: ${filePath}`);
  const startTime = Date.now();

  let worker;
  try {
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const { data } = await worker.recognize(filePath);
    const text = data.text?.trim() || '';
    const elapsed = Date.now() - startTime;

    logger.info(`OCR complete in ${elapsed}ms. Extracted ${text.length} characters.`);
    return text;
  } catch (err) {
    logger.error(`OCR failed: ${err.message}`);
    throw Object.assign(new Error(`OCR extraction failed: ${err.message}`), {
      errorCode: 'OCR_FAILED',
      statusCode: 422,
    });
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};

export default { extractTextFromImage };
