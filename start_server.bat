@echo off
title Dove QMS Server (Dev Mode)
echo Starting Dove QMS Server...
echo.
echo Please wait for "Ready on http://localhost:3000" to appear.
echo Do NOT close this window.
echo.
cd /d "%~dp0"
npm run dev
pause
