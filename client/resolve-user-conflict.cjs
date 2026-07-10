#!/usr/bin/env node

/**
 * Resolve User Conflict Script
 * Helps resolve user registration conflicts by updating existing users
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

async function resolveUserConflict(phone, newEmail) {
  console.log('🔧 Resolving user conflict...\n');
  console.log(`Phone to update: ${phone}`);
  console.log(`New email to set: ${newEmail}\n`);

  try {
    // First, check if the new email already exists
    const emailCheckQuery = 'SELECT user_id, username, email FROM users WHERE email = $1';
    const emailResult = await pool.query(emailCheckQuery, [newEmail]);
    
    if (emailResult.rows.length > 0) {
      console.log(`❌ Cannot update: Email ${newEmail} is already in use by user ${emailResult.rows[0].username}`);
      return;
    }

    // Find the user with the conflicting phone number
    const userQuery = 'SELECT user_id, username, email, name FROM users WHERE phone = $1';
    const userResult = await pool.query(userQuery, [phone]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No user found with this phone number');
      return;
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.username} (${user.email})`);
    
    // Update the user's email
    const updateQuery = 'UPDATE users SET email = $1 WHERE user_id = $2 RETURNING *';
    const updateResult = await pool.query(updateQuery, [newEmail, user.user_id]);
    
    const updatedUser = updateResult.rows[0];
    console.log(`✅ Successfully updated user ${updatedUser.username}:`);
    console.log(`   Old email: ${user.email}`);
    console.log(`   New email: ${updatedUser.email}`);
    console.log(`   Phone: ${updatedUser.phone}`);
    console.log(`   Name: ${updatedUser.name}`);
    
    console.log('\n🎉 User conflict resolved! The user can now log in with the new email address.');

  } catch (error) {
    console.error('❌ Error resolving user conflict:', error.message);
  } finally {
    await pool.end();
  }
}

// Get phone and new email from command line arguments
const phone = process.argv[2];
const newEmail = process.argv[3];

if (!phone || !newEmail) {
  console.log('Usage: node resolve-user-conflict.cjs <phone> <new-email>');
  console.log('Example: node resolve-user-conflict.cjs 8689879139 uwbpahadi@gmail.com');
  process.exit(1);
}

resolveUserConflict(phone, newEmail);