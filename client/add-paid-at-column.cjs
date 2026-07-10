const { query } = require('./backend/config/database.js');

async function addPaidAtColumn() {
  try {
    // Add the column if it doesn't exist
    await query('ALTER TABLE maintenance_bills ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP');
    console.log('✅ Added paid_at column to maintenance_bills table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addPaidAtColumn();
