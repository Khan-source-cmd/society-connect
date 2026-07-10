import express from 'express';
import { 
  generateBills, 
  getAllBills,
  getMyBills, 
  payBill, 
  verifyBill,
  downloadBillPDF,
  downloadReceiptPDF,
  generateBillsWithBreakdownHandler,
  getBillWithBreakdownHandler
} from '../controllers/maintenanceController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Maintenance Billing Routes
 * Complete billing lifecycle management
 */

// POST /api/maintenance/generate - Generate new bills for all residents (Admin only)
router.post('/generate', authenticateToken, requireAuth(['admin']), generateBills);

// POST /api/maintenance/generate-with-breakdown - Generate bills with transparent breakdown (Admin only)
router.post('/generate-with-breakdown', authenticateToken, requireAuth(['admin']), generateBillsWithBreakdownHandler);

// GET /api/maintenance/bill/:id/breakdown - Get bill with full breakdown
router.get('/bill/:id/breakdown', authenticateToken, getBillWithBreakdownHandler);

// GET /api/maintenance/all - Get all bills (Admin only)
router.get('/all', authenticateToken, requireAuth(['admin']), getAllBills);

// GET /api/maintenance/my-bills - Get bills for logged-in resident (Resident only)
router.get('/my-bills', authenticateToken, requireAuth(['resident']), getMyBills);

// PATCH /api/maintenance/pay/:id - Mark bill as paid (Resident only)
router.patch('/pay/:id', authenticateToken, requireAuth(['resident']), payBill);

// PATCH /api/maintenance/verify/:id - Verify payment and mark as paid (Admin only)
router.patch('/verify/:id', authenticateToken, requireAuth(['admin']), verifyBill);

// POST /api/maintenance/download-bill/:id - Download bill as PDF (with society settings in body)
router.post('/download-bill/:id', authenticateToken, downloadBillPDF);

// POST /api/maintenance/download-receipt/:id - Download receipt as PDF (with society settings in body)
router.post('/download-receipt/:id', authenticateToken, downloadReceiptPDF);

// POST /api/maintenance/:id/resend - Resend bill notification to specific flat (Admin only)
router.post('/:id/resend', authenticateToken, requireAuth(['admin']), async (req, res) => {
  try {
    const billId = req.params.id;
    const { query } = await import('../config/database.js');
    const { sendMaintenanceBill, isWhatsAppConnected } = await import('../services/whatsappService.cjs');

    const billResult = await query(`
      SELECT mb.*, f.owner_name, f.owner_phone
      FROM maintenance_bills mb
      JOIN flats f ON mb.flat_no = CONCAT(f.wing, '-', f.flat_number)
      WHERE mb.id = $1
    `, [billId]);

    if (billResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const bill = billResult.rows[0];

    if (!isWhatsAppConnected()) {
      return res.json({ success: true, data: { sent: false, reason: 'WhatsApp not connected' }, message: 'WhatsApp not connected. Notification queued.' });
    }

    const phone = (bill.owner_phone || '').toString().replace(/\D/g, '');
    if (phone.length >= 10) {
      await sendMaintenanceBill(phone, bill.owner_name || 'Resident', bill.flat_no, bill.amount, bill.billing_month, '', bill.due_date || '');
    }

    res.json({ success: true, data: { sent: true }, message: `Bill notification resent to ${bill.flat_no}` });
  } catch (error) {
    console.error('Resend bill error:', error);
    res.status(500).json({ success: false, error: error.message, message: 'Failed to resend bill' });
  }
});

export default router;
