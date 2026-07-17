@echo off
title Gecko Next

echo ================================================
echo         Gecko Next - Windows Launcher
echo ================================================
echo.

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python not found. Download from: https://www.python.org/downloads/
    pause
    exit /b
)
python --version

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Download from: https://nodejs.org/
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
echo === Frontend build ===
cd /d "%ROOT%frontend"
call npm run build
echo.
echo Build exit code: %ERRORLEVEL%
echo If non-zero, scroll up to see the error, then try:
echo   cd /d "%ROOT%frontend"
echo   npx vite build
echo.
pause
echo.

echo === Starting backend (port 8000) ===
start "Gecko-Backend" /D "%ROOT%backend" "%ROOT%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
timeout /t 3 /nobreak >nul

echo === Starting frontend (port 4173) ===
start "Gecko-Frontend" /D "%ROOT%frontend" cmd /c "npm run preview -- --port 4173 --host"
timeout /t 3 /nobreak >nul

echo.
echo ================================================
echo  Frontend: http://127.0.0.1:4173
echo  API docs: http://127.0.0.1:8000/docs
echo  Admin:    admin@gecko.local / admin
echo ================================================
echo.
start "" http://127.0.0.1:4173
echo Close "Gecko-Backend" + "Gecko-Frontend" windows to stop.
pause
