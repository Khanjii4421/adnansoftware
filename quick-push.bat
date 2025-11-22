@echo off
git add .
git commit -m "Update: %date% %time%"
git push origin main
echo.
echo Pushed to GitHub! Railway will auto-deploy.
timeout /t 3

