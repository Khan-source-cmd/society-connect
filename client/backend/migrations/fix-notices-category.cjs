const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'society_connect',
  password: process.env.DB_PASSWORD || 'root',
  port: parseInt(process.env.DB_PORT) || 5432
});
async function fix() {
  await pool.query(`
    ALTER TABLE notices
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS author VARCHAR(100),
      ADD COLUMN IF NOT EXISTS author_id INTEGER,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  console.log('✅ notices table fixed');
  await pool.end();
}
fix().catch(console.error);