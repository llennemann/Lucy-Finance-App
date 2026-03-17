#!/bin/bash

# Lucy Finance App - Quick Start Script

BACKEND_PORT=5000
FRONTEND_PORT=8000
BACKEND_HOST=127.0.0.1
FRONTEND_HOST=127.0.0.1
BACKEND_PID=""
FRONTEND_PID=""
CLEANED_UP=0

cleanup() {
    if [ "$CLEANED_UP" -eq 1 ]; then
        return
    fi
    CLEANED_UP=1

    echo ""
    echo "🧹 Shutting down servers..."

    if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        pkill -TERM -P "$BACKEND_PID" 2>/dev/null || true
        kill "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        pkill -TERM -P "$FRONTEND_PID" 2>/dev/null || true
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi

    # Fallback cleanup by ports in case Flask reloader leaves child processes behind.
    for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
        port_pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
        if [ -n "$port_pids" ]; then
            echo "$port_pids" | xargs kill 2>/dev/null || true
        fi
    done

    echo "✅ Cleanup complete. Ports $BACKEND_PORT and $FRONTEND_PORT released."
}

handle_interrupt() {
    cleanup
    exit 0
}

trap handle_interrupt INT TERM
trap cleanup EXIT

echo "🚀 Starting Lucy Finance App..."
echo ""

# Check if backend/venv exists, if not create it
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python -m venv venv
    cd ..
fi

# Activate virtual environment
echo "✅ Activating virtual environment..."
source backend/venv/bin/activate

# Install dependencies if not already installed
echo "📥 Installing backend dependencies..."
pip install -q -r backend/requirements.txt

# Start the Flask backend
echo "🎯 Starting Flask backend on http://$BACKEND_HOST:$BACKEND_PORT..."
python backend/app.py &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start the frontend server
echo "🖥️  Starting frontend on http://$FRONTEND_HOST:$FRONTEND_PORT..."
(
    cd frontend
    python -m http.server "$FRONTEND_PORT" --bind "$FRONTEND_HOST"
) &
FRONTEND_PID=$!

echo ""
echo "✨ Lucy Finance App is running!"
echo ""
echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait "$BACKEND_PID" "$FRONTEND_PID"
