# Taiwan Maami Printer Setup (Simple Version)

## What You Need
1. A computer connected to your thermal printer
2. Node.js installed (download from https://nodejs.org - click the LTS version)
3. Thermal printer library (installed in Step 2)

## Quick Setup (5 minutes)

### Step 1: Create a folder
Create a folder on your computer called `TaiwanMaami` (e.g., on your Desktop)

### Step 2: Copy the files
Copy these 2 files into that folder:
- `taiwan-maami-printer.js` (the main script)
- `Start-Printer.bat` (Windows) or `Start-Printer.command` (Mac)

### Step 2b: Install the printer library
1. Open Command Prompt (Windows) or Terminal (Mac)
2. Navigate to your folder:
   ```
   cd C:\Users\YourName\Desktop\TaiwanMaami
   ```
3. Run this command:
   ```
   npm install node-thermal-printer
   ```
4. Wait for it to finish (you'll see a `node_modules` folder appear)

### Step 3: Find your printer name
**Windows:**
1. Open Control Panel
2. Go to "Devices and Printers"
3. Find your thermal printer and note the EXACT name (e.g., "EPSON TM-T82 Receipt")

**Mac:**
1. Open System Preferences
2. Go to "Printers & Scanners"
3. Note the EXACT printer name

### Step 4: Edit the script
1. Open `taiwan-maami-printer.js` in Notepad (Windows) or TextEdit (Mac)
2. Find this line near the top:
   ```
   PRINTER_NAME: 'EPSON TM-T82 Receipt',
   ```
3. Change `EPSON TM-T82 Receipt` to YOUR printer's exact name
4. Save the file

### Step 5: Test it
**Windows:** Double-click `Start-Printer.bat`
**Mac:** Double-click `Start-Printer.command` (you may need to right-click → Open the first time)

You should see:
```
Taiwan Maami - KOT & Receipt Printer
Starting printer client...
Printer: [Your Printer Name]
Polling every 10 seconds
```

### Step 6: Make it start automatically

**Windows (Easiest Method):**
1. Press `Win + R`
2. Type `shell:startup` and press Enter
3. Copy `Start-Printer.bat` into this folder
4. Done! It will now start when you log in

**Mac:**
1. Open System Preferences → Users & Groups
2. Click your username, then "Login Items"
3. Click the + button and add `Start-Printer.command`
4. Done!

## Troubleshooting

**"node is not recognized"**
- Node.js is not installed. Download from https://nodejs.org and install it, then restart your computer.

**"Cannot find module 'node-thermal-printer'"**
- Run `npm install node-thermal-printer` in the printer folder

**Printer not printing**
- Make sure the printer name matches EXACTLY (including spaces and capitalization)
- Make sure the printer is turned on and connected
- Try printing a test page from Windows/Mac to verify the printer works

**No orders appearing**
- Check your internet connection
- Make sure the website is working (visit taiwanmaami.com)
- Check the `printer-log.txt` file in the same folder for error messages

## Need Help?
Check the `printer-log.txt` file in the same folder - it records everything that happens.
