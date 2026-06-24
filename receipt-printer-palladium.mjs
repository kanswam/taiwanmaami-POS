#!/usr/bin/env node
/**
 * Taiwan Maami Tax Invoice Printer Client - PALLADIUM MALL
 * 
 * Printer: BILL
 * IP: 192.168.0.115
 * Port: 9100
 * 
 * This client polls for pending receipts/tax invoices for Palladium Mall (outlet ID 1)
 * and prints them to the thermal printer when orders are marked as completed.
 */

import net from 'net';

// Configuration
const CONFIG = {
  // Your website URL (production)
  serverUrl: 'https://www.taiwanmaami.com',
  
  // Print secret from your environment variables
  printSecret: process.env.KOT_PRINT_SECRET || 'LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a',
  
  // Palladium Printer settings
  printerIp: '192.168.0.115',
  printerPort: 9100,
  printerName: 'BILL',
  
  // Outlet ID for Palladium Mall
  outletId: 1,
  
  // Polling interval (milliseconds)
  pollInterval: 5000, // Check every 5 seconds
};

// ESC/POS commands for thermal printer
const ESC = '\x1B';
const GS = '\x1D';

const PRINTER_COMMANDS = {
  INIT: `${ESC}@`,                    // Initialize printer
  ALIGN_CENTER: `${ESC}a1`,           // Center align
  ALIGN_LEFT: `${ESC}a0`,             // Left align
  ALIGN_RIGHT: `${ESC}a2`,            // Right align
  BOLD_ON: `${ESC}E1`,                // Bold on
  BOLD_OFF: `${ESC}E0`,               // Bold off
  DOUBLE_HEIGHT: `${ESC}!0x10`,       // Double height
  DOUBLE_WIDTH: `${ESC}!0x20`,        // Double width
  DOUBLE_SIZE: `${ESC}!0x30`,         // Double width and height
  NORMAL_SIZE: `${GS}!0x00`,          // Normal size text
  CUT_PAPER: `${GS}V\x41\x03`,        // Cut paper
  LINE_FEED: '\n',
  SEPARATOR: '--------------------------------\n',
  DOUBLE_LINE: '================================\n',
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
 * Format price in rupees
 */
function formatPrice(paise) {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0.00';
  return '₹' + (paise / 100).toFixed(2);
}

/**
 * Format Tax Invoice for thermal printer
 */
function formatTaxInvoice(receipt) {
  const data = typeof receipt.receiptData === 'string' ? JSON.parse(receipt.receiptData) : receipt.receiptData;
  let output = '';
  
  // Initialize printer
  output += PRINTER_COMMANDS.INIT;
  
  // Header
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'TAIWAN MAAMI\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += 'Exquisitely Crafted Boba\n';
  output += 'Palladium Mall, Chennai\n';
  output += PRINTER_COMMANDS.SEPARATOR;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'TAX INVOICE\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Order details
  output += PRINTER_COMMANDS.ALIGN_LEFT;
  const orderDate = new Date(data.createdAt);
  output += `Order #: ${data.orderNumber}\n`;
  output += `Date: ${orderDate.toLocaleDateString('en-IN')} ${orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
  output += `Type: ${data.orderType}\n`;
  output += `Customer: ${data.customerName}\n`;
  
  if (data.customerPhone) {
    output += `Phone: ${data.customerPhone}\n`;
  }
  
  if (data.tableNumber) {
    output += `Table: ${data.tableNumber}\n`;
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Items header
  output += PRINTER_COMMANDS.BOLD_ON;
  output += 'ITEMS\n';
  output += PRINTER_COMMANDS.BOLD_OFF;
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Print each item
  data.items.forEach((item, index) => {
    const itemTotal = item.totalPrice || (item.unitPrice * item.quantity);
    
    output += `${index + 1}. ${item.productName}\n`;
    output += `   ${item.quantity} x ${formatPrice(item.unitPrice)} = ${formatPrice(itemTotal)}\n`;
    
    // Print customizations
    const customizations = [];
    if (item.size) customizations.push(`Size: ${item.size}`);
    if (item.sugarLevel) customizations.push(`Sugar: ${item.sugarLevel}`);
    if (item.iceLevel) customizations.push(`Ice: ${item.iceLevel}`);
    
    if (customizations.length > 0) {
      output += `   ${customizations.join(' | ')}\n`;
    }
    
    // Print add-ons
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        output += `   + ${addon.name} (${formatPrice(addon.price)})\n`;
      });
    }
  });
  
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Totals - right aligned
  output += PRINTER_COMMANDS.ALIGN_RIGHT;
  output += `Subtotal: ${formatPrice(data.subtotal)}\n`;
  
  // Discount if any
  const totalDiscount = (data.discountAmount || 0) + (data.manualDiscountAmount || 0);
  if (totalDiscount > 0) {
    output += `Discount: -${formatPrice(totalDiscount)}\n`;
  }
  
  // Partner benefit (free item)
  if (data.partnerBenefitAmount > 0) {
    output += `Partner Benefit: -${formatPrice(data.partnerBenefitAmount)}\n`;
    if (data.partnerBenefitLabel) {
      output += `  ${data.partnerBenefitLabel}\n`;
    }
  }
  
  // Maami Rupees redeemed
  if (data.maamiRupeesUsed > 0) {
    output += `Maami Rupees: -${formatPrice(data.maamiRupeesUsed)}\n`;
  }
  
  // GST (handle both field name formats)
  const sgst = data.stateGst || data.sgst || 0;
  const cgst = data.centralGst || data.cgst || 0;
  output += `SGST (2.5%): ${formatPrice(sgst)}\n`;
  output += `CGST (2.5%): ${formatPrice(cgst)}\n`;
  
  // Delivery charge if any
  if (data.deliveryCharge > 0) {
    output += `Delivery: ${formatPrice(data.deliveryCharge)}\n`;
  }
  
  // Total
  const totalAmount = data.totalAmount || data.total || 0;
  output += PRINTER_COMMANDS.SEPARATOR;
  output += PRINTER_COMMANDS.BOLD_ON;
  output += `TOTAL: ${formatPrice(totalAmount)}\n`;
  output += PRINTER_COMMANDS.BOLD_OFF;
  
  // Payment method if available
  if (data.paymentMethod) {
    output += `Payment: ${data.paymentMethod}\n`;
  }
  
  // Earnings summary (stamps and Maami Rupees earned on this order)
  if (data.stampsEarned > 0 || data.maamiRupeesEarned > 0) {
    output += PRINTER_COMMANDS.SEPARATOR;
    output += PRINTER_COMMANDS.ALIGN_LEFT;
    if (data.stampsEarned > 0) {
      output += `Stamps earned: +${data.stampsEarned}\n`;
    }
    if (data.maamiRupeesEarned > 0) {
      output += `Maami Rupees earned: +${formatPrice(data.maamiRupeesEarned)}\n`;
    }
  }
  
  output += PRINTER_COMMANDS.SEPARATOR;
  
  // Footer
  output += PRINTER_COMMANDS.ALIGN_CENTER;
  output += 'Thank you for your order!\n';
  output += 'Follow us @taiwan_maami\n';
  output += '\n';
  output += `Printed: ${new Date().toLocaleTimeString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', 
    minute: '2-digit' 
  })}\n`;
  output += '\n\n\n';
  
  // Cut paper
  output += PRINTER_COMMANDS.CUT_PAPER;
  
  return output;
}

/**
 * Poll server for pending receipts (filtered by outlet)
 */
async function pollReceipts() {
  try {
    // Poll with outlet filter for Palladium Mall (outlet ID 1)
    const response = await fetch(`${CONFIG.serverUrl}/api/receipt/poll?secret=${CONFIG.printSecret}&outletId=${CONFIG.outletId}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ Invalid print secret. Please check your configuration.');
        return [];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.receipts || [];
  } catch (error) {
    console.error('Error polling receipts:', error.message);
    return [];
  }
}

/**
 * Mark receipt as printed
 */
async function markPrinted(receiptId) {
  try {
    const response = await fetch(`${CONFIG.serverUrl}/api/receipt/printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: CONFIG.printSecret,
        receiptId: receiptId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking receipt as printed:', error.message);
    throw error;
  }
}

/**
 * Main polling loop
 */
async function startPolling() {
  console.log('🧾 Taiwan Maami Tax Invoice Printer Client - PALLADIUM MALL');
  console.log('============================================================');
  console.log(`Server: ${CONFIG.serverUrl}`);
  console.log(`Printer: ${CONFIG.printerName} @ ${CONFIG.printerIp}:${CONFIG.printerPort}`);
  console.log(`Outlet ID: ${CONFIG.outletId} (Palladium Mall)`);
  console.log(`Poll interval: ${CONFIG.pollInterval}ms`);
  console.log('============================================================\n');
  console.log('✅ Started polling for Tax Invoices (PALLADIUM)...\n');
  
  setInterval(async () => {
    const receipts = await pollReceipts();
    
    if (receipts.length > 0) {
      console.log(`📋 Found ${receipts.length} pending receipt(s) for Palladium`);
      
      for (const receipt of receipts) {
        try {
          console.log(`\n🧾 Printing Tax Invoice #${receipt.id} to ${CONFIG.printerName} (Order: ${receipt.orderNumber})...`);
          
          // Format and print
          const printData = formatTaxInvoice(receipt);
          await printToThermal(printData);
          
          // Mark as printed
          await markPrinted(receipt.id);
          
          console.log(`✅ Tax Invoice #${receipt.id} printed to ${CONFIG.printerName} successfully`);
        } catch (error) {
          console.error(`❌ Failed to print Tax Invoice #${receipt.id} to ${CONFIG.printerName}:`, error.message);
        }
      }
    }
  }, CONFIG.pollInterval);
}

// Start the client
startPolling();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down PALLADIUM Tax Invoice printer client...');
  process.exit(0);
});
