@echo off
cd /d "%~dp0"
echo Installing SBF WORLD portal dependencies...
call npm install
if errorlevel 1 pause
if errorlevel 1 exit /b 1
echo Starting SBF WORLD portal on http://localhost:3000 ...
call npm run dev
pause
