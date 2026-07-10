import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import authRoutes from './backend/routes/authRoutes.js';
import dashboardRoutes from './backend/routes/dashboardRoutes.js';
import maintenanceRoutes from './backend/routes/maintenanceRoutes.js';
import userRoutes from './backend/routes/userRoutes.js';
import propertyRoutes from './backend/routes/propertyRoutes.js';
import tenantRoutes from './backend/routes/tenantRoutes.js';
import ownershipTransferRoutes from './backend/routes/ownershipTransferRoutes.js';
import noticeRoutes from './backend/routes/noticeRoutes.js';
import complaintRoutes from './backend/routes/complaintRoutes.js';
import visitorRoutes from './backend/routes/visitorRoutes.js';
import settingsRoutes from './backend/routes/settingsRoutes.js';
import whatsappRoutes from './backend/routes/whatsappRoutes.js';
import approvalRoutes   from './backend/routes/approvalRoutes.js';
import workOrderRoutes  from './backend/routes/workOrderRoutes.js';
import vendorRoutes     from './backend/routes/vendorRoutes.js';
import complianceRoutes from './backend/routes/complianceRoutes.js';
import paymentRoutes    from './backend/routes/paymentRoutes.js';
import documentRoutes   from './backend/routes/documentRoutes.js';
import reportRoutes     from './backend/routes/reportRoutes.js';
import amenityRoutes    from './backend/routes/amenityRoutes.js';
import visitorPassRoutes from './backend/routes/visitorPassRoutes.js';

// Validate required environment variables on startup
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(`⚠️ Missing env vars: ${missingVars.join(', ')} (using defaults)`);
}
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not set — using INSECURE default. Set this in .env for production!');
}

// Import and initialize WhatsApp
import { initializeWhatsApp, isWhatsAppConnected } from './backend/services/whatsappService.cjs';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:3001'];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(helmet());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});
app.use(limiter);

// GLOBAL - Share these with whatsapp routes
global.sseClients = new Set();
global.lastQrCode = null;

// SPECIAL ROUTE - WhatsApp QR Stream (SSE cannot send auth headers)
app.get('/api/whatsapp/qr-stream', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Add client to set
  global.sseClients.add(res);
  
  // Send current QR if available
  if (global.lastQrCode) {
    res.write(`data: ${JSON.stringify({ type: 'qr', qr: global.lastQrCode })}\n\n`);
  }

  // Remove client on disconnect
  req.on('close', () => {
    global.sseClients.delete(res);
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/ownership-transfers', ownershipTransferRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/approvals',    approvalRoutes);
app.use('/api/work-orders',  workOrderRoutes);
app.use('/api/vendors',      vendorRoutes);
app.use('/api/compliance',   complianceRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/documents',    documentRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/amenities',    amenityRoutes);
app.use('/api/visitor-passes', visitorPassRoutes);

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(join(__dirname, 'client/build')));
    app.get('*', (req, res) => {
        res.sendFile(join(__dirname, 'client/build', 'index.html'));
    });
}

// Global error handler - must be last middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message
  });
});

// Daily cron job - Generate compliance notices every day at 8:00 AM
import cron from 'node-cron';
import { generatePaymentDefaultNotices } from './backend/services/complianceService.js';

cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily compliance notice generation...');
  try {
    const result = await generatePaymentDefaultNotices();
    console.log(`✅ Daily notices completed: ${result.notices_generated} notices generated`);
  } catch (error) {
    console.error('❌ Notice generation failed:', error);
  }
});

// Auto late fee calculation — runs daily at 6 AM
import { calculateAndApplyLateFees } from './backend/services/lateFeeService.js';
cron.schedule('0 6 * * *', async () => {
  console.log('💰 Running auto late fee calculation...');
  try {
    const result = await calculateAndApplyLateFees();
    console.log(`✅ Late fee completed: ${result.fees_applied} bills updated`);
  } catch (error) {
    console.error('❌ Late fee calculation failed:', error.message);
  }
});

// Daily database backup at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('💾 Running daily database backup...');
  try {
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);
    const password = process.env.DB_PASSWORD || 'root';
    execSync(`PGPASSWORD="${password}" pg_dump -h ${process.env.DB_HOST || 'localhost'} -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'society_connect'} -f "${backupFile}" --no-owner --no-acl`, { stdio: 'pipe' });
    console.log(`✅ Backup completed: backup_${timestamp}.sql`);
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
  }
});

// Initialize WebSocket
import { initRealtime } from './backend/services/realtimeService.js';
initRealtime(httpServer);

// Start server
httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    
    // Initialize WhatsApp
    console.log('Initializing WhatsApp service...');
    initializeWhatsApp();
    console.log('WhatsApp service started (scan QR when ready)');
    console.log('✅ Daily compliance notice cron job scheduled for 8:00 AM');
});
