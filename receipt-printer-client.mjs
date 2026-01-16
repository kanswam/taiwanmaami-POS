/**
 * Taiwan Maami Receipt Printer Client
 * 
 * This script polls the server for pending receipts and prints them to a thermal printer.
 * Run this on a Windows PC connected to the receipt printer.
 * 
 * Setup:
 * 1. Install Node.js from https://nodejs.org/
 * 2. Open Command Prompt and run: npm install escpos escpos-usb node-fetch
 * 3. Run this script: node receipt-printer-client.mjs
 * 
 * Configuration:
 * - API_URL: Your Taiwan Maami website URL
 * - PRINT_SECRET: The KOT_PRINT_SECRET from your environment
 * - POLL_INTERVAL: How often to check for new receipts (in milliseconds)
 * - PRINTER_VENDOR_ID and PRINTER_PRODUCT_ID: Your thermal printer's USB IDs
 */

import escpos from 'escpos';
import USB from 'escpos-usb';
import fetch from 'node-fetch';

// ============ CONFIGURATION ============
const API_URL = 'https://taiwanmaami.com';
const PRINT_SECRET = 'tmm-kot-print-2024-secure';
const POLL_INTERVAL = 3000; // 3 seconds

// Printer USB IDs (find yours using: lsusb on Linux or Device Manager on Windows)
// Common thermal printer IDs:
// - Epson TM-T88: 0x04b8, 0x0202
// - Generic 58mm: 0x0416, 0x5011
const PRINTER_VENDOR_ID = 0x0416;
const PRINTER_PRODUCT_ID = 0x5011;

// ============ PRINTER SETUP ============
let device = null;
let printer = null;

function initPrinter() {
  try {
    device = new USB(PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID);
    printer = new escpos.Printer(device);
    console.log('✓ Printer initialized successfully');
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize printer:', error.message);
    console.log('  Make sure the printer is connected and powered on.');
    console.log('  You may need to update PRINTER_VENDOR_ID and PRINTER_PRODUCT_ID.');
    return false;
  }
}

// ============ RECEIPT FORMATTING ============
function formatPrice(paise) {
  return '₹' + (paise / 100).toFixed(2);
}

function printReceipt(receiptData) {
  return new Promise((resolve, reject) => {
    if (!device || !printer) {
      reject(new Error('Printer not initialized'));
      return;
    }

    device.open((err) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const data = receiptData;
        const orderDate = new Date(data.createdAt);
        const printDate = new Date();

        printer
          .font('a')
          .align('ct')
          .style('b')
          .size(2, 2)
          .text('TAIWAN MAAMI')
          .size(1, 1)
          .style('normal')
          .text('Exquisitely Crafted Boba')
          .text('--------------------------------')
          .align('lt')
          .text(`Order #: ${data.orderNumber}`)
          .text(`Type: ${data.orderType}`)
          .text(`Date: ${orderDate.toLocaleDateString('en-IN')} ${orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
          .text(`Customer: ${data.customerName}`);

        if (data.customerPhone) {
          printer.text(`Phone: ${data.customerPhone}`);
        }

        if (data.tableNumber) {
          printer.text(`Table: ${data.tableNumber}`);
        }

        printer
          .text('--------------------------------')
          .style('b')
          .text('ITEMS')
          .style('normal')
          .text('--------------------------------');

        // Print each item
        data.items.forEach((item, index) => {
          const itemTotal = item.totalPrice || (item.unitPrice * item.quantity);
          
          printer
            .align('lt')
            .text(`${index + 1}. ${item.productName}`)
            .text(`   ${item.quantity} x ${formatPrice(item.unitPrice)} = ${formatPrice(itemTotal)}`);

          // Print customizations
          const customizations = [];
          if (item.size) customizations.push(`Size: ${item.size}`);
          if (item.sugarLevel) customizations.push(`Sugar: ${item.sugarLevel}`);
          if (item.iceLevel) customizations.push(`Ice: ${item.iceLevel}`);
          
          if (customizations.length > 0) {
            printer.text(`   ${customizations.join(' | ')}`);
          }

          // Print add-ons
          if (item.addons && item.addons.length > 0) {
            item.addons.forEach(addon => {
              printer.text(`   + ${addon.name} (${formatPrice(addon.price)})`);
            });
          }
        });

        printer
          .text('--------------------------------')
          .align('rt');

        // Subtotal
        printer.text(`Subtotal: ${formatPrice(data.subtotal)}`);

        // Discount if any
        const totalDiscount = (data.discountAmount || 0) + (data.manualDiscountAmount || 0);
        if (totalDiscount > 0) {
          printer.text(`Discount: -${formatPrice(totalDiscount)}`);
        }

        // GST (handle both field name formats)
        const sgst = data.stateGst || data.sgst || 0;
        const cgst = data.centralGst || data.cgst || 0;
        const totalGst = sgst + cgst;
        printer.text(`SGST (2.5%): ${formatPrice(sgst)}`);
        printer.text(`CGST (2.5%): ${formatPrice(cgst)}`);

        // Delivery charge if any
        if (data.deliveryCharge > 0) {
          printer.text(`Delivery: ${formatPrice(data.deliveryCharge)}`);
        }

        // Total (handle both field name formats)
        const totalAmount = data.totalAmount || data.total || 0;
        printer
          .text('--------------------------------')
          .style('b')
          .size(1, 1)
          .text(`TOTAL: ${formatPrice(totalAmount)}`)
          .size(1, 1)
          .style('normal')
          .text('--------------------------------')
          .align('ct')
          .text('Thank you for your order!')
          .text('Follow us @taiwan_maami')
          .text('')
          .text(`Printed: ${printDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
          .text('')
          .text('')
          .text('')
          .cut()
          .close();

        resolve();
      } catch (printError) {
        reject(printError);
      }
    });
  });
}

// ============ API FUNCTIONS ============
async function pollForReceipts() {
  try {
    const response = await fetch(`${API_URL}/api/receipt/poll?secret=${PRINT_SECRET}`);
    const data = await response.json();
    return data.receipts || [];
  } catch (error) {
    console.error('Error polling for receipts:', error.message);
    return [];
  }
}

async function markReceiptPrinted(receiptId) {
  try {
    await fetch(`${API_URL}/api/receipt/printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: PRINT_SECRET, receiptId }),
    });
  } catch (error) {
    console.error('Error marking receipt as printed:', error.message);
  }
}

// ============ MAIN LOOP ============
async function processReceipts() {
  const receipts = await pollForReceipts();

  for (const receipt of receipts) {
    console.log(`\n📄 Printing receipt for Order #${receipt.orderNumber}...`);
    
    try {
      await printReceipt(receipt.receiptData);
      await markReceiptPrinted(receipt.id);
      console.log(`✓ Receipt printed successfully for Order #${receipt.orderNumber}`);
    } catch (error) {
      console.error(`✗ Failed to print receipt for Order #${receipt.orderNumber}:`, error.message);
    }
  }
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     Taiwan Maami Receipt Printer Client    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  // Initialize printer
  const printerReady = initPrinter();
  
  if (!printerReady) {
    console.log('\n⚠ Running in test mode (no printer connected)');
    console.log('  Receipts will be logged to console instead.\n');
  }

  console.log(`Polling ${API_URL} every ${POLL_INTERVAL / 1000} seconds...`);
  console.log('Press Ctrl+C to stop.\n');

  // Start polling loop
  setInterval(processReceipts, POLL_INTERVAL);
  
  // Run immediately on start
  processReceipts();
}

main();
