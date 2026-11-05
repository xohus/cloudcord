#!/usr/bin/env bash
set -euo pipefail
mkdir -p pipeline-results
trap 'adb logcat -d > pipeline-results/logcat.txt || true' EXIT
adb install --no-streaming app/build/outputs/apk/debug/app-debug.apk
adb install --no-streaming app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb logcat -c
adb shell am instrument -w -r com.getcloudcord.manager.test/androidx.test.runner.AndroidJUnitRunner | tee pipeline-results/instrumentation.txt
adb logcat -d > pipeline-results/logcat.txt
adb exec-out run-as com.getcloudcord.manager tar -C files/pipeline-results -cf - . > pipeline-results/output.tar
tar -xf pipeline-results/output.tar -C pipeline-results
rm pipeline-results/output.tar
grep -Eq 'OK \([0-9]+ tests?\)' pipeline-results/instrumentation.txt
signer="$(find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -n 1)"
for apk in pipeline-results/*.apk; do
  "$signer" verify --verbose --print-certs "$apk" > "$apk.signature.txt"
  "$(dirname "$signer")/zipalign" -c -P 16 -v 4 "$apk" > "$apk.alignment.txt" || true
  "$(dirname "$signer")/aapt" dump badging "$apk" > "$apk.package.txt"
done
adb install-multiple --no-streaming pipeline-results/*.apk 2>&1 | tee pipeline-results/install.txt
grep -qx 'Success' pipeline-results/install.txt
adb install-multiple -r --no-streaming pipeline-results/*.apk 2>&1 | tee pipeline-results/reinstall.txt
grep -qx 'Success' pipeline-results/reinstall.txt
