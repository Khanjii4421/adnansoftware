@echo off
echo ========================================
echo   ⚠️  FORCE PUSH TO GITHUB ⚠️
echo ========================================
echo.
echo WARNING: This will overwrite remote repository!
echo This will replace GitHub code with your local code.
echo.
echo Repository: https://github.com/Khanjii4421/adnansoftware
echo Branch: main
echo.
set /p confirm="Are you sure? Type 'yes' to continue: "
if /i not "%confirm%"=="yes" (
    echo Cancelled.
    pause
    exit /b
)

echo.
echo [1/3] Configuring Git...
git config --global user.name "khalil"
git config --global user.email "khanjii4421@gmail.com"
git remote set-url origin https://github.com/Khanjii4421/adnansoftware.git
git branch -M main
echo ✅ Configured
echo.

echo [2/3] Checking for uncommitted changes...
git add .
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "Force push: All local updates - %date% %time%"
    echo ✅ New changes committed
) else (
    echo ✅ No new changes, using existing commits
)
echo.
echo Local commits to push:
git log --oneline origin/main..main 2>nul || git log --oneline -5
echo.

echo [3/3] Force pushing to GitHub...
echo.
echo ⚠️  You will be prompted for credentials:
echo    Username: Khanjii4421
echo    Password: [Your Personal Access Token]
echo.

git push -u origin main --force
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   ✅ Successfully force pushed!
    echo ========================================
    echo   View at: https://github.com/Khanjii4421/adnansoftware
    echo ========================================
) else (
    echo.
    echo ❌ Push failed. Check authentication.
    echo Get token from: https://github.com/settings/tokens
)

echo.
pause
