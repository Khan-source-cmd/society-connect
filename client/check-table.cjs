const { query } = require('./backend/config/database.js');

async function checkTable() {
  try {
    // Get table structure
    const cols = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'maintenance_bills'
    `);
    console.log('Table columns:', cols.rows.map(c => c.column_name));
    
    // Get bills
    const bills = await query(`
      SELECT * FROM maintenance_bills 
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log('\nSample bills:', JSON.stringify(bills.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTable();
