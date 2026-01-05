#!/usr/bin/env node
/**
 * Taiwan Maami - KOT & Receipt Printer Client
 * 
 * SIMPLE SETUP:
 * 1. Install Node.js from https://nodejs.org
 * 2. Edit the CONFIG section below with your printer name
 * 3. Double-click this file to run (or run: node taiwan-maami-printer.js)
 * 
 * To find your printer name:
 * - Windows: Control Panel → Devices and Printers → Right-click printer → Properties
 * - Mac: System Preferences → Printers & Scanners
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ╔════════════════════════════════════════════════════════════════╗
// ║                    CONFIGURATION                                ║
// ║         Edit these values for your setup                        ║
// ╚════════════════════════════════════════════════════════════════╝

const CONFIG = {
  // Your printer name (MUST match exactly as shown in system settings)
  PRINTER_NAME: 'EPSON TM-T82 Receipt',
  
  // Secret key for authentication (DO NOT SHARE THIS)
  KOT_PRINT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // How often to check for new orders (in seconds)
  POLL_INTERVAL_SECONDS: 10,
  
  // Website URL (don't change unless instructed)
  API_BASE_URL: 'https://www.taiwanmaami.com',
};

// ╔════════════════════════════════════════════════════════════════╗
// ║              DO NOT EDIT BELOW THIS LINE                        ║
// ╚════════════════════════════════════════════════════════════════╝

const POLL_INTERVAL = CONFIG.POLL_INTERVAL_SECONDS * 1000;
const LOG_FILE = path.join(__dirname, 'printer-log.txt');

// Logging
function log(message, type = 'INFO') {
  const timestamp = new Date().toLocaleString();
  const logLine = `[${timestamp}] [${type}] ${message}`;
  console.log(logLine);
  try {
    fs.appendFileSync(LOG_FILE, logLine + '\n');
  } catch (e) {}
}

// HTTP request helper with better error handling
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
        'User-Agent': 'TaiwanMaami-Printer/2.0'
      },
      timeout: 30000 // 30 second timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          log(`API Error: Status ${res.statusCode} - ${data}`, 'ERROR');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          log(`API Parse Error: ${e.message}`, 'ERROR');
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      log(`API Network Error: ${error.message}`, 'ERROR');
      reject(error);
    });
    
    req.on('timeout', () => {
      log('API Request Timeout', 'ERROR');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Print to thermal printer
function printText(text, filename) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `${filename}.txt`);
    
    fs.writeFileSync(tempFile, text, 'utf8');
    
    let printCmd;
    if (process.platform === 'win32') {
      // Windows - use notepad for printing (more reliable)
      printCmd = `notepad /p "${tempFile}"`;
    } else if (process.platform === 'darwin') {
      // macOS
      printCmd = `lpr -P "${CONFIG.PRINTER_NAME}" "${tempFile}"`;
    } else {
      // Linux
      printCmd = `lpr -P "${CONFIG.PRINTER_NAME}" "${tempFile}"`;
    }
    
    exec(printCmd, (error, stdout, stderr) => {
      // Clean up temp file after a delay
      setTimeout(() => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }, 5000);
      
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Format KOT for printing
function formatKOT(kot) {
  const width = 42;
  const lines = [];
  
  lines.push('='.repeat(width));
  lines.push(centerText('KITCHEN ORDER TICKET', width));
  lines.push('='.repeat(width));
  lines.push('');
  lines.push(`Order #: ${kot.orderNumber}`);
  lines.push(`Type: ${kot.kotData?.orderType || 'N/A'}`);
  lines.push(`Time: ${new Date(kot.createdAt).toLocaleString()}`);
  lines.push(`Customer: ${kot.kotData?.customerName || 'Guest'}`);
  if (kot.kotData?.customerPhone) {
    lines.push(`Phone: ${kot.kotData.customerPhone}`);
  }
  lines.push('');
  lines.push('-'.repeat(width));
  lines.push('');
  
  // Items
  const items = kot.kotData?.items || [];
  items.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item.productName} x${item.quantity}`);
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
      lines.push(`   Add-ons: ${item.addons.map(a => a.name).join(', ')}`);
    }
    if (item.specialInstructions) {
      lines.push(`   Note: ${item.specialInstructions}`);
    }
    lines.push('');
  });
  
  if (kot.kotData?.specialInstructions) {
    lines.push('-'.repeat(width));
    lines.push(`ORDER NOTES: ${kot.kotData.specialInstructions}`);
  }
  
  lines.push('');
  lines.push('='.repeat(width));
  lines.push('');
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
}

// Format Receipt/Invoice for printing
function formatReceipt(receipt) {
  const width = 42;
  const lines = [];
  const data = receipt.receiptData || {};
  
  lines.push(centerText('TAIWAN MAAMI', width));
  lines.push(centerText('Authentic Taiwanese Bubble Tea', width));
  lines.push('');
  lines.push('='.repeat(width));
  lines.push(centerText('TAX INVOICE', width));
  lines.push('='.repeat(width));
  lines.push('');
  lines.push(`Order #: ${receipt.orderNumber}`);
  lines.push(`Date: ${new Date(receipt.createdAt).toLocaleString()}`);
  lines.push(`Type: ${data.orderType || 'N/A'}`);
  lines.push('');
  
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
    const itemTotal = (item.price * item.quantity / 100).toFixed(2);
    lines.push(`${item.name || item.productName}`);
    lines.push(`  ${item.quantity} x ₹${(item.price / 100).toFixed(2)}    ₹${itemTotal}`);
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        lines.push(`  + ${addon.name}    ₹${(addon.price / 100).toFixed(2)}`);
      });
    }
  });
  
  lines.push('');
  lines.push('-'.repeat(width));
  
  // Totals
  if (data.subtotal) {
    lines.push(rightAlign(`Subtotal: ₹${(data.subtotal / 100).toFixed(2)}`, width));
  }
  if (data.sgst) {
    lines.push(rightAlign(`SGST (2.5%): ₹${(data.sgst / 100).toFixed(2)}`, width));
  }
  if (data.cgst) {
    lines.push(rightAlign(`CGST (2.5%): ₹${(data.cgst / 100).toFixed(2)}`, width));
  }
  if (data.discount) {
    lines.push(rightAlign(`Discount: -₹${(data.discount / 100).toFixed(2)}`, width));
  }
  
  lines.push('-'.repeat(width));
  lines.push(rightAlign(`TOTAL: ₹${(data.total / 100).toFixed(2)}`, width));
  lines.push('='.repeat(width));
  
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

function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function rightAlign(text, width) {
  const padding = Math.max(0, width - text.length);
  return ' '.repeat(padding) + text;
}

// Poll for KOTs
async function pollKOT() {
  try {
    const response = await apiRequest(`/api/kot/poll?secret=${CONFIG.KOT_PRINT_SECRET}`);
    
    if (response.kots && response.kots.length > 0) {
      log(`Found ${response.kots.length} pending KOT(s)`);
      
      for (const kot of response.kots) {
        try {
          const kotText = formatKOT(kot);
          await printText(kotText, `kot_${kot.id}`);
          
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
          const receiptText = formatReceipt(receipt);
          await printText(receiptText, `receipt_${receipt.id}`);
          
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

// Startup
console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Taiwan Maami - KOT & Receipt Printer               ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
log(`Starting printer client...`);
log(`Printer: ${CONFIG.PRINTER_NAME}`);
log(`Polling every ${CONFIG.POLL_INTERVAL_SECONDS} seconds`);
log(`Log file: ${LOG_FILE}`);
console.log('');
console.log('Press Ctrl+C to stop');
console.log('');

// Initial poll
poll();

// Set up interval
setInterval(poll, POLL_INTERVAL);

// Handle exit
process.on('SIGINT', () => {
  log('Printer client stopped');
  process.exit(0);
});
