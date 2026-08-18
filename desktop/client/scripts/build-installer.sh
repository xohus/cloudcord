#!/bin/bash
# Builds the Sinlotl installer binary for the current platform
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
            OUT="Sinlotl-darwin-arm64"
        else
            OUT="Sinlotl-darwin-x64"
        fi
        ;;
    Linux)
        OUT="Sinlotl-linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        OUT="Sinlotl.exe"
        ;;
    *)
        echo "Unsupported platform"
        exit 1
        ;;
esac

echo "Building $OUT..."
go build -o "$OUT" .
chmod +x "$OUT" 2>/dev/null || true
echo "Done! Installer built at installer/$OUT"
