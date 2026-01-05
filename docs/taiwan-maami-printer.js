#!/usr/bin/env node
/**
 * Taiwan Maami - KOT & Receipt Printer Client
 * Version 2.3 - Dual Printer Support (Simple Method)
 * 
 * SETUP:
 * 1. Install Node.js from https://nodejs.org (v18 or higher)
 * 2. Edit the CONFIG section below with your printer names
 * 3. Double-click Start-Printer.bat to run
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// ╔════════════════════════════════════════════════════════════════╗
// ║                    CONFIGURATION                                ║
// ║         Edit these values for your setup                        ║
// ╚════════════════════════════════════════════════════════════════╝

const CONFIG = {
  // KOT Printers - KOTs will print to ALL printers in this list
  KOT_PRINTERS: [
    'MAIN BILL',        // Bar printer
    'KITCHEN KOT',      // Kitchen printer
  ],
  
  // Receipt Printer (for customer receipts)
  RECEIPT_PRINTER: 'MAIN BILL',
  
  // Secret key for authentication (DO NOT SHARE THIS)
  KOT_PRINT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // How often to check for new orders (in seconds)
  POLL_INTERVAL_SECONDS: 10,
  
  // Website URL
  API_BASE_URL: 'https://www.taiwanmaami.com',
  
  // Paper width in characters
  PAPER_WIDTH: 42,
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
        'User-Agent': 'TaiwanMaami-Printer/2.3'
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

// Print text to a specific printer
function printToDevice(text, printerName, filename) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `${filename}-${Date.now()}.txt`);
    
    fs.writeFileSync(tempFile, text, 'utf8');
    
    // Use Windows print command with specific printer
    const printCmd = `print /D:"${printerName}" "${tempFile}"`;
    
    exec(printCmd, (error, stdout, stderr) => {
      // Clean up temp file after a delay
      setTimeout(() => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }, 5000);
      
      if (error) {
        // Try alternative method using notepad
        const altCmd = `notepad /p "${tempFile}"`;
        exec(altCmd, (err2) => {
          if (err2) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

// Format KOT for printing
function formatKOT(kot) {
  const width = CONFIG.PAPER_WIDTH;
  const lines = [];
  
  lines.push('='.repeat(width));
  lines.push('');
  lines.push(centerText('KITCHEN ORDER TICKET', width));
  lines.push('='.repeat(width));
  lines.push('');
  
  lines.push(`Order #: ${kot.orderNumber}`);
  lines.push(`Type: ${kot.kotData?.orderType || 'N/A'}`);
  
  const time = new Date(kot.createdAt).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata'
  });
  lines.push(`Time: ${time}`);
  
  const customer = kot.kotData?.customerName || 'Guest';
  lines.push(`Customer: ${customer}`);
  
  if (kot.kotData?.customerPhone) {
    lines.push(`Phone: ${kot.kotData.customerPhone}`);
  }
  
  if (kot.kotData?.tableNumber) {
    lines.push(`Table: ${kot.kotData.tableNumber}`);
  }
  
  lines.push('');
  lines.push('-'.repeat(width));
  lines.push('');
  
  // Items
  const items = kot.kotData?.items || [];
  items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.productName}`);
    lines.push(`   x${item.quantity}`);
    
    if (item.size && item.size !== 'Regular') {
      lines.push(`   Size: ${item.size}`);
    }
    if (item.withBoba) {
      lines.push(`   Boba: ${item.withBoba}`);
    }
    if (item.sugarLevel) {
      lines.push(`   Sugar: ${item.sugarLevel}`);
    }
    if (item.iceLevel) {
      lines.push(`   Ice: ${item.iceLevel}`);
    }
    if (item.addons && item.addons.length > 0) {
      const addonStr = item.addons.map(a => 
        a.quantity > 1 ? `${a.name} x${a.quantity}` : a.name
      ).join(', ');
      lines.push(`   Add-ons: ${addonStr}`);
    }
    if (item.specialInstructions) {
      lines.push(`   *** ${item.specialInstructions}`);
    }
    lines.push('');
  });
  
  // Order-level special instructions
  if (kot.kotData?.specialInstructions) {
    lines.push('-'.repeat(width));
    lines.push('ORDER NOTES:');
    lines.push(kot.kotData.specialInstructions);
  }
  
  lines.push('='.repeat(width));
  lines.push('');
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
}

// Format Receipt for printing
function formatReceipt(receipt) {
  const width = CONFIG.PAPER_WIDTH;
  const lines = [];
  const data = receipt.receiptData || {};
  
  lines.push('='.repeat(width));
  lines.push('');
  lines.push(centerText('TAIWAN MAAMI', width));
  lines.push(centerText('Authentic Taiwanese Bubble Tea', width));
  lines.push('');
  lines.push('-'.repeat(width));
  lines.push(centerText('TAX INVOICE', width));
  lines.push('-'.repeat(width));
  lines.push('');
  
  lines.push(`Order #: ${receipt.orderNumber}`);
  const date = new Date(receipt.createdAt).toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata'
  });
  lines.push(`Date: ${date}`);
  lines.push(`Type: ${data.orderType || 'N/A'}`);
  
  if (data.customerName) {
    lines.push(`Customer: ${data.customerName}`);
  }
  if (data.customerPhone) {
    lines.push(`Phone: ${data.customerPhone}`);
  }
  
  lines.push('');
  lines.push('-'.repeat(width));
  lines.push('');
  
  // Items
  const items = data.items || [];
  items.forEach(item => {
    const name = item.name || item.productName;
    const qty = item.quantity;
    const price = (item.price / 100).toFixed(2);
    const total = ((item.price * qty) / 100).toFixed(2);
    
    lines.push(name);
    lines.push(`  ${qty} x Rs.${price}    Rs.${total}`);
    
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        lines.push(`  + ${addon.name}    Rs.${(addon.price / 100).toFixed(2)}`);
      });
    }
  });
  
  lines.push('');
  lines.push('-'.repeat(width));
  
  // Totals
  if (data.subtotal) {
    lines.push(rightAlign(`Subtotal: Rs.${(data.subtotal / 100).toFixed(2)}`, width));
  }
  if (data.sgst) {
    lines.push(rightAlign(`SGST (2.5%): Rs.${(data.sgst / 100).toFixed(2)}`, width));
  }
  if (data.cgst) {
    lines.push(rightAlign(`CGST (2.5%): Rs.${(data.cgst / 100).toFixed(2)}`, width));
  }
  if (data.discount) {
    lines.push(rightAlign(`Discount: -Rs.${(data.discount / 100).toFixed(2)}`, width));
  }
  
  lines.push('-'.repeat(width));
  lines.push(rightAlign(`TOTAL: Rs.${(data.total / 100).toFixed(2)}`, width));
  lines.push('-'.repeat(width));
  
  lines.push('');
  lines.push(centerText('Thank you for your order!', width));
  lines.push(centerText('Visit us again', width));
  lines.push('');
  lines.push(centerText('Thamarai Foods & Trading Pvt Ltd', width));
  lines.push(centerText('GSTIN: 33AAKCT4782H1Z1', width));
  lines.push('');
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
}

// Helper functions
function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function rightAlign(text, width) {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

// Print KOT to ALL configured printers
async function printKOT(kot) {
  const text = formatKOT(kot);
  const results = [];
  
  for (const printerName of CONFIG.KOT_PRINTERS) {
    try {
      await printToDevice(text, printerName, `kot-${kot.id}`);
      log(`✓ KOT printed to: ${printerName}`);
      results.push({ printer: printerName, success: true });
    } catch (error) {
      log(`✗ Failed to print KOT to ${printerName}: ${error.message}`, 'ERROR');
      results.push({ printer: printerName, success: false });
    }
  }
  
  return results.some(r => r.success);
}

// Print Receipt
async function printReceipt(receipt) {
  const text = formatReceipt(receipt);
  try {
    await printToDevice(text, CONFIG.RECEIPT_PRINTER, `receipt-${receipt.id}`);
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
  console.log('║              Version 2.3 - Dual Printer                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  log(`Starting printer client...`);
  log(`KOT Printers: ${CONFIG.KOT_PRINTERS.join(', ')}`);
  log(`Receipt Printer: ${CONFIG.RECEIPT_PRINTER}`);
  log(`Polling every ${CONFIG.POLL_INTERVAL_SECONDS} seconds`);
  log(`Log file: ${LOG_FILE}`);
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
