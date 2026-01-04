@echo off
title Dove QMS Database Manager
echo Starting Prisma Studio...
echo.
echo This will open a web interface to view and edit your database.
echo.

cd /d "%~dp0"
npx prisma studio --browser none
pause
