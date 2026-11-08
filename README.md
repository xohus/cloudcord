<div align="center">

<img src="https://raw.githubusercontent.com/cloudcord-mod/release-hub/main/assets/cloudcord-logo.png" width="300" alt="CloudCord logo">

# CloudCord

**Your Discord, your way.**

Customize your profile, make Discord look the way you want, and add tools to the client you already use.

[**Download**](https://getcloudcord.com/#download) · [**Releases**](https://github.com/cloudcord-mod/release-hub/releases) · [**Status**](https://getcloudcord.com/status) · [**Report a bug**](https://github.com/cloudcord-mod/release-hub/issues)

Windows · macOS · Android · iOS / iPadOS · Browser

</div>

---

## What you get

- **Fake Profile** lets you customize your name, avatar, banner, bio, badges, and profile effects. Keep your changes on your device or publish a profile that other compatible CloudCord clients can display. Nitro and badge previews are cosmetic.
- **Add-ons** brings plugins, themes, fonts, and interface tweaks into Discord settings. On desktop, you can also use compatible BetterDiscord themes.
- **CX** is CloudCord’s `.cx` format for permission-reviewed plugins and themes. Supported CX add-ons can run on desktop and mobile, including themes with chat backgrounds. The catalog is still growing. [CX catalog](https://github.com/cloudcord-mod/release-hub/tree/main/examples/cx/catalog)
- **BotCord** gives desktop users a separate interface for Discord bot accounts they manage.
- **CloudSync** backs up and syncs supported CloudCord settings through StoreCloud.

<div align="center">
  <img src="https://raw.githubusercontent.com/cloudcord-mod/release-hub/main/assets/readme/desktop/plugins.webp" width="48%" alt="CloudCord plugin browser">
  <img src="https://raw.githubusercontent.com/cloudcord-mod/release-hub/main/assets/readme/desktop/themes.webp" width="48%" alt="CloudCord desktop theme store">
</div>

## Install

| Platform | Get CloudCord | Setup |
| --- | --- | --- |
| **Windows** | [Installer](https://getcloudcord.com/download/windows) | Open the installer, choose Discord Stable, PTB, or Canary, and install CloudCord. The installer can also repair or uninstall it. |
| **macOS** | [Apple Silicon](https://getcloudcord.com/download/mac/arm64) · [Intel](https://getcloudcord.com/download/mac/x64) | Check **About This Mac** for your chip or processor, then choose the matching preview DMG. |
| **Android** | [CloudCord Manager](https://getcloudcord.com/download/android) | Install and open Manager, then follow its prompts to patch and install Discord. |
| **iOS / iPadOS** | [IPA](https://getcloudcord.com/download/ios) | Sign and sideload the IPA with a compatible tool. |
| **Browser** | [Chrome / Brave](https://getcloudcord.com/download/browser/chrome) · [Firefox](https://getcloudcord.com/download/browser/firefox) · [Userscript](https://getcloudcord.com/download/browser/userscript) | Follow the browser instructions on the download page. |

After installing, open **Discord Settings → CloudCord**. Start with **Profile** to change how your profile looks or **Add-ons** to browse extensions.

Features and build availability vary by platform. If something breaks, include your platform, Discord version, CloudCord build, and the exact error or steps to reproduce it. [Status page](https://getcloudcord.com/status) · [GitHub issues](https://github.com/cloudcord-mod/release-hub/issues)

## Source and builds

| Repository | What lives there |
| --- | --- |
| [Release Hub](https://github.com/cloudcord-mod/release-hub) | Official downloads, release workflows, and shared build inputs |
| [Desktop](https://github.com/cloudcord-mod/desktop) | Windows installer, desktop client, browser extensions, and userscript |
| [macOS](https://github.com/cloudcord-mod/macos) | Apple Silicon and Intel DMG packaging |
| [Android](https://github.com/cloudcord-mod/android) | CloudCord Manager, patcher, and Android loader integration |
| [iOS](https://github.com/cloudcord-mod/ios) | Native iOS and iPadOS loader and shared mobile runtime |

## Contributing

Make platform changes in the corresponding repository. To integrate a reviewed change into an official release, create a branch in Release Hub, import the reviewed platform directory, and open a pull request. The following commands import Android from its platform repository.

```sh
git fetch https://github.com/cloudcord-mod/android.git main
git restore --source=FETCH_HEAD --staged --worktree -- android
git diff --cached --stat
```

For shared runtime and build information, see the [workflow directory](.github/workflows). [Project and citation guide](ENTITY.md)

## Credits

**CloudCord is maintained by [Xohus](https://xohus.lol/)**, with contributions from the people who build, test, translate, and support it.

- **Desktop foundations and plugins** come from [Sincord](https://github.com/sincord/sincord), [Vencord](https://github.com/Vendicated/Vencord), [Equicord](https://github.com/Equicord/Equicord), and [Endcord](https://github.com/Endcord/Endcord) and their contributors. Sincord contributors also helped lay the groundwork for Fake Profile. [Desktop credits](https://github.com/cloudcord-mod/release-hub/blob/main/desktop/client/CREDITS.md)
- **Mobile runtime and loaders** build on Vendetta, Bunny, [Kettu](https://codeberg.org/cocobo1/Kettu), and [RainTweak](https://codeberg.org/raincord/RainTweak). The Android Manager builds on work from Aliucord, Vendetta, and Raincord Manager, with [KettuXposed](https://github.com/C0C0B01/KettuXposed) used in the Android build. [Mobile credits](https://github.com/cloudcord-mod/release-hub/blob/main/ios/docs/CREDITS.md) · [RainTweak notice](https://github.com/cloudcord-mod/release-hub/blob/main/ios/native-ios/RAIN-NOTICE.md)
- **Community add-ons** credit their original plugin and theme authors. Thanks to [BetterDiscord](https://github.com/BetterDiscord/BetterDiscord) and its community for add-ons, theme compatibility, and inspiration for the add-on cards and theme store. [CX author notices](https://github.com/cloudcord-mod/release-hub/tree/main/examples/cx/catalog)
- **README layout** takes inspiration from [Foldcord](https://github.com/ffolded/Foldcord) by folded and Xohus.

## License

CloudCord’s original branding, artwork, and other covered original work are governed by the [CloudCord license](https://github.com/cloudcord-mod/release-hub/blob/main/license). Upstream-derived components retain their applicable licenses. See the [desktop GPL license](https://github.com/cloudcord-mod/release-hub/blob/main/desktop/client/LICENSE), [Android OSL license](https://github.com/cloudcord-mod/release-hub/blob/main/android/LICENSE), [Rain loader OSL license](https://github.com/cloudcord-mod/release-hub/blob/main/ios/native-ios/RAIN-LICENSE), and [mobile runtime BSD license](https://github.com/cloudcord-mod/release-hub/blob/main/ios/runtime/LICENSE).

<div align="center">
  <sub>An independent community project for Discord.</sub>
</div>
