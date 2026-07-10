import { query } from '../config/database.js';

/**
 * Property/Flat Management Controller
 * Handles all flat-related operations
 */

// Get all flats
const getAllFlats = async (req, res) => {
  try {
    const flatsQuery = `SELECT * FROM flats ORDER BY wing, flat_number`;
    const result = await query(flatsQuery);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Flats retrieved successfully"
    });
  } catch (error) {
    console.error('Get all flats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve flats"
    });
  }
};

// Get flat by ID
const getFlatById = async (req, res) => {
  try {
    const { id } = req.params;
    const flatQuery = `SELECT * FROM flats WHERE id = $1`;
    const result = await query(flatQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Flat retrieved successfully"
    });
  } catch (error) {
    console.error('Get flat by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve flat"
    });
  }
};

// Create new flat
const createFlat = async (req, res) => {
  try {
    const { 
      flatNumber, 
      wing, 
      floor, 
      flatType, 
      carpetArea, 
      builtUpArea, 
      balconyType,
      parkingSlot,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownershipStatus,
      isOccupied,
      vehicleNumber,
      vehicleType,
      vehicleModel,
      vehicleColor
    } = req.body;

    // Validate required fields
    if (!flatNumber || !wing || !flatType) {
      return res.status(400).json({
        success: false,
        message: "Flat number, wing, and flat type are required"
      });
    }

    // Check if flat already exists
    const checkQuery = `SELECT id FROM flats WHERE flat_number = $1 AND wing = $2`;
    const checkResult = await query(checkQuery, [flatNumber, wing]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Flat ${wing}-${flatNumber} already exists`
      });
    }

    const insertQuery = `
      INSERT INTO flats (
        flat_number, wing, floor, flat_type, carpet_area, built_up_area,
        balcony_type, parking_slot, owner_name, owner_phone, owner_email,
        ownership_status, is_occupied, vehicle_number, vehicle_type, vehicle_model, vehicle_color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `;

    const result = await query(insertQuery, [
      flatNumber, wing, floor || 1, flatType, carpetArea, builtUpArea,
      balconyType || 'Standard', parkingSlot, ownerName, ownerPhone, ownerEmail,
      ownershipStatus || 'Owned', isOccupied || false, vehicleNumber, vehicleType, vehicleModel, vehicleColor
    ]);

    res.status(201).json({
      success: true,
      data: { id: result.rows[0].id, flatNumber, wing },
      message: "Flat created successfully"
    });
  } catch (error) {
    console.error('Create flat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create flat"
    });
  }
};

// Update flat
const updateFlat = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      flatNumber, 
      wing, 
      floor, 
      flatType, 
      carpetArea, 
      builtUpArea, 
      balconyType,
      parkingSlot,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownershipStatus,
      isOccupied,
      vehicleNumber,
      vehicleType,
      vehicleModel,
      vehicleColor
    } = req.body;

    const updateQuery = `
      UPDATE flats SET
        flat_number = COALESCE($1, flat_number),
        wing = COALESCE($2, wing),
        floor = COALESCE($3, floor),
        flat_type = COALESCE($4, flat_type),
        carpet_area = COALESCE($5, carpet_area),
        built_up_area = COALESCE($6, built_up_area),
        balcony_type = COALESCE($7, balcony_type),
        parking_slot = COALESCE($8, parking_slot),
        owner_name = COALESCE($9, owner_name),
        owner_phone = COALESCE($10, owner_phone),
        owner_email = COALESCE($11, owner_email),
        ownership_status = COALESCE($12, ownership_status),
        is_occupied = COALESCE($13, is_occupied),
        vehicle_number = COALESCE($14, vehicle_number),
        vehicle_type = COALESCE($15, vehicle_type),
        vehicle_model = COALESCE($16, vehicle_model),
        vehicle_color = COALESCE($17, vehicle_color),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING id
    `;

    const result = await query(updateQuery, [
      flatNumber, wing, floor, flatType, carpetArea, builtUpArea,
      balconyType, parkingSlot, ownerName, ownerPhone, ownerEmail,
      ownershipStatus, isOccupied, vehicleNumber, vehicleType, vehicleModel, vehicleColor, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found"
      });
    }

    res.json({
      success: true,
      message: "Flat updated successfully"
    });
  } catch (error) {
    console.error('Update flat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to update flat"
    });
  }
};

// Delete flat
const deleteFlat = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = `DELETE FROM flats WHERE id = $1 RETURNING id`;
    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Flat not found"
      });
    }

    res.json({
      success: true,
      message: "Flat deleted successfully"
    });
  } catch (error) {
    console.error('Delete flat error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to delete flat"
    });
  }
};

// Get flat types with rates from database
const getFlatTypes = async (req, res) => {
  try {
    // Get flat types from flats table
    const typesQuery = `SELECT DISTINCT flat_type FROM flats ORDER BY flat_type`;
    const result = await query(typesQuery);
    
    // Get rates from maintenance_rates table
    const ratesQuery = `SELECT * FROM maintenance_rates ORDER BY flat_type`;
    const ratesResult = await query(ratesQuery);
    
    // Default flat types with suggested rates
    const defaultTypes = [
      { type: '1RK', rate: 1500 },
      { type: '1BHK', rate: 2000 },
      { type: '1.5BHK', rate: 2500 },
      { type: '2BHK', rate: 3000 },
      { type: '2.5BHK', rate: 3500 },
      { type: '3BHK', rate: 4000 },
      { type: '3.5BHK', rate: 4500 },
      { type: '4BHK', rate: 5000 },
      { type: 'Penthouse', rate: 7000 },
      { type: 'Duplex', rate: 6000 }
    ];

    // Merge: use rates from DB if available, else default
    const rates = ratesResult.rows.length > 0 ? ratesResult.rows : defaultTypes;
    
    const existingTypes = result.rows.map(r => r.flat_type);
    
    res.json({
      success: true,
      data: {
        existingTypes,
        rates
      },
      message: "Flat types retrieved successfully"
    });
  } catch (error) {
    console.error('Get flat types error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve flat types"
    });
  }
};

// Update maintenance rate
const updateRate = async (req, res) => {
  try {
    const { flatType, rate } = req.body;
    
    if (!flatType || rate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Flat type and rate are required"
      });
    }

    const insertQuery = `
      INSERT INTO maintenance_rates (flat_type, rate)
      VALUES ($1, $2)
      ON CONFLICT (flat_type) DO UPDATE SET rate = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const result = await query(insertQuery, [flatType, rate]);
    
    res.json({
      success: true,
      message: "Rate updated successfully"
    });
  } catch (error) {
    console.error('Update rate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to update rate"
    });
  }
};

// Get all rates
const getAllRates = async (req, res) => {
  try {
    const ratesQuery = `SELECT * FROM maintenance_rates ORDER BY flat_type`;
    const result = await query(ratesQuery);
    
    res.json({
      success: true,
      data: result.rows,
      message: "Rates retrieved successfully"
    });
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve rates"
    });
  }
};

// Get society summary (total flats, occupancy, etc.)
const getSocietySummary = async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_flats,
        COUNT(CASE WHEN is_occupied = true THEN 1 END) as occupied_flats,
        COUNT(CASE WHEN ownership_status = 'Owned' THEN 1 END) as owned_flats,
        COUNT(CASE WHEN ownership_status = 'Rented' THEN 1 END) as rented_flats,
        COUNT(DISTINCT wing) as total_wings,
        COUNT(DISTINCT flat_type) as flat_types
      FROM flats
    `;
    
    const result = await query(summaryQuery);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Society summary retrieved successfully"
    });
  } catch (error) {
    console.error('Get society summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve society summary"
    });
  }
};

// Bulk import flats from CSV data
const bulkImportFlats = async (req, res) => {
  try {
    const { flats } = req.body;
    if (!flats || !Array.isArray(flats) || flats.length === 0) {
      return res.status(400).json({ success: false, message: "CSV data with at least one row is required" });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of flats) {
      if (!row.flat_number || !row.wing) {
        skipped++;
        errors.push(`Row ${imported + skipped}: Missing flat_number or wing`);
        continue;
      }
      const checkQuery = `SELECT id FROM flats WHERE flat_number = $1 AND wing = $2`;
      const checkResult = await query(checkQuery, [row.flat_number, row.wing]);
      if (checkResult.rows.length > 0) {
        skipped++;
        continue;
      }

      const insertQuery = `
        INSERT INTO flats (flat_number, wing, floor, flat_type, carpet_area, built_up_area,
          balcony_type, parking_slot, owner_name, owner_phone, owner_email,
          ownership_status, is_occupied, vehicle_number, vehicle_type)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      `;
      await query(insertQuery, [
        row.flat_number, row.wing, row.floor || 1, row.flat_type || '2BHK',
        row.carpet_area || null, row.built_up_area || null,
        row.balcony_type || 'Standard', row.parking_slot || null,
        row.owner_name || null, row.owner_phone || null, row.owner_email || null,
        row.ownership_status || 'Owned', row.is_occupied === 'true' || row.is_occupied === true,
        row.vehicle_number || null, row.vehicle_type || null
      ]);
      imported++;
    }

    res.json({
      success: true,
      data: { imported, skipped, total: flats.length, errors: errors.length > 0 ? errors : undefined },
      message: `Imported ${imported} flats, skipped ${skipped}`
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, error: error.message, message: "Failed to bulk import flats" });
  }
};

export {
  getAllFlats,
  getFlatById,
  createFlat,
  updateFlat,
  deleteFlat,
  getFlatTypes,
  getAllRates,
  updateRate,
  getSocietySummary,
  bulkImportFlats
};
