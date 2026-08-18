@echo off
setlocal

:: --------------------------------------------
:: OpenFishTools - ZXP Package Builder (Pure CMD)
:: --------------------------------------------

set "SOURCE=%~dp0.."
for %%I in ("%SOURCE%") do set "SOURCE=%%~fI"

set "TMP_PAYLOAD=%SOURCE%\build_zxp_payload"
set "OUTPUT_ZXP=%SOURCE%\OpenFishTools.zxp"

echo ========================================
echo   OpenFishTools - ZXP Package Builder
echo ========================================
echo.

:: 1. Cleanup old build directories
echo [1/3] Preparing workspace...
if exist "%TMP_PAYLOAD%" rd /s /q "%TMP_PAYLOAD%" 2>nul
if exist "%OUTPUT_ZXP%" del /q "%OUTPUT_ZXP%" 2>nul
mkdir "%TMP_PAYLOAD%" 2>nul

:: 2. Copy extension files to payload
echo [2/3] Copying extension files...
xcopy "%SOURCE%\CSXS" "%TMP_PAYLOAD%\CSXS\" /E /I /Y /Q >nul
xcopy "%SOURCE%\client" "%TMP_PAYLOAD%\client\" /E /I /Y /Q >nul
xcopy "%SOURCE%\host" "%TMP_PAYLOAD%\host\" /E /I /Y /Q >nul

if exist "%SOURCE%\data" (
    xcopy "%SOURCE%\data" "%TMP_PAYLOAD%\data\" /E /I /Y /Q >nul
)
if exist "%SOURCE%\Logo.svg" (
    copy /y "%SOURCE%\Logo.svg" "%TMP_PAYLOAD%\Logo.svg" >nul 2>&1
)

:: 3. Create ZXP package using native Windows tar (zip engine)
echo [3/3] Packaging ZXP...
pushd "%TMP_PAYLOAD%"
tar.exe -a -c -f "%OUTPUT_ZXP%" *
popd

:: Cleanup
if exist "%TMP_PAYLOAD%" rd /s /q "%TMP_PAYLOAD%" 2>nul

if exist "%OUTPUT_ZXP%" (
    echo.
    echo ========================================
    echo   ZXP Successfully Created!
    echo   File: %OUTPUT_ZXP%
    echo ========================================
    echo.
) else (
    echo [ERROR] Failed to create ZXP package.
    exit /b 1
)

exit /b 0
