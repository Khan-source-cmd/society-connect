import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { query, get } from '../config/database.js';

const router = express.Router();

/**
 * User Routes
 * Handles user-related operations like fetching residents
 */

// GET /api/users/residents - Get all residents (Protected, Admin only)
router.get('/residents', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "Only admins can access this resource"
      });
    }

    // Get all users with role = 'resident' (including unverified)
    const residentsQuery = `
      SELECT user_id as id, name, email, phone, flat_number, wing, role, email_verified, created_at 
      FROM users 
      WHERE role = 'resident'
      ORDER BY created_at DESC
    `;
    
    const result = await query(residentsQuery);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Residents retrieved successfully"
    });

  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to fetch residents"
    });
  }
});

export default router;
