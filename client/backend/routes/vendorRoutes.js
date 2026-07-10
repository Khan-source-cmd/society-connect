import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { addVendor, getAllVendors, getVendor, verify, blacklist, rateVendor, workHistory } from '../controllers/vendorController.js';

const router = express.Router();

router.get('/',              authenticateToken, requireAuth(['admin']), getAllVendors);
router.get('/:id',           authenticateToken, requireAuth(['admin']), getVendor);
router.get('/:id/history',   authenticateToken, requireAuth(['admin']), workHistory);
router.post('/',             authenticateToken, requireAuth(['admin']), addVendor);
router.patch('/:id/verify',  authenticateToken, requireAuth(['admin']), verify);
router.patch('/:id/blacklist', authenticateToken, requireAuth(['admin']), blacklist);
router.post('/:id/rate',     authenticateToken, rateVendor);

export default router;