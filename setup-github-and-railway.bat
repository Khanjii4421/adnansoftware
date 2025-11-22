@echo off
echo ========================================
echo   GitHub & Railway Setup Wizard
echo ========================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo [1/5] Checking Git repository...
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo Git repository initialized.
) else (
    echo Git repository already exists.
)
echo.

echo [2/5] Checking remote repository...
git remote -v >nul 2>nul
if %errorlevel% neq 0 (
    echo No remote repository found.
    echo.
    echo Please provide your GitHub repository URL:
    echo Example: https://github.com/username/repository.git
    set /p github_url="Enter GitHub URL: "
    
    if not "%github_url%"=="" (
        git remote add origin "%github_url%"
        echo Remote repository added: %github_url%
    ) else (
        echo No URL provided. Skipping remote setup.
        echo You can add it later with:
        echo   git remote add origin YOUR_GITHUB_URL
    )
) else (
    echo Remote repository found:
    git remote -v
)
echo.

echo [3/5] Adding all files...
git add .
echo.

echo [4/5] Creating initial commit...
git commit -m "Initial commit: Seller Admin Portal - Ready for Railway deployment"
echo.

echo [5/5] Pushing to GitHub...
git branch -M main
git push -u origin main
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Go to railway.app and create a new project
echo 2. Connect your GitHub repository
echo 3. Configure environment variables in Railway
echo 4. Railway will automatically deploy!
echo.
echo For detailed instructions, see: DEPLOY_TO_GITHUB_AND_RAILWAY.md
echo.
pause

