import express from 'express';
import { 
  getAllNotices, 
  getNoticeById, 
  createNotice, 
  updateNotice, 
  deleteNotice 
} from '../controllers/noticeController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Notice Routes
 * GET routes are public (all users can view notices)
 * POST, PUT, DELETE routes are admin only
 */

// GET /api/notices - Get all notices (public)
router.get('/', getAllNotices);

// GET /api/notices/:id - Get notice by ID (public)
router.get('/:id', getNoticeById);

// POST /api/notices - Create new notice (admin only)
router.post('/', authenticateToken, requireAuth(['admin']), createNotice);

// PUT /api/notices/:id - Update notice (admin only)
router.put('/:id', authenticateToken, requireAuth(['admin']), updateNotice);

// DELETE /api/notices/:id - Delete notice (admin only)
router.delete('/:id', authenticateToken, requireAuth(['admin']), deleteNotice);

export default router;
