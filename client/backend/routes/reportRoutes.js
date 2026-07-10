import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { getCollectionReport, getDefaulterReport, getSummaryReport, getFlatWiseReport } from '../controllers/reportController.js';

const router = express.Router();

router.get('/collection',    authenticateToken, requireAuth(['admin']), getCollectionReport);
router.get('/defaulters',    authenticateToken, requireAuth(['admin']), getDefaulterReport);
router.get('/summary',       authenticateToken, requireAuth(['admin']), getSummaryReport);
router.get('/flat-wise',     authenticateToken, requireAuth(['admin']), getFlatWiseReport);

export default router;