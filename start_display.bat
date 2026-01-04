@echo off
setlocal
echo Starting Dove QMS Display Mode...
echo.

:: Use a dedicated folder for Display profile to avoid conflicts
set DATA_DIR=c:\dove_display_data
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

echo Launching Display...
echo 1. Autoplay is ENABLED (Sound will play automatically).
echo 2. Fullscreen mode.
echo.

:: --autoplay-policy=no-user-gesture-required: CRITICAL for audio without click
start "" %CHROME_PATH% --user-data-dir="%DATA_DIR%" --kiosk --autoplay-policy=no-user-gesture-required "http://localhost:3000/display"

echo.
echo Running. Press Alt+F4 to exit.
pause
