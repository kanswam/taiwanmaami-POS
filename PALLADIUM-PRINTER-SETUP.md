# Taiwan Maami - Palladium Mall KOT Printer Setup

## Printer Configuration

| Setting | Value |
|---------|-------|
| **Printer Name** | BILL |
| **IP Address** | 192.168.0.115 |
| **Port** | 9100 |
| **Outlet ID** | 1 (Palladium Mall) |

---

## KOT Print Triggers

| Order Type | Payment Method | KOT Prints When |
|------------|----------------|-----------------|
| **Delivery** | Razorpay (online) | After Razorpay payment success |
| **In-Store** | Pay at Counter | Upon order confirmation (before payment) |
| **In-Store** | Razorpay (online) | After Razorpay payment success |
| **Pickup** | Any (Cash or Razorpay) | Upon order confirmation |

## Tax Invoice Print Trigger

- Prints after order is marked as **Completed** (for all order types)

---

## Setup Instructions

### Step 1: Copy Files to Windows PC

Copy these files to `C:\kot-print-server\`:
- `kot-printer-palladium.mjs` - KOT printer client
- `receipt-printer-palladium.mjs` - Tax Invoice printer client
- `start-palladium-kot.bat` - Batch file to start KOT printer
- `start-palladium-receipt.bat` - Batch file to start Tax Invoice printer

### Step 2: Install Node.js

1. Download Node.js from https://nodejs.org/
2. Install with default settings
3. Open Command Prompt and verify: `node --version`

### Step 3: Test Printer Connection

```cmd
ping 192.168.0.115
```

If successful, you should see replies from the printer.

### Step 4: Test KOT Printer

```cmd
cd C:\kot-print-server
node kot-printer-palladium.mjs
```

You should see:
```
🖨️  Taiwan Maami KOT Printer Client - PALLADIUM MALL
====================================================
Server: https://www.taiwanmaami.com
Printer: BILL @ 192.168.0.115:9100
Outlet ID: 1 (Palladium Mall)
Poll interval: 5000ms
====================================================

✅ Started polling for KOTs (PALLADIUM)...
```

### Step 5: Test Tax Invoice Printer

Open a **second** Command Prompt window:

```cmd
cd C:\kot-print-server
node receipt-printer-palladium.mjs
```

You should see:
```
🧾 Taiwan Maami Tax Invoice Printer Client - PALLADIUM MALL
============================================================
Server: https://www.taiwanmaami.com
Printer: BILL @ 192.168.0.115:9100
Outlet ID: 1 (Palladium Mall)
Poll interval: 5000ms
============================================================

✅ Started polling for Tax Invoices (PALLADIUM)...
```

---

## Auto-Start on Windows Boot

### Using Task Scheduler (Recommended)

#### For KOT Printer:

1. Open Task Scheduler (`Win + R`, type `taskschd.msc`)
2. Click "Create Basic Task"
3. Name: `Taiwan Maami KOT - Palladium`
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\kot-print-server\start-palladium-kot.bat`
7. In Properties:
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
   - Uncheck "Start only if on AC power"

#### For Tax Invoice Printer:

Repeat the same steps with:
- Name: `Taiwan Maami Receipt - Palladium`
- Program: `C:\kot-print-server\start-palladium-receipt.bat`

---

## Troubleshooting

### Printer not responding

1. Check printer is powered on
2. Verify IP address: `ping 192.168.0.115`
3. Check printer is on same network as PC
4. Try port 9001 if 9100 doesn't work

### KOTs not printing

1. Check if printer client is running
2. Verify KOT_PRINT_SECRET matches server
3. Check server logs for errors
4. Try placing a test order

### Tax Invoices not printing

1. Ensure order is marked as "Completed"
2. Check receipt printer client is running
3. Verify outlet ID matches (should be 1 for Palladium)

---

## Quick Reference

| File | Purpose |
|------|---------|
| `kot-printer-palladium.mjs` | KOT printer client |
| `receipt-printer-palladium.mjs` | Tax Invoice printer client |
| `start-palladium-kot.bat` | Start KOT printer |
| `start-palladium-receipt.bat` | Start Tax Invoice printer |

**Server URL:** https://www.taiwanmaami.com  
**KOT Secret:** LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a  
**Poll Interval:** 5 seconds

---

**Last Updated:** January 19, 2026
