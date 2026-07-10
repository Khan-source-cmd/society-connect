import express from 'express';
import { 
  getAllComplaints, 
  createComplaint, 
  updateComplaintStatus,
  deleteComplaint
} from '../controllers/complaintController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Complaint Routes
 * GET - All users can view (admin sees all, resident sees theirs)
 * POST - Authenticated users can create
 * PUT/PATCH - Admin only can update status
 * DELETE - Admin can delete any, resident can delete their own pending
 */

// GET /api/complaints - Get all complaints
router.get('/', authenticateToken, getAllComplaints);

// POST /api/complaints - Create new complaint
router.post('/', authenticateToken, createComplaint);

// PATCH /api/complaints/:id - Update complaint status (admin only)
router.patch('/:id', authenticateToken, requireAuth(['admin']), updateComplaintStatus);

// DELETE /api/complaints/:id - Delete complaint
router.delete('/:id', authenticateToken, deleteComplaint);

export default router;
