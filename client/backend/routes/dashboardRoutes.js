import express from 'express';
import { 
  getAdminDashboard, 
  getResidentDashboard, 
  getSecurityDashboard 
} from '../controllers/dashboardController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Dashboard Routes
 * Role-based dashboard endpoints with proper authentication
 */

// GET /api/dashboard/admin - Admin dashboard data (Admin only)
router.get('/admin', authenticateToken, requireAuth(['admin']), getAdminDashboard);

// GET /api/dashboard/resident - Resident dashboard data (Resident only)
router.get('/resident', authenticateToken, requireAuth(['resident']), getResidentDashboard);

// GET /api/dashboard/security - Security dashboard data (Security only)
router.get('/security', authenticateToken, requireAuth(['security']), getSecurityDashboard);

export default router;