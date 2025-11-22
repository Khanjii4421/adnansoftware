@echo off
REM ========================================
REM    Scheduled Auto-Push Script
REM    Run this with Windows Task Scheduler
REM ========================================

REM Change to project directory
cd /d "%~dp0"

REM Log file location
set LOG_FILE=auto-push.log
set TIMESTAMP=%date% %time%

REM Redirect output to log file
(
    echo.
    echo ========================================
    echo Auto-Push Started: %TIMESTAMP%
    echo ========================================
    echo.
) >> "%LOG_FILE%"

REM Check if Git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed! >> "%LOG_FILE%"
    exit /b 1
)

REM Check for changes
git status --porcelain >nul 2>nul
if %errorlevel% equ 0 (
    REM There are changes
    echo Changes detected. Committing and pushing... >> "%LOG_FILE%"
    
    REM Add all changes
    git add . >> "%LOG_FILE%" 2>&1
    
    REM Commit
    set commit_msg=Auto-update: %date% %time%
    git commit -m "%commit_msg%" --no-verify >> "%LOG_FILE%" 2>&1
    
    REM Pull latest
    git pull origin main --no-rebase >> "%LOG_FILE%" 2>&1
    
    REM Push
    git push origin main >> "%LOG_FILE%" 2>&1
    
    if %errorlevel% equ 0 (
        echo SUCCESS: Pushed to GitHub at %TIMESTAMP% >> "%LOG_FILE%"
    ) else (
        echo ERROR: Push failed at %TIMESTAMP% >> "%LOG_FILE%"
        exit /b 1
    )
) else (
    echo No changes detected. Repository is up to date. >> "%LOG_FILE%"
)

(
    echo.
    echo ========================================
    echo Auto-Push Completed: %TIMESTAMP%
    echo ========================================
    echo.
) >> "%LOG_FILE%"

exit /b 0

