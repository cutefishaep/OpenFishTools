#!/bin/bash

# --- Configuration ---
EXT_NAME="OpenFishTools"
INTERNAL_NAME="OpenFishTools"
TARGET_DIR="/Library/Application Support/Adobe/CEP/extensions/$INTERNAL_NAME"
GITHUB_REPO="cutefishaep/OpenFishTools"
TEMP_DIR="/tmp/${INTERNAL_NAME}_Setup"

show_menu() {
    clear
    echo "======================================================"
    echo "         $EXT_NAME - Maintenance Tool (macOS)"
    echo "======================================================"
    echo ""
    echo "   [1] Install / Update Extension"
    echo "   [2] Uninstall Extension"
    echo "   [3] Exit"
    echo ""
    echo "======================================================"
    read -p "Select an option [1-3]: " choice
    case $choice in
        1) install_ext ;;
        2) uninstall_ext ;;
        3) exit 0 ;;
        *) show_menu ;;
    esac
}

install_ext() {
    clear
    echo "======================================================"
    echo "            Installing $EXT_NAME"
    echo "======================================================"
    echo ""

    # Check for sudo
    if [ "$EUID" -ne 0 ]; then
        echo "[!] Requesting sudo privileges..."
        sudo "$0" 1
        return
    fi

    # Check existing
    if [ -d "$TARGET_DIR" ]; then
        echo "[i] Existing installation found."
        read -p "Overwrite current files? [y/n]: " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            echo "[!] Installation cancelled."
            read -p "Press enter to return to menu..."
            show_menu
            return
        fi
        rm -rf "$TARGET_DIR"
    fi

    echo "[*] Cleaning cache..."
    rm -rf "~/Library/Application Support/Adobe/CEP/extensions/$INTERNAL_NAME"
    rm -rf "~/Library/Caches/CSXS"

    echo "[*] Downloading latest source from GitHub..."
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    
    curl -L "https://github.com/$GITHUB_REPO/archive/refs/heads/main.zip" -o "$TEMP_DIR/dl.zip"
    if [ $? -ne 0 ]; then
        echo "[!] Download failed."
        read -p "Press enter to return to menu..."
        show_menu
        return
    fi

    echo "[*] Extracting..."
    unzip -q "$TEMP_DIR/dl.zip" -d "$TEMP_DIR/ext"
    
    # Find extracted folder
    SRC=$(find "$TEMP_DIR/ext" -maxdepth 1 -type d -name "OpenFishTools-*" | head -n 1)
    
    echo "[*] Copying extension files..."
    mkdir -p "$TARGET_DIR"
    cp -R "$SRC/." "$TARGET_DIR/"
    
    # Remove unnecessary files
    rm -rf "$TARGET_DIR/.git" 2>/dev/null
    rm -rf "$TARGET_DIR/node_modules" 2>/dev/null
    rm "$TARGET_DIR/"*.bat 2>/dev/null
    rm "$TARGET_DIR/"*.sh 2>/dev/null

    echo "[*] Enabling Adobe PlayerDebugMode..."
    for i in {7..25}; do
        defaults write com.adobe.CSXS.$i PlayerDebugMode 1 2>/dev/null
    done

    # Cleanup
    rm -rf "$TEMP_DIR"

    echo ""
    echo "[OK] $EXT_NAME installed successfully!"
    echo "[i] Please RESTART After Effects."
    echo ""
    read -p "Press enter to return to menu..."
    show_menu
}

uninstall_ext() {
    clear
    echo "======================================================"
    echo "            Uninstalling $EXT_NAME"
    echo "======================================================"
    echo ""

    # Check for sudo
    if [ "$EUID" -ne 0 ]; then
        echo "[!] Requesting sudo privileges..."
        sudo "$0" 2
        return
    fi

    if [ ! -d "$TARGET_DIR" ]; then
        echo "[!] $EXT_NAME is not currently installed."
        read -p "Press enter to return to menu..."
        show_menu
        return
    fi

    echo "[*] Removing $TARGET_DIR..."
    rm -rf "$TARGET_DIR"

    echo "[*] Cleaning leftovers..."
    rm -rf "~/Library/Application Support/Adobe/CEP/extensions/$INTERNAL_NAME"
    
    echo ""
    echo "[OK] $EXT_NAME uninstalled successfully."
    echo ""
    read -p "Press enter to return to menu..."
    show_menu
}

# Entry point
if [ "$1" == "1" ]; then
    install_ext
elif [ "$1" == "2" ]; then
    uninstall_ext
else
    show_menu
fi
