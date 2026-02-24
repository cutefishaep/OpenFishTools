@echo off
setlocal EnableDelayedExpansion

:: --- Configuration ---
SET "EXT_NAME=OpenFishTools"
SET "INTERNAL_NAME=OpenFishTools"
SET "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\!INTERNAL_NAME!"
SET "GITHUB_REPO=cutefishaep/OpenFishTools"
SET "TEMP_DIR=!TEMP!\!INTERNAL_NAME!_Setup"

:MAIN_MENU
cls
echo ======================================================
echo          !EXT_NAME! - Maintenance Tool
echo ======================================================
echo.
echo    [1] Install / Update Extension
echo    [2] Uninstall Extension
echo    [3] Exit
echo.
echo ======================================================
set /p "CHOICE=Select an option [1-3]: "

if "!CHOICE!"=="1" goto INSTALL
if "!CHOICE!"=="2" goto UNINSTALL
if "!CHOICE!"=="3" exit
goto MAIN_MENU

:INSTALL
cls
echo ======================================================
echo             Installing !EXT_NAME!
echo ======================================================
echo.

:: Check admin
net session >nul 2>&1
if !errorLevel! NEQ 0 (
    echo [!] Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~s0\"\" 1' -Verb RunAs"
    exit /B
)

:: Check existing
if exist "!TARGET_DIR!" (
    echo [i] Existing installation found at !TARGET_DIR!
    set /p "OVERWRITE=Overwrite current files? [Y/N]: "
    if /I "!OVERWRITE!" NEQ "Y" (
        echo [!] Installation cancelled.
        pause
        goto MAIN_MENU
    )
    rmdir /s /q "!TARGET_DIR!" 2>nul
)

:: Clean cache
echo [*] Cleaning CEP and AE cache...
rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\!INTERNAL_NAME!" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\cep_cache" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\!INTERNAL_NAME!" 2>nul
del /q "%TEMP%\!INTERNAL_NAME!*.log" 2>nul

:: Download
echo [*] Downloading latest source from GitHub...
if exist "!TEMP_DIR!" rmdir /s /q "!TEMP_DIR!"
mkdir "!TEMP_DIR!"

powershell -NoProfile -Command "try { iwr 'https://github.com/!GITHUB_REPO!/archive/refs/heads/main.zip' -OutFile '!TEMP_DIR!\dl.zip'; Expand-Archive '!TEMP_DIR!\dl.zip' '!TEMP_DIR!\ext' -Force; } catch { Write-Host 'Download failed: ' $_.Exception.Message -Fore Red; exit 1 }"
if !errorLevel! NEQ 0 (
    echo [!] Download failed. Check your internet connection.
    pause
    goto MAIN_MENU
)

:: Find extracted folder (GitHub zip usually has a subfolder)
for /d %%D in ("!TEMP_DIR!\ext\*") do SET "SRC=%%D"
if not defined SRC SET "SRC=!TEMP_DIR!\ext"

:: Copy files
echo [*] Copying extension files...
if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!"
robocopy "!SRC!" "!TARGET_DIR!" /E /XD .git node_modules /XF *.bat .gitignore *.log /R:1 /W:1 /NFL /NDL /NJH /NJS

:: Enable debug
echo [*] Enabling Adobe PlayerDebugMode...
for /L %%i in (7,1,25) do (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

:: Cleanup
rmdir /s /q "!TEMP_DIR!" 2>nul

echo.
echo [OK] !EXT_NAME! installed successfully!
echo [i] Please RESTART After Effects.
echo.
pause
goto MAIN_MENU

:UNINSTALL
cls
echo ======================================================
echo             Uninstalling !EXT_NAME!
echo ======================================================
echo.

:: Check admin
net session >nul 2>&1
if !errorLevel! NEQ 0 (
    echo [!] Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~s0\"\" 2' -Verb RunAs"
    exit /B
)

if not exist "!TARGET_DIR!" (
    echo [!] !EXT_NAME! is not currently installed.
    pause
    goto MAIN_MENU
)

echo [*] Removing !TARGET_DIR!...
rmdir /s /q "!TARGET_DIR!"

if exist "!TARGET_DIR!" (
    echo [!] Failed to remove folder. Close Adobe apps and try again.
) else (
    echo [*] Cleaning leftover cache...
    rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\!INTERNAL_NAME!" 2>nul
    rmdir /s /q "%LOCALAPPDATA%\Temp\cep_cache" 2>nul
    rmdir /s /q "%LOCALAPPDATA%\Temp\!INTERNAL_NAME!" 2>nul
    
    echo.
    echo [OK] !EXT_NAME! uninstalled successfully.
)

echo.
pause
goto MAIN_MENU
