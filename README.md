<div align="center">
  <img src="assets/logo-full.png" alt="CloudCord" width="720" />

  <h1>CloudCord</h1>
  <p><strong>A modern, privacy-minded Discord client experience for mobile and desktop.</strong></p>

  <p>
    <img alt="iOS" src="https://img.shields.io/badge/iOS-supported-111111?style=for-the-badge&logo=apple" />
    <img alt="Android" src="https://img.shields.io/badge/Android-supported-111111?style=for-the-badge&logo=android" />
    <img alt="Windows" src="https://img.shields.io/badge/Windows-supported-111111?style=for-the-badge" />
    <img alt="Open Source" src="https://img.shields.io/badge/source-visible-111111?style=for-the-badge&logo=github" />
    <img alt="Local First" src="https://img.shields.io/badge/local--first-settings-111111?style=for-the-badge&logo=databricks" />
  </p>
</div>

---

## Install

<div align="center">
<table>
<tr>
<td align="center" width="33%">
  <img src="assets/readme/platforms/ios.svg" width="88" height="88" alt="iOS / iPadOS" />
  <h3>iOS / iPadOS</h3>
  <br /><br />
  <a href="https://github.com/xohus/cloudcord/releases/download/new_beta/cloudcord0.ipa"><strong>Download CloudCord IPA</strong></a>
  <br />
  <sub><a href="https://github.com/xohus/cloudcord/releases/tag/new_beta">View iOS / iPadOS release</a></sub>
</td>
<td align="center" width="33%">
  <img src="assets/readme/platforms/android.svg" width="88" height="88" alt="Android" />
  <h3>Android</h3>
  <br /><br />
  <a href="https://github.com/xohus/cloudcord/releases/download/new_beta_android/cloudcord.apk"><strong>Download CloudCord APK</strong></a>
  <br />
  <sub><a href="https://github.com/xohus/cloudcord/releases/tag/new_beta_android">View Android release</a></sub>
</td>
<td align="center" width="33%">
  <img src="assets/readme/platforms/windows.svg" width="88" height="88" alt="Windows desktop" />
  <h3>Windows</h3>
  <br /><br />
  <a href="https://github.com/xohus/cloudcord/releases/download/new_beta_t_desktop/cloudcord.exe"><strong>Download cloudcord.exe</strong></a>
  <br />
  <sub><a href="https://github.com/xohus/cloudcord/releases/tag/new_beta_t_desktop">View Windows desktop release</a></sub>
</td>
</tr>
</table>
</div>

> Download CloudCord only from this repository's releases. iOS uses an `.ipa`, Android uses an `.apk`, and Windows uses `cloudcord.exe`. On Windows, close Discord completely, run the installer, and choose Install or Update / Fix.

## Live CloudCord numbers

<div align="center">
  <img src="https://cloudcord-profiles.ggxohus.workers.dev/v1/usage/installs-badge.svg" alt="Lifetime CloudCord installs" />
</div>

The number is how many times CloudCord has been obtained from the official releases across iOS, Android, and Windows. It is calculated from lifetime IPA, APK, and EXE downloads and does not use Fake Profile, Discord account IDs, or online-presence tracking. Reinstalling or downloading on another device can increase the number again.

## Platform support

| Platform | Package | Support |
| :---: | :---: | --- |
| <img src="assets/readme/platforms/ios.svg" width="28" height="28" alt="iOS" /> **iOS / iPadOS** | `.ipa` | Mobile runtime, Cloud Sync, Fake Profile, plugins, themes and fonts |
| <img src="assets/readme/platforms/android.svg" width="28" height="28" alt="Android" /> **Android** | `.apk` | Mobile runtime, Cloud Sync, Fake Profile, plugins, themes and fonts |
| <img src="assets/readme/platforms/windows.svg" width="28" height="28" alt="Windows" /> **Windows desktop** | `.exe` | Installer, automatic updates, BotCord, shared Fake Profile, Cloud Sync, plugins, themes and fonts |

## CloudCord at a glance

CloudCord extends Discord with a focused set of client features while keeping the experience familiar. Mobile features are integrated directly into the Discord settings and navigation surfaces, with local configuration and an automatically refreshed runtime.

<table>
<tr>
<td width="50%" valign="top">

### BotCord

A full Discord-style bot-account client built directly into CloudCord Desktop.

- Multiple locally saved bot accounts
- Server rail, categorized channels and direct-message home
- Message history pagination with automatic conversation refresh
- Text, image and file attachments, embeds and poll rendering
- Replies, reactions, inline editing and message deletion
- Searchable member list with one-click bot DMs
- New DM picker limited to members of servers the selected bot belongs to
- Local multi-bot switching without exposing tokens after setup

</td>
<td width="50%" valign="top">

### Fake Profile

Build a complete custom profile locally and optionally share it with other CloudCord users.

- Username, display name, avatar, banner, bio and pronouns
- Profile gradients, badges, Nitro and boost-duration previews
- Account and signup dates
- Built-in decorations, Discord catalog discovery and custom asset IDs
- Automatic full-editor profile saving and CloudCord desktop/mobile sharing by Discord user ID
- No hidden marker or symbol is added to the real Discord About Me
- Local persistence that automatically reapplies at startup

</td>
</tr>
</table>

## Built-in tabs

CloudCord keeps its main features directly inside the client settings. Each tab has a dedicated purpose and visual identity.

| Icon | Tab | What it does |
| :---: | --- | --- |
| <img src="assets/cloudcord-favicon.png" width="28" height="28" alt="General" /> | **General** | Core CloudCord controls, client options and runtime controls |
| <img src="assets/readme/tabs/botcord.svg" width="28" height="28" alt="BotCord" /> | **BotCord** | Bot accounts, DMs, servers, channels, members, messaging and media |
| <img src="ios/assets/fakeprofile-icon.png" width="28" height="28" alt="Fake Profile" /> | **Fake Profile** | Complete local and opt-in shared profiles, badges, media and decorations |
| <img src="assets/readme/tabs/cloud-sync.svg" width="28" height="28" alt="Cloud Sync" /> | **Cloud Sync** | Sync supported CloudCord settings and backups |
| <img src="assets/readme/tabs/plugins.svg" width="28" height="28" alt="Plugins" /> | **Plugins** | Enable or disable all plugins, configure them, and add trusted outside plugins from repository links |
| <img src="assets/readme/tabs/plugin-browser.svg" width="28" height="28" alt="Plugin Browser" /> | **Plugin Browser** | Browse and manage available plugins |
| <img src="assets/readme/tabs/themes.svg" width="28" height="28" alt="Themes" /> | **Themes** | Install and manage client themes |
| <img src="assets/readme/tabs/fonts.svg" width="28" height="28" alt="Fonts" /> | **Fonts** | Customize client typography |
| <img src="assets/readme/tabs/developer.svg" width="28" height="28" alt="Developer" /> | **Developer** | Loader controls, diagnostics and development options |

## Why CloudCord

### Local-first configuration

CloudCord keeps feature configuration on-device where possible. BotCord tokens always remain local. When Fake Profile is enabled, editor changes save locally and publish automatically so CloudCord desktop and mobile clients can discover them by public Discord user ID. CloudCord does not put hidden symbols in the real About Me. The public service stores only the Discord user ID and visible editor fields; it never receives Discord credentials, email addresses or phone numbers. Unmodified Discord clients cannot render CloudCord-only profile fields.

### Familiar interface

CloudCord integrates with the client rather than building a separate app around it. Settings, themes, typography and navigation are designed to follow the host client closely.

### Fast runtime updates

The CloudCord runtime can refresh independently of a full native rebuild. On Windows, `cloudcord.exe` also checks the official desktop release and replaces itself automatically when a newer installer is published.

### Plugin ecosystem

CloudCord includes plugin management and a plugin browser, alongside the broader desktop plugin codebase included in this repository.

## Platform layout

```text
cloudcord/
|-- ios/                 iOS assets, runtime and native loader
|-- android/             Android manager and packaged assets
|-- desktop/             Desktop client codebase and profile service
|-- dist/                Generated shared runtime
|-- assets/              CloudCord logos and visual assets
`-- .github/workflows/   Runtime and platform build automation
```

## Safety and privacy

CloudCord is built with a safety-minded, transparent approach: local settings where practical, source-visible client code, explicit account controls and no requirement to expose BotCord tokens in the UI after setup. As with any modified client, users should review the source, understand Discord's rules, and only install builds they trust.

## Development

The mobile runtime is generated by the CloudCord workflow and published to `dist/cc.js`. Source changes for mobile features live under `ios/runtime/src`, while native loader code lives under `ios/native-ios`. Android consumes the shared runtime through the CloudCord manager path.

## Visual identity

<div align="center">
  <img src="assets/cloudcord-logo.png" alt="CloudCord logo" width="160" />
  <br />
  <sub>CloudCord</sub>
</div>

