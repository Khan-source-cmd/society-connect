import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection configuration - Use database name from .env
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'society_connect',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
});

// Test PostgreSQL connection
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to PostgreSQL database');
    await createTables();
  }
});

// Create all tables if they don't exist
async function createTables() {
  try {
    // Check for a newer table — if missing, recreate all
    const result = await pool.query("SELECT to_regclass('public.compliance_notices')");
    if (result.rows[0].to_regclass === null) {
      console.log('Creating/updating PostgreSQL tables...');
      await createAllTables();
    } else {
      console.log('PostgreSQL tables already exist');
    }
  } catch (err) {
    console.error('Error checking/creating tables:', err.message);
  }
}

async function createAllTables() {

  // ── USERS ──────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id       SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      email         VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(20) NOT NULL,
      name          VARCHAR(100),
      phone         VARCHAR(15),
      flat_number   VARCHAR(10),
      wing          VARCHAR(10),
      flat_id       INTEGER,
      email_verified BOOLEAN DEFAULT false,
      otp           VARCHAR(6),
      otp_expiry    TIMESTAMP,
      vehicle_pass_count INTEGER DEFAULT 0,
      status        VARCHAR(20) DEFAULT 'active',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── FLATS ──────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS flats (
      id               SERIAL PRIMARY KEY,
      flat_number      VARCHAR(10) NOT NULL,
      wing             VARCHAR(10) NOT NULL,
      floor            INTEGER DEFAULT 1,
      flat_type        VARCHAR(20) NOT NULL,
      carpet_area      DECIMAL(10,2),
      built_up_area    DECIMAL(10,2),
      area_sqft        DECIMAL(10,2),
      balcony_type     VARCHAR(20) DEFAULT 'Standard',
      parking_slot     VARCHAR(20),
      owner_name       VARCHAR(100),
      owner_phone      VARCHAR(15),
      owner_email      VARCHAR(100),
      ownership_status VARCHAR(20) DEFAULT 'Owned',
      is_occupied      BOOLEAN DEFAULT false,
      vehicle_number   VARCHAR(20),
      vehicle_type     VARCHAR(20),
      vehicle_model    VARCHAR(50),
      vehicle_color    VARCHAR(20),
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(flat_number, wing)
    )
  `);

  // ── MAINTENANCE RATES ──────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_rates (
      id         SERIAL PRIMARY KEY,
      flat_type  VARCHAR(20) UNIQUE NOT NULL,
      rate       DECIMAL(10,2) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── MAINTENANCE BILLS ──────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_bills (
      id            SERIAL PRIMARY KEY,
      flat_no       VARCHAR(20) NOT NULL,
      amount        DECIMAL(10,2) NOT NULL,
      billing_month VARCHAR(20) NOT NULL,
      due_date      DATE,
      status        VARCHAR(30) DEFAULT 'Unpaid'
                    CHECK (status IN ('Unpaid','Pending Verification','Paid','generated')),
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

  // ── BILL BREAKDOWNS ────────────────────────────────────────────────────────
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

  // ── COMPLAINTS ─────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      subject     VARCHAR(200),
      category    VARCHAR(50) DEFAULT 'Others',
      description TEXT,
      urgency     VARCHAR(20) DEFAULT 'Medium',
      flat_number VARCHAR(10),
      wing        VARCHAR(10),
      status      VARCHAR(30) DEFAULT 'Pending',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── COMPLAINT ATTACHMENTS ──────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS complaint_attachments (
      attachment_id   SERIAL PRIMARY KEY,
      complaint_id    INTEGER,
      file_url        TEXT NOT NULL,
      file_type       VARCHAR(20),
      uploaded_by     TEXT,
      description     TEXT,
      gps_latitude    DECIMAL(10,7),
      gps_longitude   DECIMAL(10,7),
      timestamp_taken TIMESTAMP,
      uploaded_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── NOTICES ────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notices (
      notice_id  SERIAL PRIMARY KEY,
      title      VARCHAR(200) NOT NULL,
      content    TEXT,
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── SECURITY LOGS ──────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_logs (
      log_id         SERIAL PRIMARY KEY,
      visitor_name   VARCHAR(100),
      flat_number    VARCHAR(10),
      purpose        VARCHAR(200),
      phone          VARCHAR(15),
      pre_approved   BOOLEAN DEFAULT false,
      pass_id        INTEGER,
      scanned_by     TEXT,
      entry_photo_url TEXT,
      exit_photo_url  TEXT,
      entry_time     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      exit_time      TIMESTAMP,
      status         VARCHAR(20) DEFAULT 'inside'
    )
  `);

  // ── TENANTS ────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id             SERIAL PRIMARY KEY,
      flat_id        INTEGER REFERENCES flats(id),
      tenant_name    VARCHAR(100) NOT NULL,
      tenant_phone   VARCHAR(15),
      tenant_email   VARCHAR(100),
      lease_start    DATE,
      lease_end      DATE,
      monthly_rent   DECIMAL(10,2),
      deposit_amount DECIMAL(10,2),
      status         VARCHAR(20) DEFAULT 'Active',
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── OWNERSHIP TRANSFERS ────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ownership_transfers (
      id               SERIAL PRIMARY KEY,
      flat_id          INTEGER REFERENCES flats(id),
      old_owner_name   VARCHAR(100),
      old_owner_phone  VARCHAR(15),
      old_owner_email  VARCHAR(100),
      new_owner_name   VARCHAR(100) NOT NULL,
      new_owner_phone  VARCHAR(15),
      new_owner_email  VARCHAR(100),
      sale_deed_number VARCHAR(50),
      sale_deed_date   DATE,
      sale_amount      DECIMAL(15,2),
      noc_issued_date  DATE,
      noc_number       VARCHAR(50),
      noc_fee          DECIMAL(10,2),
      transfer_date    DATE NOT NULL,
      transfer_reason  VARCHAR(50) DEFAULT 'Sale',
      id_proof_type    VARCHAR(50),
      id_proof_number  VARCHAR(50),
      status           VARCHAR(20) DEFAULT 'Completed',
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── SOCIETY SETTINGS ───────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS society_settings (
      id         SERIAL PRIMARY KEY,
      key        VARCHAR(100) UNIQUE NOT NULL,
      value      TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── AUDIT LOG ──────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      log_id          SERIAL PRIMARY KEY,
      entity_type     VARCHAR(50),
      entity_id       TEXT,
      action          VARCHAR(50),
      performed_by    TEXT,
      old_value       TEXT,
      new_value       TEXT,
      ip_address      VARCHAR(50),
      changes_summary TEXT,
      timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── APPROVALS ──────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approvals (
      approval_id    SERIAL PRIMARY KEY,
      reference_type VARCHAR(50),
      reference_id   TEXT,
      description    TEXT,
      amount         DECIMAL(10,2),
      requested_by   TEXT,
      status         VARCHAR(20) DEFAULT 'pending',
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_stages (
      stage_id       SERIAL PRIMARY KEY,
      approval_id    INTEGER REFERENCES approvals(approval_id) ON DELETE CASCADE,
      required_role  VARCHAR(50),
      signed_by      TEXT,
      signed_date    TIMESTAMP,
      signature_hash TEXT,
      signature_base64 TEXT,
      comments       TEXT,
      status         VARCHAR(20) DEFAULT 'pending'
    )
  `);

  // ── WORK ORDERS ────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_orders (
      work_order_id                SERIAL PRIMARY KEY,
      complaint_id                 INTEGER,
      description                  TEXT NOT NULL,
      status                       VARCHAR(30) DEFAULT 'pending',
      assigned_to                  TEXT,
      scheduled_date               DATE,
      actual_start                 TIMESTAMP,
      actual_end                   TIMESTAMP,
      estimated_cost               DECIMAL(10,2),
      actual_cost                  DECIMAL(10,2),
      resident_inspection_status   VARCHAR(20) DEFAULT 'pending',
      resident_inspection_rating   INTEGER,
      resident_inspection_comments TEXT,
      resident_inspection_timestamp TIMESTAMP,
      admin_verification_status    VARCHAR(20) DEFAULT 'pending',
      admin_verified_by            TEXT,
      admin_verified_timestamp     TIMESTAMP,
      created_at                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_order_items (
      item_id        SERIAL PRIMARY KEY,
      work_order_id  INTEGER REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
      description    TEXT,
      quantity       DECIMAL(10,2),
      unit           VARCHAR(20),
      unit_price     DECIMAL(10,2),
      total_price    DECIMAL(10,2)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_order_photos (
      photo_id           SERIAL PRIMARY KEY,
      work_order_id      INTEGER REFERENCES work_orders(work_order_id) ON DELETE CASCADE,
      stage              VARCHAR(20),
      photo_url          TEXT,
      uploaded_by        TEXT,
      description        TEXT,
      uploaded_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── COMPLIANCE ─────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS compliance_notices (
      notice_id             SERIAL PRIMARY KEY,
      resident_id           INTEGER,
      flat_number           VARCHAR(20),
      notice_type           VARCHAR(50),
      trigger_description   TEXT,
      severity_level        INTEGER DEFAULT 1,
      content               TEXT,
      delivery_status       TEXT,
      next_escalation_date  DATE,
      legal_reference       TEXT,
      generated_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notice_delivery_log (
      log_id           SERIAL PRIMARY KEY,
      notice_id        INTEGER REFERENCES compliance_notices(notice_id) ON DELETE CASCADE,
      method           VARCHAR(20),
      sent_timestamp   TIMESTAMP,
      delivered_timestamp TIMESTAMP,
      status           VARCHAR(20),
      metadata         TEXT
    )
  `);

  // ── VENDORS ────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id           SERIAL PRIMARY KEY,
      name                VARCHAR(100) NOT NULL,
      contact_person      VARCHAR(100),
      phone               VARCHAR(15),
      email               VARCHAR(100),
      address             TEXT,
      category            VARCHAR(50),
      verification_status VARCHAR(20) DEFAULT 'unverified',
      verified_by         TEXT,
      verified_date       TIMESTAMP,
      rating              DECIMAL(3,1) DEFAULT 0.0,
      total_jobs          INTEGER DEFAULT 0,
      completed_jobs      INTEGER DEFAULT 0,
      pending_amount      DECIMAL(10,2) DEFAULT 0.0,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_ratings (
      rating_id     SERIAL PRIMARY KEY,
      vendor_id     INTEGER REFERENCES vendors(vendor_id) ON DELETE CASCADE,
      work_order_id INTEGER,
      rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
      comments      TEXT,
      rated_by      TEXT,
      rated_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
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

  // ── VISITOR PASSES ─────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_passes (
      pass_id          SERIAL PRIMARY KEY,
      qr_code          TEXT UNIQUE,
      flat_number      VARCHAR(20),
      flat_owner       VARCHAR(100),
      visitor_name     VARCHAR(100),
      visitor_phone    VARCHAR(15),
      visitor_relation VARCHAR(50),
      approved_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      valid_from       TIMESTAMP,
      valid_until      TIMESTAMP,
      status           VARCHAR(20) DEFAULT 'active',
      purpose          TEXT
    )
  `);

  // ── RESIDENTS (legacy, keep for compatibility) ─────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS residents (
      resident_id SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      flat_number VARCHAR(10),
      wing        VARCHAR(10),
      phone       VARCHAR(15),
      vehicle_pass_count INTEGER DEFAULT 0,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── AMENITIES ──────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS amenities (
      amenity_id   SERIAL PRIMARY KEY,
      name         VARCHAR(100) NOT NULL,
      description  TEXT,
      capacity     INTEGER DEFAULT 1,
      charges      DECIMAL(10,2) DEFAULT 0,
      requires_approval BOOLEAN DEFAULT true,
      available_from TIME DEFAULT '06:00',
      available_to   TIME DEFAULT '22:00',
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── AMENITY BOOKINGS ───────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS amenity_bookings (
      booking_id    SERIAL PRIMARY KEY,
      amenity_id    INTEGER REFERENCES amenities(amenity_id),
      booked_by     INTEGER REFERENCES users(user_id),
      flat_id       INTEGER REFERENCES flats(id),
      booking_date  DATE NOT NULL,
      start_time    TIME NOT NULL,
      end_time      TIME NOT NULL,
      purpose       TEXT,
      status        VARCHAR(20) DEFAULT 'pending',
      approved_by   INTEGER REFERENCES users(user_id),
      approval_date TIMESTAMP,
      rejection_reason TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── LATE FEE SETTINGS ──────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS late_fee_settings (
      id          SERIAL PRIMARY KEY,
      percentage  DECIMAL(5,2) DEFAULT 2.00,
      grace_days  INTEGER DEFAULT 15,
      max_fee     DECIMAL(10,2) DEFAULT 500,
      enabled     BOOLEAN DEFAULT false,
      updated_by  INTEGER REFERENCES users(user_id),
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default amenities if not exist
  await pool.query(`
    INSERT INTO amenities (name, description, capacity, charges, requires_approval)
    SELECT 'Clubhouse', 'Main community hall for events & gatherings', 50, 2000, true
    WHERE NOT EXISTS (SELECT 1 FROM amenities WHERE name = 'Clubhouse')
  `);
  await pool.query(`
    INSERT INTO amenities (name, description, capacity, charges, requires_approval)
    SELECT 'Swimming Pool', 'Community swimming pool', 20, 0, false
    WHERE NOT EXISTS (SELECT 1 FROM amenities WHERE name = 'Swimming Pool')
  `);
  await pool.query(`
    INSERT INTO amenities (name, description, capacity, charges, requires_approval)
    SELECT 'Party Hall', 'Small hall for private parties', 30, 1500, true
    WHERE NOT EXISTS (SELECT 1 FROM amenities WHERE name = 'Party Hall')
  `);
  await pool.query(`
    INSERT INTO amenities (name, description, capacity, charges, requires_approval)
    SELECT 'Tennis Court', 'Outdoor tennis court', 4, 500, true
    WHERE NOT EXISTS (SELECT 1 FROM amenities WHERE name = 'Tennis Court')
  `);
  await pool.query(`
    INSERT INTO amenities (name, description, capacity, charges, requires_approval)
    SELECT 'Gymnasium', 'Community gym', 10, 0, false
    WHERE NOT EXISTS (SELECT 1 FROM amenities WHERE name = 'Gymnasium')
  `);
  await pool.query(`
    INSERT INTO amenities (name, description, capacity, charges, requires_approval)
    SELECT 'Terrace Garden', 'Rooftop garden area', 15, 0, false
    WHERE NOT EXISTS (SELECT 1 FROM amenities WHERE name = 'Terrace Garden')
  `);

  // Insert default late fee settings if not exist
  await pool.query(`
    INSERT INTO late_fee_settings (percentage, grace_days, max_fee, enabled)
    SELECT 2.00, 15, 500, false
    WHERE NOT EXISTS (SELECT 1 FROM late_fee_settings)
  `);

  // Add late_fee columns to maintenance_bills if not exist
  try { await pool.query(`ALTER TABLE maintenance_bills ADD COLUMN IF NOT EXISTS late_fee DECIMAL(10,2) DEFAULT 0`); } catch(e) {}
  try { await pool.query(`ALTER TABLE maintenance_bills ADD COLUMN IF NOT EXISTS late_fee_paid BOOLEAN DEFAULT false`); } catch(e) {}

  console.log('✅ All tables created successfully');
}

// Helper function to execute queries
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Helper function for single row queries
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result.rows[0]);
    });
  });
}

// Helper function for insert queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export { query, get, run, pool };
