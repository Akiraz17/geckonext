#!/bin/bash

echo "===================================================="
echo "     Gecko Next: Автоматический установщик (Unix)   "
echo "===================================================="
echo ""

# 1. Проверка Node.js
if ! command -v node &> /dev/null
then
    echo "[ОШИБКА] Node.js не найден!"
    echo "Установите Node.js через Homebrew (brew install node) или с сайта https://nodejs.org/"
    exit 1
fi

# 2. Проверка папки frontend
if [ ! -d "frontend" ]; then
    echo "[ОШИБКА] Папка 'frontend' не найдена в текущей директории!"
    exit 1
fi

cd frontend

# 3. Установка зависимостей
if [ ! -d "node_modules" ]; then
    echo "[1/2] Установка npm зависимостей..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Ошибка при выполнении npm install."
        exit 1
    fi
else
    echo "[ИНФО] Зависимости node_modules обнаружены, шаг установки пропущен."
fi

# 4. Запуск
echo ""
echo "[2/2] Запуск сервера разработки Vite..."
npm run dev