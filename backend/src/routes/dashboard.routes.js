import { Router } from 'express';
import { getStats, getMonthly, getVendors, getStatusBreakdown, getRecentInvoices } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.get('/stats', getStats);
router.get('/monthly', getMonthly);
router.get('/vendors', getVendors);
router.get('/status', getStatusBreakdown);
router.get('/recent', getRecentInvoices);

export default router;
