import express from 'express';
import { 
  getAllFlats, 
  getFlatById, 
  createFlat, 
  updateFlat, 
  deleteFlat,
  getFlatTypes,
  getAllRates,
  updateRate,
  getSocietySummary,
  bulkImportFlats
} from '../controllers/propertyController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { validateFlatData } from '../middleware/validation.js';

const router = express.Router();

// GET /api/property/flats - Get all flats
router.get('/flats', authenticateToken, requireAuth(['admin']), getAllFlats);

// GET /api/property/flats/:id - Get flat by ID
router.get('/flats/:id', authenticateToken, requireAuth(['admin']), getFlatById);

// POST /api/property/flats - Create new flat
router.post('/flats', authenticateToken, requireAuth(['admin']), validateFlatData, createFlat);

// PUT /api/property/flats/:id - Update flat
router.put('/flats/:id', authenticateToken, requireAuth(['admin']), updateFlat);

// DELETE /api/property/flats/:id - Delete flat
router.delete('/flats/:id', authenticateToken, requireAuth(['admin']), deleteFlat);

// POST /api/property/flats/bulk-import - Bulk import flats from CSV
router.post('/flats/bulk-import', authenticateToken, requireAuth(['admin']), bulkImportFlats);

// GET /api/property/types - Get flat types
router.get('/types', authenticateToken, requireAuth(['admin']), getFlatTypes);

// GET /api/property/rates - Get all rates
router.get('/rates', authenticateToken, requireAuth(['admin']), getAllRates);

// PUT /api/property/rates - Update rate
router.put('/rates', authenticateToken, requireAuth(['admin']), updateRate);

// GET /api/property/summary - Get society summary
router.get('/summary', authenticateToken, requireAuth(['admin']), getSocietySummary);

export default router;