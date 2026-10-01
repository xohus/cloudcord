# discord 344.1 / rain base

this path targets discord **344.1**. it does not change the 331 build.

## what changed

- the RCTHost/JSI path initializes `payload-base.js` before the cloudcord runtime imports its loader identity.
- the primary path now injects directly after RCTHost initializes the runtime, like RainTweak, before Metro module 0. post-bundle probing is only a fallback.
- early startup can discover dormant settings modules, awaits cloudcord initialization before handing off to Discord, and keeps Discord's own Metro Map intact.
- a JSI host call connects the existing native updater registry; Rain-compatible call names are aliases, not a second loader.
- test IPAs use the newly built runtime artifact rather than an older checked-in bundle.
- runtime readiness accepts a Metro Map or an object registry.
- the packager can explicitly replace `RainTweak.dylib` instead of running rain and cloudcord together.
- hermes, substrate, discord's javascript bundle, and app extensions stay in the base app. signing still needs the original extension entitlements.

## source reference

[RainTweak](https://github.com/ra1ncord/RainTweak) uses RCTHost runtime initialization and JSI for the new React Native architecture. cloudcord keeps its existing loader implementation; these changes do not copy the upstream implementation or ship rain's runtime as cloudcord.

## packaging

build the cloudcord runtime and native tweak using the existing macOS/Theos workflow first. then use the resulting deb:

```sh
python3 ios/scripts/package-cloudcord-ipa.py \
  --discord-ipa RainTweak.ipa \
  --discord-version 344.1 \
  --replace-rain-loader \
  --runtime-deb path/to/cloudcord.deb \
  --output CloudCord-344.1-test.ipa
```

the input must be a decrypted IPA. the replacement currently supports a thin 64-bit Mach-O; unsupported inputs fail rather than being guessed. this produces a test package, not a guarantee of valid provisioning. use your normal signing flow with compatible app-group entitlements.

## checks still required on device

- first launch, account loading, and cloudcord settings registration
- plugin initialization, fakeprofile, botcord, and cloudsync
- native updater and reload behavior under bridgeless React Native
- voice calls and BroadcastUpload screen sharing after signing
- foreground/background transitions and a second launch

the startup ordering, registry ownership, and startup failure handoff have automated tests. the native bridge and platform-specific features still need device verification. do not publish this as a stable release until these checks pass.
