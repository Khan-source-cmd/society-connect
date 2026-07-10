import { query, run } from '../config/database.js';
import { sendMaintenanceDueReminder } from './emailService.cjs';
import { sendWhatsAppMessage } from './whatsappService.cjs';

/**
 * Generate payment default notices automatically
 * Runs daily as cron job
 */
export const generatePaymentDefaultNotices = async () => {
  try {
    let totalNotices = 0;

    // Level 1: 7 days overdue - Friendly reminder
    const sevenDayOverdue = await query(`
      SELECT mb.*, f.owner_name, f.owner_email, f.owner_phone, f.flat_number
      FROM maintenance_bills mb
      JOIN flats f ON mb.flat_no = CONCAT(f.wing, '-', f.flat_number)
      WHERE mb.status = 'Unpaid'
        AND mb.due_date <= CURRENT_DATE - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM compliance_notices
          WHERE flat_number = f.flat_number
            AND notice_type = 'payment_default'
            AND severity_level = 1
            AND DATE(generated_date) = CURRENT_DATE
        )
    `);

    for (const bill of sevenDayOverdue.rows) {
      await createNotice({
        type: 'payment_default',
        severity: 1,
        bill,
        template: 'PAYMENT_DUE_REMINDER_LEVEL_1'
      });
      totalNotices++;
    }

    // Level 2: 30 days overdue - Official notice
    const thirtyDayOverdue = await query(`
      SELECT mb.*, f.owner_name, f.owner_email, f.owner_phone, f.flat_number
      FROM maintenance_bills mb
      JOIN flats f ON mb.flat_no = CONCAT(f.wing, '-', f.flat_number)
      WHERE mb.status = 'Unpaid'
        AND mb.due_date <= CURRENT_DATE - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM compliance_notices
          WHERE flat_number = f.flat_number
            AND notice_type = 'payment_default'
            AND severity_level = 2
            AND DATE(generated_date) = CURRENT_DATE
        )
    `);

    for (const bill of thirtyDayOverdue.rows) {
      await createNotice({
        type: 'payment_default',
        severity: 2,
        bill,
        template: 'PAYMENT_DUE_REMINDER_LEVEL_2'
      });
      totalNotices++;
    }

    // Level 3: 60 days overdue - Legal notice
    const sixtyDayOverdue = await query(`
      SELECT mb.*, f.owner_name, f.owner_email, f.owner_phone, f.flat_number
      FROM maintenance_bills mb
      JOIN flats f ON mb.flat_no = CONCAT(f.wing, '-', f.flat_number)
      WHERE mb.status = 'Unpaid'
        AND mb.due_date <= CURRENT_DATE - INTERVAL '60 days'
        AND NOT EXISTS (
          SELECT 1 FROM compliance_notices
          WHERE flat_number = f.flat_number
            AND notice_type = 'payment_default'
            AND severity_level = 3
            AND DATE(generated_date) = CURRENT_DATE
        )
    `);

    for (const bill of sixtyDayOverdue.rows) {
      await createNotice({
        type: 'payment_default',
        severity: 3,
        bill,
        template: 'PAYMENT_DUE_REMINDER_LEVEL_3'
      });
      totalNotices++;
    }

    return {
      success: true,
      notices_generated: totalNotices,
      level1: sevenDayOverdue.rows.length,
      level2: thirtyDayOverdue.rows.length,
      level3: sixtyDayOverdue.rows.length
    };

  } catch (error) {
    console.error('Error generating compliance notices:', error);
    throw error;
  }
};

/**
 * Create and send compliance notice
 * @param {Object} noticeData Notice details
 * @returns {Object} Created notice
 */
async function createNotice(noticeData) {
  const { type, severity, bill, template } = noticeData;

  // Generate notice content
  const content = generateNoticeContent(template, bill);

  // Insert notice record
  const noticeResult = await run(`
    INSERT INTO compliance_notices (
      resident_id, flat_number, notice_type, trigger_description,
      severity_level, content, next_escalation_date, legal_reference
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING notice_id
  `, [
    bill.resident_id,
    bill.flat_number,
    type,
    `Maintenance bill ${bill.id} overdue`,
    severity,
    content,
    new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
    'Society Bylaws Section 4.2.1'
  ]);

  const noticeId = noticeResult.rows[0].notice_id;

  // Send via all available channels
  const deliveryStatus = await sendNotice(bill, content, severity);

  // Update delivery status
  await run(`
    UPDATE compliance_notices
    SET delivery_status = $1
    WHERE notice_id = $2
  `, [JSON.stringify(deliveryStatus), noticeId]);

  // Log delivery
  for (const [method, status] of Object.entries(deliveryStatus)) {
    await run(`
      INSERT INTO notice_delivery_log (
        notice_id, method, sent_timestamp, status, metadata
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
    `, [
      noticeId,
      method,
      status.sent ? 'delivered' : 'failed',
      JSON.stringify(status)
    ]);
  }

  return noticeId;
}

/**
 * Generate notice content based on template
 */
function generateNoticeContent(template, bill) {
  const templates = {
    PAYMENT_DUE_REMINDER_LEVEL_1: `
Dear ${bill.owner_name},

This is a friendly reminder that your maintenance bill for flat ${bill.flat_number} is now 7 days overdue.

Bill Details:
- Amount: ₹${bill.amount}
- Due Date: ${new Date(bill.due_date).toLocaleDateString()}

Please pay at your earliest convenience using the SocietyConnect app.

If you have already paid, please disregard this message.

Best regards,
SocietyConnect Committee
    `,

    PAYMENT_DUE_REMINDER_LEVEL_2: `
Dear ${bill.owner_name},

OFFICIAL NOTICE: Your maintenance payment for flat ${bill.flat_number} is now 30 days overdue.

Bill Details:
- Amount: ₹${bill.amount}
- Due Date: ${new Date(bill.due_date).toLocaleDateString()}
- Days Overdue: 30

Please make payment immediately to avoid further action. Late fees will be applied as per society bylaws.

If you have any questions, please contact the society secretary.

Regards,
SocietyConnect Committee
    `,

    PAYMENT_DUE_REMINDER_LEVEL_3: `
LEGAL NOTICE

Dear ${bill.owner_name},

NOTICE OF DEFAULT: Your maintenance payment for flat ${bill.flat_number} is now 60 days overdue.

This is a formal notice under Section 4.2.1 of the Society Bylaws. Immediate payment is required.

Outstanding Amount: ₹${bill.amount}
Due Date: ${new Date(bill.due_date).toLocaleDateString()}

Failure to make payment within 7 days will result in:
1. Additional late payment penalty of 2% per month
2. Restriction on society facilities
3. Initiation of legal recovery proceedings

Please contact the society treasurer immediately to resolve this matter.

For SocietyConnect Committee
Secretary
    `
  };

  return templates[template] || templates.PAYMENT_DUE_REMINDER_LEVEL_1;
}

/**
 * Send notice via all communication channels
 */
async function sendNotice(recipient, content, severity) {
  const deliveryStatus = {};

  // Send Email
  try {
    await sendMaintenanceDueReminder(
      recipient.owner_email,
      recipient.owner_name,
      recipient.flat_number,
      recipient.amount,
      new Date(recipient.due_date).toLocaleDateString()
    );
    deliveryStatus.email = { sent: true, timestamp: new Date() };
  } catch (e) {
    deliveryStatus.email = { sent: false, error: e.message };
  }

  // Send WhatsApp
  try {
    if (recipient.owner_phone) {
      const phone = recipient.owner_phone.toString().replace(/\D/g, '');
      if (phone.length >= 10) {
        await sendWhatsAppMessage(phone, content);
        deliveryStatus.whatsapp = { sent: true, timestamp: new Date() };
      }
    }
  } catch (e) {
    deliveryStatus.whatsapp = { sent: false, error: e.message };
  }

  // Mark physical notice for delivery
  deliveryStatus.physical = {
    status: 'pending_delivery',
    instructions: `Print and deliver to flat ${recipient.flat_number}`
  };

  return deliveryStatus;
}

/**
 * Get all compliance notices
 */
export const getComplianceNotices = async (filters = {}) => {
  let queryStr = `SELECT * FROM compliance_notices WHERE 1=1`;
  const params = [];

  if (filters.flat_number) {
    params.push(filters.flat_number);
    queryStr += ` AND flat_number = $${params.length}`;
  }

  if (filters.severity_level) {
    params.push(filters.severity_level);
    queryStr += ` AND severity_level = $${params.length}`;
  }

  queryStr += ` ORDER BY generated_date DESC`;

  const result = await query(queryStr, params);
  return result.rows;
};