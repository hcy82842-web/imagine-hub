@echo off
title Imagine Hub Launcher
echo === Starting Imagine Hub ===
echo.

:: Start backend in new window
echo [Backend] Starting...
start "Imagine Hub - Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python run.py"

:: Wait a moment
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo [Frontend] Starting...
start "Imagine Hub - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait for servers to start
timeout /t 3 /nobreak >nul

:: Open browser
echo [Browser] Opening http://localhost:5173 ...
start http://localhost:5173

echo.
echo Backend:  http://localhost:8000/api/health
echo Frontend: http://localhost:5173
echo.
echo Close the terminal windows to stop servers.
echo.
pause
