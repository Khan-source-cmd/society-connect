// WhatsApp Initialization - Run this separately to connect
// Usage: node backend/services/whatsappInit.cjs

const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Starting WhatsApp initialization...');

let qrShown = false;

const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  if (!qrShown) {
    console.log('\n======================================');
    console.log('  WHATSAPP QR CODE - SCAN WITH PHONE  ');
    console.log('======================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n======================================\n');
    qrShown = true;
    console.log('Waiting for scan...');
  }
});

client.on('ready', () => {
  console.log('✅ WhatsApp Client is ready!');
  console.log('You can now close this and use the app.');
});

client.on('disconnected', () => {
  console.log('WhatsApp Client disconnected');
});

console.log('Initializing WhatsApp...');
client.initialize();
