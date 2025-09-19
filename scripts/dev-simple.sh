#!/bin/bash

# Simple SchoolMe Development Script
# Starts backend and frontend in parallel

echo "🎓 Starting SchoolMe Development Environment..."

# Kill any existing processes
lsof -ti:8765 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

echo "Starting backend..."
./scripts/start.sh &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 10

echo "Starting frontend development server..."
cd app/frontend
npx expo start --web --port 8080 &
FRONTEND_PID=$!

echo ""
echo "🎉 Development Environment Ready!"
echo "================================="
echo ""
echo "📱 Frontend Dev: http://localhost:8080"
echo "🌐 Full App:     http://localhost:8765"
echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup function
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    lsof -ti:8765 | xargs kill -9 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep running
wait
