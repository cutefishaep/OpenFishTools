@echo off
setlocal

:: --------------------------------------------
:: OpenFishTools - System CEP Deploy (Pure CMD)
:: --------------------------------------------

:: Check Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -NoProfile -Command "Start-Process '%~f0' -ArgumentList 'admin_run' -Verb RunAs -Wait"
    exit /b %errorlevel%
)

:admin_run
set "SOURCE=%~dp0..\.."
for %%I in ("%SOURCE%") do set "SOURCE=%%~fI"

set "TARGET=%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\OpenFishTools"
set "USER_DIR=%APPDATA%\Adobe\CEP\extensions\OpenFishTools"

echo ========================================
echo   OpenFishTools - System CEP Deploy
echo ========================================
echo.

:: 1. PlayerDebugMode for CEP 9-16
echo [1/3] Enabling PlayerDebugMode...
for %%i in (9 10 11 12 13 14 15 16) do (
    reg add "HKCU\Software\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
)
echo       [OK] PlayerDebugMode enabled.
echo.

:: 2. Cleanup old folders
echo [2/3] Cleaning old versions...
if exist "%USER_DIR%" (
    rd /s /q "%USER_DIR%" 2>nul
)
if exist "%TARGET%" (
    rd /s /q "%TARGET%" 2>nul
)
echo       [OK] Cleanup completed.
echo.

:: 3. Deploy fresh files to System CEP
echo [3/3] Copying files to System CEP...
if not exist "%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions" (
    mkdir "%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions" 2>nul
)
mkdir "%TARGET%" 2>nul

xcopy "%SOURCE%\CSXS" "%TARGET%\CSXS\" /E /I /Y /Q >nul
xcopy "%SOURCE%\client" "%TARGET%\client\" /E /I /Y /Q >nul
xcopy "%SOURCE%\host" "%TARGET%\host\" /E /I /Y /Q >nul

if exist "%SOURCE%\data" (
    xcopy "%SOURCE%\data" "%TARGET%\data\" /E /I /Y /Q >nul
)

if exist "%SOURCE%\.debug" (
    copy /y "%SOURCE%\.debug" "%TARGET%\.debug" >nul 2>&1
)

echo       [OK] All files successfully deployed!
echo.
echo ========================================
echo   Deploy Complete!
echo   Location: %TARGET%
echo ========================================
echo.
exit /b 0

:error
echo.
echo [ERROR] Failed to deploy files to System CEP.
echo Please close After Effects and run as Administrator.
echo.
pause
exit /b 1
