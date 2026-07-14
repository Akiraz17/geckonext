#!/bin/bash

echo "===================================================="
echo "     Gecko Next: Автоматический установщик (Unix)   "
echo "===================================================="
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ОШИБКА] Python 3 не найден!"
    echo "Установите Python 3.11+ через brew install python@3.11"
    exit 1
fi

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ОШИБКА] Node.js не найден!"
    echo "Установите Node.js: brew install node"
    exit 1
fi

# 3. Install backend dependencies
echo "[1/3] Установка backend зависимостей..."
cd backend
pip install -r requirements.txt -q
cd ..

# 4. Install frontend dependencies
echo "[2/3] Установка frontend зависимостей..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# 5. Start services
echo ""
echo "[3/3] Запуск сервисов..."
echo ""

cd backend && python3 -m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
sleep 3

cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "===================================================="
echo " Backend:  http://127.0.0.1:8000/docs"
echo " Frontend: http://127.0.0.1:5173/"
echo " Admin:    admin@gecko.local / admin"
echo "===================================================="
echo ""
echo "Нажмите Ctrl+C чтобы остановить серверы."

wait $BACKEND_PID $FRONTEND_PID
