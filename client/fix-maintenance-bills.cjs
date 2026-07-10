const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'society_connect',
  password: 'root',
  port: 5432
});

async function fix() {
  console.log('Dropping old maintenance_bills table...');
  await pool.query('DROP TABLE IF EXISTS bill_breakdowns CASCADE');
  await pool.query('DROP TABLE IF EXISTS payment_records CASCADE');
  await pool.query('DROP TABLE IF EXISTS maintenance_bills CASCADE');
  
  console.log('Creating new maintenance_bills with all columns...');
  await pool.query(`
    CREATE TABLE maintenance_bills (
      id            SERIAL PRIMARY KEY,
      flat_no       VARCHAR(20) NOT NULL,
      amount        DECIMAL(10,2) NOT NULL,
      billing_month VARCHAR(20) NOT NULL,
      due_date      DATE,
      status        VARCHAR(30) DEFAULT 'Unpaid',
      transaction_id VARCHAR(100),
      paid_at       TIMESTAMP,
      generated_by  TEXT,
      approved_by   TEXT,
      flat_id       INTEGER,
      resident_id   INTEGER,
      bill_status   VARCHAR(20) DEFAULT 'generated',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(flat_no, billing_month)
    )
  `);
  
  console.log('Recreating payment_records...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_records (
      payment_id                SERIAL PRIMARY KEY,
      bill_id                   INTEGER REFERENCES maintenance_bills(id),
      amount                    DECIMAL(10,2),
      payment_method            VARCHAR(30),
      gateway_name              VARCHAR(30),
      transaction_id            VARCHAR(100),
      upi_reference             VARCHAR(100),
      payment_timestamp         TIMESTAMP,
      status                    VARCHAR(20) DEFAULT 'pending',
      receipt_url               TEXT,
      auto_notification_sent    BOOLEAN DEFAULT false,
      bank_reconciliation_status VARCHAR(20) DEFAULT 'pending',
      created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Recreating bill_breakdowns...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bill_breakdowns (
      breakdown_id      SERIAL PRIMARY KEY,
      bill_id           INTEGER REFERENCES maintenance_bills(id) ON DELETE CASCADE,
      item_name         TEXT,
      amount            DECIMAL(10,2),
      basis             TEXT,
      approval_reference TEXT,
      unit_rate         DECIMAL(10,2),
      quantity          DECIMAL(10,2),
      unit              VARCHAR(20)
    )
  `);
  
  console.log('✅ Done - maintenance_bills table has due_date column now');
  await pool.end();
}

fix().catch(e => { console.error('ERROR:', e.message); process.exit(1); });