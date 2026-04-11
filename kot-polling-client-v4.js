/**
 * Taiwan Maami KOT Polling Client v4.0 (Debug Version)
 * 
 * Improved version with better debugging and simpler receipt format
 */

const http = require('http');
const https = require('https');
const net = require('net');

// ============== CONFIGURATION ==============
const CONFIG = {
  // Using DEV server
  WEBSITE_URL: 'https://3000-ibrb4llhlbghhxvbqrgy7-c775333b.manusvm.computer',
  KOT_SECRET: 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  PRINTER_IP: '192.168.1.22',
  PRINTER_PORT: 9100,
  POLL_INTERVAL: 5000,
  DEBUG: true,
};
// ============================================

console.log('Taiwan Maami KOT Client v4.0 (Debug) Started');
console.log(`Website: ${CONFIG.WEBSITE_URL}`);
console.log(`Printer: ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}`);
console.log('---');

// ESC/POS Commands - Using raw hex values for better compatibility
const ESC = Buffer.from([0x1B]);
const GS = Buffer.from([0x1D]);
const LF = Buffer.from([0x0A]);

function createCommand(...parts) {
  return Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p, 'ascii') : p));
}

// Initialize printer
const CMD_INIT = createCommand(ESC, Buffer.from('@'));
// Align center
const CMD_CENTER = createCommand(ESC, Buffer.from('a'), Buffer.from([0x01]));
// Align left
const CMD_LEFT = createCommand(ESC, Buffer.from('a'), Buffer.from([0x00]));
// Bold on
const CMD_BOLD_ON = createCommand(ESC, Buffer.from('E'), Buffer.from([0x01]));
// Bold off
const CMD_BOLD_OFF = createCommand(ESC, Buffer.from('E'), Buffer.from([0x00]));
// Double size
const CMD_DOUBLE = createCommand(ESC, Buffer.from('!'), Buffer.from([0x30]));
// Normal size
const CMD_NORMAL = createCommand(ESC, Buffer.from('!'), Buffer.from([0x00]));
// Feed 3 lines
const CMD_FEED = createCommand(ESC, Buffer.from('d'), Buffer.from([0x03]));
// Partial cut
const CMD_CUT = createCommand(GS, Buffer.from('V'), Buffer.from([0x01]));
// Full cut
const CMD_FULL_CUT = createCommand(GS, Buffer.from('V'), Buffer.from([0x00]));

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
  const parts = [];
  
  // Initialize
  parts.push(CMD_INIT);
  
  // Header
  parts.push(CMD_CENTER);
  parts.push(CMD_DOUBLE);
  parts.push(CMD_BOLD_ON);
  parts.push(Buffer.from('TAIWAN MAAMI\n', 'ascii'));
  parts.push(CMD_NORMAL);
  parts.push(CMD_BOLD_OFF);
  parts.push(Buffer.from('Kitchen Order Ticket\n', 'ascii'));
  parts.push(Buffer.from('================================\n', 'ascii'));
  
  // Order info
  parts.push(CMD_LEFT);
  parts.push(CMD_BOLD_ON);
  const orderNum = data.orderId || kot.orderId;
  parts.push(Buffer.from(`Order: ${orderNum}\n`, 'ascii'));
  parts.push(CMD_BOLD_OFF);
  parts.push(Buffer.from(`Time: ${formatDate(kot.createdAt)}\n`, 'ascii'));
  
  if (data.customerName) {
    // Replace any non-ASCII characters
    const safeName = data.customerName.replace(/[^\x20-\x7E]/g, '');
    parts.push(Buffer.from(`Customer: ${safeName}\n`, 'ascii'));
  }
  if (data.customerPhone) {
    parts.push(Buffer.from(`Phone: ${data.customerPhone}\n`, 'ascii'));
  }
  
  parts.push(Buffer.from('--------------------------------\n', 'ascii'));
  parts.push(CMD_BOLD_ON);
  parts.push(Buffer.from('ITEMS:\n', 'ascii'));
  parts.push(CMD_BOLD_OFF);
  
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      const productName = (item.productName || item.name || 'Unknown').replace(/[^\x20-\x7E]/g, '');
      parts.push(CMD_BOLD_ON);
      parts.push(Buffer.from(`${item.quantity}x ${productName}\n`, 'ascii'));
      parts.push(CMD_BOLD_OFF);
      
      if (item.size) parts.push(Buffer.from(`   Size: ${item.size}\n`, 'ascii'));
      if (item.sugarLevel) parts.push(Buffer.from(`   Sugar: ${item.sugarLevel}\n`, 'ascii'));
      if (item.iceLevel) parts.push(Buffer.from(`   Ice: ${item.iceLevel}\n`, 'ascii'));
      if (item.withBoba) {
        const bobaLabel = item.bobaType === 'popping' 
          ? `Popping Boba${item.poppingBobaFlavor ? ` (${item.poppingBobaFlavor})` : ''}`
          : 'Tapioca Boba';
        parts.push(Buffer.from(`   Boba: ${bobaLabel}\n`, 'ascii'));
      }
      if (item.addons && item.addons.length > 0) {
        const addonsStr = item.addons.join(', ').replace(/[^\x20-\x7E,]/g, '');
        parts.push(Buffer.from(`   Add-ons: ${addonsStr}\n`, 'ascii'));
      }
      // Product-level special instructions
      if (item.specialInstructions) {
        const safeInstructions = item.specialInstructions.replace(/[^\x20-\x7E]/g, '');
        parts.push(CMD_BOLD_ON);
        parts.push(Buffer.from(`   *** ITEM NOTE ***\n`, 'ascii'));
        parts.push(CMD_BOLD_OFF);
        parts.push(Buffer.from(`   ${safeInstructions}\n`, 'ascii'));
      }
    });
  }
  
  parts.push(Buffer.from('--------------------------------\n', 'ascii'));
  parts.push(CMD_CENTER);
  parts.push(Buffer.from(`KOT ID: ${kot.id}\n`, 'ascii'));
  parts.push(Buffer.from(`Printed: ${new Date().toLocaleTimeString()}\n`, 'ascii'));
  parts.push(Buffer.from('\n\n\n', 'ascii'));
  
  // Feed and cut
  parts.push(CMD_FEED);
  parts.push(CMD_CUT);
  
  return Buffer.concat(parts);
}

function printReceipt(receiptBuffer) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let connected = false;
    
    client.setTimeout(5000);
    
    client.on('timeout', () => {
      console.log('  [DEBUG] Socket timeout');
      client.destroy();
      reject(new Error('Socket timeout'));
    });
    
    client.connect(CONFIG.PRINTER_PORT, CONFIG.PRINTER_IP, () => {
      connected = true;
      console.log('  [DEBUG] Connected to printer');
      console.log(`  [DEBUG] Sending ${receiptBuffer.length} bytes...`);
      
      if (CONFIG.DEBUG) {
        console.log('  [DEBUG] First 100 bytes (hex):', receiptBuffer.slice(0, 100).toString('hex'));
      }
      
      client.write(receiptBuffer, (err) => {
        if (err) {
          console.log('  [DEBUG] Write error:', err.message);
          reject(err);
        } else {
          console.log('  [DEBUG] Data written successfully');
        }
      });
    });
    
    client.on('data', (data) => {
      console.log('  [DEBUG] Received from printer:', data.toString('hex'));
    });
    
    client.on('close', (hadError) => {
      console.log(`  [DEBUG] Connection closed (hadError: ${hadError})`);
      if (connected) {
        resolve();
      }
    });
    
    client.on('error', (err) => {
      console.error('  [DEBUG] Socket error:', err.message);
      reject(err);
    });
    
    // Close connection after 2 seconds to ensure data is sent
    setTimeout(() => {
      if (connected) {
        console.log('  [DEBUG] Closing connection...');
        client.end();
      }
    }, 2000);
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
          console.log(`\nPrinting KOT #${kot.id} for order ${kot.orderId}...`);
          
          if (CONFIG.DEBUG) {
            console.log('  [DEBUG] KOT Data:', JSON.stringify(kot.kotData, null, 2));
          }
          
          const receiptBuffer = generateReceipt(kot);
          await printReceipt(receiptBuffer);
          
          await markKOTAsPrinted(kot.id);
          console.log(`KOT #${kot.id} printed and marked as complete\n`);
          
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

// Test print function
async function testPrint() {
  console.log('\n=== TEST PRINT ===');
  const testReceipt = Buffer.concat([
    CMD_INIT,
    CMD_CENTER,
    Buffer.from('TEST PRINT\n', 'ascii'),
    Buffer.from('If you see this, printer works!\n', 'ascii'),
    Buffer.from('\n\n\n', 'ascii'),
    CMD_FEED,
    CMD_CUT,
  ]);
  
  try {
    await printReceipt(testReceipt);
    console.log('Test print completed!\n');
  } catch (err) {
    console.error('Test print failed:', err.message);
  }
}

function startPolling() {
  console.log(`Starting polling every ${CONFIG.POLL_INTERVAL / 1000} seconds...`);
  console.log('');
  
  // Do a test print first
  testPrint().then(() => {
    pollForKOTs();
    
    setInterval(() => {
      const now = new Date().toLocaleTimeString();
      console.log(`[${now}] Polling...`);
      pollForKOTs();
    }, CONFIG.POLL_INTERVAL);
  });
}

startPolling();
