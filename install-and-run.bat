@echo off
setlocal enabledelayedexpansion
title Gecko Next

set "ROOT=%~dp0"
set "VENV=%ROOT%backend\.venv"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

if /i "%~1"=="help"    goto :help
if /i "%~1"=="-h"      goto :help
if /i "%~1"=="--help"  goto :help
if /i "%~1"=="install" goto :install
if /i "%~1"=="build"   goto :build
if /i "%~1"=="backend" goto :backend
if /i "%~1"=="dev"     goto :dev
goto :start

:help
echo Usage: install-and-run.bat [command]
echo.
echo Commands:
echo   (none)    Install deps + build frontend + start servers
echo   dev       Install deps + start backend + frontend dev mode (hot-reload)
echo   install   Install dependencies only
echo   build     Production build of frontend
echo   backend   Start backend only
echo   help      This help
goto :eof

:check_deps
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Install from https://www.python.org/downloads/
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] Python: %%v
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Install from https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v 2^>^&1') do echo [OK] Node:   %%v
for /f "tokens=*" %%v in ('npm -v 2^>^&1')   do echo [OK] npm:    %%v
goto :eof

:setup_backend
echo.
echo === [1] Backend ===
if not exist "%VENV%\Scripts\python.exe" (
    echo   Creating virtual env...
    python -m venv "%VENV%"
)
echo   Installing Python packages...
"%VENV%\Scripts\python.exe" -m pip install -r "%BACKEND%\requirements.txt" -q
echo   Done.
goto :eof

:setup_frontend
echo.
echo === [2] Frontend ===
if not exist "%FRONTEND%\node_modules\" (
    echo   Installing npm packages...
    pushd "%FRONTEND%" && call npm install && popd
) else (
    echo   node_modules exists, skipping...
)
echo   Done.
goto :eof

:build_frontend
echo.
echo === [3] Build frontend ===
pushd "%FRONTEND%"
call npx vite build --outDir dist
if errorlevel 1 (
    popd
    echo [ERROR] Frontend build failed!
    exit /b 1
)
popd
echo   Build complete.
goto :eof

:install
echo.
echo ========================================
echo   Gecko Next - Install dependencies
echo ========================================
call :check_deps
call :setup_backend
call :setup_frontend
echo.
echo   Done! Run: install-and-run.bat start
goto :eof

:build
echo.
echo ========================================
echo   Gecko Next - Production build
echo ========================================
call :check_deps
call :setup_backend
call :setup_frontend
call :build_frontend
if errorlevel 1 pause
echo.
echo   Build: frontend\dist\
echo   Run backend: install-and-run.bat backend
goto :eof

:backend
echo Starting backend only...
"%VENV%\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
goto :eof

:start
echo.
echo ========================================
echo   Gecko Next - Start
echo ========================================
call :check_deps
if not exist "%VENV%\Scripts\python.exe" call :setup_backend
if not exist "%FRONTEND%\node_modules\"     call :setup_frontend

echo.
echo === Building frontend ===
call :build_frontend
if errorlevel 1 pause & goto :eof

echo.
echo === Starting servers ===

echo   Stopping old instances...
taskkill /FI "WindowTitle eq Gecko-*" /F /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo   Backend  ^> http://127.0.0.1:8000
start "Gecko-Backend" /D "%BACKEND%" "%VENV%\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
timeout /t 3 /nobreak >nul

echo   Frontend ^> http://127.0.0.1:4173
start "Gecko-Frontend" /D "%FRONTEND%" cmd /c "node_modules\.bin\vite.cmd preview --port 4173 --host 0.0.0.0"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Gecko Next is running!
echo   Frontend:  http://127.0.0.1:4173
echo   API docs:  http://127.0.0.1:8000/docs
echo   Admin:     admin@gecko.local / admin
echo ========================================
echo.
echo   Opening browser...
start "" http://127.0.0.1:4173
echo   Close the "Gecko-Backend" and "Gecko-Frontend" windows to stop.
pause
goto :eof

:dev
echo.
echo ========================================
echo   Gecko Next - Dev mode (hot-reload)
echo ========================================
call :check_deps
if not exist "%VENV%\Scripts\python.exe" call :setup_backend
if not exist "%FRONTEND%\node_modules\"     call :setup_frontend

echo.
echo === Starting servers ===

echo   Stopping old instances...
taskkill /FI "WindowTitle eq Gecko-*" /F /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo   Backend  ^> http://127.0.0.1:8000  (auto-reload)
start "Gecko-Backend" /D "%BACKEND%" "%VENV%\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
timeout /t 3 /nobreak >nul

echo   Frontend ^> http://127.0.0.1:5173  (hot-reload)
start "Gecko-Frontend" /D "%FRONTEND%" cmd /c "node_modules\.bin\vite.cmd --host 0.0.0.0"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Gecko Next - Dev mode!
echo   Frontend:  http://127.0.0.1:5173
echo   API docs:  http://127.0.0.1:8000/docs
echo   Admin:     admin@gecko.local / admin
echo ========================================
echo.
echo   Opening browser...
start "" http://127.0.0.1:5173
echo   Close the "Gecko-Backend" and "Gecko-Frontend" windows to stop.
pause
goto :eof
