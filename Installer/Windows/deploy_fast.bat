@echo off
setlocal
title OpenFishTools - Fast Deploy

:: Check Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin_oft_fast.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c """"%~f0"""" admin_run", "", "runas", 1 >> "%temp%\getadmin_oft_fast.vbs"
    "%temp%\getadmin_oft_fast.vbs"
    del "%temp%\getadmin_oft_fast.vbs" 2>nul
    exit /b
)

:admin_run
set "SOURCE=%~dp0..\.."
for %%I in ("%SOURCE%") do set "SOURCE=%%~fI"

set "TARGET=%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\OpenFishTools"

echo ========================================
echo   OpenFishTools - Ultra Fast Deploy
echo ========================================
echo Source: %SOURCE%
echo Target: %TARGET%
echo.

:: Ensure PlayerDebugMode is enabled
for %%i in (7 8 9 10 11 12 13 14 15 16) do (
    reg add "HKCU\Software\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKLM\Software\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKCU\Software\Wow6432Node\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
    reg add "HKLM\Software\Wow6432Node\Adobe\CSXS.%%i" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
)

:: Sync directories using robocopy (Multi-threaded & ultra-fast)
robocopy "%SOURCE%\CSXS" "%TARGET%\CSXS" /E /IS /IT /MT:8 /NJH /NJS /NDL /NC /NS >nul
robocopy "%SOURCE%\client" "%TARGET%\client" /E /IS /IT /MT:8 /NJH /NJS /NDL /NC /NS >nul
robocopy "%SOURCE%\host" "%TARGET%\host" /E /IS /IT /MT:8 /NJH /NJS /NDL /NC /NS >nul

if exist "%SOURCE%\data" (
    robocopy "%SOURCE%\data" "%TARGET%\data" /E /IS /IT /MT:8 /NJH /NJS /NDL /NC /NS >nul
)

if exist "%SOURCE%\Logo.svg" (
    copy /y "%SOURCE%\Logo.svg" "%TARGET%\Logo.svg" >nul 2>&1
)

if exist "%SOURCE%\.debug" (
    copy /y "%SOURCE%\.debug" "%TARGET%\.debug" >nul 2>&1
)

echo [OK] Fast deploy completed successfully!
echo Reload the OpenFishTools panel in After Effects to apply.
echo.
timeout /t 2 >nul
exit /b 0
