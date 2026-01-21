#!/usr/bin/env node
/**
 * Taiwan Maami KOT Printer Client - PALLADIUM MALL
 * 
 * Printer: BILL
 * IP: 192.168.0.115
 * Port: 9100
 * 
 * This client polls for pending KOTs for Palladium Mall (outlet ID 1)
 * and prints them to the thermal printer.
 */

import net from 'net';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  // Your website URL (production)
  serverUrl: 'https://www.taiwanmaami.com',
  
  // KOT secret from your environment variables
  kotSecret: process.env.KOT_PRINT_SECRET || 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // Palladium Printer settings
  printerIp: '192.168.0.115',
  printerPort: 9100,
  printerName: 'BILL',
  
  // Outlet ID for Palladium Mall
  outletId: 1,
  
  // Polling interval (milliseconds)
  pollInterval: 5000, // Check every 5 seconds
  
  // Audio alert settings
  enableSound: true,
  soundFile: null, // Optional: path to custom WAV file (e.g., 'C:\\alert.wav')
  beepCount: 3, // Number of beeps for alert
  beepDelay: 200, // Delay between beeps in ms
};

// ESC/POS commands for thermal printer
const ESC = '\x1B';
const GS = '\x1D';

const PRINTER_COMMANDS = {
  INIT: `${ESC}@`,                    // Initialize printer
  ALIGN_CENTER: `${ESC}a1`,           // Center align
  ALIGN_LEFT: `${ESC}a0`,             // Left align
  BOLD_ON: `${ESC}E1`,                // Bold on
  BOLD_OFF: `${ESC}E0`,               // Bold off
  DOUBLE_HEIGHT: `${ESC}!0x10`,       // Double height
  DOUBLE_WIDTH: `${ESC}!0x20`,        // Double width
  DOUBLE_SIZE: `${ESC}!0x30`,         // Double width and height
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
      console.log(`Connected to ${CONFIG.printerName} printer at ${CONFIG.printerIp}:${CONFIG.printerPort}`);
      client.write(data);
      client.end();
    });
    
    client.on('close', () => {
      console.log(`${CONFIG.printerName} printer connection closed`);
      resolve();
    });
    
    client.on('error', (err) => {
      console.error(`${CONFIG.printerName} printer error:`, err.message);
      reject(err);
    });
    
    // Timeout after 10 seconds
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error(`${CONFIG.printerName} printer connection timeout`));
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
  output += 'PALLADIUM MALL\n';
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
  
  // Table number for dine-in
  if (kotData.tableNumber) {
    output += PRINTER_COMMANDS.BOLD_ON;
    output += `Table: ${kotData.tableNumber}\n`;
    output += PRINTER_COMMANDS.BOLD_OFF;
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
    
    // Product-level special instructions
    if (item.specialInstructions && item.specialInstructions.trim()) {
      output += PRINTER_COMMANDS.BOLD_ON;
      output += `   *** ITEM NOTE ***\n`;
      output += PRINTER_COMMANDS.BOLD_OFF;
      output += `   ${item.specialInstructions}\n`;
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
 * Poll server for pending KOTs (filtered by outlet)
 */
async function pollKOTs() {
  try {
    // Poll with outlet filter for Palladium Mall (outlet ID 1)
    const response = await fetch(`${CONFIG.serverUrl}/api/kot/poll?secret=${CONFIG.kotSecret}&outletId=${CONFIG.outletId}`);
    
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
 * Play audio alert when new KOT arrives
 */
function playAlert() {
  if (!CONFIG.enableSound) return;
  
  // Check for custom sound file first
  if (CONFIG.soundFile && existsSync(CONFIG.soundFile)) {
    // Play custom WAV file on Windows
    const soundPath = path.resolve(CONFIG.soundFile);
    exec(`powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`, (err) => {
      if (err) console.log('Sound file playback failed, using system beep');
    });
    return;
  }
  
  // Use Windows system sounds or PowerShell beep
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Multiple beeps using PowerShell for louder alert
    const beepCommands = [];
    for (let i = 0; i < CONFIG.beepCount; i++) {
      beepCommands.push('[console]::beep(1000, 300)');
      if (i < CONFIG.beepCount - 1) {
        beepCommands.push(`Start-Sleep -Milliseconds ${CONFIG.beepDelay}`);
      }
    }
    exec(`powershell -c "${beepCommands.join('; ')}"`, (err) => {
      if (err) {
        // Fallback to ASCII bell
        for (let i = 0; i < CONFIG.beepCount; i++) {
          process.stdout.write('\x07');
        }
      }
    });
  } else {
    // Linux/Mac - use ASCII bell multiple times
    for (let i = 0; i < CONFIG.beepCount; i++) {
      process.stdout.write('\x07');
    }
  }
  
  console.log('🔔 ALERT: New KOT received!');
}

/**
 * Main polling loop
 */
async function startPolling() {
  console.log('🖨️  Taiwan Maami KOT Printer Client - PALLADIUM MALL');
  console.log('====================================================');
  console.log(`Server: ${CONFIG.serverUrl}`);
  console.log(`Printer: ${CONFIG.printerName} @ ${CONFIG.printerIp}:${CONFIG.printerPort}`);
  console.log(`Outlet ID: ${CONFIG.outletId} (Palladium Mall)`);
  console.log(`Poll interval: ${CONFIG.pollInterval}ms`);
  console.log('====================================================\n');
  console.log('✅ Started polling for KOTs (PALLADIUM)...\n');
  
  setInterval(async () => {
    const kots = await pollKOTs();
    
    if (kots.length > 0) {
      console.log(`📋 Found ${kots.length} pending KOT(s) for Palladium`);
      
      // Play sound alert
      playAlert();
      
      for (const kot of kots) {
        try {
          console.log(`\n🖨️  Printing KOT #${kot.id} to ${CONFIG.printerName} (Order: ${kot.orderNumber})...`);
          
          // Format and print
          const printData = formatKOT(kot);
          await printToThermal(printData);
          
          // Mark as printed
          await markPrinted(kot.id);
          
          console.log(`✅ KOT #${kot.id} printed to ${CONFIG.printerName} successfully`);
        } catch (error) {
          console.error(`❌ Failed to print KOT #${kot.id} to ${CONFIG.printerName}:`, error.message);
        }
      }
    }
  }, CONFIG.pollInterval);
}

// Start the client
startPolling();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down PALLADIUM KOT printer client...');
  process.exit(0);
});
