# KOT Polling Client - Automation Setup Guide

This guide explains how to set up the KOT (Kitchen Order Ticket) polling client to run automatically when your computer starts up.

## Prerequisites

1. **Node.js** installed on your computer (version 18 or higher)
2. **Thermal printer** connected and configured (e.g., Epson TM-T82)
3. **Printer name** noted from your system settings

---

## Step 1: Download the Polling Script

Create a folder on your computer (e.g., `C:\TaiwanMaami\kot-client` on Windows or `~/TaiwanMaami/kot-client` on Mac).

Save the following files in that folder:

### File 1: `kot-polling-client.js`

```javascript
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============
const CONFIG = {
  // Your Taiwan Maami website URL
  API_URL: 'https://taiwanmaami.com/api/trpc',
  
  // Secret key for KOT printing (get from Admin > Site Settings)
  KOT_PRINT_SECRET: 'YOUR_KOT_PRINT_SECRET_HERE',
  
  // Printer name (find in your system printer settings)
  PRINTER_NAME: 'EPSON TM-T82 Receipt',
  
  // Polling interval in milliseconds (10 seconds = 10000)
  POLL_INTERVAL: 10000,
  
  // Log file location
  LOG_FILE: './kot-polling.log'
};
// =======================================

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\\n');
}

function makeRequest(procedure, input) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.API_URL);
    url.pathname += '/' + procedure;
    
    const postData = JSON.stringify(input);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-kot-print-secret': CONFIG.KOT_PRINT_SECRET
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.result?.data);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function generateKotText(kot) {
  const lines = [];
  const width = 42;
  
  lines.push('='.repeat(width));
  lines.push(centerText('KITCHEN ORDER TICKET', width));
  lines.push('='.repeat(width));
  lines.push('');
  lines.push(`Order #: ${kot.orderNumber}`);
  lines.push(`Type: ${kot.orderType.toUpperCase()}`);
  lines.push(`Time: ${new Date(kot.createdAt).toLocaleString()}`);
  
  if (kot.tableNumber) {
    lines.push(`Table: ${kot.tableNumber}`);
  }
  
  lines.push('-'.repeat(width));
  lines.push('');
  
  // Parse items
  try {
    const items = JSON.parse(kot.items);
    items.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} x${item.quantity}`);
      
      if (item.size && item.size !== 'Regular') {
        lines.push(`   Size: ${item.size}`);
      }
      
      if (item.customizations) {
        Object.entries(item.customizations).forEach(([key, value]) => {
          if (value && value !== 'none') {
            lines.push(`   ${key}: ${value}`);
          }
        });
      }
      
      if (item.addons && item.addons.length > 0) {
        lines.push(`   Add-ons: ${item.addons.join(', ')}`);
      }
      
      if (item.specialInstructions) {
        lines.push(`   Note: ${item.specialInstructions}`);
      }
      
      lines.push('');
    });
  } catch (e) {
    lines.push('Error parsing items');
  }
  
  if (kot.notes) {
    lines.push('-'.repeat(width));
    lines.push(`NOTES: ${kot.notes}`);
  }
  
  lines.push('');
  lines.push('='.repeat(width));
  lines.push('');
  lines.push('');
  lines.push('');
  
  return lines.join('\\n');
}

function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function printKot(kotText, kotId) {
  return new Promise((resolve, reject) => {
    // Save to temp file
    const tempFile = path.join(__dirname, `kot_${kotId}.txt`);
    fs.writeFileSync(tempFile, kotText);
    
    // Platform-specific print command
    let printCommand;
    
    if (process.platform === 'win32') {
      // Windows
      printCommand = `print /D:"${CONFIG.PRINTER_NAME}" "${tempFile}"`;
    } else if (process.platform === 'darwin') {
      // macOS
      printCommand = `lpr -P "${CONFIG.PRINTER_NAME}" "${tempFile}"`;
    } else {
      // Linux
      printCommand = `lpr -P "${CONFIG.PRINTER_NAME}" "${tempFile}"`;
    }
    
    exec(printCommand, (error, stdout, stderr) => {
      // Clean up temp file
      try { fs.unlinkSync(tempFile); } catch (e) {}
      
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function pollAndPrint() {
  try {
    // Fetch pending KOTs
    const response = await makeRequest('kot.pollPending', { json: {} });
    
    if (response && response.json && response.json.length > 0) {
      log(`Found ${response.json.length} pending KOT(s)`);
      
      for (const kot of response.json) {
        try {
          // Generate and print
          const kotText = generateKotText(kot);
          await printKot(kotText, kot.id);
          
          // Mark as printed
          await makeRequest('kot.markPrinted', { json: { id: kot.id } });
          
          log(`Printed and marked KOT #${kot.id} (Order: ${kot.orderNumber})`);
        } catch (printError) {
          log(`ERROR printing KOT #${kot.id}: ${printError.message}`);
        }
      }
    }
  } catch (error) {
    log(`ERROR polling: ${error.message}`);
  }
}

// Main loop
log('KOT Polling Client started');
log(`Polling every ${CONFIG.POLL_INTERVAL / 1000} seconds`);
log(`Printer: ${CONFIG.PRINTER_NAME}`);

// Initial poll
pollAndPrint();

// Set up interval
setInterval(pollAndPrint, CONFIG.POLL_INTERVAL);

// Keep process running
process.on('SIGINT', () => {
  log('KOT Polling Client stopped');
  process.exit(0);
});
```

### File 2: `package.json`

```json
{
  "name": "taiwan-maami-kot-client",
  "version": "1.0.0",
  "description": "KOT Polling Client for Taiwan Maami",
  "main": "kot-polling-client.js",
  "scripts": {
    "start": "node kot-polling-client.js"
  }
}
```

---

## Step 2: Configure the Script

Open `kot-polling-client.js` and update the CONFIG section:

1. **KOT_PRINT_SECRET**: Get this from Admin → Settings → Site Settings (or ask your administrator)
2. **PRINTER_NAME**: Find your printer name in system settings:
   - **Windows**: Control Panel → Devices and Printers → Note the exact printer name
   - **Mac**: System Preferences → Printers & Scanners → Note the exact printer name

---

## Step 3: Test the Script

Open a terminal/command prompt in the script folder and run:

```bash
node kot-polling-client.js
```

You should see:
```
[timestamp] KOT Polling Client started
[timestamp] Polling every 10 seconds
[timestamp] Printer: EPSON TM-T82 Receipt
```

Place a test order on the website to verify printing works.

---

## Step 4: Set Up Automatic Startup

### For Windows (Task Scheduler)

1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click "Create Basic Task" in the right panel
3. Name: `Taiwan Maami KOT Polling`
4. Trigger: Select "When the computer starts"
5. Action: Select "Start a program"
6. Program/script: `node`
7. Add arguments: `C:\TaiwanMaami\kot-client\kot-polling-client.js`
8. Start in: `C:\TaiwanMaami\kot-client`
9. Check "Open the Properties dialog" and click Finish
10. In Properties:
    - Check "Run whether user is logged on or not"
    - Check "Run with highest privileges"
    - Under Settings, uncheck "Stop the task if it runs longer than"
11. Click OK and enter your Windows password

**Alternative: Create a Batch File**

Create `start-kot-polling.bat`:
```batch
@echo off
cd /d C:\TaiwanMaami\kot-client
node kot-polling-client.js
```

Add this batch file to your Startup folder:
- Press `Win + R`, type `shell:startup`, press Enter
- Copy the batch file to this folder

---

### For Mac (LaunchAgent)

1. Create the plist file:

```bash
nano ~/Library/LaunchAgents/com.taiwanmaami.kot-polling.plist
```

2. Paste this content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.taiwanmaami.kot-polling</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/TaiwanMaami/kot-client/kot-polling-client.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/TaiwanMaami/kot-client</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/TaiwanMaami/kot-client/kot-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/TaiwanMaami/kot-client/kot-stderr.log</string>
</dict>
</plist>
```

3. Replace `YOUR_USERNAME` with your Mac username

4. Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.taiwanmaami.kot-polling.plist
```

5. To start immediately:
```bash
launchctl start com.taiwanmaami.kot-polling
```

---

## Troubleshooting

### Script not starting
- Check Node.js is installed: `node --version`
- Check the file paths are correct
- Check the log file for errors

### Printer not printing
- Verify printer name matches exactly (case-sensitive)
- Test printer with a simple text file first
- Check printer is online and has paper

### Orders not appearing
- Verify KOT_PRINT_SECRET is correct
- Check internet connection
- Look at the log file for API errors

### Checking logs
- Windows: Open `kot-polling.log` in the script folder
- Mac: Check `kot-stdout.log` and `kot-stderr.log`

---

## Support

For issues with the KOT polling system, contact your administrator or check the Admin → KOT Reports section for order status.
