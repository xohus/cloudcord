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
APP_DIR="$PACKAGE_DIR/CloudCord Setup.app"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
cp "dist/CloudCordSetup-darwin-$ARCH" "$APP_DIR/Contents/MacOS/CloudCordSetup-bin"
cp dist/desktop.asar "$PACKAGE_DIR/cloudcord.asar"
cp dist/desktop.asar "$APP_DIR/Contents/Resources/cloudcord.asar"

node --input-type=module - "$APP_DIR/Contents/Info.plist" <<'NODE'
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
const launcher = join(dirname(process.argv[2]), "MacOS", "CloudCordSetup");
writeFileSync(launcher, '#!/bin/bash\nset -euo pipefail\nAPP_CONTENTS="$(cd "$(dirname "$0")/.." && pwd)"\nexport CLOUDCORD_BUNDLED_RUNTIME="$APP_CONTENTS/Resources/cloudcord.asar"\nexec "$APP_CONTENTS/MacOS/CloudCordSetup-bin" "$@"\n', { mode: 0o755 });
writeFileSync(process.argv[2], `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.cloudcord.setup.preview</string>
<key>CFBundleName</key><string>CloudCord Setup</string>
<key>CFBundleExecutable</key><string>CloudCordSetup</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
`);
NODE

plutil -lint "$APP_DIR/Contents/Info.plist"
# A local preview is not notarized. Do not disable Gatekeeper or rewrite
# Discord's signature here; distribution signing is a separate release gate.
ditto -c -k --sequesterRsrc --keepParent "$PACKAGE_DIR" "dist/CloudCord-mac-$ARCH-preview.zip"
DMG_STAGE="$(mktemp -d "${TMPDIR:-/tmp}/cloudcord-dmg.XXXXXX")"
ditto "$APP_DIR" "$DMG_STAGE/CloudCord Setup.app"
ln -s /Applications "$DMG_STAGE/Applications"
hdiutil create -volname "CloudCord Setup" -srcfolder "$DMG_STAGE" \
    -format UDZO -ov "dist/CloudCord-mac-$ARCH-preview.dmg"
hdiutil verify "dist/CloudCord-mac-$ARCH-preview.dmg"
echo "Local preview: dist/CloudCord-mac-$ARCH-preview.zip"
echo "Disk image: dist/CloudCord-mac-$ARCH-preview.dmg"
