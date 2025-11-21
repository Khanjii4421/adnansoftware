@echo off
echo ========================================
echo   Auto Push to GitHub - Adnan Software
echo ========================================
echo.

REM Set Git Configuration
echo [1/6] Configuring Git...
git config --global user.name "khalil"
git config --global user.email "khanjii4421@gmail.com"
git config --global credential.helper wincred
echo ✅ Git configured
echo.

REM Check if remote exists
echo [2/6] Checking remote repository...
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo Adding remote repository...
    git remote add origin https://github.com/Khanjii4421/adnansoftware.git
    echo ✅ Remote added
) else (
    echo Checking existing remote...
    git remote set-url origin https://github.com/Khanjii4421/adnansoftware.git
    echo ✅ Remote configured
)
git remote -v
echo.

REM Ensure we're on main branch
echo [3/6] Setting up branch...
git branch -M main
echo Current branch: 
git branch --show-current
echo.

REM Add all changes
echo [4/6] Adding all files...
git add .
echo ✅ Files staged
echo.

REM Show what will be committed
echo Files to commit:
git status --short
echo.

REM Commit changes
echo [5/6] Committing changes...
set COMMIT_MSG=Update: Auto push with Git API functionality - %date% %time%
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo ⚠️  No changes to commit or commit failed
) else (
    echo ✅ Changes committed
)
echo.

REM Push to GitHub
echo [6/6] Pushing to GitHub...
echo.
echo ⚠️  IMPORTANT: You will be prompted for credentials
echo    Username: Khanjii4421
echo    Password: Use your Personal Access Token (NOT your GitHub password)
echo.
echo    If you don't have a token, create one at:
echo    https://github.com/settings/tokens
echo.
pause

git push -u origin main
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   ✅ Successfully pushed to GitHub!
    echo ========================================
    echo.
    echo Repository: https://github.com/Khanjii4421/adnansoftware
    echo Branch: main
    echo.
) else (
    echo.
    echo ========================================
    echo   ❌ Push failed
    echo ========================================
    echo.
    echo Possible reasons:
    echo 1. Authentication failed - check your token
    echo 2. Network issue - check internet connection
    echo 3. Remote repository not accessible
    echo.
    echo To retry, run this script again or manually:
    echo   git push -u origin main
    echo.
)

echo.
echo Next steps:
echo 1. Verify push at: https://github.com/Khanjii4421/adnansoftware
echo 2. Use API endpoint: POST /api/git/push (as admin)
echo 3. Check status: GET /api/git/status
echo.
pause
