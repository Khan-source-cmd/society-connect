import { query, run, pool } from '../config/database.js';

/**
 * Generate maintenance bills with transparent breakdown
 * Uses database transactions to ensure atomicity
 * @param {string} billingMonth Billing month in 'YYYY-MM' format
 * @param {Array} breakdownItems Bill breakdown items
 * @param {string} requestedBy User ID of requestor
 * @returns {Object} Generation result
 */
export const generateBillsWithBreakdown = async (billingMonth, breakdownItems, requestedBy) => {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Get all active flats
    const flatsResult = await client.query(`
      SELECT f.id, f.flat_number, f.wing, f.owner_name, f.owner_email, f.area_sqft
      FROM flats f
      ORDER BY f.wing, f.flat_number
    `);

    const flats = flatsResult.rows;
    const generatedBills = [];

    for (const flat of flats) {
      // Calculate bill amount
      let totalAmount = 0;
      const flatBreakdown = breakdownItems.map(item => {
        let itemAmount = item.amount;
        
        // If item is area based, calculate pro-rata
        if (item.calculation_type === 'area_pro_rata') {
          const totalArea = flats.reduce((sum, f) => sum + parseFloat(f.area_sqft || 0), 0);
          itemAmount = Math.round((parseFloat(flat.area_sqft) / totalArea) * item.amount * 100) / 100;
        }

        totalAmount += itemAmount;

        return {
          item_name: item.item_name,
          amount: itemAmount,
          basis: item.basis,
          approval_reference: item.approval_reference || null,
          unit_rate: item.unit_rate || null,
          quantity: item.quantity || null,
          unit: item.unit || null
        };
      });

      // Create main bill record
      const billResult = await client.query(`
        INSERT INTO maintenance_bills (
          flat_no, amount, billing_month, status, generated_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        `${flat.wing}-${flat.flat_number}`,
        totalAmount,
        billingMonth,
        'generated',
        requestedBy
      ]);

      const billId = billResult.rows[0].id;

      // Insert breakdown items
      for (const item of flatBreakdown) {
        await client.query(`
          INSERT INTO bill_breakdowns (
            bill_id, item_name, amount, basis, approval_reference, unit_rate, quantity, unit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          billId,
          item.item_name,
          item.amount,
          item.basis,
          item.approval_reference,
          item.unit_rate,
          item.quantity,
          item.unit
        ]);
      }

      generatedBills.push({
        bill_id: billId,
        flat_number: flat.flat_number,
        amount: totalAmount,
        breakdown: flatBreakdown
      });
    }

    // Commit transaction — all bills created atomically
    await client.query('COMMIT');

    return {
      success: true,
      message: `Generated ${generatedBills.length} bills for ${billingMonth}`,
      data: {
        bills_generated: generatedBills.length,
        total_amount: generatedBills.reduce((sum, b) => sum + b.amount, 0),
        billing_period: billingMonth,
        bills: generatedBills
      }
    };

  } catch (error) {
    // Rollback on any error — no partial bill generation
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error generating bills:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get bill with full breakdown
 * @param {number} billId Bill ID
 * @returns {Object} Bill with breakdown items
 */
export const getBillWithBreakdown = async (billId) => {
  const billResult = await query(`
    SELECT mb.*, f.owner_name, f.owner_email, f.owner_phone
    FROM maintenance_bills mb
    JOIN flats f ON mb.flat_no = CONCAT(f.wing, '-', f.flat_number)
    WHERE mb.id = $1
  `, [billId]);

  if (billResult.rows.length === 0) {
    return null;
  }

  const bill = billResult.rows[0];

  const breakdownResult = await query(`
    SELECT * FROM bill_breakdowns
    WHERE bill_id = $1
    ORDER BY breakdown_id
  `, [billId]);

  bill.breakdown = breakdownResult.rows;
  return bill;
};