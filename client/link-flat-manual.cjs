const { query } = require('./backend/config/database.js');

async function linkUserToFlat() {
  try {
    // Link the user with email momanmr23+11@gmail.com to flat C-403
    const email = 'momanmr23+11@gmail.com';
    const wing = 'C';
    const flatNumber = '403';
    
    const updateQuery = `UPDATE users SET flat_number = $1, wing = $2 WHERE LOWER(email) = LOWER($3)`;
    await query(updateQuery, [flatNumber, wing, email]);
    
    console.log(`✅ Linked user ${email} to flat ${wing}-${flatNumber}`);
    
    // Verify
    const userQuery = `SELECT user_id, email, flat_number, wing FROM users WHERE LOWER(email) = LOWER($1)`;
    const userResult = await query(userQuery, [email]);
    console.log('✅ User now has:', userResult.rows[0]);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

linkUserToFlat();
