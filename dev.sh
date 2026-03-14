#!/bin/bash

echo "🚀 Starting Chauchero Development Servers"
echo ""

PROJECT_ROOT="/Users/diego/Documents/Chauchero"

check_port() {
    lsof -ti:$1 &>/dev/null
    return $?
}

if check_port 8000; then
    echo "⚠️  Port 8000 already in use (backend)"
    read -p "Kill existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8000 | xargs kill -9
        echo "✓ Killed process on port 8000"
    fi
fi

if check_port 3000; then
    echo "⚠️  Port 3000 already in use (frontend)"
    read -p "Kill existing process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9
        echo "✓ Killed process on port 3000"
    fi
fi

echo ""
echo "Starting services..."
echo ""

echo "📦 Backend API (FastAPI) on http://localhost:8000"
cd "$PROJECT_ROOT/backend"
./venv/bin/uvicorn app.main:app --reload > /tmp/chauchero-backend.log 2>&1 &
BACKEND_PID=$!

sleep 2

echo "⚛️  Frontend (Next.js) on http://localhost:3000"
cd "$PROJECT_ROOT/frontend"
npm run dev > /tmp/chauchero-frontend.log 2>&1 &
FRONTEND_PID=$!

echo ""
echo "✅ Services started!"
echo ""
echo "Backend:  http://localhost:8000 (PID: $BACKEND_PID)"
echo "API Docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/chauchero-backend.log"
echo "  Frontend: tail -f /tmp/chauchero-frontend.log"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
echo "Or: pkill -f uvicorn && pkill -f next-server"
echo ""

wait
