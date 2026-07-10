import express from 'express';
import { getSettings, saveSettings, getWhatsAppHealth, getWhatsAppConnection, reconnectWhatsApp, getMessageQueueStatus } from '../controllers/settingsController.js';
import { authenticateToken, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/settings - Get all settings
router.get('/', authenticateToken, getSettings);

// POST /api/settings - Save settings (admin only)
router.post('/', authenticateToken, requireAuth(['admin']), saveSettings);

// WhatsApp Health Check Endpoints
// GET /api/settings/whatsapp/health - Get WhatsApp service health status
router.get('/whatsapp/health', authenticateToken, requireAuth(['admin']), getWhatsAppHealth);

// GET /api/settings/whatsapp/connection - Get WhatsApp connection status
router.get('/whatsapp/connection', authenticateToken, requireAuth(['admin']), getWhatsAppConnection);

// POST /api/settings/whatsapp/reconnect - Manual reconnection attempt
router.post('/whatsapp/reconnect', authenticateToken, requireAuth(['admin']), reconnectWhatsApp);

// GET /api/settings/whatsapp/queue - Get message queue status
router.get('/whatsapp/queue', authenticateToken, requireAuth(['admin']), getMessageQueueStatus);

export default router;
