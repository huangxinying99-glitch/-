@echo off
setlocal
set "PORT=3000"
set "HOST=127.0.0.1"
pushd "%~dp0"
start "" /b node server.mjs
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/"
popd
endlocal
