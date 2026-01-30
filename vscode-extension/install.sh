#!/bin/bash
# Pulse VSCode Extension Installer (macOS/Linux)
# Run: bash install.sh

EXTENSION_NAME="pulse-language"
VSCODE_EXT_PATH="$HOME/.vscode/extensions/$EXTENSION_NAME"
SOURCE_PATH="$(cd "$(dirname "$0")" && pwd)"

echo -e "\033[36mInstalling Pulse Language extension...\033[0m"

# Remove existing installation
if [ -d "$VSCODE_EXT_PATH" ]; then
    echo -e "\033[33mRemoving existing installation...\033[0m"
    rm -rf "$VSCODE_EXT_PATH"
fi

# Copy extension files
echo -e "\033[32mCopying extension files to $VSCODE_EXT_PATH...\033[0m"
cp -r "$SOURCE_PATH" "$VSCODE_EXT_PATH"

echo ""
echo -e "\033[32mInstallation complete!\033[0m"
echo -e "\033[36mPlease restart VSCode to activate the extension.\033[0m"
