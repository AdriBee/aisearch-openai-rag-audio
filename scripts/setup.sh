#!/bin/bash

# SchoolMe Development Setup Script
# This script sets up the development environment

set -e  # Exit on any error

echo "🎓 Setting up SchoolMe Development Environment..."
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[Setup]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[Setup]${NC} ✅ $1"
}

print_warning() {
    echo -e "${YELLOW}[Setup]${NC} ⚠️  $1"
}

print_error() {
    echo -e "${RED}[Setup]${NC} ❌ $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Python
if ! command -v python &> /dev/null; then
    print_error "Python not found. Please install Python 3.11+ first."
    echo "Visit: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
print_success "Python $PYTHON_VERSION found"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION found"

# Install root dependencies
print_status "Installing root dependencies..."
npm install --silent

# Setup Python backend
print_status "Setting up Python backend..."
cd "$(dirname "$0")/.."

# Create Python virtual environment
print_status "Creating Python virtual environment..."
python -m venv .venv

# Install Python dependencies
print_status "Installing Python dependencies..."
.venv/bin/python -m pip install --quiet --disable-pip-version-check install -r app/backend/requirements.txt

print_success "Backend setup complete"

# Setup React Native frontend
print_status "Setting up React Native frontend..."
cd app/frontend

print_status "Installing frontend dependencies..."
npm install --silent

print_success "Frontend setup complete"

# Setup complete
echo ""
print_success "SchoolMe Development Environment Setup Complete!"
echo ""
echo "🚀 Next Steps:"
echo "  1. Make sure you have Azure services configured (run 'azd up' if needed)"
echo "  2. Start development environment: npm run dev"
echo "  3. Open http://localhost:8765 to test the app"
echo ""
echo "💡 Quick Commands:"
echo "  • npm run dev     - Start development environment"
echo "  • npm run deploy  - Deploy to Azure"
echo "  • npm run start   - Start production build locally"
echo ""
