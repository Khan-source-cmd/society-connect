import { query, get, run } from '../config/database.js';
import { format } from 'date-fns';
import { sendMaintenanceBill, isWhatsAppConnected } from '../services/whatsappService.cjs';
import { generateBillInvoice, generateReceipt } from '../services/pdfService.js';
import { generateBillsWithBreakdown, getBillWithBreakdown } from '../services/billGenerationService.js';

/**
 * Get flat owner info for WhatsApp
 */
const getFlatOwnerForWhatsApp = async (flatNo) => {
  try {
    let wing = '', flatNum = flatNo;
    if (flatNo.includes('-')) {
      const parts = flatNo.split('-');
      wing = parts[0];
      flatNum = parts[1];
    }
    
    let result = await query(
      `SELECT owner_name, owner_phone FROM flats WHERE flat_number = $1 LIMIT 1`,
      [flatNum]
    );
    
    if (result.rows.length > 0 && result.rows[0].owner_phone) {
      return {
        name: result.rows[0].owner_name || 'Resident',
        phone: result.rows[0].owner_phone.toString().replace(/\D/g, '')
      };
    }
    
    result = await query(
      `SELECT owner_name, owner_phone FROM flats WHERE flat_number LIKE $1 LIMIT 1`,
      [`%${flatNum}%`]
    );
    
    if (result.rows.length > 0 && result.rows[0].owner_phone) {
      return {
        name: result.rows[0].owner_name || 'Resident',
        phone: result.rows[0].owner_phone.toString().replace(/\D/g, '')
      };
    }
    
    return null;
  } catch (err) {
    console.error('Error getting flat owner:', err);
    return null;
  }
};

const generateBills = async (req, res) => {
  try {
    const flatsQuery = `SELECT * FROM flats ORDER BY wing, flat_number`;
    const flatsResult = await query(flatsQuery);
    const flats = flatsResult.rows;

    if (flats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No flats found. Please add flats first."
      });
    }

    const ratesQuery = `SELECT * FROM maintenance_rates`;
    const ratesResult = await query(ratesQuery);
    const rates = {};
    ratesResult.rows.forEach(r => { rates[r.flat_type] = parseFloat(r.rate); });

    const defaultRates = {
      '1RK': 1500, '1BHK': 2000, '1.5BHK': 2500, '2BHK': 3000, '2.5BHK': 3500,
      '3BHK': 4000, '3.5BHK': 4500, '4BHK': 5000, 'Penthouse': 7000, 'Duplex': 6000
    };

    const currentMonth = format(new Date(), 'MMMM yyyy');
    let generated = 0;
    let skipped = 0;
    let whatsappSent = 0;

    for (const flat of flats) {
      const rate = rates[flat.flat_type] || defaultRates[flat.flat_type] || 2500;
      const flatNo = `${flat.wing}-${flat.flat_number}`;

      const checkQuery = `SELECT id FROM maintenance_bills WHERE flat_no = $1 AND billing_month = $2`;
      const checkResult = await query(checkQuery, [flatNo, currentMonth]);

      if (checkResult.rows.length > 0) {
        skipped++;
        continue;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // Due 15 days from generation
      const insertBillQuery = `INSERT INTO maintenance_bills (amount, status, flat_no, billing_month, due_date) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`;
      
      await query(insertBillQuery, [rate, 'Unpaid', flatNo, currentMonth, dueDate]);
      generated++;

      if (isWhatsAppConnected() && flat.owner_phone) {
        const ownerPhone = flat.owner_phone.toString().replace(/\D/g, '');
        if (ownerPhone.length >= 10) {
          await sendMaintenanceBill(
            ownerPhone,
            flat.owner_name || 'Resident',
            flatNo,
            rate,
            format(new Date(), 'MMMM'),
            format(new Date(), 'yyyy'),
            format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy')
          );
          whatsappSent++;
        }
      }
    }

    res.json({
      success: true,
      data: { generated, skipped, whatsappSent, totalResidents: flats.length },
      message: `Successfully generated ${generated} bills. WhatsApp notifications sent: ${whatsappSent}`
    });

  } catch (error) {
    console.error('Generate bills error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to generate maintenance bills" });
  }
};

const getAllBills = async (req, res) => {
  try {
    const { flat, year, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let countQuery = `SELECT COUNT(*) as total FROM maintenance_bills WHERE 1=1`;
    let billsQuery = `SELECT * FROM maintenance_bills WHERE 1=1`;
    const params = [];
    let paramIdx = 0;

    if (flat) {
      paramIdx++;
      params.push(flat);
      countQuery += ` AND flat_no = $${paramIdx}`;
      billsQuery += ` AND flat_no = $${paramIdx}`;
    }

    if (year) {
      paramIdx++;
      params.push(`%${year}%`);
      countQuery += ` AND billing_month LIKE $${paramIdx}`;
      billsQuery += ` AND billing_month LIKE $${paramIdx}`;
    }

    // Get total count for pagination
    const countResult = await query(countQuery, params);
    const totalBills = parseInt(countResult.rows[0].total);

    billsQuery += ` ORDER BY created_at DESC LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`;
    params.push(parseInt(limit), offset);
    
    const billsResult = await query(billsQuery, params);
    const bills = billsResult.rows;

    const totalUnpaid = bills.filter(bill => bill.status === 'Unpaid').reduce((total, bill) => total + parseFloat(bill.amount), 0);
    const totalPending = bills.filter(bill => bill.status === 'Pending Verification').reduce((total, bill) => total + parseFloat(bill.amount), 0);
    const totalPaid = bills.filter(bill => bill.status === 'Paid').reduce((total, bill) => total + parseFloat(bill.amount), 0);

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalBills,
          totalPages: Math.ceil(totalBills / parseInt(limit))
        },
        summary: { totalUnpaid: parseFloat(totalUnpaid.toFixed(2)), totalPending: parseFloat(totalPending.toFixed(2)), totalPaid: parseFloat(totalPaid.toFixed(2)), totalBills }
      },
      message: "All maintenance bills retrieved successfully"
    });

  } catch (error) {
    console.error('Get all bills error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to retrieve maintenance bills" });
  }
};

const getMyBills = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.id;
    // Combine wing and flat_number to get the full flat_no (e.g., "C-402")
    const userWing = req.user.wing || '';
    const userFlat = req.user.flat_number || req.user.flatNo || '';
    const userFlatNo = userWing && userFlat ? `${userWing}-${userFlat}` : (userFlat || 'A-101');

    console.log('getMyBills - User info:', { userId, userWing, userFlat, userFlatNo });

    const billsQuery = `SELECT * FROM maintenance_bills WHERE flat_no = $1 ORDER BY created_at DESC`;
    const billsResult = await query(billsQuery, [userFlatNo]);
    const bills = billsResult.rows;

    const totalUnpaid = bills.filter(bill => bill.status === 'Unpaid').reduce((total, bill) => total + parseFloat(bill.amount), 0);
    const totalPending = bills.filter(bill => bill.status === 'Pending Verification').reduce((total, bill) => total + parseFloat(bill.amount), 0);
    const totalPaid = bills.filter(bill => bill.status === 'Paid').reduce((total, bill) => total + parseFloat(bill.amount), 0);

    res.json({
      success: true,
      data: {
        flatNumber: userFlatNo,
        bills,
        summary: { totalUnpaid: parseFloat(totalUnpaid.toFixed(2)), totalPending: parseFloat(totalPending.toFixed(2)), totalPaid: parseFloat(totalPaid.toFixed(2)), totalBills: bills.length }
      },
      message: "Maintenance bills retrieved successfully"
    });

  } catch (error) {
    console.error('Get my bills error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to retrieve maintenance bills" });
  }
};

const payBill = async (req, res) => {
  try {
    const billId = req.params.id;
    const { transactionId } = req.body;

    if (!transactionId || transactionId.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Transaction ID is required", message: "Please provide a transaction reference number" });
    }

    const userWing = req.user.wing || '';
    const userFlat = req.user.flat_number || req.user.flatNo || '';
    const userFlatNo = userWing && userFlat ? `${userWing}-${userFlat}` : (userFlat || 'A-101');
    
    const billQuery = `SELECT * FROM maintenance_bills WHERE id = $1`;
    const billResult = await query(billQuery, [billId]);
    const bill = billResult.rows[0];

    if (!bill) return res.status(404).json({ success: false, error: "Bill not found", message: "Bill not found" });
    if (bill.status === 'Paid') return res.status(400).json({ success: false, error: "Bill already paid", message: "This bill has already been paid" });

    const updateQuery = `UPDATE maintenance_bills SET status = 'Pending Verification', transaction_id = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2`;
    await query(updateQuery, [transactionId, billId]);

    res.json({
      success: true,
      data: { billId, status: 'Pending Verification', transactionId, amount: bill.amount, billingMonth: bill.billing_month },
      message: "Bill marked as paid (pending verification)"
    });

  } catch (error) {
    console.error('Pay bill error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to mark bill as paid" });
  }
};

const verifyBill = async (req, res) => {
  try {
    const billId = req.params.id;
    const billQuery = `SELECT * FROM maintenance_bills WHERE id = $1`;
    const billResult = await query(billQuery, [billId]);
    const bill = billResult.rows[0];

    if (!bill) return res.status(404).json({ success: false, error: "Bill not found", message: "Bill not found" });
    if (bill.status === 'Paid') return res.status(400).json({ success: false, error: "Bill already verified", message: "This bill has already been verified as paid" });
    if (bill.status !== 'Pending Verification') return res.status(400).json({ success: false, error: "Invalid bill status", message: "Only bills in 'Pending Verification' status can be verified" });

    await query(`UPDATE maintenance_bills SET status = 'Paid' WHERE id = $1`, [billId]);

    res.json({
      success: true,
      data: { billId, status: 'Paid', transactionId: bill.transaction_id, amount: bill.amount, billingMonth: bill.billing_month },
      message: "Bill verified and marked as paid"
    });

  } catch (error) {
    console.error('Verify bill error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to verify bill payment" });
  }
};

const downloadBillPDF = async (req, res) => {
  try {
    const billId = req.params.id;
    const societySettings = req.body || {};

    const billQuery = `SELECT * FROM maintenance_bills WHERE id = $1`;
    const billResult = await query(billQuery, [billId]);
    const bill = billResult.rows[0];

    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    const pdfBuffer = await generateBillInvoice(bill, societySettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Bill-${bill.flat_no}-${bill.billing_month}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download bill PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

const downloadReceiptPDF = async (req, res) => {
  try {
    const billId = req.params.id;
    const societySettings = req.body || {};

    const billQuery = `SELECT * FROM maintenance_bills WHERE id = $1`;
    const billResult = await query(billQuery, [billId]);
    const bill = billResult.rows[0];

    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    if (bill.status !== 'Paid') return res.status(400).json({ success: false, message: 'Receipt only available for paid bills' });

    const pdfBuffer = await generateReceipt(bill, {
      paymentDate: bill.paid_at ? new Date(bill.paid_at).toLocaleDateString() : new Date().toLocaleDateString(),
      ...societySettings
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt-${bill.flat_no}-${bill.billing_month}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download receipt PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate receipt PDF' });
  }
};


const generateBillsWithBreakdownHandler = async (req, res) => {
  try {
    const { billing_month, breakdown } = req.body;

    if (!billing_month || !breakdown || !Array.isArray(breakdown)) {
      return res.status(400).json({
        success: false,
        message: "Billing month and breakdown items are required"
      });
    }

    const result = await generateBillsWithBreakdown(billing_month, breakdown, req.user.user_id);
    
    res.json(result);

  } catch (error) {
    console.error('Generate bills with breakdown error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to generate maintenance bills" });
  }
};

const getBillWithBreakdownHandler = async (req, res) => {
  try {
    const billId = req.params.id;
    
    const bill = await getBillWithBreakdown(billId);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    res.json({
      success: true,
      data: bill,
      message: "Bill retrieved successfully"
    });

  } catch (error) {
    console.error('Get bill with breakdown error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to retrieve bill" });
  }
};

export { 
  generateBills, 
  getAllBills, 
  getMyBills, 
  payBill, 
  verifyBill, 
  downloadBillPDF, 
  downloadReceiptPDF,
  generateBillsWithBreakdownHandler,
  getBillWithBreakdownHandler
};
