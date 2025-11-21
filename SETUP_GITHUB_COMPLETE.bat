@echo off
echo ========================================
echo   Complete GitHub Setup - Adnan Software
echo   Repository: https://github.com/Khanjii4421/adnansoftware.git
echo   User: khalil (khanjii4421@gmail.com)
echo ========================================
echo.

REM Step 1: Git Configuration
echo [Step 1/8] Configuring Git User...
git config --global user.name "khalil"
git config --global user.email "khanjii4421@gmail.com"
git config --global credential.helper wincred
git config --global init.defaultBranch main
echo ✅ Git user configured: khalil ^<khanjii4421@gmail.com^>
echo.

REM Step 2: Check Git Installation
echo [Step 2/8] Checking Git installation...
git --version
if %errorlevel% neq 0 (
    echo ❌ Git is not installed!
    echo Please install from: https://git-scm.com/downloads
    pause
    exit /b 1
)
echo ✅ Git is installed
echo.

REM Step 3: Initialize Git if needed
echo [Step 3/8] Checking Git repository...
if exist .git (
    echo ✅ Git repository already initialized
) else (
    echo Initializing Git repository...
    git init
    echo ✅ Git repository initialized
)
echo.

REM Step 4: Setup Remote
echo [Step 4/8] Setting up remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/Khanjii4421/adnansoftware.git
git remote set-url origin https://github.com/Khanjii4421/adnansoftware.git
echo ✅ Remote configured: https://github.com/Khanjii4421/adnansoftware.git
git remote -v
echo.

REM Step 5: Setup Branch
echo [Step 5/8] Setting up main branch...
git branch -M main
echo Current branch:
git branch --show-current
echo ✅ Branch set to main
echo.

REM Step 6: Add all files
echo [Step 6/8] Staging all files...
git add .
set STAGED_COUNT=0
for /f %%i in ('git diff --cached --name-only ^| find /c /v ""') do set STAGED_COUNT=%%i
echo ✅ Staged %STAGED_COUNT% files
git status --short
echo.

REM Step 7: Commit
echo [Step 7/8] Committing changes...
set COMMIT_DATE=%date% %time%
set COMMIT_MSG=Auto setup: Git Push API with complete documentation - %COMMIT_DATE%
git commit -m "%COMMIT_MSG%"
if %errorlevel% equ 0 (
    echo ✅ Changes committed
    git log --oneline -1
) else (
    echo ⚠️  No changes to commit or commit failed
)
echo.

REM Step 8: Push Instructions
echo [Step 8/8] Ready to push to GitHub
echo.
echo ========================================
echo   Setup Complete! Ready to Push
echo ========================================
echo.
echo Repository: https://github.com/Khanjii4421/adnansoftware
echo User: khalil (khanjii4421@gmail.com)
echo Branch: main
echo.
echo To push to GitHub, you need a Personal Access Token:
echo.
echo 1. Go to: https://github.com/settings/tokens
echo 2. Click "Generate new token (classic)"
echo 3. Name: adnansoftware-push
echo 4. Select scope: ✅ repo
echo 5. Generate and COPY the token
echo.
echo Then run: AUTO_PUSH_TO_GITHUB.bat
echo    OR manually: git push -u origin main
echo.
echo When prompted:
echo   Username: Khanjii4421
echo   Password: [PASTE YOUR TOKEN HERE]
echo.
echo ========================================
echo   API Endpoints Available:
echo ========================================
echo   POST /api/git/push - Push to GitHub (Admin only)
echo   GET  /api/git/status - Check git status (Admin only)
echo.
pause
