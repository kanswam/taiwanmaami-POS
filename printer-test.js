/**
 * Essae PR-55 Thermal Printer Test Script
 * 
 * This script tests different printing methods to diagnose
 * why the printer is not printing.
 */

const net = require('net');

const PRINTER_IP = '192.168.1.22';
const PRINTER_PORT = 9100;

console.log('Essae PR-55 Printer Diagnostic Tool');
console.log(`Printer: ${PRINTER_IP}:${PRINTER_PORT}`);
console.log('=====================================\n');

function sendToPrinter(data, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n--- Test: ${testName} ---`);
    console.log(`Sending ${data.length} bytes...`);
    
    const client = new net.Socket();
    client.setTimeout(10000);
    
    client.on('timeout', () => {
      console.log('  Timeout!');
      client.destroy();
      reject(new Error('Timeout'));
    });
    
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      console.log('  Connected');
      
      client.write(data, (err) => {
        if (err) {
          console.log('  Write error:', err.message);
          reject(err);
        } else {
          console.log('  Data sent successfully');
        }
      });
    });
    
    client.on('data', (data) => {
      console.log('  Received:', data.toString('hex'));
    });
    
    client.on('close', () => {
      console.log('  Connection closed');
      resolve();
    });
    
    client.on('error', (err) => {
      console.log('  Error:', err.message);
      reject(err);
    });
    
    // Close after 3 seconds
    setTimeout(() => {
      client.end();
    }, 3000);
  });
}

async function runTests() {
  try {
    // Test 1: Plain text with newlines only
    console.log('\n========== TEST 1: Plain Text ==========');
    const test1 = Buffer.from(
      'TEST 1: Plain Text\r\n' +
      'If you see this, basic printing works!\r\n' +
      '\r\n\r\n\r\n\r\n\r\n'
    );
    await sendToPrinter(test1, 'Plain Text');
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 2: With ESC @ initialization
    console.log('\n========== TEST 2: With ESC @ Init ==========');
    const test2 = Buffer.concat([
      Buffer.from([0x1B, 0x40]),  // ESC @ - Initialize
      Buffer.from('TEST 2: With Init\r\n'),
      Buffer.from('Printer initialized with ESC @\r\n'),
      Buffer.from('\r\n\r\n\r\n\r\n\r\n')
    ]);
    await sendToPrinter(test2, 'With ESC @ Init');
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 3: With paper feed command
    console.log('\n========== TEST 3: With Paper Feed ==========');
    const test3 = Buffer.concat([
      Buffer.from([0x1B, 0x40]),  // ESC @ - Initialize
      Buffer.from('TEST 3: With Paper Feed\r\n'),
      Buffer.from([0x1B, 0x64, 0x05]),  // ESC d 5 - Feed 5 lines
      Buffer.from([0x1B, 0x69])  // ESC i - Full cut (some printers)
    ]);
    await sendToPrinter(test3, 'With Paper Feed');
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 4: With GS V cut command
    console.log('\n========== TEST 4: With GS V Cut ==========');
    const test4 = Buffer.concat([
      Buffer.from([0x1B, 0x40]),  // ESC @ - Initialize
      Buffer.from('TEST 4: With GS V Cut\r\n'),
      Buffer.from('This should cut the paper\r\n'),
      Buffer.from('\n\n\n\n\n'),  // Line feeds
      Buffer.from([0x1D, 0x56, 0x00])  // GS V 0 - Full cut
    ]);
    await sendToPrinter(test4, 'With GS V Cut');
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 5: With beep (if supported)
    console.log('\n========== TEST 5: With Beep ==========');
    const test5 = Buffer.concat([
      Buffer.from([0x1B, 0x40]),  // ESC @ - Initialize
      Buffer.from([0x1B, 0x42, 0x03, 0x02]),  // ESC B - Beep
      Buffer.from('TEST 5: With Beep\r\n'),
      Buffer.from('Did you hear a beep?\r\n'),
      Buffer.from('\n\n\n\n\n')
    ]);
    await sendToPrinter(test5, 'With Beep');
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 6: Status request
    console.log('\n========== TEST 6: Status Request ==========');
    const test6 = Buffer.from([0x10, 0x04, 0x01]);  // DLE EOT 1 - Request status
    await sendToPrinter(test6, 'Status Request');
    await new Promise(r => setTimeout(r, 2000));
    
    // Test 7: Alternative cut command
    console.log('\n========== TEST 7: Alternative Commands ==========');
    const test7 = Buffer.concat([
      Buffer.from([0x1B, 0x40]),  // ESC @ - Initialize
      Buffer.from([0x1B, 0x21, 0x00]),  // ESC ! 0 - Normal mode
      Buffer.from('TEST 7: Alternative\r\n'),
      Buffer.from('Testing different commands\r\n'),
      Buffer.from([0x0A, 0x0A, 0x0A, 0x0A, 0x0A]),  // LF x5
      Buffer.from([0x1D, 0x56, 0x41, 0x00])  // GS V A 0 - Partial cut
    ]);
    await sendToPrinter(test7, 'Alternative Commands');
    
    console.log('\n\n========== TESTS COMPLETE ==========');
    console.log('If nothing printed, possible issues:');
    console.log('1. Printer is in a different mode (check DIP switches)');
    console.log('2. Network interface issue');
    console.log('3. Printer needs factory reset');
    console.log('4. Paper not loaded correctly');
    console.log('5. Printer is offline or in error state');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();
