@echo off
setlocal enabledelayedexpansion
title Gecko Next — Установщик

set "GECKO_DIR=%~dp0"
set "VENV_DIR=%GECKO_DIR%backend\.venv"
set "FRONTEND_DIR=%GECKO_DIR%frontend"
set "BACKEND_DIR=%GECKO_DIR%backend"

if /i "%~1"=="help" goto :help
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
if /i "%~1"=="install" goto :install
if /i "%~1"=="build" goto :build
if /i "%~1"=="backend" goto :backend_only

:: Default: start
goto :start

:help
echo Использование: install-and-run.bat [команда]
echo.
echo Команды:
echo   (без арг.)   Установка (если нужно) + запуск серверов + открытие браузера
echo   start        То же самое
echo   install      Только установка зависимостей, без запуска
echo   build        Production-сборка frontend
echo   backend      Запуск только backend-сервера
echo   help         Эта справка
goto :eof

:check_deps
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python 3 не найден!
    echo   Установите: https://www.python.org/downloads/
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] Python: %%v

node -v >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден!
    echo   Установите: https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v 2^>^&1') do echo [OK] Node:   %%v

for /f "tokens=*" %%v in ('npm -v 2^>^&1') do echo [OK] npm:    %%v
goto :eof

:setup_backend
echo.
echo [1/4] Настройка backend...

if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo   Создание виртуального окружения Python...
    python -m venv "%VENV_DIR%"
)

call "%VENV_DIR%\Scripts\activate.bat"
echo   Установка зависимостей Python...
pip install -r "%BACKEND_DIR%\requirements.txt" -q
call deactivate
echo   Backend готов.
goto :eof

:setup_frontend
echo.
echo [2/4] Настройка frontend...

cd /d "%FRONTEND_DIR%"
if not exist "node_modules\" (
    echo   Установка npm-зависимостей (это может занять минуту)...
    call npm install --silent
) else (
    echo   node_modules уже существует, пропускаем...
)
cd /d "%GECKO_DIR%"
echo   Frontend готов.
goto :eof

:build_frontend
echo.
echo [3/4] Сборка frontend (production)...
cd /d "%FRONTEND_DIR%"
call npx vite build --outDir dist
cd /d "%GECKO_DIR%"
echo   Сборка завершена.
goto :eof

:install
echo.
echo ====================================================
echo   Gecko Next — Установка зависимостей
echo ====================================================
call :check_deps
call :setup_backend
call :setup_frontend
echo.
echo ====================================================
echo   Установка завершена!
echo   Запустите: install-and-run.bat start
echo ====================================================
goto :eof

:build
echo.
echo ====================================================
echo   Gecko Next — Production сборка
echo ====================================================
call :check_deps
call :setup_backend
call :setup_frontend
call :build_frontend
echo.
echo ====================================================
echo   Production-сборка: frontend\dist\
echo   Запустите backend: install-and-run.bat backend
echo ====================================================
goto :eof

:backend_only
echo Запуск только backend...
call "%VENV_DIR%\Scripts\activate.bat"
cd /d "%BACKEND_DIR%"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
goto :eof

:start
echo.
echo ====================================================
echo   Gecko Next — Запуск
echo ====================================================
call :check_deps

if not exist "%VENV_DIR%\Scripts\python.exe" call :setup_backend
if not exist "%FRONTEND_DIR%\node_modules\" call :setup_frontend

echo.
echo [4/4] Запуск серверов...
echo.

call "%VENV_DIR%\Scripts\activate.bat"

echo   Останавливаю старые процессы Gecko Next...
taskkill /FI "WindowTitle eq Gecko-Backend" /F /T >nul 2>&1
taskkill /FI "WindowTitle eq Gecko-Frontend" /F /T >nul 2>&1

timeout /t 2 /nobreak >nul

echo   Запуск backend на http://127.0.0.1:8000 ...
cd /d "%BACKEND_DIR%"
start "Gecko-Backend" cmd /c "%VENV_DIR%\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd /d "%GECKO_DIR%"

timeout /t 3 /nobreak >nul

echo   Сборка frontend...
cd /d "%FRONTEND_DIR%"
call npm run build --silent >nul 2>&1
cd /d "%GECKO_DIR%"

echo   Запуск frontend preview на http://127.0.0.1:4173 ...
cd /d "%FRONTEND_DIR%"
start "Gecko-Frontend" cmd /c npm run preview -- --port 4173
cd /d "%GECKO_DIR%"

timeout /t 2 /nobreak >nul

echo.
echo ====================================================
echo   Gecko Next запущен!
echo   Frontend:  http://127.0.0.1:4173
echo   API docs:  http://127.0.0.1:8000/docs
echo   Admin:     admin@gecko.local / admin
echo ====================================================
echo.

echo   Открываю браузер...
start "" http://127.0.0.1:4173

echo   Закройте окна "Gecko-Backend" и "Gecko-Frontend" чтобы остановить.
pause
goto :eof
