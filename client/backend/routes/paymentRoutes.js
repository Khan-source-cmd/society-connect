

import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import { createOrder, verifyPayment, getPaymentHistory } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order', authenticateToken, createOrder);
router.post('/verify',       authenticateToken, verifyPayment);
router.get('/history',       authenticateToken, requireAuth(['admin']), getPaymentHistory);

export default router;