#!/usr/bin/env bash
set -euo pipefail
mkdir -p pipeline-results
trap 'adb logcat -d > pipeline-results/logcat.txt || true' EXIT
adb install --no-streaming app/build/outputs/apk/debug/app-debug.apk
adb install --no-streaming app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
version="$(curl --fail --silent --show-error --retry 3 https://tracker.vendetta.rocks/tracker/index | python3 -c 'import json,sys; print(json.load(sys.stdin)["latest"]["stable"])')"
abi="$(adb shell getprop ro.product.cpu.abi | tr -d '\r' | sed 's/-v/_v/')"
mkdir -p pipeline-input
for part in base config.en config.xxhdpi "config.$abi"; do
  curl --fail --location --silent --show-error --retry 3 --max-time 300 "https://tracker.vendetta.rocks/tracker/download/$version/$part" -o "pipeline-input/$part.apk"
done
echo "Discord version: $version; ABI: $abi" | tee pipeline-results/input.txt
sha256sum pipeline-input/*.apk >> pipeline-results/input.txt
tar -C pipeline-input -cf pipeline-input.tar .
adb push pipeline-input.tar /data/local/tmp/cloudcord-pipeline-input.tar
adb shell run-as com.getcloudcord.manager mkdir -p "files/patching/downloads/discord/$version"
adb shell run-as com.getcloudcord.manager tar -xf /data/local/tmp/cloudcord-pipeline-input.tar -C "files/patching/downloads/discord/$version"
adb logcat -c
adb shell am instrument -w -r -e discordVersion "$version" com.getcloudcord.manager.test/androidx.test.runner.AndroidJUnitRunner | tee pipeline-results/instrumentation.txt
adb logcat -d > pipeline-results/logcat.txt
adb exec-out run-as com.getcloudcord.manager tar -C files/pipeline-results -cf - . > pipeline-results/output.tar
tar -xf pipeline-results/output.tar -C pipeline-results
rm pipeline-results/output.tar
grep -Eq 'OK \([0-9]+ tests?\)' pipeline-results/instrumentation.txt
set +e
adb install-multiple --no-streaming pipeline-results/*.apk 2>&1 | tee pipeline-results/install.txt
install_status=${PIPESTATUS[0]}
set -e
signer="$(find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -n 1)"
for apk in pipeline-results/*.apk; do
  "$signer" verify --min-sdk-version 28 --verbose --print-certs "$apk" > "$apk.signature.txt"
  "$(dirname "$signer")/zipalign" -c -P 16 -v 4 "$apk" > "$apk.alignment.txt"
  "$(dirname "$signer")/aapt" dump badging "$apk" > "$apk.package.txt"
done
test "$install_status" = 0
grep -qx 'Success' pipeline-results/install.txt
adb install-multiple -r --no-streaming pipeline-results/*.apk 2>&1 | tee pipeline-results/reinstall.txt
grep -qx 'Success' pipeline-results/reinstall.txt

# Installation success does not prove that the loader or runtime executes.
# Launch the exact patched package, retaining native logs and the visible screen.
package="$(sed -n "s/^package: name='\([^']*\)'.*/\1/p" pipeline-results/patched-base.apk.package.txt | head -n 1)"
test -n "$package"
adb shell am force-stop "$package"
adb logcat -c
adb shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 > pipeline-results/launch.txt 2>&1
for attempt in $(seq 1 20); do
  sleep 3
  adb logcat -d > pipeline-results/startup-logcat.txt
  if grep -q 'CloudCord is ready!' pipeline-results/startup-logcat.txt; then break; fi
done
adb shell pidof "$package" > pipeline-results/startup-pid.txt || true
adb shell uiautomator dump /data/local/tmp/cloudcord-startup.xml || true
adb pull /data/local/tmp/cloudcord-startup.xml pipeline-results/startup-ui.xml || true
adb exec-out screencap -p > pipeline-results/startup-screen.png
test -s pipeline-results/startup-pid.txt
grep -q 'Running custom scripts' pipeline-results/startup-logcat.txt
grep -q 'CloudCord is ready!' pipeline-results/startup-logcat.txt

if [[ "${CHECK_NATIVE_RECOVERY:-0}" == 1 ]]; then
  adb shell input keyevent KEYCODE_VOLUME_UP
  adb shell uiautomator dump /data/local/tmp/cloudcord-recovery.xml
  adb pull /data/local/tmp/cloudcord-recovery.xml pipeline-results/recovery-short-press.txt
  if grep -Fq 'CloudCord recovery' pipeline-results/recovery-short-press.txt; then
    echo 'An ordinary volume press opened recovery' >&2
    exit 1
  fi
  adb shell input keyevent --longpress KEYCODE_VOLUME_UP
  adb shell uiautomator dump /data/local/tmp/cloudcord-recovery.xml
  adb pull /data/local/tmp/cloudcord-recovery.xml pipeline-results/recovery-long-press.txt
  grep -Fq 'CloudCord recovery' pipeline-results/recovery-long-press.txt
  read -r update_x update_y < <(python3 - <<'PY'
import re
from xml.etree import ElementTree

for node in ElementTree.parse("pipeline-results/recovery-long-press.txt").iter("node"):
    if node.get("text", "").casefold() == "download update":
        x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds", "")))
        print((x1 + x2) // 2, (y1 + y2) // 2)
        break
else:
    raise SystemExit("Recovery update button not found")
PY
  )
  adb logcat -c
  adb shell input tap "$update_x" "$update_y"
  for attempt in $(seq 1 20); do
    sleep 3
    adb logcat -d > pipeline-results/recovery-download.txt
    if grep -Eq 'Verified CloudCord bundle (updated|is up to date)' pipeline-results/recovery-download.txt; then break; fi
  done
  grep -Eq 'Verified CloudCord bundle (updated|is up to date)' pipeline-results/recovery-download.txt
  adb shell input keyevent KEYCODE_BACK
fi

# Repatch the same Discord inputs for a second package while the first remains installed.
second_package="${package}.second"
second_results="pipeline-results/second-session"
mkdir -p "$second_results"
adb shell am instrument -w -r -e discordVersion "$version" -e clientPackage "$second_package" \
  com.getcloudcord.manager.test/androidx.test.runner.AndroidJUnitRunner | tee "$second_results/instrumentation.txt"
grep -Eq 'OK \([0-9]+ tests?\)' "$second_results/instrumentation.txt"
adb exec-out run-as com.getcloudcord.manager tar -C files/pipeline-results -cf - . |
  tar -xf - -C "$second_results"
for apk in "$second_results"/*.apk; do
  "$(dirname "$signer")/aapt" dump badging "$apk" > "$apk.package.txt"
  grep -Fq "package: name='$second_package'" "$apk.package.txt"
done
adb install-multiple --no-streaming "$second_results"/*.apk | tee "$second_results/install.txt"
grep -qx 'Success' "$second_results/install.txt"
adb shell pm path "$package" | grep '^package:'
adb shell pm path "$second_package" | grep '^package:'
