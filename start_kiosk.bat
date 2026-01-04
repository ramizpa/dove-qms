@echo off
setlocal
echo Starting Dove QMS Kiosk Mode (Rich Print)...
echo.
echo Closing running Kiosk instances...
taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq Kiosk*" >nul 2>&1

:: Use a dedicated folder for Kiosk settings
set DATA_DIR=c:\dove_kiosk_data
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

:: Find Chrome
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if not exist %CHROME_PATH% (
    echo Chrome not found. trying Edge...
    set CHROME_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

if not exist %CHROME_PATH% (
    echo Browser not found. Please install Chrome.
    pause
    exit /b
)

echo Launching...
echo 1. If asked to restore pages, click X.
echo 2. First print MIGHT ask for printer. Select Epson.
echo 3. Future prints will be SILENT.
echo.

:: --kiosk-printing: Silences the print dialog
:: --user-data-dir: Ensures a fresh/isolated profile so flags work
start "" %CHROME_PATH% --user-data-dir="%DATA_DIR%" --kiosk --kiosk-printing --autoplay-policy=no-user-gesture-required "http://localhost:3000/kiosk"

echo.
echo Running. Press Alt+F4 to exit kiosk.
pause
