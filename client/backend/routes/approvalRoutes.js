import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import {
  createApprovalRequest, getAllApprovals, getApproval,
  getPendingApprovals, approveRequest, rejectRequest
} from '../controllers/approvalController.js';

const router = express.Router();

router.get('/',          authenticateToken, requireAuth(['admin']), getAllApprovals);
router.get('/pending',   authenticateToken, getPendingApprovals);
router.get('/:id',       authenticateToken, getApproval);
router.post('/',         authenticateToken, requireAuth(['admin']), createApprovalRequest);
router.post('/:id/approve', authenticateToken, approveRequest);
router.post('/:id/reject',  authenticateToken, rejectRequest);

export default router;