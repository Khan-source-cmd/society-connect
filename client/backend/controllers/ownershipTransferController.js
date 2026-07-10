import { query } from '../config/database.js';

/**
 * Ownership Transfer Controller
 * Handles all ownership transfer operations for flats
 */

// Get all ownership transfers
const getAllTransfers = async (req, res) => {
  try {
    const transfersQuery = `
      SELECT ot.*, f.flat_number, f.wing, f.flat_type
      FROM ownership_transfers ot
      LEFT JOIN flats f ON ot.flat_id = f.id
      ORDER BY ot.transfer_date DESC
    `;
    const result = await query(transfersQuery);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Ownership transfers retrieved successfully"
    });
  } catch (error) {
    console.error('Get all transfers error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve ownership transfers"
    });
  }
};

// Get transfer by ID
const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const transferQuery = `
      SELECT ot.*, f.flat_number, f.wing, f.flat_type
      FROM ownership_transfers ot
      LEFT JOIN flats f ON ot.flat_id = f.id
      WHERE ot.id = $1
    `;
    const result = await query(transferQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Transfer retrieved successfully"
    });
  } catch (error) {
    console.error('Get transfer by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve transfer"
    });
  }
};

// Get transfer history for a flat
const getTransferHistoryByFlat = async (req, res) => {
  try {
    const { flatId } = req.params;
    const transferQuery = `
      SELECT ot.*, f.flat_number, f.wing, f.flat_type
      FROM ownership_transfers ot
      LEFT JOIN flats f ON ot.flat_id = f.id
      WHERE ot.flat_id = $1
      ORDER BY ot.transfer_date DESC
    `;
    const result = await query(transferQuery, [flatId]);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Transfer history retrieved successfully"
    });
  } catch (error) {
    console.error('Get transfer history error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve transfer history"
    });
  }
};

// Helper to convert empty string to null for date fields
const nullIfEmpty = (value) => {
  return value === '' || value === undefined ? null : value;
};

// Create new ownership transfer
const createTransfer = async (req, res) => {
  try {
    const { 
      flatId,
      oldOwnerName,
      oldOwnerPhone,
      oldOwnerEmail,
      newOwnerName,
      newOwnerPhone,
      newOwnerEmail,
      saleDeedNumber,
      saleDeedDate,
      saleAmount,
      nocIssuedDate,
      nocNumber,
      nocFee,
      transferDate,
      transferReason,
      idProofType,
      idProofNumber
    } = req.body;

    // Validate required fields
    if (!flatId || !newOwnerName || !transferDate) {
      return res.status(400).json({
        success: false,
        message: "Flat, new owner name, and transfer date are required"
      });
    }

    // Convert empty strings to null for date fields
    const saleDeedDateVal = nullIfEmpty(saleDeedDate);
    const nocIssuedDateVal = nullIfEmpty(nocIssuedDate);
    const transferDateVal = nullIfEmpty(transferDate);

    // Check if flat exists
    const flatCheck = `SELECT id, flat_number, wing, owner_name FROM flats WHERE id = $1`;
    const flatResult = await query(flatCheck, [flatId]);
    
    if (flatResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Flat not found"
      });
    }

    const flat = flatResult.rows[0];

    // Insert ownership transfer record
    const insertQuery = `
      INSERT INTO ownership_transfers (
        flat_id, old_owner_name, old_owner_phone, old_owner_email,
        new_owner_name, new_owner_phone, new_owner_email,
        sale_deed_number, sale_deed_date, sale_amount,
        noc_issued_date, noc_number, noc_fee,
        transfer_date, transfer_reason,
        id_proof_type, id_proof_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Completed')
      RETURNING id
    `;

    const result = await query(insertQuery, [
      flatId,
      oldOwnerName || flat.owner_name,
      oldOwnerPhone,
      oldOwnerEmail,
      newOwnerName,
      newOwnerPhone,
      newOwnerEmail,
      saleDeedNumber,
      saleDeedDateVal,
      saleAmount,
      nocIssuedDateVal,
      nocNumber,
      nocFee,
      transferDateVal,
      transferReason || 'Sale',
      idProofType,
      idProofNumber
    ]);

    // Update flat with new owner
    const updateFlatQuery = `
      UPDATE flats SET
        owner_name = $1,
        owner_phone = $2,
        owner_email = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `;
    
    await query(updateFlatQuery, [newOwnerName, newOwnerPhone, newOwnerEmail, flatId]);

    res.status(201).json({
      success: true,
      data: { id: result.rows[0].id, flatId, newOwnerName },
      message: "Ownership transfer completed successfully"
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create ownership transfer"
    });
  }
};

// Get transfer summary
const getTransferSummary = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_transfers,
        COUNT(CASE WHEN transfer_reason = 'Sale' THEN 1 END) as sales,
        COUNT(CASE WHEN transfer_reason = 'Inheritance' THEN 1 END) as inheritance,
        COUNT(CASE WHEN transfer_reason = 'Gift' THEN 1 END) as gifts,
        SUM(sale_amount) as total_sale_value,
        SUM(noc_fee) as total_noc_fees
      FROM ownership_transfers
    `;
    
    const result = await query(summaryQuery);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Transfer summary retrieved successfully"
    });
  } catch (error) {
    console.error('Get transfer summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve transfer summary"
    });
  }
};

export {
  getAllTransfers,
  getTransferById,
  getTransferHistoryByFlat,
  createTransfer,
  getTransferSummary
};
