const { query } = require('./backend/config/database.js');

async function linkUserToFlat() {
  try {
    const email = 'momanmr23+11@gmail.com';
    
    // First, find the flat with this owner email
    const flatQuery = `SELECT id, wing, flat_number FROM flats WHERE LOWER(owner_email) = LOWER($1)`;
    const flatResult = await query(flatQuery, [email]);
    
    if (flatResult.rows.length === 0) {
      console.log('❌ No flat found with owner_email:', email);
      
      // Check tenants table
      const tenantQuery = `
        SELECT t.flat_id, f.wing, f.flat_number 
        FROM tenants t 
        JOIN flats f ON t.flat_id = f.id 
        WHERE LOWER(t.tenant_email) = LOWER($1) AND (t.status = 'Active' OR t.status IS NULL)
      `;
      const tenantResult = await query(tenantQuery, [email]);
      
      if (tenantResult.rows.length > 0) {
        const flat = tenantResult.rows[0];
        console.log('✅ Found tenant flat:', flat.wing, flat.flat_number);
        
        // Update user
        const updateQuery = `UPDATE users SET flat_number = $1, wing = $2 WHERE LOWER(email) = LOWER($3)`;
        await query(updateQuery, [flat.flat_number, flat.wing, email]);
        console.log('✅ User linked to flat:', flat.wing, '-', flat.flat_number);
      } else {
        console.log('❌ No tenant found with email:', email);
      }
    } else {
      const flat = flatResult.rows[0];
      console.log('✅ Found owner flat:', flat.wing, flat.flat_number);
      
      // Update user
      const updateQuery = `UPDATE users SET flat_number = $1, wing = $2 WHERE LOWER(email) = LOWER($3)`;
      await query(updateQuery, [flat.flat_number, flat.wing, email]);
      console.log('✅ User linked to flat:', flat.wing, '-', flat.flat_number);
    }
    
    // Verify the update
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
