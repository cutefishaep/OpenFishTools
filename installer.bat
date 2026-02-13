@echo off
setlocal EnableDelayedExpansion

:: --- Configuration ---
SET "EXT_NAME=FishTools"
SET "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\%EXT_NAME%"
SET "SOURCE_DIR=%~dp0"
:: Remove trailing backslash from SOURCE_DIR to avoid quote escaping issues
if "%SOURCE_DIR:~-1%"=="\" SET "SOURCE_DIR=%SOURCE_DIR:~0,-1%"

:: --- Version Detection ---
SET "VERSION=v0.0.0"
if exist "!SOURCE_DIR!\CSXS\manifest.xml" (
    for /f "tokens=*" %%v in ('powershell -NoProfile -Command "[xml]$m = Get-Content -Raw -Path '!SOURCE_DIR!\CSXS\manifest.xml'; $m.ExtensionManifest.ExtensionBundleVersion"') do set "VERSION=v%%v"
)

echo Installing %EXT_NAME% %VERSION%...

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
    cd /d "%SOURCE_DIR%"

:: --- Check Existing Installation ---
if exist "!TARGET_DIR!" (
    echo.
    echo %EXT_NAME% is already installed at:
    echo !TARGET_DIR!
    echo.
    set /p "CHOICE=Do you want to reinstall (delete and replace)? [Y/N]: "
    if /I "!CHOICE!" NEQ "Y" (
        echo.
        echo Installation cancelled by user.
        pause
        exit /b
    ) else (
        echo.
        echo Removing existing installation...
        rmdir /s /q "!TARGET_DIR!"
    )
)

:: --- Check for Updates ---
echo Checking for updates...
set "NEW_SOURCE="
for /f "delims=" %%p in ('powershell -NoProfile -Command ^
    "$repo = 'cutefishaep/OpenFishTools';" ^
    "$VERSION = '%VERSION%';" ^
    "try {" ^
    "  $latest = Invoke-RestMethod -Uri \"https://api.github.com/repos/$repo/releases/latest\";" ^
    "  $localVer = [System.Version]($VERSION.TrimStart('v'));" ^
    "  $remoteVer = [System.Version]($latest.tag_name.TrimStart('v'));" ^
    "  if ($latest -and $remoteVer -gt $localVer) {" ^
    "    Add-Type -AssemblyName System.Windows.Forms;" ^
    "    $choice = [System.Windows.Forms.MessageBox]::Show(\"New version $($latest.tag_name) is available. Download and update now?\", 'Update Available', 'YesNo', 'Information');" ^
    "    if ($choice -eq 'Yes') {" ^
    "      $asset = $latest.assets | Where-Object { $_.name -like '*.zip' -or $_.name -like '*.zxp' } | Select-Object -First 1;" ^
    "      $downloadUrl = if ($asset) { $asset.browser_download_url } else { $latest.zipball_url };" ^
    "      $fileName = if ($asset) { $asset.name } else { 'source.zip' };" ^
    "      $updateFolder = Join-Path $pwd 'FishTools_New';" ^
    "      if (Test-Path $updateFolder) { Remove-Item $updateFolder -Recurse -Force };" ^
    "      New-Item -ItemType Directory -Path $updateFolder | Out-Null;" ^
    "      Write-Host \"Downloading update...\" -ForegroundColor Cyan;" ^
    "      $tempZip = Join-Path $env:TEMP $fileName;" ^
    "      Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip;" ^
    "      Write-Host 'Extracting files...' -ForegroundColor Cyan;" ^
    "      $extractPath = Join-Path $env:TEMP 'FishToolsUpdateTemp';" ^
    "      if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force };" ^
    "      Expand-Archive -Path $tempZip -DestinationPath $extractPath -Force;" ^
    "      $inner = Get-ChildItem -Path $extractPath | Where-Object { $_.PSIsContainer } | Select-Object -First 1;" ^
    "      if ($inner) { Move-Item -Path \"$($inner.FullName)\*\" -Destination $updateFolder -Force } else { Move-Item -Path \"$($extractPath)\*\" -Destination $updateFolder -Force };" ^
    "      Remove-Item $tempZip, $extractPath -Recurse -Force;" ^
    "      Write-Host 'Update downloaded to FishTools_New folder.' -ForegroundColor Green;" ^
    "      Write-Output $updateFolder;" ^
    "    }" ^
    "  }" ^
    "} catch { Write-Host 'Skipping update check (network error or timeout).' -ForegroundColor Gray; }"') do set "NEW_SOURCE=%%p"

if defined NEW_SOURCE (
    SET "SOURCE_DIR=%NEW_SOURCE%"
    echo Using updated files from: !SOURCE_DIR!
)

:: --- Clean Cache ---
echo Cleaning Temporary Files...
rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\%EXT_NAME%" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\cep_cache" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\%EXT_NAME%" 2>nul
del /q "%TEMP%\%EXT_NAME%*.log" 2>nul
del /q "%TEMP%\getadmin.vbs" 2>nul

:: --- Clean Target & Copy Files ---
echo Copying files to destination...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Use Robocopy to exclude .git, installer.bat, etc.
robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /MIR /XD .git .debug node_modules .vscode /XF installer.bat uninstaller.bat .gitignore .DS_Store *.log /R:1 /W:1 >nul

:: Robocopy exit codes: 0-7 are success (0=No Change, 1=Copy Successful, etc.). >=8 is failure.
if %ERRORLEVEL% GEQ 8 (
    echo Error copying files! Robocopy exit code: %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

:: --- Enable Debug Mode ---
echo Enabling PlayerDebugMode...
for /L %%i in (7,1,20) do (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

echo.
echo %EXT_NAME% %VERSION% installed successfully!
echo Restart After Effects to use the extension.
pause
