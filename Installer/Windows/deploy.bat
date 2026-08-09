@echo off
setlocal enabledelayedexpansion

:: ============================================
:: OpenFishTools - Deploy to After Effects CEP
:: ============================================

set "EXTENSION_NAME=OpenFishTools"
set "EXTENSION_ID=com.cutefish.tools"
set "REG_VALUE=PlayerDebugMode"

:: Target paths (user-level, no admin needed)
set "CEP_DIR=%APPDATA%\Adobe\CEP\extensions"
set "TARGET_DIR=%CEP_DIR%\%EXTENSION_NAME%"

echo.
echo ========================================
echo   OpenFishTools - CEP Extension Deploy
echo ========================================
echo.

:: ----------------------------------------
:: Step 1: Check & Enable PlayerDebugMode
::         CEP 9 (CC 2018) to CEP 12 (2027+)
:: ----------------------------------------
echo [1/3] Checking PlayerDebugMode...
echo        CEP Versions: 9, 10, 11, 12
echo        (CC 2018 to CC 2027+)
echo.

set "DEBUG_ALL_OK=1"

:: --- CEP 9 (CC 2018 / CC 2019) ---
echo        [CSXS.9] CC 2018/2019...
reg query "HKEY_CURRENT_USER\Software\Adobe\CSXS.9" /v "%REG_VALUE%" 2>nul | find /i "0x1" >nul
if %errorlevel% equ 0 (
    echo            [OK] Already enabled.
) else (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.9" /v "%REG_VALUE%" /t REG_SZ /d "1" /f >nul 2>&1
    if %errorlevel% equ 0 (
        echo            [OK] Enabled successfully.
    ) else (
        echo            [FAIL] Could not enable.
        set "DEBUG_ALL_OK=0"
    )
)

:: --- CEP 10 (2020) ---
echo        [CSXS.10] 2020...
reg query "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v "%REG_VALUE%" 2>nul | find /i "0x1" >nul
if %errorlevel% equ 0 (
    echo            [OK] Already enabled.
) else (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v "%REG_VALUE%" /t REG_SZ /d "1" /f >nul 2>&1
    if %errorlevel% equ 0 (
        echo            [OK] Enabled successfully.
    ) else (
        echo            [FAIL] Could not enable.
        set "DEBUG_ALL_OK=0"
    )
)

:: --- CEP 11 (2022 / 2023 / 2024) ---
echo        [CSXS.11] 2022-2024...
reg query "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v "%REG_VALUE%" 2>nul | find /i "0x1" >nul
if %errorlevel% equ 0 (
    echo            [OK] Already enabled.
) else (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v "%REG_VALUE%" /t REG_SZ /d "1" /f >nul 2>&1
    if %errorlevel% equ 0 (
        echo            [OK] Enabled successfully.
    ) else (
        echo            [FAIL] Could not enable.
        set "DEBUG_ALL_OK=0"
    )
)

:: --- CEP 12 (2025 / 2026 / 2027+) ---
echo        [CSXS.12] 2025-2027+...
reg query "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v "%REG_VALUE%" 2>nul | find /i "0x1" >nul
if %errorlevel% equ 0 (
    echo            [OK] Already enabled.
) else (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v "%REG_VALUE%" /t REG_SZ /d "1" /f >nul 2>&1
    if %errorlevel% equ 0 (
        echo            [OK] Enabled successfully.
    ) else (
        echo            [FAIL] Could not enable.
        set "DEBUG_ALL_OK=0"
    )
)

echo.
if "%DEBUG_ALL_OK%"=="1" (
    echo        [OK] All PlayerDebugMode settings are enabled.
) else (
    echo        [WARNING] Some keys failed to enable.
    echo        [*] Try running as Administrator or enable manually:
    echo            1. Open Registry Editor (regedit)
    echo            2. Navigate to: HKEY_CURRENT_USER\Software\Adobe\CSXS.9-12
    echo            3. Create String value: PlayerDebugMode = "1"
    echo.
)

echo.

:: ----------------------------------------
:: Step 2: Create CEP extensions directory
:: ----------------------------------------
echo [2/3] Preparing target directory...

if not exist "%CEP_DIR%" (
    echo        [*] Creating CEP extensions directory...
    mkdir "%CEP_DIR%" 2>nul
    if %errorlevel% neq 0 (
        echo        [ERROR] Failed to create directory: %CEP_DIR%
        pause
        exit /b 1
    )
)

:: Remove old version if exists
if exist "%TARGET_DIR%" (
    echo        [*] Removing old version from: %TARGET_DIR%
    rmdir /s /q "%TARGET_DIR%" 2>nul
)
if exist "%TARGET_DIR%" (
    echo        [*] Cleaning remaining files...
    del /f /q /s "%TARGET_DIR%" >nul 2>&1
    rmdir /s /q "%TARGET_DIR%" 2>nul
)
if exist "%TARGET_DIR%" (
    echo        [WARNING] Could not completely remove old directory.
) else (
    echo        [OK] Old version removed successfully.
)

echo        [OK] Target directory ready: %TARGET_DIR%

echo.

:: ----------------------------------------
:: Step 3: Copy clean extension files
:: ----------------------------------------
echo [3/3] Copying fresh extension files...

:: Get source directory (normalized absolute path to project root)
for %%I in ("%~dp0..\..") do set "SOURCE_DIR=%%~fI"

:: Create target structure
mkdir "%TARGET_DIR%" 2>nul
mkdir "%TARGET_DIR%\CSXS" 2>nul
mkdir "%TARGET_DIR%\client" 2>nul
mkdir "%TARGET_DIR%\host" 2>nul
mkdir "%TARGET_DIR%\data" 2>nul

:: Copy CSXS (manifest)
echo        [*] Copying CSXS...
xcopy /e /i /y /q "%SOURCE_DIR%\CSXS" "%TARGET_DIR%\CSXS" >nul

:: Copy client
echo        [*] Copying client...
xcopy /e /i /y /q "%SOURCE_DIR%\client" "%TARGET_DIR%\client" >nul

:: Copy host
echo        [*] Copying host...
xcopy /e /i /y /q "%SOURCE_DIR%\host" "%TARGET_DIR%\host" >nul

:: Copy data
echo        [*] Copying data...
if exist "%SOURCE_DIR%\data" xcopy /e /i /y /q "%SOURCE_DIR%\data" "%TARGET_DIR%\data" >nul

:: Copy .debug file if present
if exist "%SOURCE_DIR%\.debug" copy /y "%SOURCE_DIR%\.debug" "%TARGET_DIR%\.debug" >nul

echo        [OK] All files copied successfully!

echo.
echo ========================================
echo   Deploy Complete!
echo ========================================
echo.
echo   Extension: %EXTENSION_NAME%
echo   Location:  %TARGET_DIR%
echo.
echo   CEP Versions Enabled:
echo     - CSXS.9  (CC 2018/2019)
echo     - CSXS.10 (2020)
echo     - CSXS.11 (2022-2024)
echo     - CSXS.12 (2025-2027+)
echo.
echo   Next steps:
echo   1. Restart After Effects
echo   2. Go to Window ^> Extensions ^> %EXTENSION_NAME%
echo.
echo ========================================
echo.

pause
