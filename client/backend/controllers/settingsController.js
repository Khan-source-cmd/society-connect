import { query } from '../config/database.js';
import { getHealthStatus, getConnectionStatus, cleanup } from '../services/whatsappService.cjs';

// Get all settings
const getSettings = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM society_settings');
    
    // Convert to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve settings'
    });
  }
};

// Save settings
const saveSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO society_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
    
    res.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to save settings'
    });
  }
};

// Get WhatsApp service health status
const getWhatsAppHealth = async (req, res) => {
  try {
    const healthStatus = getHealthStatus();
    const connectionStatus = getConnectionStatus();
    
    res.json({
      success: true,
      data: {
        health: healthStatus,
        connection: connectionStatus
      },
      message: 'WhatsApp service status retrieved successfully'
    });
  } catch (error) {
    console.error('Get WhatsApp health error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve WhatsApp service status'
    });
  }
};

// Get WhatsApp connection status
const getWhatsAppConnection = async (req, res) => {
  try {
    const connectionStatus = getConnectionStatus();
    
    res.json({
      success: true,
      data: connectionStatus,
      message: 'WhatsApp connection status retrieved successfully'
    });
  } catch (error) {
    console.error('Get WhatsApp connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve WhatsApp connection status'
    });
  }
};

// Manual reconnection attempt
const reconnectWhatsApp = async (req, res) => {
  try {
    const { initializeWhatsApp } = await import('../services/whatsappService.cjs');
    
    await initializeWhatsApp();
    
    res.json({
      success: true,
      message: 'WhatsApp reconnection attempt initiated'
    });
  } catch (error) {
    console.error('Reconnect WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to reconnect WhatsApp'
    });
  }
};

// Get message queue status
const getMessageQueueStatus = async (req, res) => {
  try {
    const { getConnectionStatus } = await import('../services/whatsappService.cjs');
    const status = getConnectionStatus();
    
    res.json({
      success: true,
      data: {
        queueLength: status.queueLength,
        processing: status.processing || false
      },
      message: 'Message queue status retrieved successfully'
    });
  } catch (error) {
    console.error('Get message queue status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve message queue status'
    });
  }
};

export { 
  getSettings, 
  saveSettings, 
  getWhatsAppHealth, 
  getWhatsAppConnection, 
  reconnectWhatsApp, 
  getMessageQueueStatus 
};
