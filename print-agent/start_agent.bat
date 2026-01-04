@echo off
title DoveQMS Client Print Agent
cd /d "%~dp0"
echo Starting Print Agent on port 8080...
echo.
npm install
node agent.js
pause
