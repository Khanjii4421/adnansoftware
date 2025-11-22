@echo off
echo ========================================
echo    Automatic Push to GitHub
echo ========================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    pause
    exit /b 1
)

REM Check if we're in a Git repository
git status >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Not a Git repository!
    echo Please run this script in your project folder.
    pause
    exit /b 1
)

REM Check if remote exists
git remote -v >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: No remote repository found!
    echo Please add a GitHub remote first:
    echo   git remote add origin YOUR_GITHUB_URL
    pause
    exit /b 1
)

echo [1/5] Checking for changes...
git fetch origin >nul 2>nul

REM Check if there are any changes
git diff --quiet HEAD
if %errorlevel% equ 0 (
    git diff --quiet --cached
    if %errorlevel% equ 0 (
        echo No changes detected. Everything is up to date.
        pause
        exit /b 0
    )
)

echo [2/5] Adding all changes...
git add .

echo [3/5] Creating commit...
set commit_msg=Auto-update: %date% %time%
git commit -m "%commit_msg%" --no-verify

if %errorlevel% neq 0 (
    echo No changes to commit. Repository is clean.
    pause
    exit /b 0
)

echo [4/5] Pulling latest changes (if any)...
git pull origin main --no-rebase

echo [5/5] Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    SUCCESS! Pushed to GitHub
    echo ========================================
    echo.
    echo Railway will automatically deploy your changes.
    echo Check Railway dashboard for deployment status.
    echo.
) else (
    echo.
    echo ========================================
    echo    ERROR! Push failed
    echo ========================================
    echo.
    echo Please check:
    echo 1. GitHub credentials are correct
    echo 2. You have push access to repository
    echo 3. Internet connection is working
    echo 4. No conflicts with remote repository
    echo.
)

pause

