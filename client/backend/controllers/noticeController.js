import { query } from '../config/database.js';
import { sendNoticeNotification, isWhatsAppConnected } from '../services/whatsappService.cjs';

/**
 * Get all residents with phone numbers for notifications
 * Priority: Tenants (if flat is rented) > Flat Owners > Users
 */
const getAllResidentsForNotifications = async () => {
  try {
    // First get all flats with their owner info
    const flatsResult = await query(`
      SELECT f.id as flat_id, f.flat_number, f.wing, f.owner_name, f.owner_phone
      FROM flats f
      WHERE f.owner_phone IS NOT NULL AND f.owner_phone != ''
    `);
    
    // Get all tenants with their flat info
    const tenantsResult = await query(`
      SELECT t.tenant_name, t.tenant_phone, t.flat_id, f.flat_number, f.wing
      FROM tenants t
      JOIN flats f ON t.flat_id = f.id
      WHERE t.tenant_phone IS NOT NULL AND t.tenant_phone != '' 
        AND (t.status = 'Active' OR t.status IS NULL)
    `);
    
    // Get users (residents with verified accounts)
    const usersResult = await query(`
      SELECT u.name, u.phone, u.flat_number, u.wing 
      FROM users u 
      WHERE u.role = 'resident' AND u.email_verified = true AND u.phone IS NOT NULL
    `);
    
    // Create a map to track flats that have tenants (to skip sending to owner for those)
    const flatsWithTenants = new Set();
    for (const tenant of tenantsResult.rows) {
      if (tenant.flat_id) {
        flatsWithTenants.add(tenant.flat_id);
      }
    }
    
    // Combine and deduplicate by phone number
    const recipients = new Map();
    
    // Step 1: Add TENANTS (highest priority - if flat is rented, tenant gets notification)
    for (const tenant of tenantsResult.rows) {
      if (tenant.tenant_phone) {
        const phone = tenant.tenant_phone.toString().replace(/\D/g, '');
        if (phone.length >= 10) {
          recipients.set(phone, {
            name: tenant.tenant_name || 'Resident',
            phone: phone,
            type: 'tenant',
            flat: `${tenant.wing}-${tenant.flat_number}`
          });
        }
      }
    }
    
    // Step 2: Add FLAT OWNERS (only if no tenant for that flat)
    for (const flat of flatsResult.rows) {
      // Skip owner if there's a tenant for this flat
      if (flatsWithTenants.has(flat.flat_id)) {
        continue;
      }
      if (flat.owner_phone) {
        const phone = flat.owner_phone.toString().replace(/\D/g, '');
        if (phone.length >= 10 && !recipients.has(phone)) {
          recipients.set(phone, {
            name: flat.owner_name || 'Resident',
            phone: phone,
            type: 'owner',
            flat: `${flat.wing}-${flat.flat_number}`
          });
        }
      }
    }
    
    // Step 3: Add USERS (if not already added)
    for (const user of usersResult.rows) {
      if (user.phone) {
        const phone = user.phone.toString().replace(/\D/g, '');
        if (phone.length >= 10 && !recipients.has(phone)) {
          recipients.set(phone, {
            name: user.name || 'Resident',
            phone: phone,
            type: 'user',
            flat: `${user.wing || ''}-${user.flat_number || ''}`
          });
        }
      }
    }
    
    console.log(`📱 Found ${recipients.size} recipients for notifications:`);
    console.log(`   - Tenants: ${tenantsResult.rows.length}`);
    console.log(`   - Owners (without tenants): ${flatsResult.rows.length - flatsWithTenants.size}`);
    console.log(`   - Users: ${usersResult.rows.length}`);
    
    return Array.from(recipients.values());
  } catch (error) {
    console.error('Error getting residents for notifications:', error);
    return [];
  }
};

/**
 * Notice Controller
 * Handles all notice operations
 */

// Get all notices (public - all users can view)
const getAllNotices = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Map notice_id to id for frontend compatibility
    let noticesQuery = `SELECT notice_id as id, title, content, category, author, author_id, created_at, updated_at FROM notices`;
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      noticesQuery += ` WHERE category = $1`;
    }

    noticesQuery += ` ORDER BY created_at DESC`;
    
    const result = await query(noticesQuery, params);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Notices retrieved successfully"
    });
  } catch (error) {
    console.error('Get all notices error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve notices"
    });
  }
};

// Get notice by ID
const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    // Map notice_id to id for frontend compatibility
    const result = await query(`SELECT notice_id as id, title, content, category, author, author_id, created_at, updated_at FROM notices WHERE notice_id = $1`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Notice retrieved successfully"
    });
  } catch (error) {
    console.error('Get notice by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve notice"
    });
  }
};

// Create new notice (Admin only)
const createNotice = async (req, res) => {
  try {
    const { title, content, category, sendWhatsApp } = req.body;
    const userId = req.user?.user_id || req.user?.id;
    const userName = req.user?.name || 'Admin';

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required"
      });
    }

    const result = await query(
      `INSERT INTO notices (title, content, category, author, author_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [title, content, category || 'General', userName, userId]
    );

    const newNotice = result.rows[0];

    // Send WhatsApp notifications if enabled
    let whatsappSent = 0;
    if (sendWhatsApp) {
      console.log('📱 Sending WhatsApp notifications for new notice...');
      
      const residents = await getAllResidentsForNotifications();
      console.log(`Found ${residents.length} residents to notify`);
      
      for (const resident of residents) {
        try {
          const result = await sendNoticeNotification(
            resident.phone,
            resident.name,
            title,
            new Date(newNotice.created_at).toLocaleDateString('en-IN')
          );
          
          if (result.success) {
            whatsappSent++;
            console.log(`✅ WhatsApp sent to ${resident.phone}`);
          } else {
            console.log(`⚠️ WhatsApp failed for ${resident.phone}: ${result.error}`);
          }
          
          // Small delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.log(`Failed to send to ${resident.phone}:`, err.message);
        }
      }
      
      console.log(`✅ WhatsApp notifications sent: ${whatsappSent}`);
    }

    res.status(201).json({
      success: true,
      data: {
        ...newNotice,
        whatsappSent
      },
      message: sendWhatsApp ? `Notice created. WhatsApp sent to ${whatsappSent} residents.` : "Notice created successfully"
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create notice"
    });
  }
};

// Update notice (Admin only)
const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;

    const checkResult = await query(`SELECT * FROM notices WHERE notice_id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    const result = await query(
      `UPDATE notices 
       SET title = $1, content = $2, category = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE notice_id = $4 
       RETURNING *`,
      [title, content, category, id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: "Notice updated successfully"
    });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to update notice"
    });
  }
};

// Delete notice (Admin only)
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await query(`SELECT * FROM notices WHERE notice_id = $1`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    await query(`DELETE FROM notices WHERE notice_id = $1`, [id]);

    res.json({
      success: true,
      message: "Notice deleted successfully"
    });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to delete notice"
    });
  }
};

export {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice
};
