@echo off
SET "EXT_NAME=FishTools"
SET "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\%EXT_NAME%"
:: Detect version from manifest.xml
for /f "tokens=*" %%v in ('powershell -Command "[xml]$m = Get-Content -Raw -Path '%~dp0CSXS\manifest.xml'; $m.ExtensionManifest.ExtensionBundleVersion"') do set "VERSION=v%%v"

if "%VERSION%"=="" set "VERSION=v0.0.0"

echo Installing %EXT_NAME% %VERSION%...

:: Check for Administrator privileges and elevate if needed
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/c %~s0", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%~dp0"

:: Check for Updates
echo Checking for updates...
powershell -Command "$latest = try { Invoke-RestMethod -Uri 'https://api.github.com/repos/cutefishaep/OpenFishTools/releases/latest' -ErrorAction Stop } catch { $null }; if ($latest -and $latest.tag_name -ne '%VERSION%') { $choice = [System.Windows.Forms.MessageBox]::Show('New version ' + $latest.tag_name + ' is available. Download now?', 'Update Available', 'YesNo'); if ($choice -eq 'Yes') { Start-Process 'https://github.com/cutefishaep/OpenFishTools/releases/latest' } }"

:: Clean Cache
echo Cleaning CEP Cache...
rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\FishTools\Meta" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Temp\cep_cache" 2>nul

:: Clean target folder
if exist "%TARGET_DIR%" (
    echo Cleaning existing extension folder...
    rd /s /q "%TARGET_DIR%"
)

:: Create target directory
mkdir "%TARGET_DIR%"

:: Copy files
echo Copying files to %TARGET_DIR%...
xcopy /s /e /y /i /q "%~dp0" "%TARGET_DIR%"

:: Set PlayerDebugMode for CEP (Enable for all versions to be safe)
echo Enabling PlayerDebugMode...
for /L %%i in (7,1,20) do (
    reg add "HKEY_CURRENT_USER\Software\Adobe\CSXS.%%i" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

echo.
echo %EXT_NAME% %VERSION% installed successfully!
echo Restart After Effects to use the extension.
pause
