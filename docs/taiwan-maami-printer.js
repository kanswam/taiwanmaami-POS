#!/usr/bin/env node
/**
 * Taiwan Maami - KOT & Receipt Printer Client
 * Version 2.1 - ESC/POS Thermal Printer Support
 * 
 * SETUP:
 * 1. Install Node.js from https://nodejs.org (v18 or higher)
 * 2. Open Command Prompt in this folder
 * 3. Run: npm install node-thermal-printer
 * 4. Edit the CONFIG section below with your printer name
 * 5. Run: node taiwan-maami-printer.js
 * 
 * To find your printer name:
 * - Windows: Control Panel → Devices and Printers → Right-click printer → Properties
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to load thermal printer library
let ThermalPrinter, PrinterTypes;
try {
  const thermalPrinter = require('node-thermal-printer');
  ThermalPrinter = thermalPrinter.printer;
  PrinterTypes = thermalPrinter.types;
} catch (e) {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  SETUP REQUIRED: Install thermal printer library           ║');
  console.log('║                                                            ║');
  console.log('║  Run this command in the printer folder:                   ║');
  console.log('║  npm install node-thermal-printer                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(1);
}

// ╔════════════════════════════════════════════════════════════════╗
// ║                    CONFIGURATION                                ║
// ║         Edit these values for your setup                        ║
// ╚════════════════════════════════════════════════════════════════╝

const CONFIG = {
  // Your printer name (MUST match exactly as shown in Windows)
  PRINTER_NAME: 'EPSON TM-T82 Receipt',
  
  // Secret key for authentication (DO NOT SHARE THIS)
  KOT_PRINT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // How often to check for new orders (in seconds)
  POLL_INTERVAL_SECONDS: 10,
  
  // Website URL
  API_BASE_URL: 'https://www.taiwanmaami.com',
  
  // Paper width in characters (48 for 80mm paper, 32 for 58mm paper)
  PAPER_WIDTH: 48,
};

// ╔════════════════════════════════════════════════════════════════╗
// ║              DO NOT EDIT BELOW THIS LINE                        ║
// ╚════════════════════════════════════════════════════════════════╝

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
        'User-Agent': 'TaiwanMaami-Printer/2.1'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          log(`API Error: Status ${res.statusCode}`, 'ERROR');
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

// Create thermal printer instance
function createPrinter() {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${CONFIG.PRINTER_NAME}`,
    characterSet: 'PC437_USA',
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: {
      timeout: 5000
    }
  });
}

// Print KOT using thermal printer
async function printKOT(kot) {
  const printer = createPrinter();
  const width = CONFIG.PAPER_WIDTH;
  
  try {
    // Header
    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println('KITCHEN ORDER TICKET');
    printer.bold(false);
    printer.setTextNormal();
    printer.drawLine();
    
    // Order info
    printer.alignLeft();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println(`Order #: ${kot.orderNumber}`);
    printer.setTextNormal();
    printer.bold(false);
    
    const orderType = kot.kotData?.orderType || 'N/A';
    printer.println(`Type: ${orderType}`);
    
    const time = new Date(kot.createdAt).toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    printer.println(`Time: ${time}`);
    
    const customer = kot.kotData?.customerName || 'Guest';
    printer.println(`Customer: ${customer}`);
    
    if (kot.kotData?.customerPhone) {
      printer.println(`Phone: ${kot.kotData.customerPhone}`);
    }
    
    if (kot.kotData?.tableNumber) {
      printer.bold(true);
      printer.println(`Table: ${kot.kotData.tableNumber}`);
      printer.bold(false);
    }
    
    printer.drawLine();
    printer.newLine();
    
    // Items
    const items = kot.kotData?.items || [];
    items.forEach((item, idx) => {
      // Product name and quantity - bold and larger
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.println(`${idx + 1}. ${item.productName}`);
      printer.println(`   x${item.quantity}`);
      printer.setTextNormal();
      printer.bold(false);
      
      // Customizations
      if (item.size && item.size !== 'Regular') {
        printer.println(`   Size: ${item.size}`);
      }
      if (item.withBoba) {
        printer.println(`   Boba: ${item.withBoba}`);
      }
      if (item.sugarLevel) {
        printer.println(`   Sugar: ${item.sugarLevel}`);
      }
      if (item.iceLevel) {
        printer.println(`   Ice: ${item.iceLevel}`);
      }
      if (item.addons && item.addons.length > 0) {
        const addonStr = item.addons.map(a => 
          a.quantity > 1 ? `${a.name} x${a.quantity}` : a.name
        ).join(', ');
        printer.println(`   Add-ons: ${addonStr}`);
      }
      
      // Special instructions - highlighted
      if (item.specialInstructions) {
        printer.bold(true);
        printer.println(`   *** NOTE: ${item.specialInstructions}`);
        printer.bold(false);
      }
      
      printer.newLine();
    });
    
    // Order-level special instructions
    if (kot.kotData?.specialInstructions) {
      printer.drawLine();
      printer.bold(true);
      printer.println('ORDER NOTES:');
      printer.println(kot.kotData.specialInstructions);
      printer.bold(false);
    }
    
    // Footer
    printer.drawLine();
    printer.newLine();
    printer.newLine();
    printer.cut();
    
    // Execute print
    await printer.execute();
    return true;
  } catch (error) {
    log(`Thermal print error: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Print Receipt using thermal printer
async function printReceipt(receipt) {
  const printer = createPrinter();
  const data = receipt.receiptData || {};
  
  try {
    // Header
    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println('TAIWAN MAAMI');
    printer.setTextNormal();
    printer.bold(false);
    printer.println('Authentic Taiwanese Bubble Tea');
    printer.newLine();
    printer.drawLine();
    printer.bold(true);
    printer.println('TAX INVOICE');
    printer.bold(false);
    printer.drawLine();
    printer.newLine();
    
    // Order info
    printer.alignLeft();
    printer.println(`Order #: ${receipt.orderNumber}`);
    
    const date = new Date(receipt.createdAt).toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata'
    });
    printer.println(`Date: ${date}`);
    printer.println(`Type: ${data.orderType || 'N/A'}`);
    
    if (data.customerName) {
      printer.println(`Customer: ${data.customerName}`);
    }
    if (data.customerPhone) {
      printer.println(`Phone: ${data.customerPhone}`);
    }
    
    printer.newLine();
    printer.drawLine();
    printer.newLine();
    
    // Items
    const items = data.items || [];
    items.forEach(item => {
      const name = item.name || item.productName;
      const qty = item.quantity;
      const price = (item.price / 100).toFixed(2);
      const total = ((item.price * qty) / 100).toFixed(2);
      
      printer.println(name);
      printer.println(`  ${qty} x Rs.${price}    Rs.${total}`);
      
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => {
          printer.println(`  + ${addon.name}    Rs.${(addon.price / 100).toFixed(2)}`);
        });
      }
    });
    
    printer.newLine();
    printer.drawLine();
    
    // Totals
    printer.alignRight();
    if (data.subtotal) {
      printer.println(`Subtotal: Rs.${(data.subtotal / 100).toFixed(2)}`);
    }
    if (data.sgst) {
      printer.println(`SGST (2.5%): Rs.${(data.sgst / 100).toFixed(2)}`);
    }
    if (data.cgst) {
      printer.println(`CGST (2.5%): Rs.${(data.cgst / 100).toFixed(2)}`);
    }
    if (data.discount) {
      printer.println(`Discount: -Rs.${(data.discount / 100).toFixed(2)}`);
    }
    
    printer.drawLine();
    printer.bold(true);
    printer.println(`TOTAL: Rs.${(data.total / 100).toFixed(2)}`);
    printer.bold(false);
    printer.drawLine();
    
    // Footer
    printer.newLine();
    printer.alignCenter();
    printer.println('Thank you for your order!');
    printer.println('Visit us again');
    printer.newLine();
    printer.println('Thamarai Foods & Trading Pvt Ltd');
    printer.println('GSTIN: 33AAKCT4782H1Z1');
    printer.newLine();
    printer.newLine();
    printer.cut();
    
    await printer.execute();
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
          await printKOT(kot);
          
          // Mark as printed
          await apiRequest('/api/kot/printed', 'POST', {
            secret: CONFIG.KOT_PRINT_SECRET,
            kotId: kot.id
          });
          
          log(`✓ Printed KOT #${kot.id} (Order: ${kot.orderNumber})`);
        } catch (printError) {
          log(`✗ Failed to print KOT #${kot.id}: ${printError.message}`, 'ERROR');
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
          
          // Mark as printed
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

// Main polling loop
async function poll() {
  await pollKOT();
  await pollReceipt();
}

// Test printer connection
async function testPrinter() {
  log('Testing printer connection...');
  const printer = createPrinter();
  
  try {
    printer.alignCenter();
    printer.bold(true);
    printer.println('PRINTER TEST');
    printer.bold(false);
    printer.drawLine();
    printer.alignLeft();
    printer.println(`Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    printer.println(`Printer: ${CONFIG.PRINTER_NAME}`);
    printer.newLine();
    printer.println('If you can read this, the printer');
    printer.println('is working correctly!');
    printer.drawLine();
    printer.newLine();
    printer.newLine();
    printer.cut();
    
    await printer.execute();
    log('✓ Test print successful');
    return true;
  } catch (error) {
    log(`✗ Test print failed: ${error.message}`, 'ERROR');
    return false;
  }
}

// Startup
async function startup() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Taiwan Maami - KOT & Receipt Printer               ║');
  console.log('║                    Version 2.1                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  log(`Starting printer client...`);
  log(`Printer: ${CONFIG.PRINTER_NAME}`);
  log(`API URL: ${CONFIG.API_BASE_URL}`);
  log(`Polling every ${CONFIG.POLL_INTERVAL_SECONDS} seconds`);
  log(`Log file: ${LOG_FILE}`);
  console.log('');
  
  // Test printer
  await testPrinter();
  
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
