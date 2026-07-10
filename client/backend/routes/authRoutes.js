import express from 'express';
import { register, login, verifyOTP, resendOTP } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Authentication Routes
 * All routes follow REST conventions with consistent response format
 */

// POST /api/auth/register - User registration
router.post('/register', (req, res, next) => {
  console.log('🎯 Register route hit');
  console.log('🎯 Request body in route:', req.body);
  register(req, res, next);
});

// POST /api/auth/login - User login
router.post('/login', login);

// POST /api/auth/verify-otp - Verify OTP and complete registration
router.post('/verify-otp', verifyOTP);

// POST /api/auth/send-otp - Send OTP for email verification
router.post('/send-otp', resendOTP);

// POST /api/auth/resend-otp - Resend OTP for email verification
router.post('/resend-otp', resendOTP);

// POST /api/auth/refresh - Refresh token (Protected)
router.post('/refresh', authenticateToken, (req, res) => {
  const jwt = require('jsonwebtoken');
  const newToken = jwt.sign(
    { user_id: req.user.user_id, email: req.user.email, role: req.user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({
    success: true,
    data: { token: newToken },
    message: "Token refreshed successfully"
  });
});

// GET /api/auth/profile - Get current user profile (Protected)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    message: "Profile retrieved successfully"
  });
});

export default router;