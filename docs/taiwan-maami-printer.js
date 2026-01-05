#!/usr/bin/env node
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
        if (res.statusCode !== 200) {
          log(`API Error: Status ${res.statusCode} - ${data}`, 'ERROR');
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Send data directly to network printer via TCP socket
function printToNetwork(data, printer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.setTimeout(10000);
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`Connection error: ${err.message}`));
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
    
    socket.connect(printer.port, printer.ip, () => {
      socket.write(data, 'binary', (err) => {
        if (err) {
          socket.destroy();
          reject(err);
        } else {
          // Give printer time to receive data
          setTimeout(() => {
            socket.end();
            resolve();
          }, 500);
        }
      });
    });
    
    socket.on('close', () => {
      resolve();
    });
  });
}

// Format KOT with ESC/POS commands
function formatKOT(kot) {
  const width = CONFIG.PAPER_WIDTH;
  let data = '';
  
  // Initialize printer
  data += COMMANDS.INIT;
  
  // Header
  data += COMMANDS.ALIGN_CENTER;
  data += COMMANDS.DOUBLE_ON;
  data += COMMANDS.BOLD_ON;
  data += 'KITCHEN ORDER TICKET\n';
  data += COMMANDS.NORMAL;
  data += COMMANDS.BOLD_OFF;
  data += '='.repeat(width) + '\n';
  
  // Order info
  data += COMMANDS.ALIGN_LEFT;
  data += COMMANDS.DOUBLE_HEIGHT_ON;
  data += COMMANDS.BOLD_ON;
  data += `Order #: ${kot.orderNumber}\n`;
  data += COMMANDS.NORMAL;
  data += COMMANDS.BOLD_OFF;
  
  const orderType = kot.kotData?.orderType || 'N/A';
  data += `Type: ${orderType}\n`;
  
  const time = new Date(kot.createdAt).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  data += `Time: ${time}\n`;
  
  const customer = kot.kotData?.customerName || 'Guest';
  data += `Customer: ${customer}\n`;
  
  if (kot.kotData?.customerPhone) {
    data += `Phone: ${kot.kotData.customerPhone}\n`;
  }
  
  if (kot.kotData?.tableNumber) {
    data += COMMANDS.BOLD_ON;
    data += `Table: ${kot.kotData.tableNumber}\n`;
    data += COMMANDS.BOLD_OFF;
  }
  
  data += '-'.repeat(width) + '\n\n';
  
  // Items
  const items = kot.kotData?.items || [];
  items.forEach((item, idx) => {
    // Product name - bold and larger
    data += COMMANDS.DOUBLE_HEIGHT_ON;
    data += COMMANDS.BOLD_ON;
    data += `${idx + 1}. ${item.productName}\n`;
    data += `   x${item.quantity}\n`;
    data += COMMANDS.NORMAL;
    data += COMMANDS.BOLD_OFF;
    
    // Customizations
    if (item.size && item.size !== 'Regular') {
      data += `   Size: ${item.size}\n`;
    }
    if (item.withBoba) {
      data += `   Boba: ${item.withBoba}\n`;
    }
    if (item.sugarLevel) {
      data += `   Sugar: ${item.sugarLevel}\n`;
    }
    if (item.iceLevel) {
      data += `   Ice: ${item.iceLevel}\n`;
    }
    if (item.addons && item.addons.length > 0) {
      const addonStr = item.addons.map(a => 
        a.quantity > 1 ? `${a.name} x${a.quantity}` : a.name
      ).join(', ');
      data += `   Add-ons: ${addonStr}\n`;
    }
    
    // Special instructions - highlighted
    if (item.specialInstructions) {
      data += COMMANDS.BOLD_ON;
      data += `   *** ${item.specialInstructions}\n`;
      data += COMMANDS.BOLD_OFF;
    }
    
    data += '\n';
  });
  
  // Order-level special instructions
  if (kot.kotData?.specialInstructions) {
    data += '-'.repeat(width) + '\n';
    data += COMMANDS.BOLD_ON;
    data += 'ORDER NOTES:\n';
    data += kot.kotData.specialInstructions + '\n';
    data += COMMANDS.BOLD_OFF;
  }
  
  // Footer
  data += '='.repeat(width) + '\n';
  data += COMMANDS.FEED_LINES(4);
  data += COMMANDS.CUT;
  
  return data;
}

// Format Receipt with ESC/POS commands
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
    const name = item.name || item.productName;
    const qty = item.quantity;
    const price = (item.price / 100).toFixed(2);
    const total = ((item.price * qty) / 100).toFixed(2);
    
    data += `${name}\n`;
    data += `  ${qty} x Rs.${price}    Rs.${total}\n`;
    
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        data += `  + ${addon.name}    Rs.${(addon.price / 100).toFixed(2)}\n`;
      });
    }
  });
  
  data += '\n' + '-'.repeat(width) + '\n';
  
  // Totals
  data += COMMANDS.ALIGN_RIGHT;
  if (data_obj.subtotal) {
    data += `Subtotal: Rs.${(data_obj.subtotal / 100).toFixed(2)}\n`;
  }
  if (data_obj.sgst) {
    data += `SGST (2.5%): Rs.${(data_obj.sgst / 100).toFixed(2)}\n`;
  }
  if (data_obj.cgst) {
    data += `CGST (2.5%): Rs.${(data_obj.cgst / 100).toFixed(2)}\n`;
  }
  if (data_obj.discount) {
    data += `Discount: -Rs.${(data_obj.discount / 100).toFixed(2)}\n`;
  }
  
  data += '-'.repeat(width) + '\n';
  data += COMMANDS.BOLD_ON;
  data += `TOTAL: Rs.${(data_obj.total / 100).toFixed(2)}\n`;
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
async function printKOT(kot) {
  const data = formatKOT(kot);
  const results = [];
  
  for (const printer of CONFIG.KOT_PRINTERS) {
    try {
      await printToNetwork(data, printer);
      log(`✓ KOT printed to: ${printer.name} (${printer.ip})`);
      results.push({ printer: printer.name, success: true });
    } catch (error) {
      log(`✗ Failed to print KOT to ${printer.name} (${printer.ip}): ${error.message}`, 'ERROR');
      results.push({ printer: printer.name, success: false, error: error.message });
    }
  }
  
  return results.some(r => r.success);
}

// Print Receipt
async function printReceipt(receipt) {
  const data = formatReceipt(receipt);
  try {
    await printToNetwork(data, CONFIG.RECEIPT_PRINTER);
    return true;
  } catch (error) {
    log(`Receipt print error: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Poll for KOTs
async function pollKOT() {
  try {
    const response = await apiRequest(`/api/kot/poll?secret=${CONFIG.KOT_PRINT_SECRET}`);
    
    if (response.kots && response.kots.length > 0) {
      log(`Found ${response.kots.length} pending KOT(s)`);
      
      for (const kot of response.kots) {
        try {
          const printed = await printKOT(kot);
          
          if (printed) {
            await apiRequest('/api/kot/printed', 'POST', {
              secret: CONFIG.KOT_PRINT_SECRET,
              kotId: kot.id
            });
            log(`✓ KOT #${kot.id} (Order: ${kot.orderNumber}) processed`);
          }
        } catch (printError) {
          log(`✗ Failed to process KOT #${kot.id}: ${printError.message}`, 'ERROR');
        }
      }
    }
  } catch (error) {
    log(`KOT poll error: ${error.message}`, 'ERROR');
  }
}

// Poll for Receipts
async function pollReceipt() {
  try {
    const response = await apiRequest(`/api/receipt/poll?secret=${CONFIG.KOT_PRINT_SECRET}`);
    
    if (response.receipts && response.receipts.length > 0) {
      log(`Found ${response.receipts.length} pending receipt(s)`);
      
      for (const receipt of response.receipts) {
        try {
          await printReceipt(receipt);
          
          await apiRequest('/api/receipt/printed', 'POST', {
            secret: CONFIG.KOT_PRINT_SECRET,
            receiptId: receipt.id
          });
          
          log(`✓ Printed Receipt #${receipt.id} (Order: ${receipt.orderNumber})`);
        } catch (printError) {
          log(`✗ Failed to print Receipt #${receipt.id}: ${printError.message}`, 'ERROR');
        }
      }
    }
  } catch (error) {
    log(`Receipt poll error: ${error.message}`, 'ERROR');
  }
}

// Test printer connection
async function testPrinter(printer) {
  let data = '';
  data += COMMANDS.INIT;
  data += COMMANDS.ALIGN_CENTER;
  data += COMMANDS.BOLD_ON;
  data += 'PRINTER TEST\n';
  data += COMMANDS.BOLD_OFF;
  data += '-'.repeat(32) + '\n';
  data += COMMANDS.ALIGN_LEFT;
  data += `Printer: ${printer.name}\n`;
  data += `IP: ${printer.ip}\n`;
  data += `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
  data += '-'.repeat(32) + '\n';
  data += 'Connection OK!\n';
  data += COMMANDS.FEED_LINES(3);
  data += COMMANDS.CUT;
  
  await printToNetwork(data, printer);
}

// Main polling loop
async function poll() {
  await pollKOT();
  await pollReceipt();
}

// Startup
async function startup() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Taiwan Maami - KOT & Receipt Printer               ║');
  console.log('║           Version 2.4 - Network Printer                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  log(`Starting printer client...`);
  log(`KOT Printers:`);
  CONFIG.KOT_PRINTERS.forEach(p => log(`  - ${p.name}: ${p.ip}:${p.port}`));
  log(`Receipt Printer: ${CONFIG.RECEIPT_PRINTER.name} (${CONFIG.RECEIPT_PRINTER.ip})`);
  log(`Polling every ${CONFIG.POLL_INTERVAL_SECONDS} seconds`);
  log(`Log file: ${LOG_FILE}`);
  console.log('');
  
  // Test printer connections
  log('Testing printer connections...');
  for (const printer of CONFIG.KOT_PRINTERS) {
    try {
      await testPrinter(printer);
      log(`✓ ${printer.name} (${printer.ip}) - OK`);
    } catch (error) {
      log(`✗ ${printer.name} (${printer.ip}) - FAILED: ${error.message}`, 'ERROR');
    }
  }
  
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
  
  // Initial poll
  poll();
  
  // Set up interval
  setInterval(poll, POLL_INTERVAL);
}

// Handle exit
process.on('SIGINT', () => {
  log('Printer client stopped');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
});

// Start
startup();
