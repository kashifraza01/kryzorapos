@echo off
title KryzoraPOS - EXE Builder
color 0B

:: Self-elevate to admin
>nul 2>&1 "%SYSTEMROOT%\System32\cacls.exe" "%SYSTEMROOT%\System32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting Administrator privileges...
    goto UACPrompt
) else (
    goto GotAdmin
)

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /b

:GotAdmin
cd /d "%~dp0"

echo.
echo ================================================================
echo   KryzoraPOS - Building Windows Installer (Admin Mode)
echo ================================================================
echo.

:: Verify prerequisites
echo [1/3] Checking prerequisites...
if not exist "php\php.exe" (
    echo [ERROR] PHP not found in electron\php\
    pause & exit /b 1
)
if not exist "..\frontend\dist\index.html" (
    echo [ERROR] Frontend dist not found!
    pause & exit /b 1
)
if not exist "..\backend\artisan" (
    echo [ERROR] Backend not found!
    pause & exit /b 1
)
echo   PHP:      OK
echo   Frontend: OK
echo   Backend:  OK
echo.

:: Clean old cache to force fresh extraction with admin rights
echo [2/3] Cleaning build cache...
if exist "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" (
    rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign" 2>nul
)
echo   Cache cleaned.
echo.

:: Build
echo [3/3] Building NSIS Installer...
echo   This will take 5-10 minutes. Please wait...
echo.

call npx electron-builder --win --x64

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   BUILD FAILED! Check errors above.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo   BUILD SUCCESSFUL!
echo ================================================================
echo.

:: Show output
for %%F in ("dist\*.exe") do (
    echo   Installer: %~dp0%%F
    echo   File Size: %%~zF bytes
)

echo.
echo   Run the .exe installer to install KryzoraPOS!
echo.
pause
