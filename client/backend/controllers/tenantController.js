import { query } from '../config/database.js';

/**
 * Tenant Management Controller
 * Handles all tenant-related operations for rented flats
 */

// Get all tenants
const getAllTenants = async (req, res) => {
  try {
    const tenantsQuery = `
      SELECT t.*, f.flat_number, f.wing, f.flat_type, f.owner_name as owner_name
      FROM tenants t
      LEFT JOIN flats f ON t.flat_id = f.id
      ORDER BY t.created_at DESC
    `;
    const result = await query(tenantsQuery);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Tenants retrieved successfully"
    });
  } catch (error) {
    console.error('Get all tenants error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve tenants"
    });
  }
};

// Get tenant by ID
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantQuery = `
      SELECT t.*, f.flat_number, f.wing, f.flat_type, f.owner_name as owner_name
      FROM tenants t
      LEFT JOIN flats f ON t.flat_id = f.id
      WHERE t.id = $1
    `;
    const result = await query(tenantQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Tenant retrieved successfully"
    });
  } catch (error) {
    console.error('Get tenant by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve tenant"
    });
  }
};

// Get tenant by flat ID
const getTenantByFlatId = async (req, res) => {
  try {
    const { flatId } = req.params;
    const tenantQuery = `
      SELECT t.*, f.flat_number, f.wing, f.flat_type
      FROM tenants t
      LEFT JOIN flats f ON t.flat_id = f.id
      WHERE t.flat_id = $1 AND t.status = 'Active'
    `;
    const result = await query(tenantQuery, [flatId]);
    
    res.json({
      success: true,
      data: result.rows[0] || null,
      message: result.rows[0] ? "Tenant retrieved successfully" : "No active tenant for this flat"
    });
  } catch (error) {
    console.error('Get tenant by flat ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve tenant"
    });
  }
};

// Create new tenant
const createTenant = async (req, res) => {
  try {
    const { 
      flatId,
      tenantName, 
      tenantPhone, 
      tenantEmail,
      emergencyContact,
      emergencyName,
      leaseStart, 
      leaseEnd, 
      rentAmount,
      idProofType,
      idProofNumber
    } = req.body;

    // Validate required fields
    if (!flatId || !tenantName) {
      return res.status(400).json({
        success: false,
        message: "Flat and tenant name are required"
      });
    }

    // Check if flat exists
    const flatCheck = `SELECT id, flat_number, wing FROM flats WHERE id = $1`;
    const flatResult = await query(flatCheck, [flatId]);
    
    if (flatResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Flat not found"
      });
    }

    // Check if flat already has active tenant
    const existingCheck = `SELECT id FROM tenants WHERE flat_id = $1 AND status = 'Active'`;
    const existingResult = await query(existingCheck, [flatId]);
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Flat ${flatResult.rows[0].wing}-${flatResult.rows[0].flat_number} already has an active tenant`
      });
    }

    const insertQuery = `
      INSERT INTO tenants (
        flat_id, tenant_name, tenant_phone, tenant_email,
        emergency_contact, emergency_name,
        lease_start, lease_end, rent_amount,
        id_proof_type, id_proof_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Active')
      RETURNING id
    `;

    const result = await query(insertQuery, [
      flatId, tenantName, tenantPhone, tenantEmail,
      emergencyContact, emergencyName,
      leaseStart, leaseEnd, rentAmount,
      idProofType, idProofNumber
    ]);

    // Automatically update flat status to occupied and rented
    await query(
      `UPDATE flats SET is_occupied = true, ownership_status = 'Rented', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [flatId]
    );

    res.status(201).json({
      success: true,
      data: { id: result.rows[0].id, tenantName, flatId },
      message: "Tenant registered successfully"
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create tenant"
    });
  }
};

// Update tenant
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      tenantName, 
      tenantPhone, 
      tenantEmail,
      emergencyContact,
      emergencyName,
      leaseStart, 
      leaseEnd, 
      rentAmount,
      idProofType,
      idProofNumber,
      status
    } = req.body;

    const updateQuery = `
      UPDATE tenants SET
        tenant_name = COALESCE($1, tenant_name),
        tenant_phone = COALESCE($2, tenant_phone),
        tenant_email = COALESCE($3, tenant_email),
        emergency_contact = COALESCE($4, emergency_contact),
        emergency_name = COALESCE($5, emergency_name),
        lease_start = COALESCE($6, lease_start),
        lease_end = COALESCE($7, lease_end),
        rent_amount = COALESCE($8, rent_amount),
        id_proof_type = COALESCE($9, id_proof_type),
        id_proof_number = COALESCE($10, id_proof_number),
        status = COALESCE($11, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING id
    `;

    const result = await query(updateQuery, [
      tenantName, tenantPhone, tenantEmail,
      emergencyContact, emergencyName,
      leaseStart, leaseEnd, rentAmount,
      idProofType, idProofNumber, status, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found"
      });
    }

    res.json({
      success: true,
      message: "Tenant updated successfully"
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to update tenant"
    });
  }
};

// Delete tenant (mark as inactive) - also updates flat status
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    // First get the tenant's flat_id before terminating
    const tenantQuery = `SELECT flat_id FROM tenants WHERE id = $1`;
    const tenantResult = await query(tenantQuery, [id]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found"
      });
    }
    
    const flatId = tenantResult.rows[0].flat_id;

    // Soft delete - mark as inactive
    const deleteQuery = `UPDATE tenants SET status = 'Terminated', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`;
    const result = await query(deleteQuery, [id]);

    // Automatically update flat status to vacant (owner can move in)
    if (flatId) {
      await query(
        `UPDATE flats SET is_occupied = false, ownership_status = 'Owned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [flatId]
      );
    }

    res.json({
      success: true,
      message: "Tenant terminated and flat marked as vacant"
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to delete tenant"
    });
  }
};

// Owner moving in - terminate tenant and mark flat as owner occupied
const ownerMovingIn = async (req, res) => {
  try {
    const { id } = req.params;

    // First get the tenant's flat_id
    const tenantQuery = `SELECT flat_id FROM tenants WHERE id = $1`;
    const tenantResult = await query(tenantQuery, [id]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found"
      });
    }
    
    const flatId = tenantResult.rows[0].flat_id;

    // Terminate the tenant
    await query(
      `UPDATE tenants SET status = 'Terminated', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Update flat to owner occupied
    await query(
      `UPDATE flats SET is_occupied = true, ownership_status = 'Owned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [flatId]
    );

    res.json({
      success: true,
      message: "Owner moved in - tenant terminated and flat marked as owner-occupied"
    });
  } catch (error) {
    console.error('Owner moving in error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to process owner moving in"
    });
  }
};

// Get tenant summary
const getTenantSummary = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_tenants,
        COUNT(CASE WHEN status = 'Terminated' THEN 1 END) as terminated_tenants,
        COUNT(CASE WHEN lease_end < CURRENT_DATE AND status = 'Active' THEN 1 END) as expired_leases
      FROM tenants
    `;
    
    const result = await query(summaryQuery);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Tenant summary retrieved successfully"
    });
  } catch (error) {
    console.error('Get tenant summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve tenant summary"
    });
  }
};

export {
  getAllTenants,
  getTenantById,
  getTenantByFlatId,
  createTenant,
  updateTenant,
  deleteTenant,
  ownerMovingIn,
  getTenantSummary
};
