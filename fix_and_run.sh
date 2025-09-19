#!/bin/bash

echo "🔧 Installing AsyncStorage for native support..."
cd app/frontend
npm install @react-native-async-storage/async-storage

echo "🎓 Starting SchoolMe with fixes..."
cd ../..

# Kill existing processes
lsof -ti:8765 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Start backend
echo "Starting backend on 0.0.0.0:8765..."
cd app/backend
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
    echo "Installing dependencies..."
    .venv/bin/python -m pip install -r requirements.txt
fi

.venv/bin/python app.py &
BACKEND_PID=$!
cd ../..

echo "Waiting for backend..."
sleep 5

# Start frontend
echo "Starting frontend..."
cd app/frontend
npx expo start --port 8080 &
FRONTEND_PID=$!

echo ""
echo "🎉 Ready!"
echo "📱 Expo Dev: http://localhost:8080"
echo "🌐 Backend: http://0.0.0.0:8765"
echo ""
echo "Press Ctrl+C to stop"

cleanup() {
    echo "Stopping..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
