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
    powershell -Command "Start-Process cmd -ArgumentList '/k \"%~f0\"' -Verb RunAs"
    exit /B

:gotAdmin

:: --- Uninstallation ---
if exist "!TARGET_DIR!" (
    echo Found %EXT_NAME% at !TARGET_DIR!
    echo Uninstalling...
    rmdir /s /q "!TARGET_DIR!"
    
    if exist "!TARGET_DIR!" (
        echo Failed to remove directory. Please close Adobe apps and try again.
    ) else (
        echo.
        echo %EXT_NAME% uninstalled successfully!
        
        echo Cleaning leftovers...
        rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\%EXT_NAME%" 2>nul
        rmdir /s /q "%LOCALAPPDATA%\Temp\cep_cache" 2>nul
        rmdir /s /q "%LOCALAPPDATA%\Temp\%EXT_NAME%" 2>nul
        del /q "%TEMP%\%EXT_NAME%*.log" 2>nul
        del /q "%TEMP%\getadmin.vbs" 2>nul
    )
) else (
    echo.
    echo %EXT_NAME% is not currently installed.
)

pause
exit
