/**
 * Taiwan Maami KOT Polling Client v3.1 (Dev Server Workaround)
 * 
 * This client polls the Taiwan Maami DEV SERVER for pending Kitchen Order Tickets (KOTs)
 * and sends them to a thermal printer via ESC/POS commands.
 * 
 * NOTE: This is a temporary workaround while production deployment issues are being resolved.
 * Once production is updated, switch back to the production URL.
 * 
 * Usage:
 *   1. Install Node.js on your Windows machine
 *   2. Save this file as polling-client.js
 *   3. Run: node polling-client.js
 */

const http = require('http');
const https = require('https');
const net = require('net');

// ============== CONFIGURATION ==============
const CONFIG = {
  // Using DEV server as workaround (change to production when fixed)
  WEBSITE_URL: 'https://3000-ibrb4llhlbghhxvbqrgy7-c775333b.manusvm.computer',
  // Production URL (uncomment when deployment is fixed):
  // WEBSITE_URL: 'https://www.taiwanmaami.com',
  
  KOT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  PRINTER_IP: '192.168.1.22',
  PRINTER_PORT: 9100,
  POLL_INTERVAL: 5000,
};
// ============================================

console.log('Taiwan Maami KOT Client v3.1 (Dev Server) Started');
console.log(`Website: ${CONFIG.WEBSITE_URL}`);
console.log(`Printer: ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}`);
console.log('---');

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: ESC + '@',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_HEIGHT: ESC + '!' + '\x10',
  DOUBLE_WIDTH: ESC + '!' + '\x20',
  DOUBLE_SIZE: ESC + '!' + '\x30',
  NORMAL_SIZE: ESC + '!' + '\x00',
  CUT: GS + 'V' + '\x00',
  PARTIAL_CUT: GS + 'V' + '\x01',
  FEED: ESC + 'd' + '\x03',
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function generateReceipt(kot) {
  const data = kot.kotData;
  let receipt = '';
  
  receipt += COMMANDS.INIT;
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += COMMANDS.DOUBLE_SIZE;
  receipt += COMMANDS.BOLD_ON;
  receipt += 'TAIWAN MAAMI\n';
  receipt += COMMANDS.NORMAL_SIZE;
  receipt += COMMANDS.BOLD_OFF;
  receipt += 'Kitchen Order Ticket\n';
  receipt += '================================\n';
  
  receipt += COMMANDS.ALIGN_LEFT;
  receipt += COMMANDS.BOLD_ON;
  receipt += `Order #: ${data.orderId || kot.orderId}\n`;
  receipt += COMMANDS.BOLD_OFF;
  receipt += `Time: ${formatDate(kot.createdAt)}\n`;
  
  if (data.customerName) {
    receipt += `Customer: ${data.customerName}\n`;
  }
  if (data.customerPhone) {
    receipt += `Phone: ${data.customerPhone}\n`;
  }
  
  receipt += '--------------------------------\n';
  receipt += COMMANDS.BOLD_ON;
  receipt += 'ITEMS:\n';
  receipt += COMMANDS.BOLD_OFF;
  
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      receipt += COMMANDS.DOUBLE_HEIGHT;
      receipt += `${item.quantity}x ${item.productName || item.name}\n`;
      receipt += COMMANDS.NORMAL_SIZE;
      
      if (item.size) receipt += `   Size: ${item.size}\n`;
      if (item.sugarLevel) receipt += `   Sugar: ${item.sugarLevel}\n`;
      if (item.iceLevel) receipt += `   Ice: ${item.iceLevel}\n`;
      if (item.addons && item.addons.length > 0) {
        receipt += `   Add-ons: ${item.addons.join(', ')}\n`;
      }
      if (index < data.items.length - 1) receipt += '   ---\n';
    });
  }
  
  receipt += '--------------------------------\n';
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += `KOT ID: ${kot.id}\n`;
  receipt += `Printed: ${new Date().toLocaleTimeString()}\n`;
  receipt += '\n';
  receipt += COMMANDS.FEED;
  receipt += COMMANDS.PARTIAL_CUT;
  
  return receipt;
}

function printReceipt(receiptData) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(CONFIG.PRINTER_PORT, CONFIG.PRINTER_IP, () => {
      console.log('Connected to printer');
      client.write(receiptData, 'binary');
    });
    
    client.on('close', () => {
      console.log('Printer connection closed');
      resolve();
    });
    
    client.on('error', (err) => {
      console.error('Printer error:', err.message);
      reject(err);
    });
    
    setTimeout(() => client.end(), 1000);
  });
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function pollForKOTs() {
  try {
    // Use the simple REST endpoint
    const url = `${CONFIG.WEBSITE_URL}/api/kot/poll?secret=${encodeURIComponent(CONFIG.KOT_SECRET)}`;
    
    const response = await makeRequest(url);
    
    if (response.error) {
      console.error('API Error:', response.error);
      return;
    }
    
    const kots = response.kots || [];
    
    if (kots.length > 0) {
      console.log(`Found ${kots.length} pending KOT(s)`);
      
      for (const kot of kots) {
        try {
          console.log(`Printing KOT #${kot.id} for order ${kot.orderId}...`);
          
          const receipt = generateReceipt(kot);
          await printReceipt(receipt);
          
          await markKOTAsPrinted(kot.id);
          console.log(`KOT #${kot.id} printed and marked as complete`);
          
        } catch (printError) {
          console.error(`Failed to print KOT #${kot.id}:`, printError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Poll error:', error.message);
  }
}

async function markKOTAsPrinted(kotId) {
  const url = `${CONFIG.WEBSITE_URL}/api/kot/printed`;
  const body = JSON.stringify({ secret: CONFIG.KOT_SECRET, kotId: kotId });
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body: body,
  });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  return response;
}

function startPolling() {
  console.log(`Starting polling every ${CONFIG.POLL_INTERVAL / 1000} seconds...`);
  console.log('');
  
  pollForKOTs();
  
  setInterval(() => {
    const now = new Date().toLocaleTimeString();
    console.log(`[${now}] Polling...`);
    pollForKOTs();
  }, CONFIG.POLL_INTERVAL);
}

startPolling();
