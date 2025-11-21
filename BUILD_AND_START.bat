@echo off
echo ========================================
echo   Seller Portal - Build and Start
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

echo.
echo Building React app for production...
echo This may take a few minutes...
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build completed successfully!
echo ========================================
echo.
echo Starting production server...
echo.

set NODE_ENV=production
start "Production Server" cmd /k "node server.js"

echo.
echo ========================================
echo   Application started!
echo ========================================
echo.
echo Server: http://localhost:3000
echo.
echo Admin Login:
echo   Email: admin@portal.com
echo   Password: admin123
echo.
echo Press any key to close this window...
pause >nul

