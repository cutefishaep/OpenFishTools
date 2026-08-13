@echo off
setlocal enabledelayedexpansion

:: ============================================
:: OpenFishTools - Deploy to After Effects CEP
:: ============================================

:: Self-elevate to Administrator (UAC popup)
if /i "%~1"=="elevated" goto :elevated

net session >nul 2>&1
if not errorlevel 1 goto :elevated

echo Requesting Administrator privileges...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process -FilePath '%~f0' -ArgumentList 'elevated' -Verb RunAs -Wait -PassThru; exit $p.ExitCode"
if errorlevel 1 (
    echo.
    echo [ERROR] Administrator elevation was cancelled or failed.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
exit /b 0

:elevated

set "EXTENSION_NAME=OpenFishTools"
set "EXTENSION_ID=com.cutefish.tools"
set "REG_VALUE=PlayerDebugMode"

:: Target path (system-level, requires admin)
:: Use an explicit path so parentheses never break batch blocks.
set "CEP_DIR=%SystemDrive%\Program Files (x86)\Common Files\Adobe\CEP\extensions"
set "TARGET_DIR=!CEP_DIR!\!EXTENSION_NAME!"

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

if not exist "!CEP_DIR!" (
    echo        [*] Creating CEP extensions directory...
    mkdir "!CEP_DIR!" 2>nul
    if errorlevel 1 (
        echo        [ERROR] Failed to create directory: !CEP_DIR!
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

:: Force-remove old version before copying
if exist "!TARGET_DIR!" (
    echo        [*] Force removing old version from: !TARGET_DIR!
    attrib -r -s -h "!TARGET_DIR!" /s /d >nul 2>&1
    rmdir /s /q "!TARGET_DIR!" 2>nul
)
if exist "!TARGET_DIR!" (
    echo        [*] Force cleaning remaining files...
    attrib -r -s -h "!TARGET_DIR!\*" /s /d >nul 2>&1
    del /f /q /s "!TARGET_DIR!" >nul 2>&1
    rmdir /s /q "!TARGET_DIR!" 2>nul
)
if exist "!TARGET_DIR!" (
    echo        [WARNING] Could not completely remove old directory.
) else (
    echo        [OK] Old version removed successfully.
)

echo        [OK] Target directory ready: !TARGET_DIR!

echo.

:: ----------------------------------------
:: Step 3: Copy clean extension files
:: ----------------------------------------
echo [3/3] Copying fresh extension files...

:: Get source directory (normalized absolute path to project root)
for %%I in ("%~dp0..\..") do set "SOURCE_DIR=%%~fI"

:: Create target structure
mkdir "!TARGET_DIR!" 2>nul
mkdir "!TARGET_DIR!\CSXS" 2>nul
mkdir "!TARGET_DIR!\client" 2>nul
mkdir "!TARGET_DIR!\host" 2>nul
mkdir "!TARGET_DIR!\data" 2>nul

set "USER_CEP_DIR=%APPDATA%\Adobe\CEP\extensions"
set "USER_TARGET_DIR=!USER_CEP_DIR!\!EXTENSION_NAME!"
mkdir "!USER_TARGET_DIR!" 2>nul
mkdir "!USER_TARGET_DIR!\CSXS" 2>nul
mkdir "!USER_TARGET_DIR!\client" 2>nul
mkdir "!USER_TARGET_DIR!\host" 2>nul
mkdir "!USER_TARGET_DIR!\data" 2>nul

:: Copy CSXS (manifest)
echo        [*] Copying CSXS...
robocopy "!SOURCE_DIR!\CSXS" "!TARGET_DIR!\CSXS" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
robocopy "!SOURCE_DIR!\CSXS" "!USER_TARGET_DIR!\CSXS" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :copy_error

:: Copy client
echo        [*] Copying client...
robocopy "!SOURCE_DIR!\client" "!TARGET_DIR!\client" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
robocopy "!SOURCE_DIR!\client" "!USER_TARGET_DIR!\client" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :copy_error

:: Copy host
echo        [*] Copying host...
robocopy "!SOURCE_DIR!\host" "!TARGET_DIR!\host" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
robocopy "!SOURCE_DIR!\host" "!USER_TARGET_DIR!\host" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :copy_error

:: Copy data
echo        [*] Copying data...
if exist "!SOURCE_DIR!\data" (
    robocopy "!SOURCE_DIR!\data" "!TARGET_DIR!\data" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
    robocopy "!SOURCE_DIR!\data" "!USER_TARGET_DIR!\data" /E /IS /IT /COPY:DAT /DCOPY:DAT /R:0 /W:0 /NFL /NDL /NJH /NJS /NP >nul
    if errorlevel 8 goto :copy_error
)

:: Copy .debug file if present
if exist "!SOURCE_DIR!\.debug" (
    copy /y "!SOURCE_DIR!\.debug" "!TARGET_DIR!\.debug" >nul
    copy /y "!SOURCE_DIR!\.debug" "!USER_TARGET_DIR!\.debug" >nul
    if errorlevel 1 goto :copy_error
)

echo        [OK] All files copied successfully!

echo.
echo ========================================
echo   Deploy Complete!
echo ========================================
echo.
echo   Extension: %EXTENSION_NAME%
echo   Location:  !TARGET_DIR!
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

echo Press any key to exit...
pause >nul
exit /b 0

:copy_error
echo.
echo [ERROR] Failed to copy extension files.
echo        Check the source and target paths, then try again as Administrator.
echo.
echo Press any key to exit...
pause >nul
exit /b 1
