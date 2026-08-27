@echo off
setlocal
set "ROOT=%~dp0"
set "NODE=%ROOT%.runtime\node-v22.14.0-win-x64\node.exe"
set "NEXT=%ROOT%frontend\node_modules\next\dist\bin\next"
set "LOGDIR=%ROOT%.logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
cd /d "%ROOT%frontend"
"%NODE%" "%NEXT%" dev -H 127.0.0.1 -p 3100 > "%LOGDIR%\frontend-3100.out.log" 2> "%LOGDIR%\frontend-3100.err.log"
