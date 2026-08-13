<div align="center">
  <img src="assets/logo-full.png" alt="CloudCord" width="720" />

  <h1>CloudCord</h1>
  <p><strong>A modern, privacy-minded Discord client experience for mobile and desktop.</strong></p>

  <p>
    <img alt="iOS" src="https://img.shields.io/badge/iOS-supported-111111?style=for-the-badge&logo=apple" />
    <img alt="Android" src="https://img.shields.io/badge/Android-supported-111111?style=for-the-badge&logo=android" />
    <img alt="Open Source" src="https://img.shields.io/badge/source-visible-111111?style=for-the-badge&logo=github" />
    <img alt="Local First" src="https://img.shields.io/badge/local--first-settings-111111?style=for-the-badge&logo=databricks" />
  </p>
</div>

---

## Install

<div align="center">
<table>
<tr>
<td align="center" width="50%">
  <img src="https://img.shields.io/badge/iOS%20%2F%20iPadOS-CloudCord-111111?style=for-the-badge&logo=apple" alt="iOS / iPadOS" />
  <br /><br />
  <a href="https://github.com/xohus/cloudcord/releases/download/new_beta/cloudcord0.ipa"><strong>Download CloudCord IPA</strong></a>
  <br />
  <sub><a href="https://github.com/xohus/cloudcord/releases/tag/new_beta">View iOS / iPadOS release</a></sub>
</td>
<td align="center" width="50%">
  <img src="https://img.shields.io/badge/Android-CloudCord-111111?style=for-the-badge&logo=android" alt="Android" />
  <br /><br />
  <a href="https://github.com/xohus/cloudcord/releases/download/new_beta_android/cloudcord.apk"><strong>Download CloudCord APK</strong></a>
  <br />
  <sub><a href="https://github.com/xohus/cloudcord/releases/tag/new_beta_android">View Android release</a></sub>
</td>
</tr>
</table>
</div>

> Download CloudCord only from this repository's releases. The iOS package is distributed as an `.ipa`; Android is distributed as an `.apk`.

## CloudCord at a glance

CloudCord extends Discord with a focused set of client features while keeping the experience familiar. Mobile features are integrated directly into the Discord settings and navigation surfaces, with local configuration and an automatically refreshed runtime.

<table>
<tr>
<td width="50%" valign="top">

### BotCord

A bot-account client built directly into CloudCord.

- Multiple locally saved bot accounts
- Server and channel navigation
- Direct messages and recent DM history
- Searchable server-member browser
- Live message refresh while a conversation is open
- Optimistic sending so your messages appear immediately
- Photo attachments from the native iOS picker
- Inline image attachment previews
- Account switching, bot logout and return to the main Discord account

</td>
<td width="50%" valign="top">

### Fake Profile

Preview a customized profile locally without changing your real Discord account.

- Display name and username preview
- Avatar and banner media
- Badge selection
- Nitro and boost-duration previews
- Local persistence
- Automatically reapplies at app startup when enabled

</td>
</tr>
</table>

## Built-in tabs

CloudCord keeps its main features directly inside the client settings. Each tab has a dedicated purpose and visual identity.

| Icon | Tab | What it does |
| :---: | --- | --- |
| <img src="assets/cloudcord-favicon.png" width="28" height="28" alt="General" /> | **General** | Core CloudCord controls, client options and runtime controls |
| <img src="assets/readme/tabs/botcord.svg" width="28" height="28" alt="BotCord" /> | **BotCord** | Bot accounts, DMs, servers, channels, members, messaging and media |
| <img src="ios/assets/fakeprofile-icon.png" width="28" height="28" alt="Fake Profile" /> | **Fake Profile** | Local profile customization, badges, avatar, banner and previews |
| <img src="assets/readme/tabs/cloud-sync.svg" width="28" height="28" alt="Cloud Sync" /> | **Cloud Sync** | Sync supported CloudCord settings and backups |
| <img src="assets/readme/tabs/plugins.svg" width="28" height="28" alt="Plugins" /> | **Plugins** | Enable, disable and configure installed plugins |
| <img src="assets/readme/tabs/plugin-browser.svg" width="28" height="28" alt="Plugin Browser" /> | **Plugin Browser** | Browse and manage available plugins |
| <img src="assets/readme/tabs/themes.svg" width="28" height="28" alt="Themes" /> | **Themes** | Install and manage client themes |
| <img src="assets/readme/tabs/fonts.svg" width="28" height="28" alt="Fonts" /> | **Fonts** | Customize client typography |
| <img src="assets/readme/tabs/developer.svg" width="28" height="28" alt="Developer" /> | **Developer** | Loader controls, diagnostics and development options |

## Why CloudCord

### Local-first configuration

CloudCord keeps feature configuration on-device where possible. BotCord account data and Fake Profile configuration are stored locally instead of being exposed as public profile data.

### Familiar interface

CloudCord integrates with the client rather than building a separate app around it. Settings, themes, typography and navigation are designed to follow the host client closely.

### Fast runtime updates

The CloudCord runtime can refresh independently of a full native rebuild, allowing fixes and feature updates to ship quickly while retaining native iOS and Android loaders.

### Plugin ecosystem

CloudCord includes plugin management and a plugin browser, alongside the broader desktop plugin codebase included in this repository.

## Platform layout

```text
cloudcord/
├── ios/                 iOS assets, runtime and native loader
├── android/             Android manager and packaged assets
├── desktop/             Desktop client codebase
├── dist/                Generated shared runtime
├── assets/              CloudCord logos and visual assets
└── .github/workflows/   Runtime and platform build automation
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
