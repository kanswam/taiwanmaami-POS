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
 * 
 * v2.0 - Fixed: infinite retry loop, cancellation KOT crash
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
  
  // Retry settings
  maxRetries: 3, // Max print attempts before giving up on a KOT
  
  // Audio alert settings
  enableSound: true,
  soundFile: null, // Optional: path to custom WAV file (e.g., 'C:\\alert.wav')
  beepCount: 3, // Number of beeps for alert
  beepDelay: 200, // Delay between beeps in ms
};

// Track failed print attempts per KOT ID
const failedAttempts = new Map(); // kotId -> { count, lastError }

// ESC/POS commands for thermal printer
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
      console.log(`Connected to ${CONFIG.printerName} printer at ${CONFIG.printerIp}:${CONFIG.printerPort}`);
      client.write(data);
      client.end();
    });
    
    client.on('close', () => {
      console.log(`${CONFIG.printerName} printer connection closed`);
      resolve();
    });
    
    client.on('error', (err) => {
      client.destroy();
      reject(new Error(`${CONFIG.printerName} printer error: ${err.message}`));
    });
    
    // Timeout after 10 seconds
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error(`${CONFIG.printerName} printer connection timeout`));
    });
  });
}

/**
 * Format a CANCELLATION KOT for thermal printer
 */
function formatCancellationKOT(kot) {
  const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
  let output = '';
  
  output += PRINTER_COMMANDS.INIT;
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'TAIWAN MAAMI\n';
  output += 'PALLADIUM MALL\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += '*** CANCELLATION ***\n';
  output += PRINTER_COMMANDS.ALIGN_LEFT;
  output += PRINTER_COMMANDS.SEPARATOR;
  
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
  output += `Customer: ${kotData.customerName || 'N/A'}\n`;
  
  if (kotData.tableNumber) {
    output += PRINTER_COMMANDS.BOLD_ON;
    output += `Table: ${kotData.tableNumber}\n`;
    output += PRINTER_COMMANDS.BOLD_OFF;
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'CANCELLED ITEM:\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += `${kotData.cancelledItemQuantity || 1}x ${kotData.cancelledItemName || 'Unknown item'}\n`;
  
  if (kotData.cancellationReason) {
    output += `\nReason: ${kotData.cancellationReason}\n`;
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += `KOT ID: ${kot.id}\n`;
  output += '\n\n\n';
  output += PRINTER_COMMANDS.CUT_PAPER;
  
  return output;
}

/**
 * Format KOT data for thermal printer
 */
function formatKOT(kot) {
  const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
  
  // Handle cancellation KOTs (no items array)
  if (kotData.isCancellation) {
    return formatCancellationKOT(kot);
  }
  
  // Handle KOTs without items gracefully
  if (!kotData.items || !Array.isArray(kotData.items) || kotData.items.length === 0) {
    if (kotData.isAddition && kotData.isCustomItem) {
      return formatCustomItemKOT(kot, kotData);
    }
    console.warn(`⚠️  KOT #${kot.id} has no items array and is not a cancellation. Skipping format.`);
    return null;
  }
  
  let output = '';
  
  output += PRINTER_COMMANDS.INIT;
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'TAIWAN MAAMI\n';
  output += 'PALLADIUM MALL\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  if (kotData.isAddition) {
    output += '*** ADDITION ***\n';
  } else {
    output += 'Kitchen Order Ticket\n';
  }
  
  output += PRINTER_COMMANDS.ALIGN_LEFT;
  output += PRINTER_COMMANDS.SEPARATOR;
  
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
  output += `Customer: ${kotData.customerName || 'N/A'}\n`;
  if (kotData.customerPhone) {
    output += `Phone: ${kotData.customerPhone}\n`;
  }
  
  if (kotData.tableNumber) {
    output += PRINTER_COMMANDS.BOLD_ON;
    output += `Table: ${kotData.tableNumber}\n`;
    output += PRINTER_COMMANDS.BOLD_OFF;
  }
  
  output += PRINTER_COMMANDS.BOLD_ON;
  output += `Type: ${kotData.orderType || 'PICKUP'}\n`;
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  if (kotData.specialInstructions && kotData.specialInstructions.trim()) {
    output += PRINTER_COMMANDS.BOLD_ON;
    output += '*** SPECIAL INSTRUCTIONS ***\n';
    output += PRINTER_COMMANDS.BOLD_OFF;
    output += `${kotData.specialInstructions}\n`;
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'ITEMS:\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  kotData.items.forEach((item) => {
    if (!item) return;
    
    output += `${item.quantity || 1}x ${item.productName || 'Unknown'}\n`;
    
    if (item.size) {
      output += `   Size: ${item.size}\n`;
    }
    
    if (item.withBoba !== null && item.withBoba !== undefined) {
      if (item.withBoba) {
        const bobaLabel = item.bobaType === 'popping' 
          ? `Popping Boba${item.poppingBobaFlavor ? ` (${item.poppingBobaFlavor})` : ''}`
          : `Tapioca Boba${item.bobaSize ? ` (${item.bobaSize})` : ''}`;
        output += `   Boba: ${bobaLabel}\n`;
      } else {
        output += `   Boba: No\n`;
      }
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
        if (!addon) return;
        output += `   - ${addon.name || 'Unknown'}\n`;
      });
    }
    
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
  output += PRINTER_COMMANDS.CUT_PAPER;
  
  return output;
}

/**
 * Format a custom item addition KOT
 */
function formatCustomItemKOT(kot, kotData) {
  let output = '';
  
  output += PRINTER_COMMANDS.INIT;
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'TAIWAN MAAMI\n';
  output += 'PALLADIUM MALL\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += '*** ADDITION ***\n';
  output += PRINTER_COMMANDS.ALIGN_LEFT;
  output += PRINTER_COMMANDS.SEPARATOR;
  
  output += PRINTER_COMMANDS.BOLD_ON;
  output += `Order #: ${kotData.orderId || 'N/A'}\n`;
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += `Customer: ${kotData.customerName || 'N/A'}\n`;
  
  if (kotData.tableNumber) {
    output += `Table: ${kotData.tableNumber}\n`;
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'CUSTOM ITEM ADDED\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  if (kotData.items && Array.isArray(kotData.items)) {
    kotData.items.forEach(item => {
      if (!item) return;
      output += `${item.quantity || 1}x ${item.productName || 'Custom Item'}\n`;
    });
  } else if (kotData.itemName) {
    output += `1x ${kotData.itemName}\n`;
  } else {
    output += '(See order details)\n';
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += `KOT ID: ${kot.id}\n`;
  output += '\n\n\n';
  output += PRINTER_COMMANDS.CUT_PAPER;
  
  return output;
}

/**
 * Poll server for pending KOTs (filtered by outlet)
 */
async function pollKOTs() {
  try {
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
 * Mark KOT as printed even if it failed (to stop infinite retries)
 */
async function forceMarkPrinted(kotId, reason) {
  console.error(`⛔ KOT #${kotId} exceeded max retries (${CONFIG.maxRetries}). Marking as printed to stop loop.`);
  console.error(`   Reason: ${reason}`);
  console.error(`   This KOT will need to be reprinted manually from Admin panel if needed.`);
  try {
    await markPrinted(kotId);
  } catch (e) {
    console.error(`   Could not mark KOT #${kotId} on server: ${e.message}`);
  }
  failedAttempts.delete(kotId);
}

/**
 * Play audio alert when new KOT arrives
 */
function playAlert() {
  if (!CONFIG.enableSound) return;
  
  if (CONFIG.soundFile && existsSync(CONFIG.soundFile)) {
    const soundPath = path.resolve(CONFIG.soundFile);
    exec(`powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`, (err) => {
      if (err) console.log('Sound file playback failed, using system beep');
    });
    return;
  }
  
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    const beepCommands = [];
    for (let i = 0; i < CONFIG.beepCount; i++) {
      beepCommands.push('[console]::beep(1000, 300)');
      if (i < CONFIG.beepCount - 1) {
        beepCommands.push(`Start-Sleep -Milliseconds ${CONFIG.beepDelay}`);
      }
    }
    exec(`powershell -c "${beepCommands.join('; ')}"`, (err) => {
      if (err) {
        for (let i = 0; i < CONFIG.beepCount; i++) {
          process.stdout.write('\x07');
        }
      }
    });
  } else {
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
  console.log('🖨️  Taiwan Maami KOT Printer Client - PALLADIUM MALL v2.0');
  console.log('==========================================================');
  console.log(`Server: ${CONFIG.serverUrl}`);
  console.log(`Printer: ${CONFIG.printerName} @ ${CONFIG.printerIp}:${CONFIG.printerPort}`);
  console.log(`Outlet ID: ${CONFIG.outletId} (Palladium Mall)`);
  console.log(`Poll interval: ${CONFIG.pollInterval}ms`);
  console.log(`Max retries per KOT: ${CONFIG.maxRetries}`);
  console.log('==========================================================\n');
  console.log('✅ Started polling for KOTs (PALLADIUM)...\n');
  
  setInterval(async () => {
    const kots = await pollKOTs();
    
    if (kots.length > 0) {
      console.log(`📋 Found ${kots.length} pending KOT(s) for Palladium`);
      
      // Play sound alert
      playAlert();
      
      for (const kot of kots) {
        const kotId = kot.id;
        
        // Check if we've already exceeded retries for this KOT
        const attempts = failedAttempts.get(kotId);
        if (attempts && attempts.count >= CONFIG.maxRetries) {
          await forceMarkPrinted(kotId, attempts.lastError);
          continue;
        }
        
        try {
          console.log(`\n🖨️  Printing KOT #${kotId} to ${CONFIG.printerName} (Order: ${kot.orderNumber})...`);
          
          const printData = formatKOT(kot);
          
          if (printData === null) {
            console.warn(`⚠️  KOT #${kotId} has unrecognized format. Marking as printed.`);
            await markPrinted(kotId);
            failedAttempts.delete(kotId);
            continue;
          }
          
          await printToThermal(printData);
          await markPrinted(kotId);
          failedAttempts.delete(kotId);
          
          console.log(`✅ KOT #${kotId} printed to ${CONFIG.printerName} successfully`);
        } catch (error) {
          const currentAttempts = failedAttempts.get(kotId) || { count: 0, lastError: '' };
          currentAttempts.count += 1;
          currentAttempts.lastError = error.message;
          failedAttempts.set(kotId, currentAttempts);
          
          console.error(`❌ Failed to print KOT #${kotId} to ${CONFIG.printerName}: ${error.message} (attempt ${currentAttempts.count}/${CONFIG.maxRetries})`);
          
          if (currentAttempts.count >= CONFIG.maxRetries) {
            await forceMarkPrinted(kotId, error.message);
          }
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
