# SchoolMe Development Environment Startup Script (PowerShell)
# This script starts both backend and frontend for local development

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "SchoolMe Development Environment" -ForegroundColor Blue
    Write-Host "================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\scripts\dev.ps1"
    Write-Host ""
    Write-Host "This script will:"
    Write-Host "  • Start Python backend on port 8765"
    Write-Host "  • Start React Native frontend on port 8080"
    Write-Host "  • Set up hot reloading for development"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop both servers"
    exit 0
}

Write-Host "🎓 Starting SchoolMe Development Environment..." -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return $connection.Count -gt 0
    }
    catch {
        return $false
    }
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param([int]$Port)
    if (Test-Port $Port) {
        Write-Host "⚠️  Killing existing process on port $Port..." -ForegroundColor Yellow
        $processes = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
            Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }
}

# Cleanup function
function Cleanup {
    Write-Host "Shutting down SchoolMe development environment..." -ForegroundColor Blue
    
    # Kill processes on our ports
    Stop-ProcessOnPort 8765
    Stop-ProcessOnPort 8080
    
    Write-Host "✅ Development environment stopped" -ForegroundColor Green
    exit 0
}

# Set up signal handlers
Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

try {
    # Check prerequisites
    Write-Host "Checking prerequisites..." -ForegroundColor Blue

    # Check if Python is available
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Python not found. Please install Python 3.11+ and try again." -ForegroundColor Red
        exit 1
    }

    $pythonVersion = python --version 2>&1
    Write-Host "✅ $pythonVersion found" -ForegroundColor Green

    # Check if Node.js is available
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Node.js not found. Please install Node.js and try again." -ForegroundColor Red
        exit 1
    }

    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

    # Clear any existing processes on our ports
    Write-Host "Clearing existing processes..." -ForegroundColor Blue
    Stop-ProcessOnPort 8765
    Stop-ProcessOnPort 8080

    # Start Backend
    Write-Host "Starting Python backend..." -ForegroundColor Blue
    
    # Load Python environment
    & ".\scripts\load_python_env.ps1"
    
    Write-Host "Starting backend server on port 8765..." -ForegroundColor Blue
    Set-Location "app\backend"
    
    # Start backend in background
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        & ".venv\Scripts\python.exe" app.py
    }

    # Wait for backend to start
    Write-Host "Waiting for backend to start..." -ForegroundColor Blue
    for ($i = 1; $i -le 30; $i++) {
        if (Test-Port 8765) {
            Write-Host "✅ Backend started successfully on http://localhost:8765" -ForegroundColor Green
            break
        }
        if ($i -eq 30) {
            Write-Host "❌ Backend failed to start after 30 seconds" -ForegroundColor Red
            Cleanup
            exit 1
        }
        Start-Sleep -Seconds 1
    }

    # Start Frontend
    Write-Host "Starting React Native frontend..." -ForegroundColor Blue
    Set-Location "..\frontend"

    Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
    npm install --silent

    Write-Host "Starting Expo development server on port 8080..." -ForegroundColor Blue
    
    # Start frontend in background
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npx expo start --web --port 8080
    }

    # Wait for frontend to start
    Write-Host "Waiting for frontend to start..." -ForegroundColor Blue
    for ($i = 1; $i -le 30; $i++) {
        if (Test-Port 8080) {
            Write-Host "✅ Frontend started successfully on http://localhost:8080" -ForegroundColor Green
            break
        }
        if ($i -eq 30) {
            Write-Host "❌ Frontend failed to start after 30 seconds" -ForegroundColor Red
            Cleanup
            exit 1
        }
        Start-Sleep -Seconds 1
    }

    # Development environment ready
    Write-Host ""
    Write-Host "🎉 SchoolMe Development Environment Ready!" -ForegroundColor Green
    Write-Host "=========================================="
    Write-Host ""
    Write-Host "📱 Frontend (React Native): http://localhost:8080" -ForegroundColor Cyan
    Write-Host "🐍 Backend (Python):        http://localhost:8765" -ForegroundColor Cyan
    Write-Host "🌐 Full App:                http://localhost:8765" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Development Tips:" -ForegroundColor Yellow
    Write-Host "   • Use http://localhost:8080 for frontend development (hot reload)"
    Write-Host "   • Use http://localhost:8765 for full app testing (with AI)"
    Write-Host "   • Press Ctrl+C to stop both servers"
    Write-Host ""
    Write-Host "🎤 Ready to test voice interaction!" -ForegroundColor Green
    Write-Host "📚 Ask questions about Contoso to see reference citations" -ForegroundColor Green
    Write-Host ""

    # Keep script running and monitor processes
    while ($true) {
        # Check if backend job is still running
        if ($backendJob.State -ne "Running") {
            Write-Host "❌ Backend process died unexpectedly" -ForegroundColor Red
            Cleanup
            exit 1
        }
        
        # Check if frontend job is still running
        if ($frontendJob.State -ne "Running") {
            Write-Host "❌ Frontend process died unexpectedly" -ForegroundColor Red
            Cleanup
            exit 1
        }
        
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Cleanup
    exit 1
}
