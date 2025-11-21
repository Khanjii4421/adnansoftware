@echo off
echo ========================================
echo   Push All Updates to GitHub
echo   Repository: https://github.com/Khanjii4421/adnansoftware
echo ========================================
echo.

REM Configure Git
git config --global user.name "khalil"
git config --global user.email "khanjii4421@gmail.com"
git config --global credential.helper wincred

REM Set remote
git remote set-url origin https://github.com/Khanjii4421/adnansoftware.git

REM Ensure on main branch
git branch -M main

echo [Step 1/4] Adding all files...
git add .
echo ✅ All files staged
echo.

echo [Step 2/4] Committing changes...
set COMMIT_MSG=Update: All latest changes - %date% %time%
git commit -m "%COMMIT_MSG%" || echo ⚠️  No changes to commit
echo.

echo [Step 3/4] Fetching latest from GitHub...
git fetch origin main
echo.

echo [Step 4/4] Pushing to GitHub...
echo.
echo ⚠️  You will be prompted for authentication:
echo    Username: Khanjii4421
echo    Password: [Your Personal Access Token]
echo.
echo    Get token from: https://github.com/settings/tokens
echo.

REM Try to push
git push -u origin main 2>&1 | findstr /V "Password:"
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   ✅ Successfully pushed to GitHub!
    echo ========================================
    echo   Repository: https://github.com/Khanjii4421/adnansoftware
    echo   Branch: main
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Push attempt completed
    echo ========================================
    echo.
    echo If push was rejected due to conflicts:
    echo   1. Run: git pull origin main
    echo   2. Resolve conflicts
    echo   3. Run this script again
    echo.
    echo Or use force push (CAUTION - overwrites remote):
    echo   git push -u origin main --force
    echo.
)

echo.
pause
