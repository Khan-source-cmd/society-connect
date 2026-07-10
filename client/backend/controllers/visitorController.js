import { query, run, get } from '../config/database.js';
import { sendVisitorAlert, isWhatsAppConnected } from '../services/whatsappService.cjs';

// Get all visitors (optionally filter by today)
export const getVisitors = async (req, res) => {
  try {
    const { today } = req.query;
    
    let sql = 'SELECT * FROM security_logs';
    let params = [];
    
    if (today === 'true') {
      sql = `SELECT * FROM security_logs 
             WHERE DATE(entry_time) = CURRENT_DATE 
             ORDER BY entry_time DESC`;
    } else {
      sql += ' ORDER BY entry_time DESC';
    }
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting visitors:', err);
    res.status(500).json({ error: 'Failed to get visitors' });
  }
};

// Get flat owner/tenant by flat number - checks tenants first, then owners
const getFlatOwner = async (flatNumber) => {
  try {
    console.log('🔍 Searching for flat:', flatNumber);
    
    // Clean up the flat number - remove wing prefix if present
    let cleanFlatNum = flatNumber;
    if (flatNumber.includes('-')) {
      cleanFlatNum = flatNumber.split('-')[1] || flatNumber;
    }
    
    // First, check if there's an ACTIVE TENANT for this flat
    // Join with flats table to match by flat_number
    let tenantResult = await query(
      `SELECT t.tenant_name, t.tenant_phone, f.flat_number, f.wing
       FROM tenants t
       JOIN flats f ON t.flat_id = f.id
       WHERE f.flat_number = $1 AND t.status = 'Active'
       LIMIT 1`,
      [cleanFlatNum]
    );
    
    console.log('📍 Tenant check for ' + cleanFlatNum + ':', tenantResult.rows);
    
    // If there's an active tenant, send notification to tenant
    if (tenantResult.rows.length > 0 && tenantResult.rows[0].tenant_phone) {
      const phone = tenantResult.rows[0].tenant_phone.toString().replace(/\D/g, '');
      console.log('✅ Found TENANT for flat ' + flatNumber + ':', tenantResult.rows[0].tenant_name);
      return {
        name: tenantResult.rows[0].tenant_name || 'Tenant',
        phone: phone,
        type: 'tenant'
      };
    }
    
    // If no tenant, check for flat owner
    let flatResult = await query(
      `SELECT owner_name, owner_phone FROM flats WHERE flat_number = $1 LIMIT 1`,
      [cleanFlatNum]
    );
    
    console.log('📍 Owner check for ' + cleanFlatNum + ':', flatResult.rows);
    
    if (flatResult.rows.length > 0 && flatResult.rows[0].owner_phone) {
      const phone = flatResult.rows[0].owner_phone.toString().replace(/\D/g, '');
      console.log('✅ Found OWNER for flat ' + flatNumber + ':', flatResult.rows[0].owner_name);
      return {
        name: flatResult.rows[0].owner_name || 'Owner',
        phone: phone,
        type: 'owner'
      };
    }
    
    // Try partial match for owner
    flatResult = await query(
      `SELECT owner_name, owner_phone FROM flats WHERE flat_number LIKE $1 LIMIT 1`,
      [`%${cleanFlatNum}%`]
    );
    
    console.log('📍 Owner partial match:', flatResult.rows);
    
    if (flatResult.rows.length > 0 && flatResult.rows[0].owner_phone) {
      const phone = flatResult.rows[0].owner_phone.toString().replace(/\D/g, '');
      return {
        name: flatResult.rows[0].owner_name || 'Owner',
        phone: phone,
        type: 'owner'
      };
    }
    
    console.log('❌ No flat found with phone number');
    return null;
    
  } catch (err) {
    console.error('Error getting flat owner:', err);
    return null;
  }
};

// Add new visitor
export const addVisitor = async (req, res) => {
  try {
    const { visitor_name, flat_number, purpose, phone } = req.body;
    
    console.log('Adding visitor:', { visitor_name, flat_number, purpose, phone });
    
    const sql = `
      INSERT INTO security_logs (visitor_name, flat_number, purpose, phone, entry_time, status)
      VALUES ($1, $2, $3, $4, NOW(), 'inside')
      RETURNING *
    `;
    
    const result = await query(sql, [visitor_name, flat_number, purpose, phone || null]);
    const newVisitor = result.rows[0];
    
    console.log('Visitor added:', newVisitor);
    
    // Try to send WhatsApp alert (but don't fail if it doesn't work)
    try {
      const owner = await getFlatOwner(flat_number);
      console.log('Looking for owner of flat:', flat_number, 'Found:', owner);
      
      if (owner && owner.phone) {
        const entryTime = new Date(newVisitor.entry_time).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        
        const alertResult = await sendVisitorAlert(
          owner.phone,
          owner.name || 'Resident',
          flat_number,
          visitor_name,
          purpose,
          entryTime
        );
        
        if (alertResult.success) {
          console.log(`✅ WhatsApp alert sent for visitor ${visitor_name} to flat ${flat_number}`);
        } else {
          console.log(`⚠️ WhatsApp alert failed for visitor ${visitor_name} to flat ${flat_number}: ${alertResult.error}`);
        }
      } else {
        console.log(`⚠️ No owner found for flat ${flat_number} - skipping WhatsApp alert`);
      }
    } catch (whatsappErr) {
      console.error('WhatsApp error (non-fatal):', whatsappErr.message);
    }
    
    res.status(201).json(newVisitor);
  } catch (err) {
    console.error('Error adding visitor:', err);
    res.status(500).json({ error: 'Failed to add visitor: ' + err.message });
  }
};

// Checkout visitor
export const checkoutVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = `
      UPDATE security_logs 
      SET exit_time = NOW(), status = 'left'
      WHERE log_id = $1
      RETURNING *
    `;
    
    const result = await query(sql, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error checking out visitor:', err);
    res.status(500).json({ error: 'Failed to checkout visitor' });
  }
};

// Get visitor by ID
export const getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM security_logs WHERE log_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting visitor:', err);
    res.status(500).json({ error: 'Failed to get visitor' });
  }
};
