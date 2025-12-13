/**
 * Taiwan Maami KOT Polling Client v2.0
 * 
 * This client polls the Taiwan Maami server for pending Kitchen Order Tickets (KOTs)
 * and sends them to a thermal printer via ESC/POS commands.
 * 
 * Usage:
 *   1. Install Node.js on your Windows machine
 *   2. Save this file as polling-client.js
 *   3. Update the configuration below
 *   4. Run: node polling-client.js
 * 
 * Configuration:
 *   - WEBSITE_URL: The base URL of your Taiwan Maami website
 *   - KOT_SECRET: The secret key for KOT authentication (from your .env)
 *   - PRINTER_IP: The IP address of your thermal printer
 *   - PRINTER_PORT: The port of your thermal printer (usually 9100)
 *   - POLL_INTERVAL: How often to check for new KOTs (in milliseconds)
 */

const http = require('http');
const https = require('https');
const net = require('net');

// ============== CONFIGURATION ==============
const CONFIG = {
  WEBSITE_URL: 'https://www.taiwanmaami.com',  // Your website URL
  KOT_SECRET: 'your-kot-secret-here',           // Replace with your actual KOT secret
  PRINTER_IP: '192.168.1.22',                   // Your thermal printer IP
  PRINTER_PORT: 9100,                           // Thermal printer port
  POLL_INTERVAL: 5000,                          // Poll every 5 seconds
};
// ============================================

console.log('Taiwan Maami KOT Client v2.0 Started');
console.log(`Website: ${CONFIG.WEBSITE_URL}`);
console.log(`Printer: ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}`);
console.log('---');

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: ESC + '@',                    // Initialize printer
  ALIGN_CENTER: ESC + 'a' + '\x01',   // Center align
  ALIGN_LEFT: ESC + 'a' + '\x00',     // Left align
  BOLD_ON: ESC + 'E' + '\x01',        // Bold on
  BOLD_OFF: ESC + 'E' + '\x00',       // Bold off
  DOUBLE_HEIGHT: ESC + '!' + '\x10', // Double height
  DOUBLE_WIDTH: ESC + '!' + '\x20',  // Double width
  DOUBLE_SIZE: ESC + '!' + '\x30',   // Double height and width
  NORMAL_SIZE: ESC + '!' + '\x00',   // Normal size
  CUT: GS + 'V' + '\x00',            // Full cut
  PARTIAL_CUT: GS + 'V' + '\x01',    // Partial cut
  FEED: ESC + 'd' + '\x03',          // Feed 3 lines
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
 * Format price in rupees
 */
function formatPrice(paise) {
  return '₹' + (paise / 100).toFixed(2);
}

/**
 * Generate ESC/POS receipt for a KOT
 */
function generateReceipt(kot) {
  const data = kot.kotData;
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
  receipt += `Order #: ${data.orderNumber || kot.orderId}\n`;
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
      receipt += `${item.quantity}x ${item.name}\n`;
      receipt += COMMANDS.NORMAL_SIZE;
      
      // Size
      if (item.size) {
        receipt += `   Size: ${item.size}\n`;
      }
      
      // Customizations
      if (item.sugarLevel) {
        receipt += `   Sugar: ${item.sugarLevel}\n`;
      }
      if (item.iceLevel) {
        receipt += `   Ice: ${item.iceLevel}\n`;
      }
      
      // Addons
      if (item.addons && item.addons.length > 0) {
        receipt += `   Add-ons: ${item.addons.join(', ')}\n`;
      }
      
      // Special instructions
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
  
  // Special instructions for whole order
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
  
  // Feed and cut
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
    
    // Close connection after sending
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
 * Poll for pending KOTs
 */
async function pollForKOTs() {
  try {
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
          
          // Generate and print receipt
          const receipt = generateReceipt(kot);
          await printReceipt(receipt);
          
          // Mark as printed
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

/**
 * Mark KOT as printed
 */
async function markKOTAsPrinted(kotId) {
  const url = `${CONFIG.WEBSITE_URL}/api/kot/printed`;
  const body = JSON.stringify({
    secret: CONFIG.KOT_SECRET,
    kotId: kotId,
  });
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    body: body,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to mark KOT as printed');
  }
  
  return response;
}

/**
 * Main polling loop
 */
function startPolling() {
  console.log(`Starting polling every ${CONFIG.POLL_INTERVAL / 1000} seconds...`);
  console.log('');
  
  // Initial poll
  pollForKOTs();
  
  // Set up interval
  setInterval(() => {
    const now = new Date().toLocaleTimeString();
    console.log(`[${now}] Polling...`);
    pollForKOTs();
  }, CONFIG.POLL_INTERVAL);
}

// Start the client
startPolling();
