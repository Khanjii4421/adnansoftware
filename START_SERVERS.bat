@echo off
echo Starting Backend Server...
start "Backend Server" cmd /k "node server.js"
timeout /t 3 /nobreak >nul
echo Starting Frontend Server...
start "Frontend Server" cmd /k "npm start"
timeout /t 10 /nobreak >nul
echo Opening browser...
start "" "http://localhost:3001"
echo.
echo Servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3001
echo.
echo Admin Login: admin@portal.com / admin123
pause

