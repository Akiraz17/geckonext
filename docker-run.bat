@echo off
title Gecko Next Docker

echo ====================================================
echo        Gecko Next - Docker Launcher
echo ====================================================
echo.

docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found.
    echo Install Docker Desktop from https://www.docker.com/products/docker-desktop/
    echo Or use install-and-run.bat to run without Docker.
    pause
    exit /b
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running.
    echo Please start Docker Desktop first.
    pause
    exit /b
)

echo [*] Building and starting containers...
echo     This may take a few minutes on first run...
echo.

docker-compose up --build

echo.
echo ====================================================
echo  Frontend: http://localhost
echo  Backend:  http://localhost:8000/docs
echo  Admin:    admin@gecko.local / admin
echo ====================================================
echo.
echo Press Ctrl+C to stop.
pause
