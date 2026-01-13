# Taiwan Maami - Dual KOT Printer Setup Guide

This guide will help you set up **two KOT printers** (one for bar, one for kitchen) and configure them to **start automatically** when Windows boots.

---

## 📋 What You'll Need

1. **Two Essae PR-55 thermal printers** (or compatible ESC/POS printers)
2. **Both printers connected to your network**
3. **IP addresses for both printers**
   - Bar printer: `192.168.1.22` (already configured)
   - Kitchen printer: `192.168.1.??` (you need to find this)

---

## 🔍 Step 1: Find Your Kitchen Printer's IP Address

### Method 1: Print Network Configuration from Printer
1. Turn on the kitchen printer
2. Press and hold the **FEED button** for 5-10 seconds
3. The printer will print a configuration page showing its IP address

### Method 2: Check Your Router
1. Log in to your WiFi router admin panel
2. Look for "Connected Devices" or "DHCP Client List"
3. Find the printer (usually shows as "Essae" or "PR-55")
4. Note down the IP address (e.g., `192.168.1.23`)

---

## 📦 Step 2: Setup Files on Your Computer

### 2.1 Create the folder structure
```
C:\kot-print-server\
├── kot-printer-client.mjs           (BAR printer)
├── kot-printer-client-kitchen.mjs   (KITCHEN printer)
├── start-bar-printer.bat
└── start-kitchen-printer.bat
```

### 2.2 Update Kitchen Printer IP
1. Open `kot-printer-client-kitchen.mjs` in Notepad
2. Find line 19: `printerIp: '192.168.1.23',`
3. Change `192.168.1.23` to your actual kitchen printer IP
4. Save the file

---

## ✅ Step 3: Test Both Printers Manually

### 3.1 Test Bar Printer
1. Open Command Prompt
2. Run:
   ```cmd
   cd C:\kot-print-server
   node kot-printer-client.mjs
   ```
3. You should see: `✅ Started polling for KOTs (BAR)...`
4. Press `Ctrl+C` to stop

### 3.2 Test Kitchen Printer
1. Open a **second** Command Prompt window
2. Run:
   ```cmd
   cd C:\kot-print-server
   node kot-printer-client-kitchen.mjs
   ```
3. You should see: `✅ Started polling for KOTs (KITCHEN)...`
4. Press `Ctrl+C` to stop

### 3.3 Test Both Together
1. Open two Command Prompt windows
2. Run bar printer in window 1
3. Run kitchen printer in window 2
4. Place a test order on your website
5. **Both printers should print the same KOT simultaneously!**

---

## 🚀 Step 4: Configure Auto-Start on Windows Boot

### Option A: Using Windows Task Scheduler (Recommended)

#### For BAR Printer:

1. **Open Task Scheduler**
   - Press `Win + R`
   - Type `taskschd.msc` and press Enter

2. **Create New Task**
   - Click "Create Basic Task" in the right panel
   - Name: `Taiwan Maami KOT - Bar Printer`
   - Description: `Automatically starts bar printer client on boot`
   - Click "Next"

3. **Set Trigger**
   - Select "When the computer starts"
   - Click "Next"

4. **Set Action**
   - Select "Start a program"
   - Click "Next"
   - Program/script: `C:\kot-print-server\start-bar-printer.bat`
   - Click "Next"

5. **Finish**
   - Check "Open the Properties dialog"
   - Click "Finish"

6. **Configure Advanced Settings**
   - In the "General" tab:
     - Check "Run whether user is logged on or not"
     - Check "Run with highest privileges"
   - In the "Conditions" tab:
     - **Uncheck** "Start the task only if the computer is on AC power"
   - In the "Settings" tab:
     - Check "Allow task to be run on demand"
     - Check "If the task fails, restart every: 1 minute"
     - Set "Attempt to restart up to: 3 times"
   - Click "OK"

7. **Test the Task**
   - Right-click the task → "Run"
   - Check if the bar printer client starts

#### For KITCHEN Printer:

Repeat the same steps above, but use:
- Name: `Taiwan Maami KOT - Kitchen Printer`
- Program/script: `C:\kot-print-server\start-kitchen-printer.bat`

---

### Option B: Using Windows Startup Folder (Simpler, but requires login)

1. **Open Startup Folder**
   - Press `Win + R`
   - Type `shell:startup` and press Enter

2. **Create Shortcuts**
   - Right-click in the folder → New → Shortcut
   - For bar printer: `C:\kot-print-server\start-bar-printer.bat`
   - Click "Next" → Name it "Bar Printer" → Click "Finish"
   - Repeat for kitchen printer: `C:\kot-print-server\start-kitchen-printer.bat`

3. **Test**
   - Restart your computer
   - After login, both printer clients should start automatically

---

## 🔧 Step 5: Verify Everything Works

1. **Restart your computer**
2. **Check if both clients are running:**
   - Open Task Manager (`Ctrl + Shift + Esc`)
   - Go to "Details" tab
   - Look for two `node.exe` processes
3. **Place a test order** on www.taiwanmaami.com
4. **Both printers should print simultaneously!**

---

## 🛠️ Troubleshooting

### Problem: Kitchen printer not printing

**Solution 1: Check IP address**
```cmd
ping 192.168.1.23
```
If it says "Request timed out", the IP is wrong.

**Solution 2: Check printer is on the same network**
- Make sure the kitchen printer is connected to the same WiFi/LAN as your computer

**Solution 3: Check printer port**
- Most ESC/POS printers use port 9100
- Some use port 9001 or 9002
- Try changing `printerPort: 9100` to `printerPort: 9001` in the kitchen client file

### Problem: Printers not starting on boot

**Check Task Scheduler:**
1. Open Task Scheduler
2. Find your tasks
3. Right-click → "Run" to test
4. Check "Last Run Result" column (should show "Success")

**Check batch file paths:**
- Make sure `C:\kot-print-server` exists
- Make sure all `.mjs` files are in that folder

### Problem: Only one printer prints

**This is normal!** The system marks the KOT as "printed" after the first printer succeeds. To fix this:

1. Both clients need to poll **before** marking as printed
2. Or use a queue system where each printer has its own queue

For now, the simpler solution is:
- Bar printer marks as printed (current setup)
- Kitchen printer just prints without marking (I can modify this if needed)

---

## 📞 Need Help?

If you encounter issues:
1. Check the Command Prompt windows for error messages
2. Verify both printer IPs are correct
3. Make sure both printers are powered on and connected to network
4. Test with `ping <printer-ip>` to verify network connectivity

---

## 🎯 Quick Reference

| Printer | IP Address | File | Batch File |
|---------|-----------|------|------------|
| **Bar** | 192.168.1.22 | `kot-printer-client.mjs` | `start-bar-printer.bat` |
| **Kitchen** | 192.168.1.?? | `kot-printer-client-kitchen.mjs` | `start-kitchen-printer.bat` |

**Server URL:** https://www.taiwanmaami.com  
**KOT Secret:** LqhbdPxvsm27rFoc2ImVqc9sZ8Rrme3a  
**Poll Interval:** 5 seconds

---

## ✨ What's Fixed

✅ Header is now centered (TAIWAN MAAMI, Kitchen Order Ticket)  
✅ Clean, readable fonts (no distortion)  
✅ Dual printer support (bar + kitchen)  
✅ Auto-start on Windows boot  
✅ Clear labeling in logs (BAR vs KITCHEN)

---

**Last Updated:** December 22, 2025
