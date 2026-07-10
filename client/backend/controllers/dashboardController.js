import { query, get } from '../config/database.js';

/**
 * Dashboard Controller
 * Provides data for different user dashboards (Admin, Resident, Security)
 */

/**
 * Get Admin Dashboard Data
 * Returns comprehensive statistics and charts data for admin users
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Get total residents count (verified users with role='resident')
    const residentsCountQuery = "SELECT COUNT(*) as count FROM users WHERE role = 'resident' AND email_verified = true";
    const residentsResult = await query(residentsCountQuery);
    const totalResidents = parseInt(residentsResult.rows[0].count);

    // Get previous month residents count for % change calculation
    const prevMonthQuery = "SELECT COUNT(*) as count FROM users WHERE role = 'resident' AND email_verified = true AND created_at < DATE_TRUNC('month', CURRENT_DATE) AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'";
    const prevMonthResult = await query(prevMonthQuery);
    const prevMonthResidents = parseInt(prevMonthResult.rows[0].count);
    
    // Calculate % change
    const residentsChange = prevMonthResidents > 0 ? Math.round(((totalResidents - prevMonthResidents) / prevMonthResidents) * 100) : 0;

    // Get total collection amount
    const collectionQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE status = 'Paid'`;
    const collectionResult = await query(collectionQuery);
    const totalCollection = parseFloat(collectionResult.rows[0].total || 0);

    // Get pending bills count
    const pendingBillsQuery = `SELECT COUNT(*) as count FROM maintenance_bills WHERE status = 'Unpaid'`;
    const pendingBillsResult = await query(pendingBillsQuery);
    const pendingBills = parseInt(pendingBillsResult.rows[0].count);

    // Get complaints count - use lowercase status
    const complaintsQuery = `SELECT COUNT(*) as count FROM complaints WHERE LOWER(status) = 'pending'`;
    const complaintsResult = await query(complaintsQuery);
    const pendingComplaints = parseInt(complaintsResult.rows[0].count);

    // Get maintenance collection trend data (last 12 months)
    const trendQuery = `SELECT 
           TO_CHAR(created_at, 'Mon') as month,
           COALESCE(SUM(amount), 0) as collection
         FROM maintenance_bills 
         WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)
         GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
         ORDER BY EXTRACT(MONTH FROM created_at)`;

    const trendResult = await query(trendQuery);
    const maintenanceData = trendResult.rows;

    // Get latest notice - use notice_id
    const noticeQuery = `SELECT notice_id as id, title, content, created_at FROM notices ORDER BY created_at DESC LIMIT 1`;
    const noticeResult = await query(noticeQuery);
    const latestNotice = noticeResult.rows[0] || null;

    // Get collection target percentage
    const targetQuery = 'SELECT COALESCE(SUM(amount), 0) as target FROM maintenance_bills WHERE status = \'Unpaid\'';
    const targetResult = await query(targetQuery);
    const pendingAmount = parseFloat(targetResult.rows[0].target || 0);
    const collectionTarget = pendingAmount > 0 ? Math.round((totalCollection / (totalCollection + pendingAmount)) * 100) : 100;

    // Get days until bills are due - use created_at + 30 days as due date
    const dueDateQuery = `SELECT MIN(created_at + INTERVAL '30 days') as nearest_due FROM maintenance_bills WHERE status = 'Unpaid'`;
    const dueDateResult = await query(dueDateQuery);
    let pendingBillsDueDays = null;
    if (dueDateResult.rows[0]?.nearest_due) {
      const nearestDue = new Date(dueDateResult.rows[0].nearest_due);
      const today = new Date();
      pendingBillsDueDays = Math.ceil((nearestDue - today) / (1000 * 60 * 60 * 24));
      if (pendingBillsDueDays < 0) pendingBillsDueDays = 0;
    }

    // Check if there are complaints needing immediate attention (older than 7 days)
    const urgentComplaintsQuery = `SELECT COUNT(*) as count FROM complaints WHERE LOWER(status) = 'pending' AND created_at < NOW() - INTERVAL '7 days'`;
    const urgentResult = await query(urgentComplaintsQuery);
    const urgentComplaintsCount = parseInt(urgentResult.rows[0].count);
    const complaintsNeedAttention = urgentComplaintsCount > 0 || pendingComplaints > 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalResidents,
          totalCollection,
          pendingBills,
          pendingComplaints,
          residentsChange,
          collectionTarget,
          pendingBillsDueDays,
          complaintsNeedAttention
        },
        maintenanceTrend: maintenanceData,
        latestNotice: latestNotice
      },
      message: "Admin dashboard data retrieved successfully"
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve admin dashboard data"
    });
  }
};

/**
 * Get Resident Dashboard Data
 * Returns personal information and tasks for resident users
 */
const getResidentDashboard = async (req, res) => {
  try {
    // Use req.user which is already set by authentication middleware
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User profile not found"
      });
    }

    // Get user's flat number and wing from the user object
    // Note: user comes from auth middleware which queries user_id from database
    const userWing = user.wing || '';
    const userFlat = user.flatNumber || user.flat_number || '';
    const userFlatNo = userWing && userFlat ? `${userWing}-${userFlat}` : (userFlat || '');

    // Get user's ID - the database returns user_id, so use that
    const userId = user.user_id || user.userId || user.id;

    console.log('Resident dashboard - User info:', { userWing, userFlat, userFlatNo, userId, user });

    // Get unpaid dues for this resident's flat
    let pendingDues = 0;
    let totalPaid = 0;
    let paymentHistory = [];
    if (userFlatNo) {
      const duesQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE flat_no = $1 AND status = 'Unpaid'`;
      const duesResult = await query(duesQuery, [userFlatNo]);
      pendingDues = parseFloat(duesResult.rows[0].total || 0);

      const paidQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_bills WHERE flat_no = $1 AND status = 'Paid'`;
      const paidResult = await query(paidQuery, [userFlatNo]);
      totalPaid = parseFloat(paidResult.rows[0].total || 0);

      // Get actual payment history for the chart (include both Paid and Pending Verification)
      const historyQuery = `
        SELECT id, amount, status, billing_month, created_at, paid_at 
        FROM maintenance_bills 
        WHERE flat_no = $1 AND (status = 'Paid' OR status = 'Pending Verification')
        ORDER BY paid_at DESC
        LIMIT 12
      `;
      const historyResult = await query(historyQuery, [userFlatNo]);
      paymentHistory = historyResult.rows.map(bill => ({
        id: bill.id,
        amount: parseFloat(bill.amount),
        status: bill.status,
        month: bill.billing_month,
        createdAt: bill.created_at,
        paidAt: bill.paid_at
      }));

      console.log('Payment history for', userFlatNo, ':', paymentHistory);
    }

    // Get active complaints for this resident
    let activeComplaints = 0;
    if (userId) {
      console.log('Fetching complaints for user_id:', userId);
      const complaintsQuery = `SELECT COUNT(*) as count FROM complaints WHERE user_id = $1 AND LOWER(status) != 'resolved'`;
      const complaintsResult = await query(complaintsQuery, [userId]);
      activeComplaints = parseInt(complaintsResult.rows[0].count || 0);
      console.log('Active complaints:', activeComplaints);
    }

    // Get latest notice - use notice_id
    const noticeQuery = `SELECT notice_id as id, title, content, created_at FROM notices ORDER BY created_at DESC LIMIT 1`;
    const noticeResult = await query(noticeQuery);
    const latestNotice = noticeResult.rows[0] || null;
    console.log('Latest notice:', latestNotice);

    res.json({
      success: true,
      data: {
        userInfo: {
          user_id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        tasks: {
          pendingDues,
          totalPaid,
          activeComplaints
        },
        flatInfo: {
          flatNumber: userFlat,
          wing: userWing,
          fullFlatNo: userFlatNo
        },
        latestNotice,
        paymentHistory
      },
      message: "Resident dashboard data retrieved successfully"
    });

  } catch (error) {
    console.error('Resident dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve resident dashboard data"
    });
  }
};

/**
 * Get Security Dashboard Data
 * Returns security-specific information and logs
 */
const getSecurityDashboard = async (req, res) => {
  try {
    // Get today's expected visitors count
    const expectedVisitorsQuery = `SELECT COUNT(*) as count 
         FROM security_logs 
         WHERE DATE(entry_time) = CURRENT_DATE`;
    
    const expectedResult = await query(expectedVisitorsQuery);
    const expectedVisitors = parseInt(expectedResult.rows[0].count);

    // Get unchecked out guests
    const uncheckedQuery = `SELECT COUNT(*) as count 
         FROM security_logs 
         WHERE status = 'inside' AND exit_time IS NULL`;
    
    const uncheckedResult = await query(uncheckedQuery);
    const uncheckedGuests = parseInt(uncheckedResult.rows[0].count);

    // Get visitor activity data (last 6 hours)
    const activityQuery = `SELECT 
           DATE_TRUNC('hour', entry_time) as time,
           COUNT(*) as count
         FROM security_logs 
         WHERE entry_time >= NOW() - INTERVAL '6 hours'
         GROUP BY DATE_TRUNC('hour', entry_time)
         ORDER BY time`;

    const activityResult = await query(activityQuery);
    const visitorActivity = activityResult.rows;

    res.json({
      success: true,
      data: {
        gateLogs: {
          todaysExpectedVisitors: expectedVisitors,
          uncheckedOutGuests: uncheckedGuests
        },
        systemStatus: {
          cctvStatus: "All Active",
          gateSystem: "Operational"
        },
        visitorActivity: visitorActivity
      },
      message: "Security dashboard data retrieved successfully"
    });

  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve security dashboard data"
    });
  }
};

export { 
  getAdminDashboard, 
  getResidentDashboard, 
  getSecurityDashboard 
};
