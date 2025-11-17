@echo off
echo ========================================
echo   Seller Portal - Starting Application
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Starting backend server on port 5000...
start "Backend Server" cmd /k "node server.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo Starting frontend on port 3001...
start "Frontend Server" cmd /k "npm start"

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo.
echo Opening browser...
start "" "http://localhost:3001"

echo.
echo ========================================
echo   Application started successfully!
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3001
echo.
echo Admin Login:
echo   Email: admin@portal.com
echo   Password: admin123
echo.
echo Press any key to close this window...
pause >nul

