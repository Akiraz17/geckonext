@echo off
cd /d "%~dp0"

echo Installing missing platform package (Windows fix)...
call npm install @rollup/rollup-win32-x64-msvc --no-save >nul 2>&1

echo Starting Vite dev server...
call node_modules\.bin\vite.cmd --host
if errorlevel 1 (
    echo.
    echo Vite failed. Reinstalling all dependencies...
    echo.
    rmdir /s /q node_modules 2>nul
    del package-lock.json 2>nul
    call npm install
    echo.
    echo Starting Vite again...
    call node_modules\.bin\vite.cmd --host
)
pause
