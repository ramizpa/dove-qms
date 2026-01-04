@echo off
title DoveQMS Server
echo ---------------------------------------------------
echo      Starting DoveQMS (Production Mode)
echo ---------------------------------------------------
echo.

:: Ensure we are in the correct directory
cd /d "%~dp0"

echo 1. Checking Database...
call npx prisma db push

echo.
echo 2. Starting Server...
echo    Access at: http://localhost:3000
echo ---------------------------------------------------
call npm start
pause
