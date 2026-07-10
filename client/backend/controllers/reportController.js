import { query } from '../config/database.js';

export const getCollectionReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const filterYear = year || new Date().getFullYear();
    
    // Monthly collection data
    const report = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', COALESCE(paid_at, created_at)), 'Mon YYYY') as month,
        DATE_TRUNC('month', COALESCE(paid_at, created_at)) as month_date,
        COUNT(*) FILTER (WHERE status = 'Paid') as paid_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'Paid'), 0) as collected_amount,
        COUNT(*) FILTER (WHERE status != 'Paid' AND status != 'generated') as pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status != 'Paid' AND status != 'generated'), 0) as pending_amount,
        COUNT(*) as total_bills,
        COALESCE(SUM(amount), 0) as total_amount
      FROM maintenance_bills
      WHERE EXTRACT(YEAR FROM COALESCE(paid_at, created_at)) = $1
        ${month ? `AND EXTRACT(MONTH FROM COALESCE(paid_at, created_at)) = $2` : ''}
      GROUP BY month_date
      ORDER BY month_date
    `, month ? [filterYear, parseInt(month)] : [filterYear]);

    res.json({ success: true, data: report.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getDefaulterReport = async (req, res) => {
  try {
    const defaulters = await query(`
      SELECT 
        f.wing || '-' || f.flat_number as flat,
        f.owner_name,
        f.owner_phone,
        COUNT(*) FILTER (WHERE mb.status = 'Unpaid') as unpaid_count,
        COALESCE(SUM(mb.amount) FILTER (WHERE mb.status = 'Unpaid'), 0) as total_due,
        COALESCE(SUM(mb.late_fee) FILTER (WHERE mb.status = 'Unpaid'), 0) as total_late_fee,
        MAX(mb.billing_month) as oldest_pending_month
      FROM maintenance_bills mb
      JOIN flats f ON f.flat_number = SPLIT_PART(mb.flat_no, '-', 2)
      WHERE mb.status IN ('Unpaid', 'Pending Verification')
      GROUP BY f.id, f.wing, f.flat_number, f.owner_name, f.owner_phone
      ORDER BY total_due DESC
    `);
    
    res.json({ success: true, data: defaulters.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getSummaryReport = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    
    const totalFlats = await query('SELECT COUNT(*) FROM flats');
    const occupiedFlats = await query("SELECT COUNT(*) FROM flats WHERE is_occupied = true");
    
    const totalBilled = await query(
      'SELECT COALESCE(SUM(amount),0) as total FROM maintenance_bills WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const totalCollected = await query(
      "SELECT COALESCE(SUM(amount),0) as total FROM maintenance_bills WHERE status = 'Paid' AND EXTRACT(YEAR FROM paid_at) = $1", [year]
    );
    const totalLateFee = await query(
      "SELECT COALESCE(SUM(late_fee),0) as total FROM maintenance_bills WHERE status = 'Paid' AND EXTRACT(YEAR FROM paid_at) = $1", [year]
    );
    
    res.json({
      success: true,
      data: {
        total_flats: parseInt(totalFlats.rows[0].count),
        occupied_flats: parseInt(occupiedFlats.rows[0].count),
        total_billed: parseFloat(totalBilled.rows[0].total),
        total_collected: parseFloat(totalCollected.rows[0].total),
        total_late_fee: parseFloat(totalLateFee.rows[0].total),
        collection_rate: parseFloat(totalBilled.rows[0].total) > 0 
          ? Math.round((parseFloat(totalCollected.rows[0].total) / parseFloat(totalBilled.rows[0].total)) * 100) 
          : 0
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getFlatWiseReport = async (req, res) => {
  try {
    const report = await query(`
      SELECT 
        f.wing || '-' || f.flat_number as flat,
        f.owner_name,
        COUNT(mb.id) as total_bills,
        COALESCE(SUM(mb.amount), 0) as total_billed,
        COALESCE(SUM(mb.amount) FILTER (WHERE mb.status = 'Paid'), 0) as total_paid,
        COALESCE(SUM(mb.amount) FILTER (WHERE mb.status NOT IN ('Paid', 'generated')), 0) as outstanding,
        COALESCE(SUM(mb.late_fee), 0) as late_fees
      FROM flats f
      LEFT JOIN maintenance_bills mb ON mb.flat_id = f.id
      GROUP BY f.id, f.wing, f.flat_number, f.owner_name
      ORDER BY f.wing, f.flat_number
    `);
    
    res.json({ success: true, data: report.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};