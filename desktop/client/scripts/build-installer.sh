#!/bin/bash
# Builds the CloudCord Setup installer binary for the current platform
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$SCRIPT_DIR/../installer"

if ! command -v go &> /dev/null; then
    echo "ERROR: Go is not installed."
    echo "Install it with: brew install go  (Mac)"
    echo "                 winget install GoLang.Go  (Windows)"
    exit 1
fi

cd "$INSTALLER_DIR"

case "$(uname -s)" in
    Darwin)
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            OUT="CloudCordSetup-darwin-arm64"
        else
            OUT="CloudCordSetup-darwin-x64"
        fi
        ;;
    Linux)
        OUT="CloudCordSetup-linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        OUT="CloudCordSetup.exe"
        ;;
    *)
        echo "Unsupported platform"
        exit 1
        ;;
esac

echo "Building $OUT..."
go build -o "$OUT" .
chmod +x "$OUT" 2>/dev/null || true
mkdir -p ../dist
cp "$OUT" "../dist/$OUT"
echo "Done! Installer built at installer/$OUT and dist/$OUT"
