#!/usr/bin/env node

/**
 * Check User Conflict Script
 * Helps identify why a user registration is failing with 409 Conflict
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'society_connect',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root'
});

async function checkUserConflict(email, phone) {
  console.log('🔍 Checking for user conflicts...\n');
  console.log(`Email to check: ${email}`);
  console.log(`Phone to check: ${phone}\n`);

  try {
    // Check for existing users with same email or phone
    const query = `
      SELECT user_id, username, email, phone, name, role, email_verified, status, created_at
      FROM users 
      WHERE email = $1 OR phone = $2
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [email, phone]);
    
    if (result.rows.length === 0) {
      console.log('✅ No conflicts found. User should be able to register.');
      return;
    }

    console.log(`⚠️ Found ${result.rows.length} existing user(s) with matching email or phone:\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`User #${index + 1}:`);
      console.log(`  ID: ${user.user_id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Phone: ${user.phone}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Email Verified: ${user.email_verified ? '✅' : '❌'}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });

    console.log('💡 Resolution Options:');
    console.log('1. Use a different email address or phone number');
    console.log('2. If this is your account, try logging in instead of registering');
    console.log('3. If you forgot your password, use the "Forgot Password" feature');
    console.log('4. Contact admin to check if the account needs to be activated');

  } catch (error) {
    console.error('❌ Error checking user conflicts:', error.message);
  } finally {
    await pool.end();
  }
}

// Get email and phone from command line arguments
const email = process.argv[2];
const phone = process.argv[3];

if (!email || !phone) {
  console.log('Usage: node check-user-conflict.cjs <email> <phone>');
  console.log('Example: node check-user-conflict.cjs momanmr23+23@gmail.com 8689879139');
  process.exit(1);
}

checkUserConflict(email, phone);