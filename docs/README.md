# CloudCord

CloudCord is a custom Discord iOS client build with CloudCord branding, a patched runtime, and support for plugins and themes.

This is a beta project. Some things can break after Discord updates or runtime changes.

## Version

v0.1 beta

## What it includes

- CloudCord branding
- CloudCord runtime
- Plugin/runtime support
- Theme and font support when supported by the loader
- GitHub Actions runtime builder
- Unsigned IPA builds for iOS

## Installation

Download the latest IPA from the Releases tab.

The IPA is unsigned, so you need to sign it before installing it.

Basic install flow:

1. Download the latest CloudCord IPA from Releases.
2. Sign it with your own certificate or signing service.
3. Install it on your device.
4. Open CloudCord.

## Links

GitHub: https://github.com/xohus/cloudcord

Discord Server: https://discord.gg/5naTPJYemX

## Runtime

The runtime files are built through GitHub Actions.

Main runtime files:

```txt
cc.js
cloudcord.js
cloudcord.min.js
```

To rebuild the runtime:

1. Open the Actions tab.
2. Select Build CloudCord Runtime.
3. Click Run workflow.
4. Wait for the green check.
5. The runtime files will be updated in the repo.

## Releases

IPA builds should be uploaded through GitHub Releases.

Recommended release tag:

```txt
v0.1
```

Recommended release title:

```txt
CloudCord v0.1 Beta
```

## Notes

CloudCord is still being worked on. If something breaks, try a clean reinstall before reporting an issue.

If the app shows an old runtime or old branding, delete the app fully and reinstall it.

## Credits

CloudCord uses work from existing open-source Discord iOS modding projects.

Credits go to the original developers and maintainers of the tools and runtime this project is based on.

## Disclaimer

CloudCord is not affiliated with Discord Inc.

Use it at your own risk. This is a personal/community project, not an official Discord app.
