# KOT Printer Setup Guide

## Overview

The KOT (Kitchen Order Ticket) printer automatically prints order tickets to your Essae PR-55 thermal printer when customers complete payment on the website.

## How It Works

1. Customer places order on website
2. Customer completes Razorpay payment
3. Server creates KOT in database
4. Printer client (running at outlet) polls server every 5 seconds
5. New KOTs are automatically printed
6. KOT marked as printed in database

## Hardware Requirements

- **Printer**: Essae PR-55 Thermal Receipt Printer
- **Connection**: Network (Ethernet or WiFi)
- **Printer IP**: 192.168.1.22
- **Printer Port**: 9100
- **Computer**: Any Windows/Mac/Linux computer at outlet with Node.js installed

## Software Requirements

- Node.js 18 or higher
- Network access to printer
- Internet connection to reach your website

## Installation Steps

### 1. Install Node.js

**Windows:**
- Download from https://nodejs.org
- Run installer
- Verify: Open Command Prompt and run `node --version`

**Mac:**
- Download from https://nodejs.org
- Run installer
- Verify: Open Terminal and run `node --version`

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

### 2. Download Printer Client

Copy the `kot-printer-client.mjs` file to your outlet computer.

### 3. Configure the Client

Edit `kot-printer-client.mjs` and update these settings:

```javascript
const CONFIG = {
  // Your published website URL
  serverUrl: 'https://taiwan-maami.manus.space',
  
  // KOT secret (get this from your environment variables)
  kotSecret: 'your-kot-secret-here',
  
  // Printer settings (already configured for your Essae PR-55)
  printerIp: '192.168.1.22',
  printerPort: 9100,
  
  // How often to check for new KOTs (5 seconds)
  pollInterval: 5000,
};
```

**Important:** Replace `your-kot-secret-here` with the actual `KOT_PRINT_SECRET` value from your environment variables.

### 4. Test Printer Connection

Before running the client, test that your computer can reach the printer:

**Windows:**
```cmd
ping 192.168.1.22
```

**Mac/Linux:**
```bash
ping -c 4 192.168.1.22
```

You should see responses. If not, check:
- Printer is powered on
- Printer is connected to same network
- Printer IP is correct (check printer settings)

### 5. Run the Printer Client

**Windows:**
```cmd
cd path\to\kot-printer-client
node kot-printer-client.mjs
```

**Mac/Linux:**
```bash
cd /path/to/kot-printer-client
node kot-printer-client.mjs
```

You should see:
```
🖨️  Taiwan Maami KOT Printer Client
=====================================
Server: https://taiwan-maami.manus.space
Printer: 192.168.1.22:9100
Poll interval: 5000ms
=====================================

✅ Started polling for KOTs...
```

### 6. Test with a Real Order

1. Go to your website
2. Add items to cart
3. Complete checkout with Razorpay payment
4. Watch the printer client console
5. KOT should print automatically!

## Running in Background

For production use, keep the client running 24/7 using PM2:

### Install PM2

```bash
npm install -g pm2
```

### Start Client with PM2

```bash
pm2 start kot-printer-client.mjs --name "taiwan-maami-kot"
```

### Auto-start on Computer Reboot

```bash
pm2 startup
pm2 save
```

### Useful PM2 Commands

```bash
pm2 status              # Check if running
pm2 logs taiwan-maami-kot   # View logs
pm2 restart taiwan-maami-kot  # Restart
pm2 stop taiwan-maami-kot     # Stop
```

## Troubleshooting

### KOT Not Printing

1. **Check printer client is running**
   ```bash
   pm2 status
   ```

2. **Check printer connection**
   ```bash
   ping 192.168.1.22
   ```

3. **Check printer client logs**
   ```bash
   pm2 logs taiwan-maami-kot
   ```

4. **Common errors:**
   - `Invalid KOT secret` → Wrong secret in CONFIG
   - `Printer connection timeout` → Printer offline or wrong IP
   - `HTTP 404` → Wrong server URL

### Printer Prints Garbage Characters

- Essae PR-55 uses ESC/POS commands (already configured)
- If still having issues, printer may need firmware update

### Want to Print Test KOT

You can manually create a test KOT from the Admin panel or by placing a test order with a small amount.

## KOT Format

The printed KOT includes:

```
        TAIWAN MAAMI
      KITCHEN ORDER TICKET
--------------------------------
Order #: TM-20251218-001
Customer: John Doe
Phone: +91 98765 43210
Time: 2:30 PM
--------------------------------
ITEMS:

1. Classic Bubble Tea
   Qty: 2
   Size: Large
   Boba: Yes
   Sugar: 50%
   Ice: Normal
   Add-ons:
   - Extra Pearls

2. Mochi (Strawberry)
   Qty: 3
--------------------------------
Total: ₹450.00
--------------------------------
    Printed: 18/12/2025, 2:30:15 PM
```

## Support

For issues:
1. Check logs: `pm2 logs taiwan-maami-kot`
2. Verify printer is on same network
3. Test printer with another application
4. Contact support with error logs

## Environment Variables Reference

The following environment variable must be set:

- `KOT_PRINT_SECRET` - Secret key for authenticating KOT polling requests

This is already configured in your Manus project environment.
