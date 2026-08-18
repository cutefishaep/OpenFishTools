# ─────────────────────────────────────────────────────────────────────────────
# OpenFishTools - Version Updater (PowerShell)
# Usage: powershell -File scripts/update_version.ps1 1.3.1
# ─────────────────────────────────────────────────────────────────────────────

param(
    [Parameter(Position=0)]
    [string]$NewVersion
)

if ([string]::IsNullOrWhiteSpace($NewVersion)) {
    $NewVersion = Read-Host "Enter new version number (e.g. 1.3.1)"
}

if ([string]::IsNullOrWhiteSpace($NewVersion)) {
    Write-Error "No version number provided."
    exit 1
}

# Strip leading 'v' or 'V'
$ver = $NewVersion.TrimStart('v', 'V').Trim()
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Resolve-Path (Join-Path $scriptDir "..")).Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenFishTools Version Updater" -ForegroundColor Cyan
Write-Host "  Target Version: $ver" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Update CSXS/manifest.xml
$manifest = Join-Path $rootDir "CSXS\manifest.xml"
if (Test-Path $manifest) {
    $c = [System.IO.File]::ReadAllText($manifest, [System.Text.Encoding]::UTF8)
    $c = [regex]::Replace($c, 'ExtensionBundleVersion="[^"]+"', "ExtensionBundleVersion=""$ver""")
    $c = [regex]::Replace($c, '(<Extension Id="com\.cutefish\.tools\.panel" Version=")[^"]+(")', "`${1}$ver`${2}")
    [System.IO.File]::WriteAllText($manifest, $c, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] Updated CSXS/manifest.xml" -ForegroundColor Green
}

# 2. Update Mac Welcome Resource
foreach ($wName in @("welcome.txt", "welcome.html")) {
    $welcome = Join-Path $rootDir "Installer\Mac\resources\$wName"
    if (Test-Path $welcome) {
        $c = [System.IO.File]::ReadAllText($welcome, [System.Text.Encoding]::UTF8)
        $c = [regex]::Replace($c, 'CEP Extension for Adobe After Effects v[0-9\.]+', "CEP Extension for Adobe After Effects v$ver")
        [System.IO.File]::WriteAllText($welcome, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  [OK] Updated $wName" -ForegroundColor Green
    }
}

# 3. Update Mac Conclusion Resource
foreach ($cName in @("conclusion.txt", "conclusion.html")) {
    $conclusion = Join-Path $rootDir "Installer\Mac\resources\$cName"
    if (Test-Path $conclusion) {
        $c = [System.IO.File]::ReadAllText($conclusion, [System.Text.Encoding]::UTF8)
        $c = [regex]::Replace($c, 'OpenFishTools v[0-9\.]+ has been installed', "OpenFishTools v$ver has been installed")
        [System.IO.File]::WriteAllText($conclusion, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  [OK] Updated $cName" -ForegroundColor Green
    }
}

# 4. Update Windows Inno Setup .iss
$iss = Join-Path $rootDir "Installer\Windows\OpenFishTools_Setup.iss"
if (Test-Path $iss) {
    $c = [System.IO.File]::ReadAllText($iss, [System.Text.Encoding]::UTF8)
    $c = [regex]::Replace($c, '#define MyAppVersion  "[^"]+"', "#define MyAppVersion  ""$ver""")
    [System.IO.File]::WriteAllText($iss, $c, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] Updated OpenFishTools_Setup.iss" -ForegroundColor Green
}

# 5. Update Mac build_pkg.sh
$pkg = Join-Path $rootDir "Installer\Mac\build_pkg.sh"
if (Test-Path $pkg) {
    $c = [System.IO.File]::ReadAllText($pkg, [System.Text.Encoding]::UTF8)
    $c = [regex]::Replace($c, 'APP_VERSION="\$\{APP_VERSION:-[^"]+\}"', "APP_VERSION=""`${APP_VERSION:-$ver}""")
    [System.IO.File]::WriteAllText($pkg, $c, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] Updated build_pkg.sh" -ForegroundColor Green
}

Write-Host ""
Write-Host "[SUCCESS] Version updated to $ver across all project files!" -ForegroundColor Cyan
Write-Host ""
