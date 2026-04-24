@echo off
echo Starting Kryzora POS Offline Mode...

echo ------------------------------------------
echo Starting Backend...
echo ------------------------------------------
cd "%~dp0backend"
start "Kryzora Backend" /b cmd /c "php artisan serve"

echo ------------------------------------------
echo Starting Frontend...
echo ------------------------------------------
cd "%~dp0frontend"
start "Kryzora Frontend" /b cmd /c "npm run dev"

echo ------------------------------------------
echo Waiting for servers to initialize...
echo ------------------------------------------
timeout /t 5 /nobreak > NUL

echo ------------------------------------------
echo Opening Chrome...
echo ------------------------------------------
start chrome "http://localhost:5173"
if %errorlevel% neq 0 (
    echo Chrome not found, trying default browser...
    start http://localhost:5173
)

echo.
echo Both backend and frontend are running in the background.
echo To stop them, you might need to close the terminal or kill the PHP and Node.js processes in Task Manager.
echo.
pause
