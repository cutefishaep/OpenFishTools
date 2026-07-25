#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Auto-update version across CSXS/manifest.xml and installer files.
# Usage: ./scripts/update_version.sh 1.0.94
# ─────────────────────────────────────────────────────────────────────────────

set -e

NEW_VER="$1"

if [ -z "$NEW_VER" ]; then
    echo "❌ Error: Please provide a version number (e.g. ./scripts/update_version.sh 1.0.94)"
    exit 1
fi

# Strip leading 'v' if provided (e.g. v1.0.94 -> 1.0.94)
NEW_VER="${NEW_VER#v}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Updating version to: $NEW_VER"

# 1. Update CSXS/manifest.xml
MANIFEST="$ROOT_DIR/CSXS/manifest.xml"
if [ -f "$MANIFEST" ]; then
    perl -pi -e "s/ExtensionBundleVersion=\"[^\"]+\"/ExtensionBundleVersion=\"$NEW_VER\"/g" "$MANIFEST"
    perl -pi -e "s/(<Extension Id=\"com\.cutefish\.tools\.panel\" Version=\")[^\"]+(\")/\${1}$NEW_VER\${2}/g" "$MANIFEST"
    echo "  ✅ Updated CSXS/manifest.xml"
fi

# 2. Update Mac Welcome HTML
WELCOME="$ROOT_DIR/Installer/Mac/resources/welcome.html"
if [ -f "$WELCOME" ]; then
    perl -pi -e "s/CEP Extension for Adobe After Effects v[0-9\.]+/CEP Extension for Adobe After Effects v$NEW_VER/g" "$WELCOME"
    echo "  ✅ Updated welcome.html"
fi

# 3. Update Mac Conclusion HTML
CONCLUSION="$ROOT_DIR/Installer/Mac/resources/conclusion.html"
if [ -f "$CONCLUSION" ]; then
    perl -pi -e "s/OpenFishTools v[0-9\.]+ has been installed/OpenFishTools v$NEW_VER has been installed/g" "$CONCLUSION"
    echo "  ✅ Updated conclusion.html"
fi

# 4. Update Windows Inno Setup .iss
ISS="$ROOT_DIR/Installer/Windows/OpenFishTools_Setup.iss"
if [ -f "$ISS" ]; then
    perl -pi -e "s/#define MyAppVersion  \"[^\"]+\"/#define MyAppVersion  \"$NEW_VER\"/g" "$ISS"
    echo "  ✅ Updated OpenFishTools_Setup.iss"
fi

# 5. Update Mac build_pkg.sh fallback
BUILD_PKG="$ROOT_DIR/Installer/Mac/build_pkg.sh"
if [ -f "$BUILD_PKG" ]; then
    perl -pi -e "s/APP_VERSION=\"\\\${APP_VERSION:-[^\"]+}\"/APP_VERSION=\"\\\${APP_VERSION:-$NEW_VER}\"/g" "$BUILD_PKG"
    echo "  ✅ Updated build_pkg.sh"
fi

echo "✨ All files updated to version $NEW_VER successfully!"
