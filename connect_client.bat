@echo off
setlocal

:: --- CONFIGURATION ---
:: CHANGE THIS IP to your Server's IP Address (e.g., 192.168.1.10)
set SERVER_IP=192.168.1.100
:: ---------------------

echo ==========================================
echo      Dove QMS - Client Connector
echo ==========================================
echo.
echo This script connects this computer to the QMS Server.
echo.

:: Ask for IP if not set manually above (simple validation logic)
set /p USER_IP="Enter Server IP (Press Enter to use default %SERVER_IP%): "
if not "%USER_IP%"=="" set SERVER_IP=%USER_IP%

echo.
echo Connecting to http://%SERVER_IP%:3000 ...
echo.
echo Choose Device Type:
echo 1. Kiosk (Touch Screen - Silent Print)
echo 2. Display (TV - Audio Autoplay)
echo 3. Service Counter (Staff PC)
echo.
set /p TYPE="Select Option (1-3): "

set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if "%TYPE%"=="1" (
    echo Launching Kiosk Mode...
    start "" %CHROME_PATH% --kiosk --kiosk-printing "http://%SERVER_IP%:3000/kiosk"
)

if "%TYPE%"=="2" (
    echo Launching Display Mode...
    start "" %CHROME_PATH% --kiosk --autoplay-policy=no-user-gesture-required "http://%SERVER_IP%:3000/display"
)

if "%TYPE%"=="3" (
    echo Launching Counter Dashboard...
    start "" %CHROME_PATH% "http://%SERVER_IP%:3000/counter"
)

echo.
echo Launched! pop-up window can be closed.
pause
