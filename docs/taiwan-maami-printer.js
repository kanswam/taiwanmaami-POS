/**
 * Taiwan Maami - KOT & Receipt Printer Client
 * Version 2.4 - Network Printer Support
 * 
 * SETUP:
 * 1. Install Node.js from https://nodejs.org (v18 or higher)
 * 2. Edit the CONFIG section below with your printer IP addresses
 * 3. Double-click Start-Printer.bat to run
 */

const https = require('https');
const net = require('net');
const fs = require('fs');
const path = require('path');

// ╔════════════════════════════════════════════════════════════════╗
// ║                    CONFIGURATION                                ║
// ║         Edit these values for your setup                        ║
// ╚════════════════════════════════════════════════════════════════╝

const CONFIG = {
  // KOT Printers - KOTs will print to ALL printers in this list
  KOT_PRINTERS: [
    { name: 'MAIN BILL', ip: '192.168.1.23', port: 9100 },
    { name: 'KITCHEN KOT', ip: '192.168.1.22', port: 9100 },
  ],
  
  // Receipt Printer (for customer receipts)
  RECEIPT_PRINTER: { name: 'MAIN BILL', ip: '192.168.1.23', port: 9100 },
  
  // Secret key for authentication (DO NOT SHARE THIS)
  KOT_PRINT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // How often to check for new orders (in seconds)
  POLL_INTERVAL_SECONDS: 10,
  
  // Website URL
  API_BASE_URL: 'https://www.taiwanmaami.com',
  
  // Paper width in characters (48 for 80mm, 32 for 58mm)
  PAPER_WIDTH: 48,
};

// ╔════════════════════════════════════════════════════════════════╗
// ║              DO NOT EDIT BELOW THIS LINE                        ║
// ╚════════════════════════════════════════════════════════════════╝

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: ESC + '@',                    // Initialize printer
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_HEIGHT_ON: ESC + '!' + '\x10',
  DOUBLE_WIDTH_ON: ESC + '!' + '\x20',
  DOUBLE_ON: ESC + '!' + '\x30',      // Double height + width
  NORMAL: ESC + '!' + '\x00',
  CUT: GS + 'V' + '\x00',             // Full cut
  PARTIAL_CUT: GS + 'V' + '\x01',
  FEED_LINES: (n) => ESC + 'd' + String.fromCharCode(n),
};

const POLL_INTERVAL = CONFIG.POLL_INTERVAL_SECONDS * 1000;
const LOG_FILE = path.join(__dirname, 'printer-log.txt');

// Logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const logLine = `[${timestamp}] [${type}] ${message}`;
  console.log(logLine);
  try {
    fs.appendFileSync(LOG_FILE, logLine + '\n');
  } catch (e) {}
}

// HTTP request helper
function apiRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.API_BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TaiwanMaami-Printer/2.4'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Format KOT (Kitchen Order Ticket)
function formatKOT(order) {
  const width = CONFIG.PAPER_WIDTH;
  const items = order.items || [];
  let data = '';

  // Initialize printer
  data += COMMANDS.INIT;

  // Header
  data += COMMANDS.ALIGN_CENTER;
  data += COMMANDS.DOUBLE_ON;
  data += COMMANDS.BOLD_ON;
  data += 'TAIWAN MAAMI\n';
  data += COMMANDS.NORMAL;
  data += COMMANDS.BOLD_OFF;
  data += 'Kitchen Order Ticket\n\n';
  data += '-'.repeat(width) + '\n';

  // Order info
  data += COMMANDS.ALIGN_LEFT;
  data += `Order #: ${order.orderNumber}\n`;
  
  const date = new Date(order.createdAt).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata'
  });
  data += `Time: ${date}\n`;
  data += `Type: ${order.orderType.toUpperCase()}\n`;
  
  if (order.tableNumber) {
    data += `Table: ${order.tableNumber}\n`;
  }
  if (order.customerName) {
    data += `Customer: ${order.customerName}\n`;
  }

  data += '\n' + '-'.repeat(width) + '\n\n';

  // Items
  items.forEach((item, index) => {
    data += `${index + 1}. ${item.productName}\n`;
    data += `   Qty: ${item.quantity}`;
    
    if (item.size) data += ` | Size: ${item.size}`;
    if (item.sugarLevel) data += ` | Sugar: ${item.sugarLevel}`;
    if (item.iceLevel) data += ` | Ice: ${item.iceLevel}`;
    if (item.withBoba !== undefined) data += ` | Boba: ${item.withBoba ? 'Yes' : 'No'}`;
    
    data += '\n';

    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        data += `   + ${addon.name}\n`;
      });
    }
    data += '\n';
  });

  data += '-'.repeat(width) + '\n';
  
  if (order.staffNotes) {
    data += COMMANDS.BOLD_ON;
    data += 'SPECIAL INSTRUCTIONS:\n';
    data += COMMANDS.BOLD_OFF;
    data += order.staffNotes + '\n';
    data += '-'.repeat(width) + '\n';
  }

  data += COMMANDS.ALIGN_CENTER;
  data += 'Please prepare carefully\n\n';
  data += COMMANDS.FEED_LINES(4);
  data += COMMANDS.CUT;

  return data;
}

// Format Receipt with correct field names
function formatReceipt(receipt) {
  const width = CONFIG.PAPER_WIDTH;
  const data_obj = receipt.receiptData || {};
  let data = '';
  
  // Initialize printer
  data += COMMANDS.INIT;
  
  // Header
  data += COMMANDS.ALIGN_CENTER;
  data += COMMANDS.DOUBLE_ON;
  data += COMMANDS.BOLD_ON;
  data += 'TAIWAN MAAMI\n';
  data += COMMANDS.NORMAL;
  data += COMMANDS.BOLD_OFF;
  data += 'Authentic Taiwanese Bubble Tea\n\n';
  data += '-'.repeat(width) + '\n';
  data += COMMANDS.BOLD_ON;
  data += 'TAX INVOICE\n';
  data += COMMANDS.BOLD_OFF;
  data += '-'.repeat(width) + '\n\n';
  
  // Order info
  data += COMMANDS.ALIGN_LEFT;
  data += `Order #: ${receipt.orderNumber}\n`;
  
  const date = new Date(receipt.createdAt).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata'
  });
  data += `Date: ${date}\n`;
  data += `Type: ${data_obj.orderType || 'N/A'}\n`;
  
  if (data_obj.customerName) {
    data += `Customer: ${data_obj.customerName}\n`;
  }
  if (data_obj.customerPhone) {
    data += `Phone: ${data_obj.customerPhone}\n`;
  }
  
  data += '\n' + '-'.repeat(width) + '\n\n';
  
  // Items
  const items = data_obj.items || [];
  items.forEach(item => {
    const name = item.productName;
    const qty = item.quantity;
    const unitPrice = (item.unitPrice / 100).toFixed(2);
    const total = ((item.unitPrice * qty) / 100).toFixed(2);
    
    data += `${name}\n`;
    data += `  ${qty} x Rs.${unitPrice}    Rs.${total}\n`;
    
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        data += `  + ${addon.name}    Rs.${(addon.price / 100).toFixed(2)}\n`;
      });
    }
  });
  
  data += '\n' + '-'.repeat(width) + '\n';
  
  // Totals - FIXED TO USE CORRECT FIELD NAMES
  data += COMMANDS.ALIGN_RIGHT;
  if (data_obj.subtotal) {
    data += `Subtotal: Rs.${(data_obj.subtotal / 100).toFixed(2)}\n`;
  }
  if (data_obj.stateGst) {
    data += `SGST (2.5%): Rs.${(data_obj.stateGst / 100).toFixed(2)}\n`;
  }
  if (data_obj.centralGst) {
    data += `CGST (2.5%): Rs.${(data_obj.centralGst / 100).toFixed(2)}\n`;
  }
  if (data_obj.discountAmount) {
    data += `Discount: -Rs.${(data_obj.discountAmount / 100).toFixed(2)}\n`;
  }
  
  data += '-'.repeat(width) + '\n';
  data += COMMANDS.BOLD_ON;
  // TOTAL NOW CORRECTLY USES totalAmount WHICH INCLUDES GST
  data += `TOTAL: Rs.${(data_obj.totalAmount / 100).toFixed(2)}\n`;
  data += COMMANDS.BOLD_OFF;
  data += '-'.repeat(width) + '\n\n';
  
  // Footer
  data += COMMANDS.ALIGN_CENTER;
  data += 'Thank you for your order!\n';
  data += 'Visit us again\n\n';
  data += 'Thamarai Foods & Trading Pvt Ltd\n';
  data += 'GSTIN: 33AAKCT4782H1Z1\n';
  data += COMMANDS.FEED_LINES(4);
  data += COMMANDS.CUT;
  
  return data;
}

// Print KOT to ALL configured printers
async function printKOT(order) {
  const kotData = formatKOT(order);
  const printers = CONFIG.KOT_PRINTERS;

  for (const printer of printers) {
    try {
      await printToNetwork(printer, kotData);
      log(`KOT #${order.orderNumber} printed to ${printer.name}`, 'SUCCESS');
    } catch (error) {
      log(`Failed to print KOT to ${printer.name}: ${error.message}`, 'ERROR');
    }
  }
}

// Print Receipt
async function printReceipt(receipt) {
  const receiptData = formatReceipt(receipt);
  const printer = CONFIG.RECEIPT_PRINTER;

  try {
    await printToNetwork(printer, receiptData);
    log(`Receipt #${receipt.orderNumber} printed`, 'SUCCESS');
  } catch (error) {
    log(`Failed to print receipt: ${error.message}`, 'ERROR');
  }
}

// Print to Network Printer
function printToNetwork(printer, data) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(printer.port, printer.ip, () => {
      client.write(data, 'binary');
      client.end();
      resolve();
    });

    client.on('error', reject);
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// Poll for pending receipts
async function pollReceipts() {
  try {
    const response = await apiRequest('/api/receipt/poll');
    
    if (response.receipts && response.receipts.length > 0) {
      for (const receipt of response.receipts) {
        try {
          await printReceipt(receipt);
          
          // Mark as printed
          await apiRequest('/api/receipt/printed', 'POST', {
            secret: CONFIG.KOT_PRINT_SECRET,
            receiptId: receipt.id,
          });
        } catch (error) {
          log(`Error processing receipt ${receipt.id}: ${error.message}`, 'ERROR');
        }
      }
    }
  } catch (error) {
    log(`Poll error: ${error.message}`, 'ERROR');
  }
}

// Poll for pending KOTs
async function pollKOTs() {
  try {
    const response = await apiRequest('/api/kot/poll');
    
    if (response.kots && response.kots.length > 0) {
      for (const kot of response.kots) {
        try {
          await printKOT(kot.order);
          
          // Mark as printed
          await apiRequest('/api/kot/printed', 'POST', {
            secret: CONFIG.KOT_PRINT_SECRET,
            kotId: kot.id,
          });
        } catch (error) {
          log(`Error processing KOT ${kot.id}: ${error.message}`, 'ERROR');
        }
      }
    }
  } catch (error) {
    log(`KOT poll error: ${error.message}`, 'ERROR');
  }
}

// Main polling loop
async function startPolling() {
  log('Taiwan Maami Printer Service Started', 'INFO');
  log(`Polling interval: ${CONFIG.POLL_INTERVAL_SECONDS} seconds`, 'INFO');
  log(`API Base URL: ${CONFIG.API_BASE_URL}`, 'INFO');
  
  // Poll immediately on startup
  await pollKOTs();
  await pollReceipts();
  
  // Then poll at regular intervals
  setInterval(async () => {
    await pollKOTs();
    await pollReceipts();
  }, POLL_INTERVAL);
}

// Start the service
startPolling().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
