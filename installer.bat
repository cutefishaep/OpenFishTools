@echo off
setlocal EnableDelayedExpansion

SET "EXT_NAME=FishTools"
SET "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\!EXT_NAME!"
SET "GITHUB_REPO=cutefishaep/OpenFishTools"
SET "TEMP_DIR=!TEMP!\!EXT_NAME!_Install"

echo Installing !EXT_NAME!...
echo.

:: Check admin
net session >nul 2>&1
if !errorLevel! NEQ 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/k \"%~f0\"' -Verb RunAs"
    exit /B
)

:: Check existing installation
if exist "!TARGET_DIR!" (
    set /p "OVERWRITE=Extension already installed. Overwrite? [Y/N]: "
    if /I "!OVERWRITE!" NEQ "Y" (
        echo Installation cancelled.
        pause
        exit /b
    )
    rmdir /s /q "!TARGET_DIR!" 2>nul
)

:: Clean cache
echo Cleaning cache...
rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\!EXT_NAME!" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\cep_cache" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\!EXT_NAME!" 2>nul
del /q "%TEMP%\!EXT_NAME!*.log" 2>nul

:: Download from GitHub
echo Downloading from GitHub...
if exist "!TEMP_DIR!" rmdir /s /q "!TEMP_DIR!"
mkdir "!TEMP_DIR!"

powershell -NoProfile -Command "try { Write-Host 'Downloading source code...'; iwr 'https://github.com/!GITHUB_REPO!/archive/refs/heads/main.zip' -OutFile '!TEMP_DIR!\dl.zip'; Expand-Archive '!TEMP_DIR!\dl.zip' '!TEMP_DIR!\ext' -Force; Write-Host 'Download complete.' -Fore Green } catch { Write-Host 'Download failed: ' $_.Exception.Message -Fore Red; exit 1 }"

:: Find extracted folder
for /d %%D in ("!TEMP_DIR!\ext\*") do SET "SRC=%%D"
if not defined SRC SET "SRC=!TEMP_DIR!\ext"

:: Copy files
echo Installing...
if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!"
robocopy "!SRC!" "!TARGET_DIR!" /E /XD .git node_modules /XF *.bat .gitignore *.log /R:1 /W:1 /NFL /NDL /NJH /NJS

:: Enable debug mode
for /L %%i in (7,1,20) do reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

:: Cleanup
rmdir /s /q "!TEMP_DIR!" 2>nul

echo.
echo Installation complete! Restart After Effects.
pause
exit