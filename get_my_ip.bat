@echo off
title My IP Address
echo ==================================================
echo         YOUR SERVER IP ADDRESS IS BELOW
echo ==================================================
echo.
ipconfig | findstr "IPv4"
echo.
echo use the number above (e.g. 192.168.1.X) in the Connect Script.
echo.
pause
