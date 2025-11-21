@echo off
echo ========================================
echo   GitHub Setup Quick Guide
echo ========================================
echo.

echo Step 1: Check if Git is installed...
git --version
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git is not installed!
    echo Please download from: https://git-scm.com/downloads
    pause
    exit /b 1
)
echo ✅ Git is installed
echo.

echo Step 2: Check if this is a git repository...
git rev-parse --is-inside-work-tree >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo This is not a git repository yet.
    echo Initializing git...
    git init
    echo ✅ Git initialized
) else (
    echo ✅ Already a git repository
)
echo.

echo Step 3: Check current branch...
git branch --show-current
echo.

echo Step 4: Check remote repository...
git remote -v
if %errorlevel% neq 0 (
    echo.
    echo No remote repository configured.
    echo.
    echo To add GitHub remote, run:
    echo   git remote add origin https://github.com/Khanjii4421/adnansoftware.git
    echo.
    echo Replace YOUR_USERNAME and YOUR_REPO with your actual GitHub details.
) else (
    echo ✅ Remote repository configured
)
echo.

echo ========================================
echo   Next Steps:
echo ========================================
echo.
echo 1. Create GitHub repository at github.com
echo 2. Add remote: git remote add origin https://github.com/Khanjii4421/adnansoftware.git
echo 3. Generate Personal Access Token from GitHub Settings
echo 4. Push code: git push -u origin main
echo    OR use API: POST /api/git/push (as admin)
echo.
echo For complete guide, see: GITHUB_PUSH_SETUP_GUIDE.md
echo.
pause
