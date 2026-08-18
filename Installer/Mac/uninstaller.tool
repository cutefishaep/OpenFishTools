#!/bin/bash
# =============================================================================
# OpenFishTools Uninstaller
# Double-click this file in Finder to uninstall OpenFishTools.
# =============================================================================

EXTENSION_NAME="OpenFishTools"
SYSTEM_CEP_PATH="/Library/Application Support/Adobe/CEP/extensions"
USER_CEP_PATH="$HOME/Library/Application Support/Adobe/CEP/extensions"

# Confirm uninstall
CONFIRM=$(osascript -e 'button returned of (display dialog "Are you sure you want to uninstall OpenFishTools?\n\nThis will remove the extension from Adobe After Effects." buttons {"Cancel", "Uninstall"} default button "Cancel" with title "OpenFishTools Uninstaller" with icon caution)')

if [ "$CONFIRM" != "Uninstall" ]; then
    echo "Uninstall cancelled."
    exit 0
fi

# Ask if they want to remove PlayerDebugMode
REMOVE_DEBUG=$(osascript -e 'button returned of (display dialog "Do you also want to remove Adobe CEP PlayerDebugMode settings?\n\nChoose \"Yes\" to disable debug mode. Choose \"No\" to keep it (recommended if you use other custom or unsigned CEP extensions)." buttons {"No", "Yes"} default button "No" with title "OpenFishTools Uninstaller" with icon caution)')

# Determine if admin privileges are required
NEEDS_ADMIN=false
if [ -d "$SYSTEM_CEP_PATH/$EXTENSION_NAME" ]; then
    NEEDS_ADMIN=true
fi
if [ "$REMOVE_DEBUG" = "Yes" ]; then
    NEEDS_ADMIN=true
fi

if [ "$NEEDS_ADMIN" = true ]; then
    if [ -d "$SYSTEM_CEP_PATH/$EXTENSION_NAME" ]; then
        osascript -e "do shell script \"rm -rf '/Library/Application Support/Adobe/CEP/extensions/OpenFishTools'\" with administrator privileges"
    fi
    if [ "$REMOVE_DEBUG" = "Yes" ]; then
        osascript -e "do shell script \"for v in 7 8 9 10 11 12 13 14 15 16; do defaults delete /Library/Preferences/com.adobe.CSXS.\$v PlayerDebugMode 2>/dev/null; done; exit 0\" with administrator privileges"
    fi
fi

# Remove user-level installation (if present)
if [ -d "$USER_CEP_PATH/$EXTENSION_NAME" ]; then
    rm -rf "$USER_CEP_PATH/$EXTENSION_NAME"
fi

# Remove user-level PlayerDebugMode entries if selected
if [ "$REMOVE_DEBUG" = "Yes" ]; then
    for v in 7 8 9 10 11 12 13 14 15 16; do
        defaults delete "$HOME/Library/Preferences/com.adobe.CSXS.$v" PlayerDebugMode 2>/dev/null || true
    done
fi

if [ "$REMOVE_DEBUG" = "Yes" ]; then
    osascript -e 'display dialog "OpenFishTools has been successfully uninstalled.\n\nCEP PlayerDebugMode settings have been removed.\n\nRestart Adobe After Effects to complete the removal." buttons {"OK"} default button "OK" with title "OpenFishTools Uninstaller" with icon note'
else
    osascript -e 'display dialog "OpenFishTools has been successfully uninstalled.\n\nCEP PlayerDebugMode settings were kept intact.\n\nRestart Adobe After Effects to complete the removal." buttons {"OK"} default button "OK" with title "OpenFishTools Uninstaller" with icon note'
fi

exit 0
