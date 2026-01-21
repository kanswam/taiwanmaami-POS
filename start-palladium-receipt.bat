@echo off
title Taiwan Maami Tax Invoice Printer - Palladium Mall
echo ============================================================
echo Taiwan Maami Tax Invoice Printer - PALLADIUM MALL
echo Printer: BILL @ 192.168.0.115:9100
echo ============================================================
echo.
cd /d C:\kot-print-server
node receipt-printer-palladium.mjs
pause
