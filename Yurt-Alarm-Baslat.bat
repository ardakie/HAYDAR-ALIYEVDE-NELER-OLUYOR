@echo off
chcp 65001 >nul
title Yurt Alarm
mode con: cols=102 lines=36
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Once https://nodejs.org adresinden LTS surumunu kur.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Ilk kurulum yapiliyor, biraz bekle...
  call npm install --omit=dev --no-audit --no-fund
)
node --liftoff-only --max-semi-space-size=1 --max-old-space-size=64 index.js %*
pause
