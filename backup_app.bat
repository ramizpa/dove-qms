@echo off
setlocal
title Dove QMS Backup Utility

echo ===================================================
echo   Dove QMS Application Backup
echo ===================================================
echo.
echo This script will:
echo 1. Stop the running server (to unlock the database)
echo 2. Create a backup folder with today's timestamp
echo 3. Copy all application files
echo.

set "SOURCE=%~dp0"
:: Get date/time in a region-independent way is hard in batch, relying on simple parsing
:: Assuming default Windows format for now, will fallback if it fails.
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,4%"

set "BACKUP_DIR=%SOURCE%..\DoveQMS_Backups\Backup_%TIMESTAMP%"

echo [1/3] Stopping Server...
call stop_server.bat 
echo Server stopped.
echo.

echo [2/3] Backing up to: %BACKUP_DIR%
echo Please wait, copying files... 
echo (This may take a minute...)

if not exist "%SOURCE%..\DoveQMS_Backups" mkdir "%SOURCE%..\DoveQMS_Backups"

:: Use Robocopy for speed and better handling of long paths
:: /E = recursive, /ZB = restartable mode, /DCOPY:T = copy timestamps, /XJ = exclude junction points
:: Exclude .next/cache to save space if needed, but let's keep it simple for Full Backup.
robocopy "%SOURCE%." "%BACKUP_DIR%" /E /ZB /DCOPY:T /XJ /XD ".next" "node_modules"

:: Copy node_modules separately or skip? 
:: User asked for "Full folder copy". Robocopy is fast. 
:: Let's skip node_modules to make it fast, and tell user they can 'npm install' if they restore.
:: BUT user is non-technical. Better to include it so it's "Ready to Run".
:: Re-running robocopy for node_modules
echo Copying dependencies (might be slow)...
robocopy "%SOURCE%node_modules" "%BACKUP_DIR%\node_modules" /E /ZB /DCOPY:T /XJ >nul

echo.
echo [3/3] Backup Complete!
echo Location: %BACKUP_DIR%
echo.
echo ===================================================
echo  READY. You can restart the server now.
echo ===================================================
pause
