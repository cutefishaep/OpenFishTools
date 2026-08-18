#!/bin/bash
# ============================================
# OpenFishTools - Deploy to After Effects CEP (macOS)
# ============================================
# Equivalent of Installer/Windows/deploy.bat
# System-level deployment (requires admin / sudo).
# Double-click this file in Finder to run.
# ============================================

set -e

EXTENSION_NAME="OpenFishTools"
EXTENSION_ID="com.cutefish.tools"
REG_KEY="PlayerDebugMode"

# Resolve project root (two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Target paths (system-level, requires admin)
CEP_DIR="/Library/Application Support/Adobe/CEP/extensions"
TARGET_DIR="$CEP_DIR/$EXTENSION_NAME"

# Colors / formatting
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
CYAN="\033[36m"
RESET="\033[0m"

ok()    { printf "            ${GREEN}[OK]${RESET} %s\n" "$1"; }
fail()  { printf "            ${RED}[FAIL]${RESET} %s\n" "$1"; }
warn()  { printf "        ${YELLOW}[WARNING]${RESET} %s\n" "$1"; }
info()  { printf "        ${CYAN}[*]${RESET} %s\n" "$1"; }

printf "\n"
printf "========================================\n"
printf "   OpenFishTools - CEP Extension Deploy\n"
printf "========================================\n"
printf "\n"

# ----------------------------------------
# Step 0: Obtain admin privileges (sudo)
# ----------------------------------------
printf "[0/3] Requesting administrator privileges...\n"
printf "        (needed to write to system CEP folder)\n\n"

# Cache sudo credentials up-front so the password is only asked once
if ! sudo -v 2>/dev/null; then
    fail "Administrator privileges are required to deploy."
    printf "        Please run this script as a user with admin rights.\n"
    printf "\n"
    if [ -t 0 ]; then
        :
    else
        printf "Press any key to close...\n"
        read -n 1 -s || true
    fi
    exit 1
fi
ok "Admin privileges obtained."
printf "\n"

# ----------------------------------------
# Step 1: Check & Enable PlayerDebugMode
#         CEP 9 (CC 2018) to CEP 12 (2027+)
#         (per-user setting, no sudo needed)
# ----------------------------------------
printf "[1/3] Checking PlayerDebugMode...\n"
printf "        CEP Versions: 9, 10, 11, 12\n"
printf "        (CC 2018 to CC 2027+)\n"
printf "\n"

DEBUG_ALL_OK=1

enable_debug() {
    local csxs_version="$1"
    local label="$2"
    local domain="com.adobe.CSXS.${csxs_version}"

    printf "        [CSXS.%s] %s...\n" "$csxs_version" "$label"

    # Check if already enabled (value == 1)
    current="$(defaults read "$domain" "$REG_KEY" 2>/dev/null || echo "")"
    if [ "$current" = "1" ]; then
        ok "Already enabled."
        return 0
    fi

    # Try to enable (per-user, no sudo)
    if defaults write "$domain" "$REG_KEY" -string "1" 2>/dev/null; then
        ok "Enabled successfully."
    else
        fail "Could not enable."
        DEBUG_ALL_OK=0
    fi
}

enable_debug "7"  "CC 2017"
enable_debug "8"  "CC 2018"
enable_debug "9"  "CC 2019"
enable_debug "10" "CC 2020"
enable_debug "11" "CC 2021/2022"
enable_debug "12" "CC 2023-2027+"

printf "\n"
if [ "$DEBUG_ALL_OK" = "1" ]; then
    printf "        ${GREEN}[OK]${RESET} All PlayerDebugMode settings are enabled.\n"
else
    warn "Some keys failed to enable."
    printf "        [*] Try enabling manually:\n"
    printf "            1. Open Terminal\n"
    printf "            2. Run: defaults write com.adobe.CSXS.8 PlayerDebugMode 1\n"
    printf "            3. Repeat for other CSXS versions (7 through 16)\n"
    printf "\n"
fi

printf "\n"

# ----------------------------------------
# Step 2: Create CEP extensions directory
#         (delete old + prepare target)
# ----------------------------------------
printf "[2/3] Preparing target directory...\n"

if [ ! -d "$CEP_DIR" ]; then
    info "Creating CEP extensions directory..."
    sudo mkdir -p "$CEP_DIR"
fi

# Remove old version if exists (delete)
if [ -d "$TARGET_DIR" ]; then
    info "Removing old version from: $TARGET_DIR"
    sudo rm -rf "$TARGET_DIR"
fi

if [ -d "$TARGET_DIR" ]; then
    warn "Could not completely remove old directory."
else
    ok "Old version removed successfully."
fi

printf "        ${GREEN}[OK]${RESET} Target directory ready: %s\n" "$TARGET_DIR"

printf "\n"

# ----------------------------------------
# Step 3: Copy clean extension files (paste)
# ----------------------------------------
printf "[3/3] Copying fresh extension files...\n"

sudo mkdir -p "$TARGET_DIR"

info "Copying extension files..."
sudo rsync -a \
    --exclude=".git" \
    --exclude=".gitignore" \
    --exclude=".agents" \
    --exclude=".github" \
    --exclude="Installer" \
    --exclude="scripts" \
    --exclude="skills" \
    --exclude="README.md" \
    --exclude="changelog.md" \
    --exclude="LICENSE" \
    --exclude="AGENTS.md" \
    --exclude="Logo.svg" \
    --exclude="*.sh" \
    --exclude="*.command" \
    --exclude="*.bat" \
    --exclude="*.iss" \
    --exclude="*.ico" \
    "$PROJECT_ROOT/" \
    "$TARGET_DIR/"

# Ensure the current user owns the deployed files (so future edits/deploy work)
sudo chown -R "$(id -u):$(id -g)" "$TARGET_DIR"

ok "All files copied successfully!"

printf "\n"
printf "========================================\n"
printf "   Deploy Complete!\n"
printf "========================================\n"
printf "\n"
printf "   Extension: %s\n" "$EXTENSION_NAME"
printf "   Location:  %s\n" "$TARGET_DIR"
printf "\n"
printf "   CEP Versions Enabled:\n"
printf "     - CSXS.9  (CC 2018/2019)\n"
printf "     - CSXS.10 (2020)\n"
printf "     - CSXS.11 (2022-2024)\n"
printf "     - CSXS.12 (2025-2027+)\n"
printf "\n"
printf "   Next steps:\n"
printf "   1. Restart After Effects\n"
printf "   2. Go to Window > Extensions > %s\n" "$EXTENSION_NAME"
printf "\n"
printf "========================================\n"
printf "\n"

# Keep terminal open when double-clicked from Finder
if [ -t 0 ]; then
    : # Running from terminal, no pause needed
else
    printf "Press any key to close...\n"
    read -n 1 -s || true
fi
