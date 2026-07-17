@echo off
title Gecko Next

echo ================================================
echo         Gecko Next - Windows Launcher
echo ================================================
echo.

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python not found. Download: https://www.python.org/downloads/
    pause
    exit /b
)
python --version

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Download: https://nodejs.org/
    pause
    exit /b
)
node -v

set "ROOT=%~dp0"

echo.
echo === Backend setup ===
if not exist "%ROOT%backend\.venv\Scripts\python.exe" (
    python -m venv "%ROOT%backend\.venv"
)
"%ROOT%backend\.venv\Scripts\python.exe" -m pip install -r "%ROOT%backend\requirements.txt" -q
echo [OK]

echo.
echo === Frontend install ===
cd /d "%ROOT%frontend"
if not exist "node_modules" (
    call npm install
)
echo [OK]

echo.
echo === Starting backend (separate window, port 8000) ===
cd /d "%ROOT%backend"
start "Gecko-Backend" "%ROOT%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
cd /d "%ROOT%"
timeout /t 3 /nobreak >nul

echo.
echo === Starting frontend (in this window, port 5173) ===
echo Open http://127.0.0.1:5173 in your browser.
echo Press Ctrl+C to stop the frontend.
echo.
cd /d "%ROOT%frontend"
npm run dev -- --host
pause
