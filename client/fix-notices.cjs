const { Pool } = require('pg');
const pool = new Pool({ 
  user: 'postgres', 
  host: 'localhost', 
  database: 'society_connect', 
  password: 'root', 
  port: 5432 
});

async function fixNoticesTable() {
  try {
    // Add missing columns to notices table
    await pool.query(`
      ALTER TABLE notices 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS author VARCHAR(100),
      ADD COLUMN IF NOT EXISTS author_id INTEGER
    `);
    
    console.log('✅ Added missing columns to notices table');
    
    // Verify
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notices' 
      ORDER BY ordinal_position
    `);
    console.log('Columns:', columns.rows.map(c => c.column_name));
    
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    pool.end();
  }
}

fixNoticesTable();
