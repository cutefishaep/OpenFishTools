#!/bin/bash
set -e

APP_NAME="OpenFishTools"
APP_VERSION="${APP_VERSION:-1.0.8}"
BUNDLE_ID="com.cutefish.tools"
EXTENSION_FOLDER_NAME="OpenFishTools"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PAYLOAD_DIR="$SCRIPT_DIR/payload"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
RESOURCES_DIR="$SCRIPT_DIR/resources"
BUILD_DIR="$SCRIPT_DIR/build"
OUTPUT_PKG="$SCRIPT_DIR/${APP_NAME}.pkg"
COMPONENT_PKG="$BUILD_DIR/${APP_NAME}_component.pkg"

INSTALL_LOCATION="/Library/Application Support/Adobe/CEP/extensions"

SIGNING_IDENTITY="${SIGNING_IDENTITY:-}"

if [ -z "$SIGNING_IDENTITY" ]; then
    DETECTED_IDENTITY=$(security find-identity -v 2>/dev/null | grep -i "Developer ID Installer" | head -n 1 | awk -F'"' '{print $2}' || true)
    if [ -z "$DETECTED_IDENTITY" ]; then
        DETECTED_IDENTITY=$(security find-identity -v 2>/dev/null | grep -i "Installer" | head -n 1 | awk -F'"' '{print $2}' || true)
    fi
    if [ -n "$DETECTED_IDENTITY" ]; then
        SIGNING_IDENTITY="$DETECTED_IDENTITY"
    fi
fi

info()    { echo "  $1"; }
section() { echo ""; echo "--- $1 ---"; }
error()   { echo "  ERROR: $1"; exit 1; }

echo ""
echo "OpenFishTools - Mac Package Builder v$APP_VERSION"

section "Step 1: Preparing payload"

rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR/$EXTENSION_FOLDER_NAME"

info "Copying extension files..."
rsync -av \
    --exclude=".git" \
    --exclude=".gitignore" \
    --exclude=".debug" \
    --exclude="Installer" \
    --exclude="*.sh" \
    --exclude="README.md" \
    --exclude="changelog.md" \
    "$PROJECT_ROOT/" \
    "$PAYLOAD_DIR/$EXTENSION_FOLDER_NAME/"

info "Payload prepared at: $PAYLOAD_DIR"

section "Step 2: Setting script permissions"

chmod +x "$SCRIPTS_DIR/preinstall"
chmod +x "$SCRIPTS_DIR/postinstall"
info "Permissions set."

section "Step 3: Building component package"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

pkgbuild \
    --root "$PAYLOAD_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --identifier "${BUNDLE_ID}.pkg" \
    --version "$APP_VERSION" \
    --install-location "$INSTALL_LOCATION" \
    "$COMPONENT_PKG"

info "Component package built: $COMPONENT_PKG"

section "Step 4: Building distribution package"

cp "$COMPONENT_PKG" "$RESOURCES_DIR/${APP_NAME}_component.pkg"

if [ -n "$SIGNING_IDENTITY" ]; then
    info "Signing with: $SIGNING_IDENTITY"
    productbuild \
        --distribution "$RESOURCES_DIR/distribution.xml" \
        --resources "$RESOURCES_DIR" \
        --package-path "$RESOURCES_DIR" \
        --sign "$SIGNING_IDENTITY" \
        "$OUTPUT_PKG"
else
    info "Building unsigned package"
    productbuild \
        --distribution "$RESOURCES_DIR/distribution.xml" \
        --resources "$RESOURCES_DIR" \
        --package-path "$RESOURCES_DIR" \
        "$OUTPUT_PKG"
fi

rm -f "$RESOURCES_DIR/${APP_NAME}_component.pkg"

info "Distribution package built: $OUTPUT_PKG"

section "Step 5: Cleaning up"

rm -rf "$PAYLOAD_DIR"
rm -rf "$BUILD_DIR"
info "Cleanup complete."

echo ""
echo "Build complete: $(basename "$OUTPUT_PKG")"
echo "Path: $OUTPUT_PKG"
echo ""

exit 0
