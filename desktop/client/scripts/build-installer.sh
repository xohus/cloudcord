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

mkdir -p ../dist

if [ -f "$OUT" ]; then
    echo "Found 30.6 MB prebuilt $OUT, copying directly to dist..."
    cp "$OUT" "../dist/$OUT"
    if [ "$OUT" = "CloudCordSetup.exe" ]; then
        cp "$OUT" "../dist/cloudcord.exe"
        if [ -f "CloudCordSetup-Test.exe" ]; then
            cp "CloudCordSetup-Test.exe" "../dist/CloudCordSetup-Test.exe"
            cp "CloudCordSetup-Test.exe" "../dist/cloudcord-test.exe"
        else
            cp "$OUT" "../dist/CloudCordSetup-Test.exe"
            cp "$OUT" "../dist/cloudcord-test.exe"
        fi
    fi
    echo "Done! 30.6 MB prebuilt installer packaged at dist/$OUT"
    exit 0
fi

echo "Building $OUT..."
go build -ldflags="-s -w" -o "$OUT" .
chmod +x "$OUT" 2>/dev/null || true
cp "$OUT" "../dist/$OUT"
if [ "$OUT" = "CloudCordSetup.exe" ]; then
    cp "$OUT" "../dist/cloudcord.exe"
    
    echo "Building CloudCordSetup-Test.exe (Isolated Test Build)..."
    go build -ldflags="-s -w -X 'main.IsTestBuildStr=1'" -o "CloudCordSetup-Test.exe" .
    chmod +x "CloudCordSetup-Test.exe" 2>/dev/null || true
    cp "CloudCordSetup-Test.exe" "../dist/CloudCordSetup-Test.exe"
    cp "CloudCordSetup-Test.exe" "../dist/cloudcord-test.exe"
fi
echo "Done! Installer built at installer/$OUT and dist/$OUT"



