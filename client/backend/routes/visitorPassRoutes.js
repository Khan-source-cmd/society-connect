import express from 'express';
import { query, run } from '../config/database.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/visitor-passes - Create a pre-approved visitor pass (Resident)
router.post('/', authenticateToken, requireAuth(['resident', 'admin']), async (req, res) => {
  try {
    const { visitor_name, visitor_phone, visitor_relation, purpose, valid_from, valid_until } = req.body;
    const flat_number = req.user.flat_number ? `${req.user.wing || ''}-${req.user.flat_number}` : (req.body.flat_number || '');
    const flat_owner = req.user.name || req.body.flat_owner || '';

    if (!visitor_name || !flat_number) {
      return res.status(400).json({ success: false, message: 'Visitor name and flat number are required' });
    }

    const qr_code = `PASS-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const result = await run(`
      INSERT INTO visitor_passes (qr_code, flat_number, flat_owner, visitor_name, visitor_phone, visitor_relation, purpose, valid_from, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING pass_id
    `, [qr_code, flat_number, flat_owner, visitor_name, visitor_phone || null, visitor_relation || null, purpose || null, valid_from || new Date(), valid_until || new Date(Date.now() + 24 * 60 * 60 * 1000)]);

    res.status(201).json({ success: true, data: { pass_id: result.rows[0].pass_id, qr_code }, message: 'Visitor pass created' });
  } catch (error) {
    console.error('Create visitor pass error:', error);
    res.status(500).json({ success: false, error: error.message, message: 'Failed to create pass' });
  }
});

// GET /api/visitor-passes/my - Get my visitor passes (Resident)
router.get('/my', authenticateToken, requireAuth(['resident', 'admin']), async (req, res) => {
  try {
    const flat_number = req.user.flat_number ? `${req.user.wing || ''}-${req.user.flat_number}` : '';
    const result = await query(`
      SELECT * FROM visitor_passes
      WHERE flat_number = $1
      ORDER BY approved_date DESC
    `, [flat_number]);
    res.json({ success: true, data: result.rows, message: 'Passes retrieved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/visitor-passes/:id/cancel - Cancel a pass
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    await run(`UPDATE visitor_passes SET status = 'cancelled' WHERE pass_id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Pass cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;