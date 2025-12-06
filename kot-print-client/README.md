# Taiwan Maami - KOT Print Client

This folder contains the polling client that runs on the outlet computer to print Kitchen Order Tickets (KOTs) to the thermal printer.

## Requirements

- Node.js v18 or higher
- Network access to the Taiwan Maami website
- Network access to the Essae thermal printer (192.168.1.22:9100)

## Setup Instructions

### Step 1: Install Node.js

1. Download Node.js from https://nodejs.org/
2. Choose "LTS" version (v18 or higher)
3. Run the installer
4. Verify installation:
   ```
   node --version
   # Should show v18.x.x or higher
   ```

### Step 2: Configure the Client

Edit `polling-client.js` and update these values:

```javascript
// Your published website URL
const WEBSITE_URL = "https://your-website.manus.space";

// Printer IP and Port (Essae thermal printer)
const PRINTER_IP = "192.168.1.22";
const PRINTER_PORT = 9100;

// Security secret (must match website environment variable)
const KOT_PRINT_SECRET = "your-secret-key-here";

// Outlet ID (1 = T Nagar)
const OUTLET_ID = 1;
```

### Step 3: Test the Client

1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to this folder:
   ```
   cd C:\\kot-print-server
   ```
3. Run the client:
   ```
   node polling-client.js
   ```
4. You should see:
   ```
   Polling for new KOTs...
   No pending KOTs
   ```

### Step 4: Auto-Start on Boot (Windows)

1. Create a batch file `start-kot-client.bat`:
   ```batch
   @echo off
   title KOT Polling Client - Taiwan Maami
   cd /d C:\\kot-print-server
   node polling-client.js
   pause
   ```

2. Press `Win + R`, type `shell:startup`, press Enter
3. Copy `start-kot-client.bat` into the Startup folder
4. Restart the computer to test

### Step 5: Auto-Start on Boot (Linux)

1. Create a systemd service:
   ```
   sudo nano /etc/systemd/system/kot-polling.service
   ```

2. Add this content:
   ```ini
   [Unit]
   Description=KOT Polling Client
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/kot-print-server
   ExecStart=/usr/bin/node polling-client.js
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. Enable and start:
   ```
   sudo systemctl enable kot-polling
   sudo systemctl start kot-polling
   sudo systemctl status kot-polling
   ```

## Troubleshooting

### Client Not Finding KOTs

1. Check website URL is correct
2. Verify KOT_PRINT_SECRET matches the website environment variable
3. Test API endpoint manually:
   ```
   curl "https://your-website.manus.space/api/trpc/kot.pollPending?input={\"secret\":\"your-secret\"}"
   ```

### Printer Not Printing

1. Verify printer IP address (192.168.1.22)
2. Check printer port (9100)
3. Ensure printer is powered on and connected to network
4. Test printer connection:
   ```
   # Windows
   telnet 192.168.1.22 9100

   # Linux
   nc -zv 192.168.1.22 9100
   ```

### Duplicate Prints

This usually means the `markPrinted` API call failed. Check:
1. Network connectivity
2. Console logs for errors
3. Website backend logs

## Environment Variable

The website needs this environment variable configured:

```
KOT_PRINT_SECRET=your-secret-key-here
```

This must match the value in `polling-client.js`.
