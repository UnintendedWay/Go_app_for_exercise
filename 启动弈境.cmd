@echo off
setlocal
title Go Launcher
cd /d "%~dp0"
if not exist "%~dp0Go.exe" goto missing
curl.exe --fail --silent http://127.0.0.1:8787/api/status >nul 2>nul
if not errorlevel 1 goto ready
echo Starting Go and KataGo...
start "Go" "%~dp0Go.exe"
for /l %%I in (1,1,30) do (
  curl.exe --fail --silent http://127.0.0.1:8787/api/status >nul 2>nul
  if not errorlevel 1 goto ready
  ping 127.0.0.1 -n 2 >nul
)
echo Startup timed out. Check Go.log and make sure port 8787 is free.
if exist "%~dp0Go.log" type "%~dp0Go.log"
pause
exit /b 1
:ready
start "" "http://127.0.0.1:8787/"
exit /b 0
:missing
echo Go.exe was not found next to this launcher.
pause
exit /b 1
