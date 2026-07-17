#!/bin/bash
set -e

GECKO_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$GECKO_DIR/backend/.venv"
FRONTEND_DIR="$GECKO_DIR/frontend"
BACKEND_DIR="$GECKO_DIR/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        ${GREEN}Gecko Next — Установщик для Linux${CYAN}         ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_deps() {
    local missing=""

    if ! command -v python3 &>/dev/null; then
        echo -e "${RED}[ОШИБКА] Python 3 не найден!${NC}"
        echo "  Установите: sudo apt install python3 python3-venv python3-pip"
        missing=1
    fi

    if ! command -v node &>/dev/null; then
        echo -e "${RED}[ОШИБКА] Node.js не найден!${NC}"
        echo "  Установите: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install nodejs"
        missing=1
    fi

    if ! command -v npm &>/dev/null; then
        echo -e "${RED}[ОШИБКА] npm не найден!${NC}"
        missing=1
    fi

    if [ -n "$missing" ]; then
        exit 1
    fi

    echo -e "${GREEN}[OK] Python: $(python3 --version)${NC}"
    echo -e "${GREEN}[OK] Node:   $(node --version)${NC}"
    echo -e "${GREEN}[OK] npm:    $(npm --version)${NC}"
}

setup_backend() {
    echo ""
    echo -e "${YELLOW}[1/4] Настройка backend...${NC}"

    if [ ! -d "$VENV_DIR" ]; then
        echo "  Создание виртуального окружения Python..."
        python3 -m venv "$VENV_DIR"
    fi

    source "$VENV_DIR/bin/activate"

    echo "  Установка зависимостей Python..."
    pip install -r "$BACKEND_DIR/requirements.txt" -q

    deactivate
    echo -e "  ${GREEN}Backend готов.${NC}"
}

setup_frontend() {
    echo ""
    echo -e "${YELLOW}[2/4] Настройка frontend...${NC}"

    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        echo "  Установка npm-зависимостей (это может занять минуту)..."
        npm install --silent
    else
        echo "  node_modules уже существует, пропускаем..."
    fi

    chmod +x "$FRONTEND_DIR/node_modules/.bin/"* 2>/dev/null || true

    cd "$GECKO_DIR"
    echo -e "  ${GREEN}Frontend готов.${NC}"
}

build_frontend() {
    echo ""
    echo -e "${YELLOW}[3/4] Сборка frontend (production)...${NC}"

    cd "$FRONTEND_DIR"
    npx vite build --outDir dist
    cd "$GECKO_DIR"

    echo -e "  ${GREEN}Сборка завершена.${NC}"
}

free_port() {
    local port=$1
    if ! ss -tlnp 2>/dev/null | grep -q ":$port "; then
        echo $port
        return
    fi
    local p=$((port + 1))
    while [ $p -le $((port + 20)) ]; do
        if ! ss -tlnp 2>/dev/null | grep -q ":$p "; then
            echo $p
            return
        fi
        p=$((p + 1))
    done
    echo ""
}

kill_on_ports() {
    for p in "$@"; do
        local pids
        pids=$(ss -tlnp 2>/dev/null | grep ":$p " | grep -oP 'pid=\K[0-9]+' | sort -u | tr '\n' ' ')
        for pid in $pids; do
            [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
        done
    done
    # Also kill any leftover uvicorn / vite preview processes from this project
    pkill -9 -f "uvicorn.*app.main:app" 2>/dev/null || true
    pkill -9 -f "vite preview" 2>/dev/null || true
    pkill -9 -f "npm run preview" 2>/dev/null || true
    sleep 1
}

launch() {
    echo ""
    echo -e "${YELLOW}[4/4] Запуск серверов...${NC}"
    echo ""

    source "$VENV_DIR/bin/activate"

    echo -e "  ${YELLOW}Останавливаю старые процессы Gecko Next...${NC}"
    kill_on_ports 8000 8001 4173

    BACKEND_PORT=$(free_port 8000)
    if [ -z "$BACKEND_PORT" ]; then
        echo -e "  ${RED}Не удалось найти свободный порт для backend (8000-8020).${NC}"
        exit 1
    fi

    FRONTEND_PORT=$(free_port 4173)
    if [ -z "$FRONTEND_PORT" ]; then
        echo -e "  ${RED}Не удалось найти свободный порт для frontend (4173-4193).${NC}"
        exit 1
    fi

    echo -e "  ${CYAN}Запуск backend на http://127.0.0.1:$BACKEND_PORT ...${NC}"
    cd "$BACKEND_DIR"
    python3 -m uvicorn app.main:app --host 127.0.0.1 --port $BACKEND_PORT > /tmp/gecko-backend.log 2>&1 &
    BACKEND_PID=$!
    cd "$GECKO_DIR"

    sleep 3

    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "  ${RED}Backend не запустился! Лог:${NC}"
        cat /tmp/gecko-backend.log 2>/dev/null
        exit 1
    fi

    echo -e "  ${CYAN}Сборка frontend...${NC}"
    cd "$FRONTEND_DIR"
    npm run build --silent > /dev/null 2>&1
    cd "$GECKO_DIR"

    echo -e "  ${CYAN}Запуск frontend preview на http://127.0.0.1:$FRONTEND_PORT ...${NC}"
    cd "$FRONTEND_DIR"
    npm run preview -- --port $FRONTEND_PORT > /tmp/gecko-frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd "$GECKO_DIR"

    sleep 3

    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "  ${RED}Frontend preview не запустился! Лог:${NC}"
        cat /tmp/gecko-frontend.log 2>/dev/null
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Gecko Next запущен!                          ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  Frontend:  ${CYAN}http://127.0.0.1:$FRONTEND_PORT${GREEN}                  ║${NC}"
    echo -e "${GREEN}║  API docs:  ${CYAN}http://127.0.0.1:$BACKEND_PORT/docs${GREEN}             ║${NC}"
    echo -e "${GREEN}║  Admin:     ${CYAN}admin@gecko.local / admin${GREEN}            ║${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "  ${YELLOW}Нажми Ctrl+C чтобы остановить серверы.${NC}"

    if command -v xdg-open &>/dev/null; then
        sleep 1
        xdg-open "http://127.0.0.1:$FRONTEND_PORT" &>/dev/null &
    fi

    cleanup() {
        echo ""
        echo -e "${YELLOW}Остановка серверов...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}Серверы остановлены.${NC}"
        exit 0
    }

    trap cleanup SIGINT SIGTERM

    wait $BACKEND_PID $FRONTEND_PID
}

case "${1:-}" in
    install)
        banner
        check_deps
        setup_backend
        setup_frontend
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════${NC}"
        echo -e "${GREEN}  Установка завершена!                   ${NC}"
        echo -e "${GREEN}  Запустите: ${CYAN}./install-and-run.sh start${GREEN}      ${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════${NC}"
        ;;
    build)
        banner
        check_deps
        setup_backend
        setup_frontend
        build_frontend
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════${NC}"
        echo -e "${GREEN}  Production-сборка: ${CYAN}frontend/dist/${GREEN}  ${NC}"
        echo -e "${GREEN}  Запустите backend: ${CYAN}./install-and-run.sh backend${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════${NC}"
        ;;
    backend)
        echo -e "${YELLOW}Запуск только backend...${NC}"
        source "$VENV_DIR/bin/activate"
        cd "$BACKEND_DIR"
        python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
        cd "$GECKO_DIR"
        ;;
    start|run|"")
        banner
        check_deps
        if [ ! -d "$VENV_DIR" ]; then
            setup_backend
        fi
        if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
            setup_frontend
        fi
        launch
        ;;
    help|-h|--help)
        echo "Использование: ./install-and-run.sh [команда]"
        echo ""
        echo "Команды:"
        echo "  (без арг.)  Установка (если нужно) + запуск серверов + открытие в браузере"
        echo "  start       То же самое"
        echo "  install     Только установка зависимостей, без запуска"
        echo "  build       Production-сборка frontend"
        echo "  backend     Запуск только backend-сервера"
        echo "  help        Эта справка"
        ;;
    *)
        echo -e "${RED}Неизвестная команда: $1${NC}"
        echo "Используйте: ./install-and-run.sh help"
        exit 1
        ;;
esac
