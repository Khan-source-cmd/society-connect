import express from 'express';
import { getVisitors, addVisitor, checkoutVisitor, getVisitorById } from '../controllers/visitorController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/',           authenticateToken, requireAuth(['admin', 'security']), getVisitors);
router.get('/:id',        authenticateToken, requireAuth(['admin', 'security']), getVisitorById);
router.post('/',          authenticateToken, requireAuth(['admin', 'security']), addVisitor);
router.put('/:id/checkout', authenticateToken, requireAuth(['admin', 'security']), checkoutVisitor);

export default router;