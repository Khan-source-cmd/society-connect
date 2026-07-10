import { query, get } from '../config/database.js';
import { sendNewComplaintToAdmin, sendComplaintUpdate, isWhatsAppConnected } from '../services/whatsappService.cjs';

/**
 * Get all residents with phone numbers for notifications
 */
const getAllResidentsForNotifications = async () => {
  try {
    const usersResult = await query(`
      SELECT u.name, u.phone, u.flat_number, u.wing 
      FROM users u 
      WHERE u.role = 'resident' AND u.email_verified = true AND u.phone IS NOT NULL
    `);
    
    const flatsResult = await query(`
      SELECT owner_name, owner_phone, flat_number, wing 
      FROM flats 
      WHERE owner_phone IS NOT NULL AND owner_phone != ''
    `);
    
    const recipients = new Map();
    
    for (const user of usersResult.rows) {
      if (user.phone) {
        const phone = user.phone.toString().replace(/\D/g, '');
        if (phone.length >= 10) {
          recipients.set(phone, {
            name: user.name || 'Resident',
            phone: phone
          });
        }
      }
    }
    
    for (const flat of flatsResult.rows) {
      if (flat.owner_phone) {
        const phone = flat.owner_phone.toString().replace(/\D/g, '');
        if (phone.length >= 10 && !recipients.has(phone)) {
          recipients.set(phone, {
            name: flat.owner_name || 'Resident',
            phone: phone
          });
        }
      }
    }
    
    return Array.from(recipients.values());
  } catch (error) {
    console.error('Error getting residents for notifications:', error);
    return [];
  }
};

/**
 * Get admin phone number
 */
const getAdminPhone = async () => {
  try {
    const result = await query(`SELECT phone FROM users WHERE role = 'admin' AND phone IS NOT NULL LIMIT 1`);
    if (result.rows.length > 0 && result.rows[0].phone) {
      return result.rows[0].phone.replace(/\D/g, '');
    }
    return null;
  } catch (error) {
    console.error('Error getting admin phone:', error);
    return null;
  }
};

/**
 * Complaint Controller
 * Handles all complaint operations
 */

// Get all complaints (Admin sees all, residents see theirs)
const getAllComplaints = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.user_id;
    
    let complaintsQuery = `
      SELECT c.*, u.name as resident_name 
      FROM complaints c 
      LEFT JOIN users u ON c.user_id = u.user_id
    `;
    const params = [];

    if (userRole === 'resident') {
      complaintsQuery += ` WHERE c.user_id = $1`;
      params.push(userId);
    }

    complaintsQuery += ` ORDER BY c.created_at DESC`;
    
    const result = await query(complaintsQuery, params);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Complaints retrieved successfully"
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve complaints"
    });
  }
};

// Create new complaint
const createComplaint = async (req, res) => {
  try {
    const { subject, category, description, urgency, flatNumber, wing, sendWhatsApp } = req.body;
    const userId = req.user?.user_id;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: "Subject and description are required"
      });
    }

    const result = await query(
      `INSERT INTO complaints (user_id, subject, category, description, urgency, flat_number, wing) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, subject, category || 'Others', description, urgency || 'Medium', flatNumber, wing]
    );

    const newComplaint = result.rows[0];

    // Send WhatsApp to admin
    let whatsappSent = 0;
    if (sendWhatsApp) {
      const adminPhone = await getAdminPhone();
      if (adminPhone) {
        try {
          const result = await sendNewComplaintToAdmin(
            adminPhone,
            newComplaint.id,
            flatNumber || newComplaint.flat_number,
            wing || newComplaint.wing,
            subject,
            category || 'Others',
            urgency || 'Medium',
            description
          );
          
          if (result.success) {
            whatsappSent = 1;
            console.log(`✅ WhatsApp sent to admin for complaint ${newComplaint.id}`);
          } else {
            console.log(`⚠️ WhatsApp failed for complaint ${newComplaint.id}: ${result.error}`);
          }
        } catch (err) {
          console.log('Failed to send WhatsApp to admin:', err.message);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: { ...newComplaint, whatsappSent },
      message: whatsappSent ? "Complaint submitted. Admin notified via WhatsApp." : "Complaint submitted successfully"
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to submit complaint"
    });
  }
};

// Update complaint status (Admin only)
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sendWhatsApp } = req.body;

    const checkResult = await query(`SELECT * FROM complaints WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    const oldComplaint = checkResult.rows[0];
    
    const result = await query(
      `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // Send WhatsApp to resident
    let whatsappSent = 0;
    if (sendWhatsApp) {
      // Get resident's phone
      const userResult = await query(`SELECT name, phone FROM users WHERE user_id = $1`, [oldComplaint.user_id]);
      if (userResult.rows.length > 0 && userResult.rows[0].phone) {
        const resident = userResult.rows[0];
        const phone = resident.phone.toString().replace(/\D/g, '');
        
        try {
          const result = await sendComplaintUpdate(
            phone,
            resident.name || 'Resident',
            id,
            status,
            oldComplaint.subject || 'Your complaint'
          );
          
          if (result.success) {
            whatsappSent = 1;
            console.log(`✅ WhatsApp sent to resident for complaint ${id}`);
          } else {
            console.log(`⚠️ WhatsApp failed for complaint ${id}: ${result.error}`);
          }
        } catch (err) {
          console.log('Failed to send WhatsApp to resident:', err.message);
        }
      }
    }

    res.json({
      success: true,
      data: { ...result.rows[0], whatsappSent },
      message: whatsappSent ? "Complaint status updated. Resident notified via WhatsApp." : "Complaint status updated"
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to update complaint"
    });
  }
};

// Delete complaint
const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.user_id;

    // Check if complaint exists
    const checkResult = await query(`SELECT * FROM complaints WHERE id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    const complaint = checkResult.rows[0];

    // Check permissions: admin can delete any, resident can only delete their own pending complaints
    if (userRole === 'resident' && complaint.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own complaints"
      });
    }

    if (userRole === 'resident' && complaint.status !== 'Pending') {
      return res.status(403).json({
        success: false,
        message: "You can only delete complaints with 'Pending' status"
      });
    }

    // Delete the complaint
    await query(`DELETE FROM complaints WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: "Complaint deleted successfully"
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to delete complaint"
    });
  }
};

export {
  getAllComplaints,
  createComplaint,
  updateComplaintStatus,
  deleteComplaint
};
