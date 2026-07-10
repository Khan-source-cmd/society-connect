const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const path = require('path');

// WhatsApp service configuration
const CONFIG = {
  sessionPath: 'whatsapp-session',
  maxRetries: 3,
  retryDelay: 2000,
  messageTimeout: 30000,
  puppeteerTimeout: 60000
};

// Service state management
let client = null;
let isReady = false;
let isInitializing = false;
let isDisconnected = false;
let messageQueue = [];
let queueProcessing = false;

// Connection state tracking
let connectionState = 'disconnected'; // disconnected, connecting, connected, ready
let lastError = null;
let retryCount = 0;

// Initialize WhatsApp client with enhanced session persistence
const initializeWhatsApp = async () => {
  if (client && isReady) {
    console.log('✅ WhatsApp already initialized and ready');
    return client;
  }

  if (isInitializing) {
    console.log('⏳ WhatsApp initialization already in progress...');
    return client;
  }

  isInitializing = true;
  connectionState = 'connecting';
  console.log('🚀 Initializing WhatsApp with enhanced session persistence...');

  try {
    // Ensure session directory exists
    await ensureSessionDirectory();

    client = new Client({
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        executablePath: process.env.CHROME_PATH || undefined
      },
      authStrategy: new LocalAuth({
        clientId: 'society-connect',
        dataPath: CONFIG.sessionPath
      }),
      puppeteerTimeout: CONFIG.puppeteerTimeout,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 10000
    });

    setupEventListeners(client);
    
    await client.initialize();
    
    console.log('✅ WhatsApp initialization completed');
    isInitializing = false;
    return client;

  } catch (error) {
    console.error('❌ WhatsApp initialization failed:', error.message);
    isInitializing = false;
    connectionState = 'disconnected';
    lastError = error;

    // If browser is already running, try to clean up the lock and session folder
    if (error.message && error.message.includes('browser is already running')) {
      console.log('⚠️  Trying to clean up orphaned session files...');
      try {
        const lockPath = path.join(CONFIG.sessionPath, 'society-connect', 'lockfile');
        await fs.unlink(lockPath).catch(() => {});
        // Also try to remove any stale chromium lock files
        const defaultDir = path.join(CONFIG.sessionPath, 'society-connect');
        const dirs = await fs.readdir(defaultDir).catch(() => []);
        for (const d of dirs) {
          const lockFile = path.join(defaultDir, d, 'lock');
          await fs.unlink(lockFile).catch(() => {});
        }
      } catch (cleanupErr) {
        console.log('Session cleanup attempt completed');
      }
    }
    // Do NOT throw — let the server continue running even if WhatsApp fails
    // WhatsApp can be reconnected later via the /api/whatsapp/reconnect endpoint
  }
};

// Setup event listeners for the WhatsApp client
const setupEventListeners = (whatsappClient) => {
  whatsappClient.on('qr', (qr) => {
    console.log('\n=== WHATSAPP QR CODE ===');
    console.log('Scan this QR with your WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('========================\n');
    
    // Store QR for frontend access
    if (typeof global !== 'undefined' && global.sseClients) {
      global.lastQrCode = qr;
      global.sseClients.forEach(client => {
        try {
          client.write(`data: ${JSON.stringify({ type: 'qr', qr })}\n\n`);
        } catch (e) {}
      });
    }
  });

  whatsappClient.on('ready', async () => {
    console.log('✅ WhatsApp Client is ready!');
    isReady = true;
    connectionState = 'ready';
    isDisconnected = false;
    retryCount = 0;
    
    // Process any queued messages
    await processMessageQueue();
  });

  whatsappClient.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated successfully!');
    connectionState = 'connected';
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp auth failure:', msg);
    isReady = false;
    connectionState = 'disconnected';
    lastError = new Error('Authentication failed: ' + msg);
    client = null;
    scheduleReconnect();
  });

  whatsappClient.on('disconnected', async (reason) => {
    console.log('⚠️ WhatsApp Client disconnected:', reason);
    isReady = false;
    isDisconnected = true;
    connectionState = 'disconnected';
    lastError = new Error('Disconnected: ' + reason);
    client = null;

    // On LOGOUT, don't auto-reconnect — session is invalid
    // User must click "Connect" button to get a fresh QR
    if (reason === 'LOGOUT') {
      console.log('🔴 Session logged out. Click "Connect" in the GUI to start fresh.');
      return;
    }
    
    scheduleReconnect();
  });

  whatsappClient.on('loading_screen', (percent, message) => {
    console.log(`📱 WhatsApp loading: ${percent}% - ${message}`);
  });

  whatsappClient.on('change_state', (state) => {
    console.log(`🔄 WhatsApp state changed: ${state}`);
    connectionState = state;
  });

  whatsappClient.on('error', (error) => {
    console.error('🚨 WhatsApp error:', error.message);
    lastError = error;
  });
};

// Ensure session directory exists
const ensureSessionDirectory = async () => {
  try {
    await fs.access(CONFIG.sessionPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(CONFIG.sessionPath, { recursive: true });
      console.log('📁 Created WhatsApp session directory');
    }
  }
};

// Check if WhatsApp is connected and ready
const isWhatsAppConnected = () => {
  return isReady && client !== null && connectionState === 'ready';
};

// Get connection status
const getConnectionStatus = () => {
  return {
    connected: isReady,
    state: connectionState,
    disconnected: isDisconnected,
    lastError: lastError?.message || null,
    retryCount,
    queueLength: messageQueue.length
  };
};

// Send WhatsApp message with retry logic
const sendWhatsAppMessage = async (phoneNumber, message, options = {}) => {
  const {
    retries = CONFIG.maxRetries,
    timeout = CONFIG.messageTimeout
  } = options;

  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  // Validate phone number format
  let formattedNumber = phoneNumber.replace(/\D/g, '');
  if (!formattedNumber.startsWith('91')) {
    formattedNumber = '91' + formattedNumber;
  }
  formattedNumber = formattedNumber + '@c.us';

  // Check if WhatsApp is ready
  if (!isWhatsAppConnected()) {
    console.log('⚠️ WhatsApp not ready, attempting to initialize...');
    try {
      await initializeWhatsApp();
      // Wait for ready state
      await waitForReadyState();
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp:', error.message);
      throw new Error('WhatsApp service unavailable');
    }
  }

  // Double-check client is valid before sending
  if (!client || !isReady || connectionState !== 'ready') {
    throw new Error('WhatsApp client not properly initialized');
  }

  try {
    // Send message with timeout
    const sendPromise = client.sendMessage(formattedNumber, message);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Message send timeout')), timeout)
    );

    await Promise.race([sendPromise, timeoutPromise]);
    
    console.log(`✅ WhatsApp message sent to ${phoneNumber}`);
    return { success: true, phoneNumber, message };
    
  } catch (error) {
    console.error(`❌ Error sending WhatsApp message to ${phoneNumber}:`, error.message);
    
    if (retries > 0 && shouldRetry(error)) {
      console.log(`🔄 Retrying message send (${retries} attempts remaining)...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return sendWhatsAppMessage(phoneNumber, message, { retries: retries - 1, timeout });
    }
    
    throw error;
  }
};

// Check if error should trigger a retry
const shouldRetry = (error) => {
  const retryableErrors = [
    'timeout',
    'detached',
    'session',
    'connection',
    'network'
  ];
  
  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some(keyword => errorMessage.includes(keyword));
};

// Wait for WhatsApp to be ready
const waitForReadyState = async (timeout = 30000) => {
  const startTime = Date.now();
  
  while (!isReady && (Date.now() - startTime) < timeout) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!isReady) {
    throw new Error('WhatsApp failed to become ready within timeout');
  }
};

// Schedule automatic reconnection
const scheduleReconnect = () => {
  if (retryCount >= CONFIG.maxRetries) {
    console.log('❌ Max reconnection attempts reached. Manual intervention required.');
    return;
  }

  retryCount++;
  const delay = CONFIG.retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
  
  console.log(`🔄 Scheduling reconnection attempt ${retryCount}/${CONFIG.maxRetries} in ${delay}ms`);
  
  setTimeout(async () => {
    try {
      console.log('🔄 Attempting to reconnect WhatsApp...');
      await initializeWhatsApp();
      await waitForReadyState();
      console.log('✅ WhatsApp reconnected successfully');
    } catch (error) {
      console.error('❌ Reconnection failed:', error.message);
      scheduleReconnect();
    }
  }, delay);
};

// Message queue management
const addToQueue = (phoneNumber, message, callback) => {
  messageQueue.push({
    phoneNumber,
    message,
    callback,
    timestamp: Date.now()
  });
  
  console.log(`📝 Message queued (${messageQueue.length} messages in queue)`);
  processMessageQueue();
};

const processMessageQueue = async () => {
  if (queueProcessing || messageQueue.length === 0 || !isWhatsAppConnected()) {
    return;
  }

  queueProcessing = true;
  
  while (messageQueue.length > 0 && isWhatsAppConnected()) {
    const { phoneNumber, message, callback } = messageQueue.shift();
    
    try {
      await sendWhatsAppMessage(phoneNumber, message);
      if (callback) callback(null, { success: true, phoneNumber, message });
    } catch (error) {
      console.error(`❌ Failed to send queued message to ${phoneNumber}:`, error.message);
      if (callback) callback(error);
    }
    
    // Add delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  queueProcessing = false;
  
  if (messageQueue.length > 0) {
    console.log(`📝 ${messageQueue.length} messages still in queue`);
  } else {
    console.log('✅ Message queue processed');
  }
};

// Enhanced visitor alert with queue support
const sendVisitorAlert = async (ownerPhone, ownerName, flatNumber, visitorName, purpose, time) => {
  const message = `🏠 *Visitor Alert*\n\n` +
    `Hello ${ownerName},\n\n` +
    `A visitor has arrived for Flat ${flatNumber}:\n\n` +
    `👤 Name: ${visitorName}\n` +
    `📝 Purpose: ${purpose}\n` +
    `🕐 Time: ${time}\n\n` +
    `Please take necessary action.`;

  try {
    const result = await sendWhatsAppMessage(ownerPhone, message);
    return { success: true, ...result };
  } catch (error) {
    console.error('⚠️ Failed to send visitor alert, adding to queue:', error.message);
    return new Promise((resolve, reject) => {
      addToQueue(ownerPhone, message, (error, result) => {
        if (error) {
          console.error('❌ Queued visitor alert failed:', error.message);
          resolve({ success: false, error: error.message });
        } else {
          console.log('✅ Queued visitor alert sent successfully');
          resolve({ success: true, ...result });
        }
      });
    });
  }
};

// Enhanced maintenance bill notification
const sendMaintenanceBill = async (ownerPhone, ownerName, flatNumber, amount, month, year, dueDate) => {
  const message = `💰 *Maintenance Bill*\n\n` +
    `Hello ${ownerName},\n\n` +
    `Your maintenance bill for ${month} ${year} is ready:\n\n` +
    `🏠 Flat: ${flatNumber}\n` +
    `💵 Amount: ₹${amount}\n` +
    `📅 Due Date: ${dueDate}\n\n` +
    `Please pay at the earliest.`;

  try {
    const result = await sendWhatsAppMessage(ownerPhone, message);
    return { success: true, ...result };
  } catch (error) {
    console.error('⚠️ Failed to send maintenance bill, adding to queue:', error.message);
    return new Promise((resolve, reject) => {
      addToQueue(ownerPhone, message, (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, ...result });
        }
      });
    });
  }
};

// Enhanced new complaint notification to admin
const sendNewComplaintToAdmin = async (adminPhone, complaintId, flatNumber, wing, subject, category, urgency, description) => {
  const urgencyEmoji = urgency === 'High' ? '🔴' : urgency === 'Medium' ? '🟡' : '🟢';
  
  const message = `📝 *New Complaint Received*\n\n` +
    `Complaint #${complaintId}\n\n` +
    `🏠 Flat: ${flatNumber}, Wing ${wing}\n` +
    `📌 Subject: ${subject}\n` +
    `📂 Category: ${category}\n` +
    `${urgencyEmoji} Urgency: ${urgency}\n\n` +
    `📝 Description:\n${description.substring(0, 200)}${description.length > 200 ? '...' : ''}\n\n` +
    `Please take action.`;

  try {
    const result = await sendWhatsAppMessage(adminPhone, message);
    return { success: true, ...result };
  } catch (error) {
    console.error('⚠️ Failed to send complaint notification, adding to queue:', error.message);
    return new Promise((resolve, reject) => {
      addToQueue(adminPhone, message, (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, ...result });
        }
      });
    });
  }
};

// Enhanced complaint status update
const sendComplaintUpdate = async (ownerPhone, ownerName, complaintId, status, description) => {
  const statusEmoji = status === 'Resolved' ? '✅' : status === 'In Progress' ? '⏳' : '📋';
  
  const message = `${statusEmoji} *Complaint Update*\n\n` +
    `Hello ${ownerName},\n\n` +
    `Your complaint #${complaintId} status has been updated:\n\n` +
    `📊 Status: ${status}\n` +
    `📝 Description: ${description}`;

  try {
    const result = await sendWhatsAppMessage(ownerPhone, message);
    return { success: true, ...result };
  } catch (error) {
    console.error('⚠️ Failed to send complaint update, adding to queue:', error.message);
    return new Promise((resolve, reject) => {
      addToQueue(ownerPhone, message, (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, ...result });
        }
      });
    });
  }
};

// Enhanced notice notification
const sendNoticeNotification = async (ownerPhone, ownerName, noticeTitle, noticeDate) => {
  const message = `📢 *New Notice*\n\n` +
    `Hello ${ownerName},\n\n` +
    `A new notice has been posted:\n\n` +
    `📌 Title: ${noticeTitle}\n` +
    `📅 Date: ${noticeDate}\n\n` +
    `Please check the Notice Board for details.`;

  try {
    const result = await sendWhatsAppMessage(ownerPhone, message);
    return { success: true, ...result };
  } catch (error) {
    console.error('⚠️ Failed to send notice notification, adding to queue:', error.message);
    return new Promise((resolve, reject) => {
      addToQueue(ownerPhone, message, (error, result) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, ...result });
        }
      });
    });
  }
};

// Cleanup function for graceful shutdown
const cleanup = async () => {
  if (client) {
    try {
      await client.destroy();
      console.log('✅ WhatsApp client destroyed gracefully');
    } catch (error) {
      console.error('❌ Error destroying WhatsApp client:', error.message);
    }
  }
  client = null;
  isReady = false;
  isInitializing = false;
  isDisconnected = false;
  connectionState = 'disconnected';
};

// Reset and reinitialize (deletes session and restarts)
const resetAndReinitialize = async () => {
  await cleanup();
  
  // Delete session folder
  const fs = require('fs');
  const p = require('path');
  const sessionPath = p.join(__dirname, '..', '..', 'whatsapp-session');
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (e) {
    console.log('Session folder cleanup (non-critical):', e.message);
  }
  
  // Start fresh
  await initializeWhatsApp();
};

// Health check endpoint data
const getHealthStatus = () => {
  return {
    service: 'whatsapp',
    status: isWhatsAppConnected() ? 'healthy' : 'unhealthy',
    connectionState,
    isReady,
    isDisconnected,
    lastError: lastError?.message || null,
    retryCount,
    queueLength: messageQueue.length,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  initializeWhatsApp,
  resetAndReinitialize,
  sendWhatsAppMessage,
  sendVisitorAlert,
  sendMaintenanceBill,
  sendNewComplaintToAdmin,
  sendComplaintUpdate,
  sendNoticeNotification,
  isWhatsAppConnected,
  getConnectionStatus,
  getHealthStatus,
  cleanup,
  addToQueue,
  processMessageQueue
};
