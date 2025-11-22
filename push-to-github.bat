@echo off
echo ========================================
echo    Push to GitHub - Automated Script
echo ========================================
echo.

echo [1/4] Checking Git status...
git status
echo.

echo [2/4] Adding all changes...
git add .
echo.

echo [3/4] Enter commit message:
set /p commit_msg="> "
if "%commit_msg%"=="" set commit_msg=Update: %date% %time%

echo Committing changes with message: %commit_msg%
git commit -m "%commit_msg%"
echo.

echo [4/4] Pushing to GitHub...
git push origin main
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo    SUCCESS! Pushed to GitHub
    echo ========================================
    echo.
    echo Railway will automatically deploy your changes.
    echo Check Railway dashboard for deployment status.
    echo.
) else (
    echo ========================================
    echo    ERROR! Push failed
    echo ========================================
    echo.
    echo Please check:
    echo 1. GitHub credentials are correct
    echo 2. You have push access to repository
    echo 3. Internet connection is working
    echo.
)

pause

