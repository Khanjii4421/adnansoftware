@echo off
echo ========================================
echo   Seller Portal - Production Mode
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

REM Check if build folder exists
if not exist "build" (
    echo Building React app...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Build failed
        pause
        exit /b 1
    )
)

echo.
echo Starting production server...
echo.

REM Set production environment and start server
set NODE_ENV=production
node server.js

pause

