@echo off
title Taiwan Maami Printer Client
echo.
echo Starting Taiwan Maami Printer Client...
echo.
cd /d "%~dp0"

REM Check if node-thermal-printer is installed
if not exist "node_modules\node-thermal-printer" (
    echo Installing thermal printer library...
    echo This only happens once, please wait...
    echo.
    npm install node-thermal-printer
    echo.
)

node taiwan-maami-printer.js
pause
