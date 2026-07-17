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
echo === Starting backend (port 8000) ===
start "Gecko-Backend" /D "%ROOT%backend" "%ROOT%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
timeout /t 3 /nobreak >nul

echo === Starting frontend (port 5173, hot-reload) ===
start "Gecko-Frontend" /D "%ROOT%frontend" cmd /c "npm run dev -- --host"
timeout /t 3 /nobreak >nul

echo.
echo ================================================
echo  Gecko Next is running!
echo  Frontend: http://127.0.0.1:5173
echo  API docs: http://127.0.0.1:8000/docs
echo  Admin:    admin@gecko.local / admin
echo ================================================
echo.
start "" http://127.0.0.1:5173
echo Close the "Gecko-Backend" and "Gecko-Frontend" windows to stop.
pause
