/**
 * Taiwan Maami - KOT Polling Client
 * 
 * This script runs on the outlet computer and:
 * 1. Polls the website every 10 seconds for new KOTs
 * 2. Prints KOTs to the Essae thermal printer
 * 3. Marks KOTs as printed in the database
 * 
 * Requirements:
 * - Node.js v18 or higher
 * - Network access to website
 * - Network access to Essae printer (192.168.1.22:9100)
 */

const net = require('net');
const https = require('https');

// ============================================
// CONFIGURATION - Update these values
// ============================================

// Website URL (your published website)
const WEBSITE_URL = "https://your-website.manus.space";

// Printer IP and Port (Essae thermal printer)
const PRINTER_IP = "192.168.1.22";
const PRINTER_PORT = 9100;

// Security secret (must match website environment variable)
const KOT_PRINT_SECRET = "LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a";

// Outlet ID (1 = T Nagar)
const OUTLET_ID = 1;

// Polling interval (milliseconds)
const POLL_INTERVAL = 10000; // 10 seconds

// ============================================
// ESC/POS Commands for thermal printer
// ============================================
const ESC = '\\x1B';
const GS = '\\x1D';
const COMMANDS = {
  INIT: '\\x1B@',                    // Initialize printer
  CENTER: '\\x1Ba\\x01',             // Center alignment
  LEFT: '\\x1Ba\\x00',               // Left alignment
  BOLD_ON: '\\x1BE\\x01',            // Bold on
  BOLD_OFF: '\\x1BE\\x00',           // Bold off
  DOUBLE_HEIGHT: '\\x1B!\\x10',      // Double height
  NORMAL: '\\x1B!\\x00',             // Normal size
  CUT: '\\x1DVA\\x00',               // Full cut
  FEED: '\\x0A',                     // Line feed
};

// ============================================
// Helper Functions
// ============================================

function escapeCommands(str) {
  return str.replace(/\\\\x([0-9A-Fa-f]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

function formatPrice(paise) {
  return '₹' + (paise / 100).toFixed(2);
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// ============================================
// KOT Formatting
// ============================================

function formatKOT(kotData) {
  let receipt = '';
  
  // Initialize
  receipt += COMMANDS.INIT;
  
  // Header
  receipt += COMMANDS.CENTER;
  receipt += COMMANDS.DOUBLE_HEIGHT;
  receipt += COMMANDS.BOLD_ON;
  receipt += '================================\\n';
  receipt += '      TAIWAN MAAMI\\n';
  receipt += '   Kitchen Order Ticket\\n';
  receipt += '================================\\n';
  receipt += COMMANDS.NORMAL;
  receipt += COMMANDS.BOLD_OFF;
  receipt += COMMANDS.FEED;
  
  // Order Info
  receipt += COMMANDS.LEFT;
  receipt += 'Order: ' + kotData.orderId + '\\n';
  receipt += 'Time: ' + formatDateTime(kotData.createdAt) + '\\n';
  receipt += COMMANDS.FEED;
  
  // Customer Info
  receipt += 'Customer: ' + (kotData.customerName || 'Guest') + '\\n';
  if (kotData.customerPhone) {
    receipt += 'Phone: ' + kotData.customerPhone + '\\n';
  }
  receipt += 'Type: ' + (kotData.orderType || 'N/A').toUpperCase() + '\\n';
  receipt += COMMANDS.FEED;
  
  // Items Header
  receipt += COMMANDS.BOLD_ON;
  receipt += '================================\\n';
  receipt += 'ITEMS:\\n';
  receipt += '================================\\n';
  receipt += COMMANDS.BOLD_OFF;
  receipt += COMMANDS.FEED;
  
  // Items
  if (kotData.items && kotData.items.length > 0) {
    kotData.items.forEach((item, index) => {
      receipt += COMMANDS.BOLD_ON;
      receipt += (index + 1) + '. ' + item.productName + ' x' + item.quantity + '\\n';
      receipt += COMMANDS.BOLD_OFF;
      
      // Item details
      if (item.size) receipt += '   Size: ' + item.size + '\\n';
      if (item.withBoba !== undefined) receipt += '   Boba: ' + (item.withBoba ? 'Yes' : 'No') + '\\n';
      if (item.sugarLevel) receipt += '   Sugar: ' + item.sugarLevel + '\\n';
      if (item.iceLevel) receipt += '   Ice: ' + item.iceLevel + '\\n';
      
      // Special instructions
      if (item.specialInstructions) {
        receipt += COMMANDS.BOLD_ON;
        receipt += '   >>> ' + item.specialInstructions + '\\n';
        receipt += COMMANDS.BOLD_OFF;
      }
      
      receipt += '   Item Total: ' + formatPrice(item.price * item.quantity) + '\\n';
      receipt += '--------------------------------\\n';
    });
  }
  
  // Total
  receipt += COMMANDS.FEED;
  receipt += COMMANDS.BOLD_ON;
  receipt += COMMANDS.DOUBLE_HEIGHT;
  receipt += '================================\\n';
  receipt += 'TOTAL AMOUNT: ' + formatPrice(kotData.totalAmount) + '\\n';
  receipt += '================================\\n';
  receipt += COMMANDS.NORMAL;
  receipt += COMMANDS.BOLD_OFF;
  
  // Footer
  receipt += COMMANDS.FEED;
  receipt += COMMANDS.FEED;
  receipt += COMMANDS.FEED;
  receipt += COMMANDS.CUT;
  
  return escapeCommands(receipt);
}

// ============================================
// Printer Functions
// ============================================

function printToThermal(data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.setTimeout(5000);
    
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log('Connected to printer');
      client.write(data);
      client.end();
    });
    
    client.on('close', () => {
      console.log('Printer connection closed');
      resolve(true);
    });
    
    client.on('error', (err) => {
      console.error('Printer error:', err.message);
      reject(err);
    });
    
    client.on('timeout', () => {
      console.error('Printer connection timeout');
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// ============================================
// API Functions
// ============================================

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBSITE_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = https.request(options, (res) => {
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
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function pollPendingKOTs() {
  try {
    const params = new URLSearchParams({
      input: JSON.stringify({ secret: KOT_PRINT_SECRET, outletId: OUTLET_ID })
    });
    
    const response = await makeRequest('GET', '/api/trpc/kot.pollPending?' + params.toString());
    
    if (response.result && response.result.data) {
      return response.result.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error polling KOTs:', error.message);
    return [];
  }
}

async function markKOTAsPrinted(kotId) {
  try {
    const response = await makeRequest('POST', '/api/trpc/kot.markPrinted', {
      secret: KOT_PRINT_SECRET,
      kotId: kotId
    });
    
    return response.result && response.result.data && response.result.data.success;
  } catch (error) {
    console.error('Error marking KOT as printed:', error.message);
    return false;
  }
}

// ============================================
// Main Polling Loop
// ============================================

async function processKOTs() {
  console.log('Polling for new KOTs...');
  
  const pendingKOTs = await pollPendingKOTs();
  
  if (pendingKOTs.length === 0) {
    console.log('No pending KOTs');
    return;
  }
  
  console.log('Found ' + pendingKOTs.length + ' pending KOT(s)');
  
  for (const kot of pendingKOTs) {
    try {
      console.log('Processing KOT #' + kot.id + ' for order ' + kot.orderId);
      
      // Format and print
      const printData = formatKOT(kot.kotData);
      await printToThermal(printData);
      
      console.log('Printed KOT #' + kot.id);
      
      // Mark as printed
      const marked = await markKOTAsPrinted(kot.id);
      if (marked) {
        console.log('Marked KOT #' + kot.id + ' as printed');
      } else {
        console.error('Failed to mark KOT #' + kot.id + ' as printed');
      }
      
    } catch (error) {
      console.error('Error processing KOT #' + kot.id + ':', error.message);
    }
  }
}

// ============================================
// Start Polling
// ============================================

console.log('');
console.log('========================================');
console.log('  Taiwan Maami - KOT Polling Client');
console.log('========================================');
console.log('');
console.log('Website: ' + WEBSITE_URL);
console.log('Printer: ' + PRINTER_IP + ':' + PRINTER_PORT);
console.log('Outlet ID: ' + OUTLET_ID);
console.log('Poll Interval: ' + (POLL_INTERVAL / 1000) + ' seconds');
console.log('');
console.log('Starting polling...');
console.log('');

// Initial poll
processKOTs();

// Set up interval
setInterval(processKOTs, POLL_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\nShutting down...');
  process.exit(0);
});
