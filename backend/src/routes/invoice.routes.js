import { Router } from 'express';
import { upload, list, getById, update, remove, download, getFlags, resolveFlag } from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware, upload);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/:id/download', download);
router.get('/:id/flags', getFlags);
router.put('/:id/flags/:flagId', resolveFlag);

export default router;
