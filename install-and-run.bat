@echo off
chcp 65001 > nul
title Gecko Next Installer

echo ====================================================
echo      Gecko Next: Автоматический установщик
echo ====================================================
echo.

:: 1. Проверка установленного Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден на этом компьютере!
    echo Пожалуйста, скачайте и установите Node.js с официального сайта: https://nodejs.org/
    echo После установки перезапустите этот файл.
    echo.
    pause
    exit /b
)

:: 2. Переход в папку фронтенда
if not exist "frontend" (
    echo [ОШИБКА] Папка "frontend" не найдена! Убедитесь, что запускаете скрипт из корня проекта.
    pause
    exit /b
)

cd frontend

:: 3. Установка зависимостей (если папки node_modules еще нет)
if not exist "node_modules" (
    echo [1/2] Папка node_modules не найдена. Устанавливаю зависимости...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось установить зависимости. Проверьте подключение к интернету.
        pause
        exit /b
    )
    echo [ОК] Зависимости успешно установлены!
) else (
    echo [ИНФО] Зависимости уже установлены, пропускаю шаг npm install.
)

:: 4. Запуск проекта
echo.
echo [2/2] Запускаю сервер разработки Vite...
echo Проект автоматически откроется в браузере через несколько секунд.
echo Для остановки сервера нажмите Ctrl + C в этом окне.
echo.

call npm run dev
pause