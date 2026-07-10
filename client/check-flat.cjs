const { query } = require('./backend/config/database.js');

async function checkFlat() {
  try {
    // Check flat C-403
    const flatQuery = `SELECT * FROM flats WHERE wing = 'C' AND flat_number = '403'`;
    const flatResult = await query(flatQuery);
    
    console.log('Flat C-403:', flatResult.rows[0]);
    
    // Also check all flats to see what's there
    const allFlatsQuery = `SELECT wing, flat_number, owner_name, owner_email, owner_phone FROM flats ORDER BY wing, flat_number`;
    const allFlatsResult = await query(allFlatsQuery);
    
    console.log('\nAll flats:');
    allFlatsResult.rows.forEach(f => {
      console.log(`${f.wing}-${f.flat_number}: Owner: ${f.owner_name}, Email: ${f.owner_email}, Phone: ${f.owner_phone}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkFlat();
