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
