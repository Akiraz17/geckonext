@echo off
title Gecko Next

echo ====================================================
echo            Gecko Next Launcher
echo ====================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3 not found
    pause
    exit /b
)

node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found
    pause
    exit /b
)

echo [*] Installing backend deps...
cd backend
pip install -r requirements.txt -q
cd ..

echo [*] Installing frontend deps...
cd frontend
if not exist node_modules\ npm install
cd ..

echo.
echo [*] Starting servers...
echo.

cd backend
start "Gecko-Backend" cmd /c python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
cd ..

timeout /t 3 /nobreak >nul

cd frontend
start "Gecko-Frontend" cmd /c npm run dev
cd ..

echo.
echo ====================================================
echo  Backend : http://127.0.0.1:8000/docs
echo  Frontend: http://127.0.0.1:5173
echo  Admin   : admin@gecko.local / admin
echo ====================================================
echo.
pause
