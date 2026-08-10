import multer from 'multer';
import path from 'path';
import { config } from '../config/env.js';
import { generateSafeFilename, ensureDir } from '../utils/file.js';

const ALLOWED_MIMETYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDir(config.upload.dir);
      cb(null, config.upload.dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const safeName = generateSafeFilename(file.originalname);
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];

  if (!allowedExts.includes(ext)) {
    return cb(new Error(`Unsupported file type: ${ext}`), false);
  }
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type: ${file.mimetype}`), false);
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
    files: 1,
  },
}).single('invoice');

export default uploadMiddleware;
