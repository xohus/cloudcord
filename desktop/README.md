# CloudCord Desktop

CloudCord Desktop is an open-source Discord desktop client mod. It targets an installed Discord desktop `.exe` and injects the CloudCord desktop bundle into Discord using an in-repo installer. Windows release builds embed the matching desktop runtime, so installation still works when a separate release asset is unavailable.

The desktop tree is self-contained under `desktop/` and uses CloudCord branding, settings, updater endpoints, and release artifacts. Required upstream licensing and attribution remain in `CREDITS.md` and source headers.

CloudCord Desktop is separate from CloudCord iOS and Android. iOS and Android use the React Native/mobile runtime. Desktop uses the desktop client mod runtime built from `desktop/client`.

BotCord provides a responsive Discord-style bot client with servers, categorized channels, direct messages, message history, embeds, media, replies, reactions, editing and member browsing. Fake Profile saves and publishes the complete editor automatically through the service in `desktop/profile-service`; the client installs and maintains its invisible About Me link automatically while preserving visible bio text. Discord credentials and BotCord tokens are never sent to that service.

## Build

From the repository root:

```sh
cd desktop/client
pnpm install
pnpm typecheck
pnpm build
pnpm build:installer
```

`build:installer` packages `dist/desktop` as `dist/desktop.asar` and embeds it in the setup executable. Do not skip the runtime build step.

On Windows, the installer build outputs:

```text
desktop/client/dist/cloudcord.exe
```

The unpacked desktop runtime and packaged installer runtime are generated in:

```text
desktop/client/dist/desktop
desktop/client/dist/desktop.asar
```

## Workflow

Run the `CloudCord Desktop` GitHub Actions workflow manually, or push changes under `desktop/**` or `.github/workflows/desktop.yml`. The workflow builds the committed desktop runtime, packages it into the Windows installer, smoke-tests the EXE, then uploads `CloudCordDesktop-Windows`.

## Install

Build or download `cloudcord.exe`, close Discord fully from the system tray, run the installer, select the Discord installation, and choose `Install`.

## Uninstall

Run `cloudcord.exe`, select the patched Discord installation, and choose `Delete`.

## Update

Run `cloudcord.exe`, select the Discord installation, and choose `Update / Fix`. Update replaces only the CloudCord runtime and reapplies the desktop patch. It preserves plugins, settings, themes, fonts, Cloud Sync state, BotCord data, and Fake Profile data.

The Windows installer checks the official CloudCord desktop release when it opens. If the published `cloudcord.exe` has a different verified SHA-256 digest, it updates itself and relaunches automatically.

On Windows, Install and Update close all processes for the selected Discord channel before replacing the runtime. The replacement is staged through a rollback file so an interrupted update does not destroy the working runtime. Use `Update / Fix` if Discord updates or damages its CloudCord patch.

## Logs

Installer logs are written to the CloudCord data directory and are the first place to inspect failed install, delete, or update operations.

## Test

```sh
cd desktop/client
pnpm typecheck
pnpm build
pnpm build:installer
```

The deployed shared-profile endpoint also exposes `/health`. Its Worker source and D1 schema are versioned under `desktop/profile-service` so the service can be audited or redeployed independently.

## Known Risks

Discord desktop updates can replace `app.asar` and require an update from CloudCord Setup. Discord client mods may violate Discord terms of service. Plugin patches depend on Discord internals and can break after Discord updates. Antivirus or Windows SmartScreen can flag unsigned community installers. Always close Discord before installing, deleting, or updating.
