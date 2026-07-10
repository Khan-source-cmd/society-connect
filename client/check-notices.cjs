const { Pool } = require('pg');
const pool = new Pool({ 
  user: 'postgres', 
  host: 'localhost', 
  database: 'society_connect', 
  password: 'root', 
  port: 5432 
});

async function checkNotices() {
  try {
    // Check if notices table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notices'
    `);
    
    console.log('Notices table exists:', tableCheck.rows.length > 0);
    
    if (tableCheck.rows.length > 0) {
      // Get columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'notices' 
        ORDER BY ordinal_position
      `);
      console.log('Columns:', columns.rows);
      
      // Get data
      const data = await pool.query('SELECT * FROM notices');
      console.log('Data count:', data.rows.length);
      console.log('Data:', data.rows);
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    pool.end();
  }
}

checkNotices();
