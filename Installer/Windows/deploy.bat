@echo off
setlocal

:: --------------------------------------------
:: OpenFishTools - System CEP Deploy (Pure CMD)
:: --------------------------------------------

:: Check Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin_oft.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c """"%~f0"""" admin_run", "", "runas", 1 >> "%temp%\getadmin_oft.vbs"
    "%temp%\getadmin_oft.vbs"
    del "%temp%\getadmin_oft.vbs" 2>nul
    exit /b
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

:: 1. PlayerDebugMode for CEP 7-16 (CC 2017 - CC 2027+, HKCU & HKLM)
echo [1/3] Enabling PlayerDebugMode...
for %%i in (7 8 9 10 11 12 13 14 15 16) do (
    reg add "HKCU\Software\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKLM\Software\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKCU\Software\Wow6432Node\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKLM\Software\Wow6432Node\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
)
echo       [OK] PlayerDebugMode enabled for CSXS 7-16.
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

if exist "%SOURCE%\Logo.svg" (
    copy /y "%SOURCE%\Logo.svg" "%TARGET%\Logo.svg" >nul 2>&1
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
echo Launch Adobe After Effects and open:
echo   Window ^> Extensions ^> OpenFishTools
echo.
pause
exit /b 0
