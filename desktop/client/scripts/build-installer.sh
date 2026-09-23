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

echo "Building $OUT..."
if [ "$OUT" = "CloudCordSetup.exe" ]; then
    # Match the original CloudCord installer packaging exactly: static SDL GUI,
    # Windows subsystem, and embedded icon/version resources.
    go-winres simply --icon winres/icon.png --manifest gui \
        --product-version "git-tag" --file-version "git-tag" \
        --product-name "CloudCord" --file-description "CloudCord Setup" \
        --original-filename "CloudCordSetup.exe"
    INSTALLER_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo Unknown)"
    CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -tags "static gui" \
        -ldflags="-s -w -H=windowsgui -extldflags=-static -X 'sinlotl/buildinfo.InstallerGitHash=$INSTALLER_HASH' -X 'sinlotl/buildinfo.InstallerTag=cloudcord'" \
        -o "$OUT" .
else
    go build -ldflags="-s -w" -o "$OUT" .
fi
chmod +x "$OUT" 2>/dev/null || true
cp "$OUT" "../dist/$OUT"
if [ "$OUT" = "CloudCordSetup.exe" ]; then
    cp "$OUT" "../dist/cloudcord.exe"
    
    echo "Building CloudCordSetup-Test.exe (Isolated Test Build)..."
    CGO_ENABLED=1 GOOS=windows GOARCH=amd64 go build -tags "static gui" \
        -ldflags="-s -w -H=windowsgui -extldflags=-static -X 'main.IsTestBuildStr=1' -X 'sinlotl/buildinfo.InstallerGitHash=$INSTALLER_HASH' -X 'sinlotl/buildinfo.InstallerTag=cloudcord-test'" \
        -o "CloudCordSetup-Test.exe" .
    chmod +x "CloudCordSetup-Test.exe" 2>/dev/null || true
    cp "CloudCordSetup-Test.exe" "../dist/CloudCordSetup-Test.exe"
    cp "CloudCordSetup-Test.exe" "../dist/cloudcord-test.exe"
fi
echo "Done! Installer built at installer/$OUT and dist/$OUT"
