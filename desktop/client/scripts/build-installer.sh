#!/bin/bash
# Builds the CloudCord Setup installer binary for the current platform
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$SCRIPT_DIR/../installer"
CLIENT_DIR="$SCRIPT_DIR/.."

if ! command -v go &> /dev/null; then
    echo "ERROR: Go is not installed."
    echo "Install it with: brew install go  (Mac)"
    echo "                 winget install GoLang.Go  (Windows)"
    exit 1
fi

if [ ! -d "$CLIENT_DIR/dist/desktop" ]; then
    echo "ERROR: The CloudCord desktop runtime has not been built."
    echo "Run 'pnpm build' before 'pnpm build:installer'."
    exit 1
fi

echo "Packaging the CloudCord desktop runtime..."
pnpm exec asar pack "$CLIENT_DIR/dist/desktop" "$CLIENT_DIR/dist/desktop.asar"
mkdir -p "$INSTALLER_DIR/bundled"
cp "$CLIENT_DIR/dist/desktop.asar" "$INSTALLER_DIR/bundled/desktop.asar"

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
        BUILD_FLAGS=(-ldflags "-s -w -H windowsgui")
        ;;
    *)
        echo "Unsupported platform"
        exit 1
        ;;
esac

echo "Building $OUT..."
go build "${BUILD_FLAGS[@]}" -o "$OUT" .
chmod +x "$OUT" 2>/dev/null || true
mkdir -p ../dist
cp "$OUT" "../dist/$OUT"
echo "Done! Installer built at installer/$OUT and dist/$OUT"
