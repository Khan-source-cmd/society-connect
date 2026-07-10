import express from 'express';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';
import {
  initializeWhatsApp,
  resetAndReinitialize,
  getConnectionStatus,
  isWhatsAppConnected
} from '../services/whatsappService.cjs';

const router = express.Router();

/**
 * WhatsApp API Routes
 * For admin panel WhatsApp setup
 */



// Intercept WhatsApp QR events
const originalLog = console.log;
console.log = (...args) => {
  originalLog.apply(console, args);
  
  // Catch QR code events
  if (args.length > 0 && typeof args[0] === 'string') {
    if (args[0].includes('=== WHATSAPP QR CODE ===') || args[0] === 'Scan this QR with your WhatsApp:') {
      // Next log line will be the QR string
      const qrString = args[1];
      if (qrString && qrString.length > 100) {
        // For now just send raw qr string, frontend will render it
        global.lastQrCode = qrString;
        // Broadcast to all connected SSE clients
        global.sseClients.forEach(client => {
          client.write(`data: ${JSON.stringify({ type: 'qr', qr: qrString })}\n\n`);
        });
      }
    }

    // Catch connected event
    if (args[0].includes('✅ WhatsApp Client is ready!')) {
      global.lastQrCode = null;
      global.sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      });
    }

    // Catch disconnected event
    if (args[0].includes('⚠️ WhatsApp Client disconnected:')) {
      global.sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'disconnected' })}\n\n`);
      });
    }
  }
};

// GET /api/whatsapp/status - Get current connection status
router.get('/status', authenticateToken, requireAuth(['admin', 'secretary']), async (req, res) => {
  try {
    const status = getConnectionStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// POST /api/whatsapp/reconnect - Reinitialize WhatsApp connection
router.post('/reconnect', authenticateToken, requireAuth(['admin', 'Admin']), async (req, res) => {
  try {
    global.lastQrCode = null;
    
    // Reset and reinitialize (cleans up client + session folder + restarts)
    resetAndReinitialize();

    res.json({
      success: true,
      message: 'WhatsApp reconnection initiated'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;