/**
 * Taiwan Maami KOT Polling Client v3.0
 * 
 * This client polls the Taiwan Maami server for pending Kitchen Order Tickets (KOTs)
 * and sends them to a thermal printer via ESC/POS commands.
 * 
 * Usage:
 *   1. Install Node.js on your Windows machine
 *   2. Save this file as polling-client.js
 *   3. Update the configuration below if needed
 *   4. Run: node polling-client.js
 */

const http = require('http');
const https = require('https');
const net = require('net');

// ============== CONFIGURATION ==============
const CONFIG = {
  WEBSITE_URL: 'https://www.taiwanmaami.com',  // Your website URL
  KOT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',  // Taiwan Maami KOT secret
  PRINTER_IP: '192.168.1.22',                   // Your thermal printer IP
  PRINTER_PORT: 9100,                           // Thermal printer port
  POLL_INTERVAL: 5000,                          // Poll every 5 seconds
};
// ============================================

console.log('Taiwan Maami KOT Client v3.0 Started');
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

/**
 * Format date for display
 */
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

/**
 * Generate ESC/POS receipt for a KOT
 */
function generateReceipt(kot) {
  const data = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
  let receipt = '';
  
  // Initialize printer
  receipt += COMMANDS.INIT;
  
  // Header
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += COMMANDS.DOUBLE_SIZE;
  receipt += COMMANDS.BOLD_ON;
  receipt += 'TAIWAN MAAMI\n';
  receipt += COMMANDS.NORMAL_SIZE;
  receipt += COMMANDS.BOLD_OFF;
  receipt += 'Kitchen Order Ticket\n';
  receipt += '================================\n';
  
  // Order info
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
  
  // Order type
  receipt += COMMANDS.BOLD_ON;
  receipt += `Type: ${(data.orderType || 'pickup').toUpperCase()}\n`;
  receipt += COMMANDS.BOLD_OFF;
  
  if (data.orderType === 'delivery' && data.deliveryAddress) {
    receipt += `Address: ${data.deliveryAddress}\n`;
  }
  
  receipt += '--------------------------------\n';
  
  // Items
  receipt += COMMANDS.BOLD_ON;
  receipt += 'ITEMS:\n';
  receipt += COMMANDS.BOLD_OFF;
  
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      receipt += COMMANDS.DOUBLE_HEIGHT;
      receipt += `${item.quantity}x ${item.name || item.productName}\n`;
      receipt += COMMANDS.NORMAL_SIZE;
      
      if (item.size) {
        receipt += `   Size: ${item.size}\n`;
      }
      if (item.sugarLevel) {
        receipt += `   Sugar: ${item.sugarLevel}\n`;
      }
      if (item.iceLevel) {
        receipt += `   Ice: ${item.iceLevel}\n`;
      }
      if (item.addons && item.addons.length > 0) {
        receipt += `   Add-ons: ${item.addons.join(', ')}\n`;
      }
      if (item.specialInstructions) {
        receipt += COMMANDS.BOLD_ON;
        receipt += `   NOTE: ${item.specialInstructions}\n`;
        receipt += COMMANDS.BOLD_OFF;
      }
      if (index < data.items.length - 1) {
        receipt += '   ---\n';
      }
    });
  }
  
  receipt += '--------------------------------\n';
  
  if (data.specialInstructions) {
    receipt += COMMANDS.BOLD_ON;
    receipt += 'SPECIAL INSTRUCTIONS:\n';
    receipt += COMMANDS.BOLD_OFF;
    receipt += `${data.specialInstructions}\n`;
    receipt += '--------------------------------\n';
  }
  
  // Footer
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += `KOT ID: ${kot.id}\n`;
  receipt += `Printed: ${new Date().toLocaleTimeString()}\n`;
  receipt += '\n';
  
  receipt += COMMANDS.FEED;
  receipt += COMMANDS.PARTIAL_CUT;
  
  return receipt;
}

/**
 * Send data to thermal printer
 */
function printReceipt(receiptData) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(CONFIG.PRINTER_PORT, CONFIG.PRINTER_IP, () => {
      console.log('Connected to printer');
      client.write(receiptData, 'binary');
    });
    
    client.on('data', (data) => {
      console.log('Printer response:', data.toString());
    });
    
    client.on('close', () => {
      console.log('Printer connection closed');
      resolve();
    });
    
    client.on('error', (err) => {
      console.error('Printer error:', err.message);
      reject(err);
    });
    
    setTimeout(() => {
      client.end();
    }, 1000);
  });
}

/**
 * Make HTTP/HTTPS request
 */
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
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Poll for pending KOTs using tRPC endpoint
 */
async function pollForKOTs() {
  try {
    // tRPC query format - input must be JSON stringified and wrapped in {"0": input}
    const input = JSON.stringify({ "0": { json: { secret: CONFIG.KOT_SECRET } } });
    const url = `${CONFIG.WEBSITE_URL}/api/trpc/kot.pollPending?batch=1&input=${encodeURIComponent(input)}`;
    
    const response = await makeRequest(url);
    
    // tRPC batch response format
    if (response && response[0]) {
      if (response[0].error) {
        console.error('API Error:', response[0].error.message || response[0].error);
        return;
      }
      
      const result = response[0].result;
      if (result && result.data && result.data.json) {
        const kots = result.data.json.kots || result.data.json || [];
        
        if (Array.isArray(kots) && kots.length > 0) {
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
      }
    }
    
  } catch (error) {
    console.error('Poll error:', error.message);
  }
}

/**
 * Mark KOT as printed using tRPC mutation
 */
async function markKOTAsPrinted(kotId) {
  const input = JSON.stringify({ "0": { json: { secret: CONFIG.KOT_SECRET, kotId: kotId } } });
  const url = `${CONFIG.WEBSITE_URL}/api/trpc/kot.markPrinted?batch=1`;
  
  const body = input;
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body: body,
  });
  
  if (response && response[0] && response[0].error) {
    throw new Error(response[0].error.message || 'Failed to mark KOT as printed');
  }
  
  return response;
}

/**
 * Main polling loop
 */
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

// Start the client
startPolling();
