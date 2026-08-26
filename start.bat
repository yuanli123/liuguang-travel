@echo off
rem Liuguang Travel launcher (double-click to start)
rem Opens two console windows: frontend (8123) + backend (3000). Close them to stop.

echo Starting Liuguang Travel...
echo Frontend: http://localhost:8123
echo Backend:  http://localhost:3000
echo.

start "Liuguang-frontend(8123)" /D "%~dp0" cmd /k "chcp 65001 >nul && python -m http.server 8123"
start "Liuguang-backend(3000)" /D "%~dp0server" cmd /k "chcp 65001 >nul && npm run dev"

echo Two service windows opened. Visit http://localhost:8123 in your browser.
echo You can close THIS window anytime; the two services keep running.
pause
