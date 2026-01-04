@echo off
set "URL=http://localhost:3000/kiosk"

:: Try to find Chrome in standard locations
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    echo Chrome not found in standard locations.
    echo Please manually launch Chrome with: file.exe --kiosk --kiosk-printing %URL%
    pause
    exit /b
)

echo Closing existing Chrome instances to ensure flags take effect...
taskkill /IM chrome.exe /F >nul 2>&1

echo Launching Kiosk with Silent Printing...
"%CHROME_PATH%" --kiosk --kiosk-printing "%URL%"
exit
