#!/usr/bin/env node
/**
 * Taiwan Maami Printer Client - ANNA NAGAR
 * 
 * Handles BOTH KOTs and Receipts on a single USB thermal printer ("Main Bill")
 * 
 * Printer: Main Bill (USB, accessed via Windows printer share name)
 * Outlet ID: 3 (Anna Nagar)
 * 
 * v2.0 - Fixed: infinite retry loop, cancellation KOT crash
 */

import { exec, execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

// Configuration
const CONFIG = {
  serverUrl: 'https://www.taiwanmaami.com',
  kotSecret: process.env.KOT_PRINT_SECRET || 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  printerName: 'Main Bill',
  outletId: 3,
  pollInterval: 5000, // 5 seconds
  maxRetries: 3, // Max print attempts before giving up
  enableSound: true,
  beepCount: 3,
  beepDelay: 200,
};

// Track failed print attempts per KOT/Receipt ID
const failedKOTAttempts = new Map();
const failedReceiptAttempts = new Map();

// ESC/POS commands
const ESC = '\x1B';
const GS = '\x1D';

const CMD = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a1`,
  ALIGN_LEFT: `${ESC}a0`,
  ALIGN_RIGHT: `${ESC}a2`,
  BOLD_ON: `${ESC}E1`,
  BOLD_OFF: `${ESC}E0`,
  DOUBLE_SIZE: `${GS}!\x11`,
  NORMAL_SIZE: `${GS}!\x00`,
  CUT_PAPER: `${GS}V\x41\x03`,
  LINE_FEED: '\n',
  SEPARATOR: '--------------------------------\n',
};

// ============ PRINTER HARDWARE ============

async function printToThermal(data) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(tmpdir(), `print_${Date.now()}.bin`);
    try {
      writeFileSync(tmpFile, data, 'binary');
      const cmd = `powershell -Command "Copy-Item '${tmpFile}' -Destination '\\\\localhost\\${CONFIG.printerName}' -Force"`;
      exec(cmd, (error) => {
        try { unlinkSync(tmpFile); } catch (e) {}
        if (error) {
          const tmpFile2 = path.join(tmpdir(), `print_${Date.now()}.bin`);
          writeFileSync(tmpFile2, data, 'binary');
          const fallbackCmd = `copy /b "${tmpFile2}" "\\\\localhost\\${CONFIG.printerName}"`;
          exec(fallbackCmd, { shell: 'cmd.exe' }, (err2) => {
            try { unlinkSync(tmpFile2); } catch (e) {}
            if (err2) reject(new Error(`Print failed: ${error.message}`));
            else resolve();
          });
        } else {
          resolve();
        }
      });
    } catch (err) {
      try { unlinkSync(tmpFile); } catch (e) {}
      reject(err);
    }
  });
}

// ============ KOT FORMATTING ============

function formatCancellationKOT(kot) {
  const kotData = typeof kot.kotData === 'string' ? JSON.parse(kot.kotData) : kot.kotData;
  let o = '';

  o += CMD.INIT;
  o += CMD.ALIGN_CENTER;
  o += CMD.BOLD_ON;
  o += 'TAIWAN MAAMI\n';
  o += 'ANNA NAGAR\n';
  o += CMD.BOLD_OFF;
  o += '*** CANCELLATION ***\n';
  o += CMD.ALIGN_LEFT;
  o += CMD.SEPARATOR;

  o += CMD.BOLD_ON;
  o += `Order #: ${kotData.orderId}\n`;
  o += CMD.BOLD_OFF;
  o += `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}\n`;
  o += `Customer: ${kotData.customerName || 'N/A'}\n`;

  if (kotData.tableNumber) {
    o += CMD.BOLD_ON;
    o += `Table: ${kotData.tableNumber}\n`;
    o += CMD.BOLD_OFF;
  }

  o += CMD.SEPARATOR;
  o += CMD.BOLD_ON;
  o += 'CANCELLED ITEM:\n';
  o += CMD.BOLD_OFF;
  o += `${kotData.cancelledItemQuantity || 1}x ${kotData.cancelledItemName || 'Unknown item'}\n`;

  if (kotData.cancellationReason) {
    o += `\nReason: ${kotData.cancellationReason}\n`;
  }

  o += CMD.SEPARATOR;
  o += CMD.ALIGN_CENTER;
  o += `KOT ID: ${kot.id}\n`;
  o += '\n\n\n';
  o += CMD.CUT_PAPER;

  return o;
}

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

  let o = '';

  o += CMD.INIT;
  o += CMD.ALIGN_CENTER;
  o += CMD.BOLD_ON;
  o += 'TAIWAN MAAMI\n';
  o += 'ANNA NAGAR\n';
  o += CMD.BOLD_OFF;

  if (kotData.isAddition) {
    o += '*** ADDITION ***\n';
  } else {
    o += 'Kitchen Order Ticket\n';
  }

  o += CMD.ALIGN_LEFT;
  o += CMD.SEPARATOR;

  o += CMD.BOLD_ON;
  o += `Order #: ${kotData.orderId}\n`;
  o += CMD.BOLD_OFF;
  o += `Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}\n`;
  o += `Customer: ${kotData.customerName || 'N/A'}\n`;
  if (kotData.customerPhone) o += `Phone: ${kotData.customerPhone}\n`;
  if (kotData.tableNumber) {
    o += CMD.BOLD_ON;
    o += `Table: ${kotData.tableNumber}\n`;
    o += CMD.BOLD_OFF;
  }
  o += CMD.BOLD_ON;
  o += `Type: ${kotData.orderType || 'PICKUP'}\n`;
  o += CMD.BOLD_OFF;

  if (kotData.specialInstructions && kotData.specialInstructions.trim()) {
    o += CMD.BOLD_ON;
    o += '*** SPECIAL INSTRUCTIONS ***\n';
    o += CMD.BOLD_OFF;
    o += `${kotData.specialInstructions}\n`;
  }

  o += CMD.SEPARATOR;
  o += CMD.BOLD_ON;
  o += 'ITEMS:\n';
  o += CMD.BOLD_OFF;

  kotData.items.forEach((item) => {
    if (!item) return;

    o += `${item.quantity || 1}x ${item.productName || 'Unknown'}\n`;
    if (item.size) o += `   Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)}\n`;
    if (item.withBoba !== null && item.withBoba !== undefined) {
      if (item.withBoba) {
        const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
        const bobaLabel = item.bobaType === 'popping'
          ? `Popping Boba${item.poppingBobaFlavor ? ` (${cap(item.poppingBobaFlavor)})` : ''}`
          : `Tapioca Boba${item.bobaSize ? ` (${cap(item.bobaSize)})` : ''}`;
        o += `   Boba: ${bobaLabel}\n`;
      } else {
        o += `   Boba: No\n`;
      }
    }
    if (item.sugarLevel) o += `   Sugar: ${item.sugarLevel}\n`;
    if (item.iceLevel) o += `   Ice: ${item.iceLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n`;
    if (item.addons && item.addons.length > 0) {
      o += `   Add-ons:\n`;
      item.addons.forEach(addon => {
        if (!addon) return;
        const qty = addon.quantity && addon.quantity > 1 ? ` x${addon.quantity}` : '';
        o += `   - ${addon.name || 'Unknown'}${qty}\n`;
      });
    }
    if (item.specialInstructions && item.specialInstructions.trim()) {
      o += CMD.BOLD_ON;
      o += `   *** ITEM NOTE ***\n`;
      o += CMD.BOLD_OFF;
      o += `   ${item.specialInstructions}\n`;
    }
    o += CMD.SEPARATOR;
  });

  o += CMD.ALIGN_CENTER;
  o += `KOT ID: ${kot.id}\n`;
  o += `Printed: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\n`;
  o += '\n\n\n';
  o += CMD.CUT_PAPER;

  return o;
}

function formatCustomItemKOT(kot, kotData) {
  let o = '';

  o += CMD.INIT;
  o += CMD.ALIGN_CENTER;
  o += CMD.BOLD_ON;
  o += 'TAIWAN MAAMI\n';
  o += 'ANNA NAGAR\n';
  o += CMD.BOLD_OFF;
  o += '*** ADDITION ***\n';
  o += CMD.ALIGN_LEFT;
  o += CMD.SEPARATOR;

  o += CMD.BOLD_ON;
  o += `Order #: ${kotData.orderId || 'N/A'}\n`;
  o += CMD.BOLD_OFF;
  o += `Customer: ${kotData.customerName || 'N/A'}\n`;

  if (kotData.tableNumber) {
    o += `Table: ${kotData.tableNumber}\n`;
  }

  o += CMD.SEPARATOR;
  o += CMD.BOLD_ON;
  o += 'CUSTOM ITEM ADDED\n';
  o += CMD.BOLD_OFF;

  if (kotData.items && Array.isArray(kotData.items)) {
    kotData.items.forEach(item => {
      if (!item) return;
      o += `${item.quantity || 1}x ${item.productName || 'Custom Item'}\n`;
    });
  } else if (kotData.itemName) {
    o += `1x ${kotData.itemName}\n`;
  } else {
    o += '(See order details)\n';
  }

  o += CMD.SEPARATOR;
  o += CMD.ALIGN_CENTER;
  o += `KOT ID: ${kot.id}\n`;
  o += '\n\n\n';
  o += CMD.CUT_PAPER;

  return o;
}

// ============ RECEIPT FORMATTING ============

function formatPrice(amountInPaise) {
  const rupees = Number(amountInPaise) / 100;
  return `Rs.${rupees.toFixed(2)}`;
}

function formatReceipt(receipt) {
  const data = typeof receipt.receiptData === 'string' ? JSON.parse(receipt.receiptData) : receipt.receiptData;

  // Handle receipts without items gracefully
  if (!data.items || !Array.isArray(data.items)) {
    console.warn(`⚠️  Receipt for Order #${receipt.orderNumber} has no items. Skipping.`);
    return null;
  }

  let o = '';

  o += CMD.INIT;
  o += CMD.ALIGN_CENTER;
  o += CMD.BOLD_ON;
  o += CMD.DOUBLE_SIZE;
  o += 'TAIWAN MAAMI\n';
  o += CMD.NORMAL_SIZE;
  o += CMD.BOLD_OFF;
  o += 'Anna Nagar, Chennai\n';
  o += CMD.SEPARATOR;
  o += CMD.ALIGN_LEFT;

  o += `Order #: ${data.orderNumber}\n`;
  o += `Type: ${data.orderType}\n`;
  const orderDate = new Date(data.createdAt);
  o += `Date: ${orderDate.toLocaleDateString('en-IN')} ${orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
  o += `Customer: ${data.customerName}\n`;
  if (data.customerPhone) o += `Phone: ${data.customerPhone}\n`;
  if (data.tableNumber) o += `Table: ${data.tableNumber}\n`;

  o += CMD.SEPARATOR;
  o += CMD.BOLD_ON;
  o += 'ITEMS\n';
  o += CMD.BOLD_OFF;
  o += CMD.SEPARATOR;

  data.items.forEach((item, index) => {
    if (!item) return;
    const unitPrice = item.price || item.unitPrice || 0;
    const itemTotal = item.totalPrice || (unitPrice * item.quantity);
    const itemName = item.name || item.productName || 'Unknown Item';
    const isMochi = itemName.toLowerCase().includes('mochi');
    
    if (isMochi && item.quantity > 1 && itemTotal === unitPrice) {
      o += `${index + 1}. ${itemName} (${item.quantity} pcs)\n`;
      o += `   ${formatPrice(itemTotal)}\n`;
    } else if (item.quantity > 1) {
      o += `${index + 1}. ${itemName}\n`;
      o += `   ${item.quantity} x ${formatPrice(unitPrice)} = ${formatPrice(itemTotal)}\n`;
    } else {
      o += `${index + 1}. ${itemName}\n`;
      o += `   ${formatPrice(itemTotal)}\n`;
    }

    const customizations = [];
    if (item.size) customizations.push(`Size: ${item.size}`);
    if (item.sugarLevel) customizations.push(`Sugar: ${item.sugarLevel}`);
    if (item.iceLevel) customizations.push(`Ice: ${item.iceLevel}`);
    if (customizations.length > 0) o += `   ${customizations.join(' | ')}\n`;

    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        if (!addon) return;
        o += `   + ${addon.name || 'Unknown'} (${formatPrice(addon.price || 0)})\n`;
      });
    }
  });

  o += CMD.SEPARATOR;
  o += CMD.ALIGN_RIGHT;
  o += `Subtotal: ${formatPrice(data.subtotal)}\n`;

  const totalDiscount = (data.discountAmount || 0) + (data.manualDiscountAmount || 0);
  if (totalDiscount > 0) o += `Discount: -${formatPrice(totalDiscount)}\n`;

  const sgst = data.stateGst || data.sgst || 0;
  const cgst = data.centralGst || data.cgst || 0;
  o += `SGST (2.5%): ${formatPrice(sgst)}\n`;
  o += `CGST (2.5%): ${formatPrice(cgst)}\n`;

  if (data.deliveryCharge > 0) o += `Delivery: ${formatPrice(data.deliveryCharge)}\n`;

  const totalAmount = data.totalAmount || data.total || 0;
  o += CMD.SEPARATOR;
  o += CMD.BOLD_ON;
  o += `TOTAL: ${formatPrice(totalAmount)}\n`;
  o += CMD.BOLD_OFF;
  o += CMD.SEPARATOR;

  o += CMD.ALIGN_CENTER;
  o += 'Thank you for your order!\n';
  o += 'Follow us @taiwan_maami\n';
  o += '\n';
  o += `Printed: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
  o += '\n\n\n';
  o += CMD.CUT_PAPER;

  return o;
}

// ============ API FUNCTIONS ============

async function pollKOTs() {
  try {
    const response = await fetch(`${CONFIG.serverUrl}/api/kot/poll?secret=${CONFIG.kotSecret}&outletId=${CONFIG.outletId}`);
    if (!response.ok) {
      if (response.status === 401) console.error('❌ Invalid KOT secret.');
      return [];
    }
    const data = await response.json();
    return data.kots || [];
  } catch (error) {
    console.error('Error polling KOTs:', error.message);
    return [];
  }
}

async function markKOTPrinted(kotId) {
  try {
    await fetch(`${CONFIG.serverUrl}/api/kot/printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: CONFIG.kotSecret, kotId }),
    });
  } catch (error) {
    console.error('Error marking KOT as printed:', error.message);
    throw error;
  }
}

async function pollReceipts() {
  try {
    const response = await fetch(`${CONFIG.serverUrl}/api/receipt/poll?secret=${CONFIG.kotSecret}&outletId=${CONFIG.outletId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.receipts || [];
  } catch (error) {
    console.error('Error polling receipts:', error.message);
    return [];
  }
}

async function markReceiptPrinted(receiptId) {
  try {
    await fetch(`${CONFIG.serverUrl}/api/receipt/printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: CONFIG.kotSecret, receiptId }),
    });
  } catch (error) {
    console.error('Error marking receipt as printed:', error.message);
    throw error;
  }
}

/**
 * Force-mark a KOT/receipt as printed to stop infinite retries
 */
async function forceMarkKOTPrinted(kotId, reason) {
  console.error(`⛔ KOT #${kotId} exceeded max retries (${CONFIG.maxRetries}). Marking as printed to stop loop.`);
  console.error(`   Reason: ${reason}`);
  console.error(`   Reprint manually from Admin panel if needed.`);
  try {
    await markKOTPrinted(kotId);
  } catch (e) {
    console.error(`   Could not mark KOT #${kotId} on server: ${e.message}`);
  }
  failedKOTAttempts.delete(kotId);
}

async function forceMarkReceiptPrinted(receiptId, reason) {
  console.error(`⛔ Receipt #${receiptId} exceeded max retries (${CONFIG.maxRetries}). Marking as printed to stop loop.`);
  console.error(`   Reason: ${reason}`);
  try {
    await markReceiptPrinted(receiptId);
  } catch (e) {
    console.error(`   Could not mark Receipt #${receiptId} on server: ${e.message}`);
  }
  failedReceiptAttempts.delete(receiptId);
}

// ============ AUDIO ALERT ============

function playAlert() {
  if (!CONFIG.enableSound) return;
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const beepCommands = [];
    for (let i = 0; i < CONFIG.beepCount; i++) {
      beepCommands.push('[console]::beep(1000, 300)');
      if (i < CONFIG.beepCount - 1) beepCommands.push(`Start-Sleep -Milliseconds ${CONFIG.beepDelay}`);
    }
    exec(`powershell -c "${beepCommands.join('; ')}"`, () => {});
  } else {
    for (let i = 0; i < CONFIG.beepCount; i++) process.stdout.write('\x07');
  }
  console.log('🔔 ALERT: New order received!');
}

// ============ MAIN POLLING LOOP ============

async function startPolling() {
  console.log('');
  console.log('🖨️  Taiwan Maami Printer Client - ANNA NAGAR v2.0');
  console.log('====================================================');
  console.log(`Server: ${CONFIG.serverUrl}`);
  console.log(`Printer: ${CONFIG.printerName} (USB)`);
  console.log(`Outlet ID: ${CONFIG.outletId} (Anna Nagar)`);
  console.log(`Handles: KOTs + Receipts`);
  console.log(`Poll interval: ${CONFIG.pollInterval}ms`);
  console.log(`Max retries per item: ${CONFIG.maxRetries}`);
  console.log('====================================================\n');

  // Verify printer
  try {
    const checkCmd = `powershell -Command "Get-Printer -Name '${CONFIG.printerName}' | Select-Object Name, PortName, PrinterStatus"`;
    execSync(checkCmd, { encoding: 'utf8' });
    console.log(`✅ Printer "${CONFIG.printerName}" found\n`);
  } catch (e) {
    console.warn(`⚠️  Could not verify printer "${CONFIG.printerName}" - make sure it's shared in Windows.\n`);
  }

  console.log('✅ Started polling for KOTs and Receipts...\n');

  setInterval(async () => {
    // Poll KOTs
    const kots = await pollKOTs();
    if (kots.length > 0) {
      console.log(`📋 Found ${kots.length} pending KOT(s)`);
      playAlert();
      for (const kot of kots) {
        const kotId = kot.id;

        // Check retry limit
        const attempts = failedKOTAttempts.get(kotId);
        if (attempts && attempts.count >= CONFIG.maxRetries) {
          await forceMarkKOTPrinted(kotId, attempts.lastError);
          continue;
        }

        try {
          console.log(`🖨️  Printing KOT #${kotId} (Order: ${kot.orderNumber})...`);
          const printData = formatKOT(kot);

          if (printData === null) {
            console.warn(`⚠️  KOT #${kotId} has unrecognized format. Marking as printed.`);
            await markKOTPrinted(kotId);
            failedKOTAttempts.delete(kotId);
            continue;
          }

          await printToThermal(printData);
          await markKOTPrinted(kotId);
          failedKOTAttempts.delete(kotId);
          console.log(`✅ KOT #${kotId} printed`);
        } catch (error) {
          const currentAttempts = failedKOTAttempts.get(kotId) || { count: 0, lastError: '' };
          currentAttempts.count += 1;
          currentAttempts.lastError = error.message;
          failedKOTAttempts.set(kotId, currentAttempts);
          console.error(`❌ KOT #${kotId} failed: ${error.message} (attempt ${currentAttempts.count}/${CONFIG.maxRetries})`);

          if (currentAttempts.count >= CONFIG.maxRetries) {
            await forceMarkKOTPrinted(kotId, error.message);
          }
        }
      }
    }

    // Poll Receipts
    const receipts = await pollReceipts();
    if (receipts.length > 0) {
      console.log(`📄 Found ${receipts.length} pending receipt(s)`);
      for (const receipt of receipts) {
        const receiptId = receipt.id;

        // Check retry limit
        const attempts = failedReceiptAttempts.get(receiptId);
        if (attempts && attempts.count >= CONFIG.maxRetries) {
          await forceMarkReceiptPrinted(receiptId, attempts.lastError);
          continue;
        }

        try {
          console.log(`🖨️  Printing receipt for Order #${receipt.orderNumber}...`);
          const printData = formatReceipt(receipt);

          if (printData === null) {
            console.warn(`⚠️  Receipt #${receiptId} has unrecognized format. Marking as printed.`);
            await markReceiptPrinted(receiptId);
            failedReceiptAttempts.delete(receiptId);
            continue;
          }

          await printToThermal(printData);
          await markReceiptPrinted(receiptId);
          failedReceiptAttempts.delete(receiptId);
          console.log(`✅ Receipt for Order #${receipt.orderNumber} printed`);
        } catch (error) {
          const currentAttempts = failedReceiptAttempts.get(receiptId) || { count: 0, lastError: '' };
          currentAttempts.count += 1;
          currentAttempts.lastError = error.message;
          failedReceiptAttempts.set(receiptId, currentAttempts);
          console.error(`❌ Receipt #${receiptId} failed: ${error.message} (attempt ${currentAttempts.count}/${CONFIG.maxRetries})`);

          if (currentAttempts.count >= CONFIG.maxRetries) {
            await forceMarkReceiptPrinted(receiptId, error.message);
          }
        }
      }
    }
  }, CONFIG.pollInterval);
}

startPolling();

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down ANNA NAGAR printer client...');
  process.exit(0);
});
