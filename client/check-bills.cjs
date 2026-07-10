const { query } = require('./backend/config/database.js');

async function checkBills() {
  try {
    const result = await query(`
      SELECT bill_id, flat_no, amount, status, month, year, paid_at 
      FROM maintenance_bills 
      WHERE flat_no LIKE 'C%'
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log('Bills for C-wing:', JSON.stringify(result.rows, null, 2));
    
    // Also check the total paid
    const paidResult = await query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
      FROM maintenance_bills 
      WHERE status = 'Paid'
    `);
    console.log('\nPaid bills:', paidResult.rows[0]);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkBills();
