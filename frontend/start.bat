@echo off
cd /d "%~dp0"

echo Starting Vite dev server...
node_modules\.bin\vite.cmd --host
if errorlevel 1 (
    echo.
    echo Vite failed. Possible cause: missing @rollup/rollup-win32-x64-msvc.
    echo This is a known npm bug. Reinstalling dependencies...
    echo.
    rmdir /s /q node_modules 2>nul
    del package-lock.json 2>nul
    call npm install
    echo.
    echo Done. Starting Vite again...
    node_modules\.bin\vite.cmd --host
)
pause
