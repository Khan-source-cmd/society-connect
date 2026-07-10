import { query } from '../config/database.js';

/**
 * Auto-calculate and apply late fees to overdue bills
 * Uses society_settings to get percentage, grace_days, and max_fee
 */
export const calculateAndApplyLateFees = async () => {
  try {
    // Get late fee settings
    const settingsResult = await query(`SELECT * FROM late_fee_settings LIMIT 1`);
    const settings = settingsResult.rows[0];
    if (!settings || !settings.enabled) {
      return { success: true, message: 'Late fees are disabled', fees_applied: 0 };
    }

    const { percentage, grace_days, max_fee } = settings;

    // Find overdue Unpaid bills past grace period
    const overdueResult = await query(`
      SELECT mb.id, mb.flat_no, mb.amount, mb.billing_month, mb.created_at, mb.late_fee
      FROM maintenance_bills mb
      WHERE mb.status IN ('Unpaid', 'generated')
        AND mb.created_at < CURRENT_DATE - INTERVAL '1 day' * $1
        AND (mb.late_fee IS NULL OR mb.late_fee = 0)
    `, [grace_days]);

    let feesApplied = 0;
    for (const bill of overdueResult.rows) {
      // Calculate days overdue beyond grace period
      const createdDate = new Date(bill.created_at);
      const dueDate = new Date(createdDate.getTime() + grace_days * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysOverdue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));

      if (daysOverdue <= 0) continue;

      // Calculate late fee
      let lateFee = parseFloat(bill.amount) * (percentage / 100);
      lateFee = Math.min(lateFee, max_fee);
      lateFee = Math.round(lateFee * 100) / 100;

      // Apply late fee
      await query(`
        UPDATE maintenance_bills SET late_fee = $1 WHERE id = $2
      `, [lateFee, bill.id]);

      feesApplied++;
    }

    return {
      success: true,
      message: `Applied late fees to ${feesApplied} bills`,
      fees_applied: feesApplied,
      settings: { percentage, grace_days, max_fee }
    };
  } catch (error) {
    console.error('Late fee calculation error:', error);
    throw error;
  }
};

/**
 * Get current late fee settings
 */
export const getLateFeeSettings = async () => {
  const result = await query(`SELECT * FROM late_fee_settings LIMIT 1`);
  return result.rows[0] || { percentage: 2, grace_days: 15, max_fee: 500, enabled: false };
};

/**
 * Update late fee settings
 */
export const updateLateFeeSettings = async (updates, userId) => {
  await query(`
    UPDATE late_fee_settings SET
      percentage = COALESCE($1, percentage),
      grace_days = COALESCE($2, grace_days),
      max_fee = COALESCE($3, max_fee),
      enabled = COALESCE($4, enabled),
      updated_by = $5,
      updated_at = CURRENT_TIMESTAMP
  `, [updates.percentage, updates.grace_days, updates.max_fee, updates.enabled, userId]);
  return getLateFeeSettings();
};