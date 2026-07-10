import { Pool } from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(import.meta.dirname, '../../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.join(__dirname, '../../backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().slice(0, 10);
const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'society_connect',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
};

try {
  // Use pg_dump via child_process for a proper SQL backup
  const cmd = `PGPASSWORD="${config.password}" pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${backupFile}" --no-owner --no-acl`;
  
  execSync(cmd, { stdio: 'pipe' });
  
  // Clean up old backups (keep last 30 days)
  const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_'));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  files.forEach(f => {
    const fDate = new Date(f.replace('backup_', '').replace('.sql', ''));
    if (fDate < thirtyDaysAgo) {
      fs.unlinkSync(path.join(backupDir, f));
      console.log(`Cleaned old backup: ${f}`);
    }
  });

  const size = fs.statSync(backupFile).size;
  console.log(`✅ Backup completed: ${backupFile} (${(size / 1024).toFixed(1)} KB)`);
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  
  // Fallback: try pg_dump with env-based connection string
  try {
    const cmd = `PGPASSWORD="${config.password}" pg_dump postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database} > "${backupFile}"`;
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ Backup completed via connection string: ${backupFile}`);
  } catch (e2) {
    console.error('❌ All backup methods failed:', e2.message);
    process.exit(1);
  }
}