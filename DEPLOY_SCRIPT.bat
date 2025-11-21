@echo off
chcp 65001 >nul
echo ========================================
echo   🚀 Deployment Preparation Script
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)
echo ✅ Node.js is installed

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed!
    pause
    exit /b 1
)
echo ✅ npm is installed

echo.
echo ========================================
echo   Building Application for Production
echo ========================================
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

echo.
echo Building React app for production...
echo This may take 2-3 minutes...
echo.

REM Build React app
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed!
    echo.
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ Build Successful!
echo ========================================
echo.
echo Your application is ready for deployment!
echo.
echo Next steps:
echo 1. Make sure your code is on GitHub
echo 2. Follow DEPLOY_NOW.md for deployment steps
echo 3. Deploy to Railway or Render
echo.
echo ========================================
echo.
pause

