#!/bin/bash

# SchoolMe Development Environment Startup Script
# This script starts both backend and frontend for local development

set -e  # Exit on any error

echo "🎓 Starting SchoolMe Development Environment..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[SchoolMe]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SchoolMe]${NC} ✅ $1"
}

print_warning() {
    echo -e "${YELLOW}[SchoolMe]${NC} ⚠️  $1"
}

print_error() {
    echo -e "${RED}[SchoolMe]${NC} ❌ $1"
}

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    if check_port $1; then
        print_warning "Killing existing process on port $1..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down SchoolMe development environment..."
    
    # Kill any processes on our ports
    kill_port 8765
    kill_port 8080
    
    print_success "Development environment stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Python is available
if ! command -v python &> /dev/null; then
    print_error "Python not found. Please install Python 3.11+ and try again."
    exit 1
fi

PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
print_success "Python $PYTHON_VERSION found"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js and try again."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION found"

# Clear any existing processes on our ports
print_status "Clearing existing processes..."
kill_port 8765
kill_port 8080

# Navigate to project root
cd "$(dirname "$0")/.."

# Start Backend using existing script
print_status "Starting Python backend using existing start script..."
./scripts/start.sh &
BACKEND_PID=$!

# Wait for backend to start
print_status "Waiting for backend to start..."
for i in {1..45}; do
    if check_port 8765; then
        print_success "Backend started successfully on http://localhost:8765"
        break
    fi
    if [ $i -eq 45 ]; then
        print_error "Backend failed to start after 45 seconds"
        cleanup
        exit 1
    fi
    sleep 1
done

# Start Frontend Development Server
print_status "Starting React Native frontend development server..."
cd app/frontend

print_status "Installing frontend dependencies if needed..."
npm install --silent 2>/dev/null || npm install

print_status "Starting Expo development server on port 8080..."
npx expo start --web --port 8080 &
FRONTEND_PID=$!

# Wait for frontend to start
print_status "Waiting for frontend development server to start..."
for i in {1..30}; do
    if check_port 8080; then
        print_success "Frontend development server started on http://localhost:8080"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Frontend development server failed to start after 30 seconds"
        cleanup
        exit 1
    fi
    sleep 1
done

# Development environment ready
echo ""
echo "🎉 SchoolMe Development Environment Ready!"
echo "=========================================="
echo ""
echo "📱 Frontend Dev Server: http://localhost:8080"
echo "   • Hot reloading enabled"
echo "   • Edit code and see changes instantly"
echo "   • Great for UI development"
echo ""
echo "🌐 Full App with AI:    http://localhost:8765"
echo "   • Complete voice functionality"
echo "   • Azure AI integration"
echo "   • Use for testing complete features"
echo ""
echo "💡 Development Workflow:"
echo "   1. Use http://localhost:8080 for UI changes (hot reload)"
echo "   2. Use http://localhost:8765 for AI voice testing"
echo "   3. Press Ctrl+C to stop both servers"
echo ""
echo "🎤 Ready to test voice interaction!"
echo "📚 Ask questions about Contoso to see reference citations"
echo ""

# Keep script running and monitor processes
print_status "Monitoring development environment... (Press Ctrl+C to stop)"

while true; do
    # Check if backend is still running
    if ! check_port 8765; then
        print_error "Backend server stopped unexpectedly"
        cleanup
        exit 1
    fi
    
    # Check if frontend is still running
    if ! check_port 8080; then
        print_error "Frontend development server stopped unexpectedly"
        cleanup
        exit 1
    fi
    
    sleep 10
done