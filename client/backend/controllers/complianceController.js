import { generatePaymentDefaultNotices, getComplianceNotices } from '../services/complianceService.js';
import { query } from '../config/database.js';

export const runComplianceNotices = async (req, res) => {
  try {
    const result = await generatePaymentDefaultNotices();
    res.json({ success: true, data: result, message: `Generated ${result.notices_generated} notices` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getNotices = async (req, res) => {
  try {
    const notices = await getComplianceNotices(req.query);
    res.json({ success: true, data: notices });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getDefaulters = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        mb.flat_no,
        SUM(mb.amount) as total_outstanding,
        COUNT(*) as bill_count,
        MIN(mb.due_date) as oldest_due,
        EXTRACT(DAY FROM NOW() - MIN(mb.due_date))::INTEGER as days_overdue
      FROM maintenance_bills mb
      WHERE mb.status = 'Unpaid' AND mb.due_date IS NOT NULL AND mb.due_date < NOW()
      GROUP BY mb.flat_no
      ORDER BY total_outstanding DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getDashboardInsights = async (req, res) => {
  try {
    const monthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const [totalRes, paidRes, defaultersRes, complaintsRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount),0) as total FROM maintenance_bills WHERE billing_month ILIKE $1`, [monthStr]),
      query(`SELECT COALESCE(SUM(amount),0) as total FROM maintenance_bills WHERE status='Paid' AND billing_month ILIKE $1`, [monthStr]),
      query(`SELECT flat_no, SUM(amount) as outstanding, MIN(due_date) as since
             FROM maintenance_bills WHERE status='Unpaid' AND due_date < NOW()
             GROUP BY flat_no ORDER BY outstanding DESC LIMIT 5`),
      query(`SELECT status, COUNT(*) as count FROM complaints WHERE status IN ('Pending','In Progress') GROUP BY status`)
    ]);

    const total = parseFloat(totalRes.rows[0].total);
    const paid  = parseFloat(paidRes.rows[0].total);
    const efficiency = total > 0 ? Math.round((paid / total) * 100) : 100;

    const suggestions = [];
    if (efficiency < 70) suggestions.push('⚠️ Collection below 70% — send reminders now');
    if (defaultersRes.rows.length >= 3) suggestions.push('⚖️ Multiple defaulters — consider Level 2 notices');
    const pendingComplaints = complaintsRes.rows.find(r => r.status === 'Pending');
    if (pendingComplaints && parseInt(pendingComplaints.count) > 5)
      suggestions.push('📞 5+ complaints pending — review open items');

    res.json({
      success: true,
      data: {
        collection_efficiency: efficiency,
        outstanding_amount: total - paid,
        top_defaulters: defaultersRes.rows,
        complaint_aging: complaintsRes.rows,
        suggestions
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};