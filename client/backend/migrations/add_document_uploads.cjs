const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../../.env' });
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'society_connect',
  password: process.env.DB_PASSWORD || 'root',
  port: parseInt(process.env.DB_PORT) || 5432
});

async function migrate() {
  console.log('Creating document_uploads table...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_uploads (
      document_id       SERIAL PRIMARY KEY,
      entity_type       VARCHAR(50) NOT NULL,
      entity_id         INTEGER NOT NULL,
      document_type     VARCHAR(50) NOT NULL,
      file_url          TEXT NOT NULL,
      file_name         VARCHAR(255),
      file_size         INTEGER,
      mime_type         VARCHAR(50),
      uploaded_by       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      verification_status VARCHAR(20) DEFAULT 'pending',
      verified_by       INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      verified_date     TIMESTAMP,
      rejection_reason  TEXT,
      description       TEXT,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add verification-related columns to flats table
  console.log('Adding verification columns to flats...');
  await pool.query(`
    ALTER TABLE flats
      ADD COLUMN IF NOT EXISTS ownership_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(user_id),
      ADD COLUMN IF NOT EXISTS verified_date TIMESTAMP
  `);
  
  // Add verification columns to ownership_transfers
  console.log('Adding verification columns to ownership_transfers...');
  await pool.query(`
    ALTER TABLE ownership_transfers
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(user_id),
      ADD COLUMN IF NOT EXISTS verified_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
  `);
  
  // Add verification columns to tenants
  console.log('Adding verification columns to tenants...');
  await pool.query(`
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(user_id),
      ADD COLUMN IF NOT EXISTS verified_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
  `);

  console.log('✅ Document verification migration complete');
  await pool.end();
}

migrate().catch(e => { console.error('Migration error:', e.message); process.exit(1); });