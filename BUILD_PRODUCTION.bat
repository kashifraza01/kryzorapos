@echo off
title KryzoraPOS - Production Build Script
color 0B
echo.
echo ======================================================
echo   KryzoraPOS - Production Build Pipeline
echo   by Kryzora Solutions
echo ======================================================
echo.

:: 1. Build Frontend
echo [1/4] Building Frontend (React + Vite)...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Frontend build failed!
    pause
    exit /b
)
echo [OK] Frontend built to frontend/dist/

:: 2. Optimize Backend
echo [2/4] Optimizing Backend (Laravel)...
cd /d "%~dp0backend"
call php artisan config:cache
call php artisan route:cache
call php artisan view:cache
echo [OK] Backend optimized.

:: 3. Clean up dev files from build
echo [3/4] Cleaning development files...
if exist "backend\public\test_db.php" del "backend\public\test_db.php"
if exist "backend\storage\logs\laravel.log" del "backend\storage\logs\laravel.log"
echo [OK] Dev files cleaned.

:: 4. Notify completion
echo.
echo ======================================================
echo   BUILD COMPLETE!
echo ======================================================
echo.
echo   Next steps:
echo   1. To build Electron EXE:
echo      cd electron ^&^& npm run build
echo.
echo   2. To build Inno Setup installer:
echo      Compile KryzoraPOS_Installer.iss with Inno Setup
echo.
echo   3. To test locally:
echo      Run START_EVERYTHING.bat
echo.
pause
