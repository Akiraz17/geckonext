@echo off
title Gecko Next Setup

echo ================================================
echo         Gecko Next - Setup for Windows
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
echo === Step 1: Python virtual environment ===
if not exist "%ROOT%backend\.venv\Scripts\python.exe" (
    python -m venv "%ROOT%backend\.venv"
)
"%ROOT%backend\.venv\Scripts\python.exe" -m pip install -r "%ROOT%backend\requirements.txt" -q
echo [OK] Backend

echo.
echo === Step 2: Frontend npm install ===
cd /d "%ROOT%frontend"
call npm install
echo [OK] npm install

echo.
echo === Step 3: Frontend build (vite only, no tsc) ===
cd /d "%ROOT%frontend"
call npx vite build
echo.
echo [BUILD EXIT CODE: %ERRORLEVEL%]
echo.

if %ERRORLEVEL% NEQ 0 (
    echo Build failed. Please copy the error text above.
    echo.
    echo Try to run this manually:
    echo   cd /d "%ROOT%frontend"
    echo   npx vite build
    echo.
    pause
    exit /b
)

echo [OK] Build complete
echo.
echo Setup finished successfully.
echo Now run: run.bat
pause
