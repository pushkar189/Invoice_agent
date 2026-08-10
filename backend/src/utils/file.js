import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIMETYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

/**
 * Generate a safe unique filename preserving the original extension.
 */
export const generateSafeFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const safe = `invoice_${uuidv4()}${ext}`;
  return safe;
};

/**
 * Validate file extension and mimetype.
 */
export const validateFile = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file type: ${ext}. Allowed: PDF, PNG, JPG` };
  }
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return { valid: false, error: `Invalid MIME type: ${file.mimetype}` };
  }
  return { valid: true };
};

/**
 * Ensure a directory exists, create if not.
 */
export const ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

/**
 * Delete a file safely without throwing.
 */
export const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.debug(`Deleted file: ${filePath}`);
  } catch (err) {
    logger.warn(`Could not delete file ${filePath}: ${err.message}`);
  }
};

/**
 * Check if a file exists.
 */
export const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export default { generateSafeFilename, validateFile, ensureDir, deleteFile, fileExists };
