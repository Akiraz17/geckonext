@echo off
title Gecko Next

set "ROOT=%~dp0"

echo ================================================
echo         Gecko Next - Start Servers
echo ================================================
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
echo Close the "Gecko-Backend" and "Gecko-Frontend" windows to stop.
echo.
pause
