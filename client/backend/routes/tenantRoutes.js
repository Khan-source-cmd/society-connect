import express from 'express';
import { 
  getAllTenants, 
  getTenantById, 
  getTenantByFlatId,
  createTenant, 
  updateTenant, 
  deleteTenant,
  ownerMovingIn,
  getTenantSummary
} from '../controllers/tenantController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Tenant Management Routes
 * All routes require authentication and admin role
 */

// GET /api/tenants - Get all tenants
router.get('/', authenticateToken, requireAuth(['admin']), getAllTenants);

// GET /api/tenants/summary - Get tenant summary
router.get('/summary', authenticateToken, requireAuth(['admin']), getTenantSummary);

// GET /api/tenants/:id - Get tenant by ID
router.get('/:id', authenticateToken, requireAuth(['admin']), getTenantById);

// GET /api/tenants/flat/:flatId - Get tenant by flat ID
router.get('/flat/:flatId', authenticateToken, requireAuth(['admin']), getTenantByFlatId);

// POST /api/tenants - Create new tenant
router.post('/', authenticateToken, requireAuth(['admin']), createTenant);

// PUT /api/tenants/:id - Update tenant
router.put('/:id', authenticateToken, requireAuth(['admin']), updateTenant);

// DELETE /api/tenants/:id - Delete (terminate) tenant
router.delete('/:id', authenticateToken, requireAuth(['admin']), deleteTenant);

// POST /api/tenants/:id/owner-moving-in - Owner moving in (terminate tenant + update flat)
router.post('/:id/owner-moving-in', authenticateToken, requireAuth(['admin']), ownerMovingIn);

export default router;
