@echo off
title Gecko Next

echo ================================================
echo  Gecko Next - Windows
echo ================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Download: https://www.python.org/downloads/
    pause
    exit /b
)
python --version

node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Download: https://nodejs.org/
    pause
    exit /b
)
node -v

set "ROOT=%~dp0"

echo.
echo 1/3 Backend setup...
if not exist "%ROOT%backend\.venv\Scripts\python.exe" (
    python -m venv "%ROOT%backend\.venv"
)
"%ROOT%backend\.venv\Scripts\python.exe" -m pip install -r "%ROOT%backend\requirements.txt" -q
echo OK

echo.
echo 2/3 Frontend npm install...
cd /d "%ROOT%frontend"
if not exist "node_modules" (
    call npm install
)
echo OK

echo.
echo 3/3 Starting servers...
echo.

start "Gecko-Backend" /D "%ROOT%backend" "%ROOT%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
timeout /t 4 /nobreak >nul

start "Gecko-Frontend" /D "%ROOT%frontend" cmd /c "npx --yes vite --host"
timeout /t 5 /nobreak >nul

echo ================================================
echo  Frontend: http://127.0.0.1:5173
echo  API docs: http://127.0.0.1:8000/docs
echo  Admin:    admin@gecko.local / admin
echo ================================================
start "" http://127.0.0.1:5173
echo.
echo Close the two server windows to stop.
pause
