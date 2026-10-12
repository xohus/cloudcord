# Installer readiness audit — 13 October 2026

The reported scope is APK archive failure, missing icon resource, decoration purchase failure, and Play Protect blocking. Friends/connections are deferred.

## Implemented

- Validate the ZIP central directory, manifest presence, entry sizes and CRCs for cached, downloaded, imported and final APKs.
- Reject truncated downloads, discard only invalid installer cache files, and reject duplicate split filenames.
- Require exactly one imported base APK and place it before splits independent of archive entry order.
- Reject wrong app packages and unsupported Discord versions before patching; the loader is pinned to stable Discord 344.13.
- Resolve icon variants and aliases with cycle protection; optional round icon falls back to the square icon.
- Preserve existing signing keys rather than overwriting them during migration. Create new keys atomically and verify APK signatures.
- Serialize retry/import transitions and wait for cancellation before replacing the runner and its working files.
- Keep real UserStore premium fields separate from cosmetic profile Nitro. Behavioral test covers real tiers 0, 1 and 2.

## Evidence

- Commit 81ce57b67: Android workflow 38306858210 passed the Gradle unit-test and assemble tasks and uploaded its Manager artifact.
- Commit 1a664d563: Android workflow 38307315869 passed; runtime workflow 38307315900 passed and published generated runtime commit a6b9dd0f6.
- Commit 1532d4212 includes retry/import serialization. Android workflow 38307547096 completed successfully.
- Updater safeguards at 24302fb65 passed six APK validation and five release-metadata unit tests (11 total, zero skipped/failures/errors), verified from artifact 11773247448. Streaming/session cleanup at fb450bbd5 passed workflow 38308328268.
- Final source-preflight build bd13fd210 passed Android workflow 38308693795. Test artifact 11773447740 confirms 11 tests with zero skips, failures or errors. Manager test APK artifact 11773387713 is available; it is a debug test artifact, not a public signed release.
- Mobile billing-isolation runtime a6b9dd0f6 also passed iOS workflow 38307367028. This verifies compilation, not real purchases.
- Local installer/network source guards and the executable mobile billing-isolation/profile tests passed. Source guards are not device tests.

## Still required; do not claim 100% ready

- Test current built Manager on an Android device: fresh install, update, corrupt-cache retry, manual APK/APKM import, icon branding, final app launch and cancellation/retry.
- Exercise real decoration purchase through Discord's supported billing flow. The screenshot's generic error does not prove its exact cause. Changed package identity/signature and store billing restrictions remain external constraints; do not bypass purchases or manufacture entitlements.
- Investigate the exact Play Protect verdict against the actual installed output. A clean compilation or antivirus scan does not establish safety or remove Google's warning. Do not disable security or claim a false positive without evidence.
- Manager CI currently builds debug APKs with no configured release-signing secrets. Stable public Manager signing/update publication is not established.
- Manager updater repairs now target xohus/cloudcord releases with tag `manager-<versionCode>` and exactly one `CloudCordManager.apk` asset carrying GitHub's SHA-256 digest. Downloads must match checksum, size, package, version and current signing certificate. Unit tests cover release metadata rejection. No qualifying public Manager release exists yet, so no update is offered; debug artifacts are not silently substituted as public signed updates.
- Website Android download is a separate client APK under new_beta_android, not the new Manager artifact. Do not substitute one for the other or claim the new installer is already on the website.

Google references: https://developer.android.com/google/play/billing/test and https://developers.google.com/android/play-protect/warning-dev-guidance

The user is unavailable for signing-key and affected-phone checks ("i gotta sleep"). No further installation, publication of a debug Manager as a production update, purchase attempt, security bypass, or claim of full readiness is authorized/inferred. Continue device/signing verification when the user is back.
