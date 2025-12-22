#!/usr/bin/env node
/**
 * Taiwan Maami KOT Printer Client - BAR
 * 
 * This application runs at the outlet and automatically prints KOTs
 * to the BAR thermal printer when customers complete payment.
 */

import net from 'net';

// Configuration
const CONFIG = {
  // Your website URL (production)
  serverUrl: 'https://www.taiwanmaami.com',
  
  // KOT secret from your environment variables
  kotSecret: process.env.KOT_PRINT_SECRET || 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // BAR Printer settings
  printerIp: '192.168.1.23',  // Bar printer IP
  printerPort: 9100,
  
  // Polling interval (milliseconds)
  pollInterval: 5000, // Check every 5 seconds
};

// ESC/POS commands for Essae PR-55
const ESC = '\x1B';
const GS = '\x1D';

const PRINTER_COMMANDS = {
  INIT: `${ESC}@`,                    // Initialize printer
  ALIGN_CENTER: `${ESC}a1`,           // Center align
  ALIGN_LEFT: `${ESC}a0`,             // Left align
  BOLD_ON: `${ESC}E1`,                // Bold on
  BOLD_OFF: `${ESC}E0`,               // Bold off
  NORMAL_SIZE: `${GS}!0x00`,          // Normal size text
  CUT_PAPER: `${GS}V\x41\x03`,        // Cut paper
  LINE_FEED: '\n',
  SEPARATOR: '--------------------------------\n',
};

/**
 * Send data to thermal printer
 */
async function printToThermal(data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    client.connect(CONFIG.printerPort, CONFIG.printerIp, () => {
      console.log(`Connected to BAR printer at ${CONFIG.printerIp}:${CONFIG.printerPort}`);
      client.write(data);
      client.end();
    });
    
    client.on('close', () => {
      console.log('BAR printer connection closed');
      resolve();
    });
    
    client.on('error', (err) => {
      console.error('BAR printer error:', err.message);
      reject(err);
    });
    
    // Timeout after 10 seconds
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('BAR printer connection timeout'));
    });
  });
}

/**
 * Format KOT data for thermal printer
 */
function formatKOT(kot) {
  // kotData is already a JSON object from the database (not a string)
  const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
  let output = '';
  
  // Initialize printer
  output += PRINTER_COMMANDS.INIT;
  
  // Header
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'TAIWAN MAAMI\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += 'Kitchen Order Ticket\n';
  output += PRINTER_COMMANDS.ALIGN_LEFT;
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Order details
  output += PRINTER_COMMANDS.ALIGN_LEFT;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += `Order #: ${kotData.orderId}\n`;
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += `Time: ${new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}\n`;
  output += `Customer: ${kotData.customerName}\n`;
  if (kotData.customerPhone) {
    output += `Phone: ${kotData.customerPhone}\n`;
  }
  
  // Order type - prominent display
  output += PRINTER_COMMANDS.BOLD_ON;
  output += `Type: ${kotData.orderType || 'PICKUP'}\n`;
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  // Special instructions - if present
  if (kotData.specialInstructions && kotData.specialInstructions.trim()) {
    output += PRINTER_COMMANDS.BOLD_ON;
    output += '*** SPECIAL INSTRUCTIONS ***\n';
    output += PRINTER_COMMANDS.BOLD_OFF;
    output += `${kotData.specialInstructions}\n`;
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Items
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'ITEMS:\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  kotData.items.forEach((item, index) => {
    output += `${item.quantity}x ${item.productName}\n`;
    
    if (item.size) {
      output += `   Size: ${item.size}\n`;
    }
    
    if (item.withBoba !== null && item.withBoba !== undefined) {
      output += `   Boba: ${item.withBoba ? 'Yes' : 'No'}\n`;
    }
    
    if (item.sugarLevel) {
      output += `   Sugar: ${item.sugarLevel}\n`;
    }
    
    if (item.iceLevel) {
      output += `   Ice: ${item.iceLevel}\n`;
    }
    
    if (item.addons && item.addons.length > 0) {
      output += `   Add-ons:\n`;
      item.addons.forEach(addon => {
        output += `   - ${addon.name}\n`;
      });
    }
    
    output += PRINTER_COMMANDS.SEPARATOR;
  });
  
  // Footer
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += `KOT ID: ${kot.id}\n`;
  output += `Printed: ${new Date().toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })}\n`;
  output += '\n\n\n';
  
  // Cut paper
  output += PRINTER_COMMANDS.CUT_PAPER;
  
  return output;
}

/**
 * Poll server for pending KOTs
 */
async function pollKOTs() {
  try {
    const response = await fetch(`${CONFIG.serverUrl}/api/kot/poll?secret=${CONFIG.kotSecret}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ Invalid KOT secret. Please check your configuration.');
        return [];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.kots || [];
  } catch (error) {
    console.error('Error polling KOTs:', error.message);
    return [];
  }
}

/**
 * Mark KOT as printed
 */
async function markPrinted(kotId) {
  try {
    const response = await fetch(`${CONFIG.serverUrl}/api/kot/printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: CONFIG.kotSecret,
        kotId: kotId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking KOT as printed:', error.message);
    throw error;
  }
}

/**
 * Main polling loop
 */
async function startPolling() {
  console.log('🖨️  Taiwan Maami KOT Printer Client - BAR');
  console.log('=====================================');
  console.log(`Server: ${CONFIG.serverUrl}`);
  console.log(`Printer: ${CONFIG.printerIp}:${CONFIG.printerPort}`);
  console.log(`Poll interval: ${CONFIG.pollInterval}ms`);
  console.log('=====================================\n');
  console.log('✅ Started polling for KOTs (BAR)...\n');
  
  setInterval(async () => {
    const kots = await pollKOTs();
    
    if (kots.length > 0) {
      console.log(`📋 Found ${kots.length} pending KOT(s)`);
      
      // Play sound alert (Windows beep)
      console.log('\x07'); // ASCII bell character - makes system beep
      
      for (const kot of kots) {
        try {
          console.log(`\n🖨️  Printing KOT #${kot.id} to BAR (Order: ${kot.orderNumber})...`);
          
          // Format and print
          const printData = formatKOT(kot);
          await printToThermal(printData);
          
          // Mark as printed
          await markPrinted(kot.id);
          
          console.log(`✅ KOT #${kot.id} printed to BAR successfully`);
        } catch (error) {
          console.error(`❌ Failed to print KOT #${kot.id} to BAR:`, error.message);
        }
      }
    }
  }, CONFIG.pollInterval);
}

// Start the client
startPolling();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down BAR KOT printer client...');
  process.exit(0);
});
