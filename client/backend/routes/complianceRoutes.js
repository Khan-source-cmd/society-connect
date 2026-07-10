import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { runComplianceNotices, getNotices, getDefaulters, getDashboardInsights } from '../controllers/complianceController.js';

const router = express.Router();

router.get('/notices',  authenticateToken, requireAuth(['admin']), getNotices);
router.get('/defaulters', authenticateToken, requireAuth(['admin']), getDefaulters);
router.get('/insights', authenticateToken, requireAuth(['admin']), getDashboardInsights);
router.post('/run',     authenticateToken, requireAuth(['admin']), runComplianceNotices);

export default router;