@echo off
setlocal EnableDelayedExpansion

:: --- Configuration ---
SET "EXT_NAME=FishTools"
SET "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\%EXT_NAME%"

:: --- Check for Administrator privileges ---
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo Requesting administrative privileges...
    goto UACPrompt
) else (
    goto gotAdmin
)

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c ""%~f0""", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )

:: --- Uninstallation ---
if exist "%TARGET_DIR%" (
    echo Found %EXT_NAME% at %TARGET_DIR%
    echo Uninstalling...
    rmdir /s /q "%TARGET_DIR%"
    
    if exist "%TARGET_DIR%" (
        echo Failed to remove directory. Please close Adobe apps and try again.
    ) else (
        echo.
        echo %EXT_NAME% uninstalled successfully!
    )
) else (
    echo.
    echo %EXT_NAME% is not currently installed.
)

pause
