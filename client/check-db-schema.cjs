const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'society_connect',
  password: 'root',
  port: 5432
});

async function check() {
  const tables = ['maintenance_bills', 'complaints', 'users', 'compliance_notices'];
  for (const table of tables) {
    const r = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n=== ${table} ===`);
    r.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
  }
  await pool.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });