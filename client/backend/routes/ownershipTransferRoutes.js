import express from 'express';
import { 
  getAllTransfers, 
  getTransferById, 
  getTransferHistoryByFlat,
  createTransfer, 
  getTransferSummary
} from '../controllers/ownershipTransferController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Ownership Transfer Routes
 * All routes require authentication and admin role
 */

// GET /api/ownership-transfers - Get all transfers
router.get('/', authenticateToken, requireAuth(['admin']), getAllTransfers);

// GET /api/ownership-transfers/summary - Get transfer summary
router.get('/summary', authenticateToken, requireAuth(['admin']), getTransferSummary);

// GET /api/ownership-transfers/:id - Get transfer by ID
router.get('/:id', authenticateToken, requireAuth(['admin']), getTransferById);

// GET /api/ownership-transfers/flat/:flatId - Get transfer history by flat
router.get('/flat/:flatId', authenticateToken, requireAuth(['admin']), getTransferHistoryByFlat);

// POST /api/ownership-transfers - Create new transfer
router.post('/', authenticateToken, requireAuth(['admin']), createTransfer);

export default router;
