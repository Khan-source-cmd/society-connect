import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  createOrder, getAllOrders, getOrder, startOrder,
  completeOrder, uploadPhoto, residentVerify, adminVerify
} from '../controllers/workOrderController.js';

const router = express.Router();

router.get('/',                   authenticateToken, requireAuth(['admin']), getAllOrders);
router.get('/:id',                authenticateToken, getOrder);
router.post('/',                  authenticateToken, requireAuth(['admin']), createOrder);
router.patch('/:id/start',        authenticateToken, requireAuth(['admin']), startOrder);
router.patch('/:id/complete',     authenticateToken, requireAuth(['admin']), completeOrder);
router.post('/:id/photos/:stage', authenticateToken, upload.single('photo'), uploadPhoto);
router.post('/:id/resident-verify', authenticateToken, requireAuth(['resident']), residentVerify);
router.post('/:id/admin-verify',  authenticateToken, requireAuth(['admin']), adminVerify);

export default router;