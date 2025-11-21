@echo off
echo ========================================
echo   Quick Fix - Push Code to GitHub
echo ========================================
echo.

echo Step 1: Adding all files...
git add .

echo.
echo Step 2: Committing changes...
git commit -m "Fix build - disable ESLint warnings"

echo.
echo Step 3: Pushing to GitHub...
git push

echo.
echo ========================================
echo   ✅ Done! Code pushed to GitHub!
echo ========================================
echo.
echo Next: Go to Railway and click "Redeploy"
echo.
pause

