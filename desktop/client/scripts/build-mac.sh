#!/usr/bin/env bash
# Local-only Mac preview. This script does not upload or publish anything.
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
    echo "Build this package on macOS; the graphical installer uses native libraries."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CLIENT_DIR"

case "$(uname -m)" in
    arm64) ARCH=arm64 ;;
    x86_64) ARCH=x64 ;;
    *) echo "Unsupported Mac architecture"; exit 1 ;;
esac

# Standalone keeps platform checks dynamic instead of baking the build host
# into the runtime. Use the complete desktop plugin set, not a reduced web build.
pnpm typecheck
node scripts/test-mac-package.cjs
pnpm buildStandalone
(
    cd installer
    go test -tags cli ./...
)
bash "$SCRIPT_DIR/build-installer.sh"

PACKAGE_DIR="$CLIENT_DIR/dist/mac-$ARCH"
APP_DIR="$PACKAGE_DIR/CloudCord.app"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
cp "dist/CloudCordSetup-darwin-$ARCH" "$APP_DIR/Contents/MacOS/CloudCordSetup"
cp dist/desktop.asar "$PACKAGE_DIR/cloudcord.asar"
cp dist/desktop.asar "$APP_DIR/Contents/Resources/cloudcord.asar"
cp installer/MAC-INSTALL.txt "$PACKAGE_DIR/Read Me First.txt"
cp installer/MAC-INSTALL.txt "$APP_DIR/Contents/Resources/Read Me First.txt"
# Generate Apple's icon sizes from the existing square CloudCord favicon.
# Using the square source preserves the cloud's proportions at every size.
ICON_WORK="$(mktemp -d "${TMPDIR:-/tmp}/cloudcord-icons.XXXXXX")"
ICONSET="$ICON_WORK/CloudCord.iconset"
mkdir -p "$ICONSET"
for SIZE in 16 32 128 256 512; do
    sips -z "$SIZE" "$SIZE" "$CLIENT_DIR/../../assets/cloudcord-favicon.png" --out "$ICONSET/icon_${SIZE}x${SIZE}.png" >/dev/null
    DOUBLE=$((SIZE * 2))
    sips -z "$DOUBLE" "$DOUBLE" "$CLIENT_DIR/../../assets/cloudcord-favicon.png" --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/CloudCord.icns"

node --input-type=module - "$APP_DIR/Contents/Info.plist" <<'NODE'
import { writeFileSync } from "node:fs";
writeFileSync(process.argv[2], `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.cloudcord.setup.preview</string>
<key>CFBundleDisplayName</key><string>CloudCord</string>
<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
<key>CFBundleName</key><string>CloudCord</string>
<key>CFBundleIconFile</key><string>CloudCord.icns</string>
<key>CFBundleExecutable</key><string>CloudCordSetup</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>NSHighResolutionCapable</key><true/>
<key>CFBundleSupportedPlatforms</key><array><string>MacOSX</string></array>
<key>LSApplicationCategoryType</key><string>public.app-category.utilities</string>
</dict></plist>
`);
NODE

plutil -lint "$APP_DIR/Contents/Info.plist"
chmod 755 "$APP_DIR/Contents/MacOS/CloudCordSetup"
codesign --force --sign - "$APP_DIR"
codesign --verify --strict --verbose=2 "$APP_DIR"
file "$APP_DIR/Contents/MacOS/CloudCordSetup"
# Exercise Finder/LaunchServices rather than only compiling the executable.
LAUNCH_LOG="$PACKAGE_DIR/launch.log"
otool -L "$APP_DIR/Contents/MacOS/CloudCordSetup"
# Capture native startup errors before testing LaunchServices. A successful
# compile/signature check alone does not establish that the GUI can run.
"$APP_DIR/Contents/MacOS/CloudCordSetup" >"$LAUNCH_LOG" 2>&1 &
LAUNCH_PID=$!
sleep 5
if ! kill -0 "$LAUNCH_PID" 2>/dev/null; then
    cat "$LAUNCH_LOG"
    wait "$LAUNCH_PID"
    echo "Installer exited before its launch check completed."
    exit 1
fi
# Stop the tested instance so the disk-image launch cannot accidentally pass
# by finding the process that was started from the build directory.
for TEST_PID in $(pgrep -x CloudCordSetup); do
    kill "$TEST_PID"
done
kill "$LAUNCH_PID"
wait "$LAUNCH_PID" || true
open -n "$APP_DIR"
sleep 5
# Match the executable name, not a regex containing the bundle path (which
# contains spaces and may differ from the argv exposed by LaunchServices).
if ! pgrep -x CloudCordSetup >/dev/null; then
    cat "$LAUNCH_LOG"
    ps -axo pid,comm,args
    find "$HOME/Library/Logs/DiagnosticReports" -maxdepth 1 -name 'CloudCordSetup*' -type f -exec cat {} \; 2>/dev/null || true
    echo "LaunchServices did not leave a running installer."
    exit 1
fi
# A local preview is not notarized. Do not disable Gatekeeper or rewrite
# Discord's signature here; distribution signing is a separate release gate.
ditto -c -k --sequesterRsrc --keepParent "$PACKAGE_DIR" "dist/CloudCord-mac-$ARCH-preview.zip"
DMG_STAGE="$(mktemp -d "${TMPDIR:-/tmp}/cloudcord-dmg.XXXXXX")"
ditto "$APP_DIR" "$DMG_STAGE/CloudCord.app"
cp installer/MAC-INSTALL.txt "$DMG_STAGE/Read Me First.txt"
ln -s /Applications "$DMG_STAGE/Applications"
hdiutil create -volname "CloudCord" -srcfolder "$DMG_STAGE" \
    -fs HFS+ -format UDZO -ov "dist/CloudCord-mac-$ARCH-preview.dmg"
hdiutil verify "dist/CloudCord-mac-$ARCH-preview.dmg"

# Test the delivered image, including the normal drag-to-Applications copy,
# instead of treating the pre-packaging executable as sufficient evidence.
DMG_MOUNT="$(mktemp -d "${TMPDIR:-/tmp}/cloudcord-mount.XXXXXX")"
DMG_COPY="$(mktemp -d "${TMPDIR:-/tmp}/cloudcord-install-check.XXXXXX")"
hdiutil attach -readonly -nobrowse -mountpoint "$DMG_MOUNT" "dist/CloudCord-mac-$ARCH-preview.dmg"
ditto "$DMG_MOUNT/CloudCord.app" "$DMG_COPY/CloudCord.app"
codesign --verify --strict --verbose=2 "$DMG_COPY/CloudCord.app"
test -x "$DMG_COPY/CloudCord.app/Contents/MacOS/CloudCordSetup"
test -s "$DMG_COPY/CloudCord.app/Contents/Resources/CloudCord.icns"
cmp installer/MAC-INSTALL.txt "$DMG_MOUNT/Read Me First.txt"
cmp "$APP_DIR/Contents/Resources/cloudcord.asar" "$DMG_COPY/CloudCord.app/Contents/Resources/cloudcord.asar"
open -n "$DMG_COPY/CloudCord.app"
sleep 5
if ! pgrep -x CloudCordSetup >/dev/null; then
    echo "The app copied from the finished disk image did not stay running."
    hdiutil detach "$DMG_MOUNT"
    exit 1
fi
for TEST_PID in $(pgrep -x CloudCordSetup); do
    kill "$TEST_PID"
done
hdiutil detach "$DMG_MOUNT"
echo "Finished DMG copy, signature, resource and Finder launch checks passed."
echo "Local preview: dist/CloudCord-mac-$ARCH-preview.zip"
echo "Disk image: dist/CloudCord-mac-$ARCH-preview.dmg"
