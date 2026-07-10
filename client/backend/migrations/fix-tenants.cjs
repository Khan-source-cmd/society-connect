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
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(15),
      ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS rent_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS id_proof_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS id_proof_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);
  console.log('✅ tenants table fixed');
  await pool.end();
}
fix().catch(console.error);