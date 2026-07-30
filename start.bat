@echo off
echo.
echo  ============================================
echo   Sailee ^& Ajinkya — Expense Tracker
echo  ============================================
echo.

cd /d "%~dp0server"
echo  Starting server...
echo  Open your browser at: http://localhost:3001
echo  On your phones, use: http://^<your-local-IP^>:3001
echo.
echo  To find your local IP, open another terminal and run: ipconfig
echo  Look for "IPv4 Address" under your WiFi adapter.
echo.
echo  Press Ctrl+C to stop.
echo.
node index.js
