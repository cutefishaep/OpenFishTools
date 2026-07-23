@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   OpenFishTools - Windows Installer Builder
echo ===================================================

set "ISCC="

where iscc >nul 2>nul
if %errorlevel%==0 (
    set "ISCC=iscc"
) else if exist "C:\Program Files (x86)\Inno Setup 6\iscc.exe" (
    set "ISCC="C:\Program Files (x86)\Inno Setup 6\iscc.exe""
) else if exist "C:\Program Files\Inno Setup 6\iscc.exe" (
    set "ISCC="C:\Program Files\Inno Setup 6\iscc.exe""
)

if "%ISCC%"=="" (
    echo.
    echo [ERROR] Inno Setup 6 is not installed or not in PATH!
    echo Please install Inno Setup 6 from https://jrsoftware.org/isdl.php
    echo.
    pause
    exit /b 1
)

echo Found Inno Setup Compiler: %ISCC%
echo.

cd /d "%~dp0"
%ISCC% "OpenFishTools_Setup.iss"

if %errorlevel%==0 (
    echo.
    echo ===================================================
    echo   [SUCCESS] Windows installer created successfully!
    echo   Output: Installer\Windows\OpenFishTools_Setup.exe
    echo ===================================================
) else (
    echo.
    echo [ERROR] Inno Setup compilation failed!
)

echo.
pause
