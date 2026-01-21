@echo off
title Taiwan Maami KOT Printer - Palladium Mall
echo ====================================================
echo Taiwan Maami KOT Printer - PALLADIUM MALL
echo Printer: BILL @ 192.168.0.115:9100
echo ====================================================
echo.
cd /d C:\kot-print-server
node kot-printer-palladium.mjs
pause
