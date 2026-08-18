# [<img src="./browser/icon.png" width="40" align="left" alt="CloudCord">](https://github.com/xohus/cloudcord) CloudCord

CloudCord is a fork of [Vencord](https://github.com/Vendicated/Vencord), with over 300+ plugins.


### Included Plugins

Our included plugins can be found [here](https://sincord.org/plugins).

## Installing / Uninstalling

Windows

- [-](https://github.com/xohus/cloudcord/releases/download/v1.14.13.1/CloudCord Setup-windows-amd64.exe)

MacOS

- [-](https://github.com/xohus/cloudcord/releases/download/v1.14.13.1/CloudCordSetup-darwin-arm64)

Linux

- [-](https://github.com/xohus/cloudcord/releases/download/v1.14.13.1/CloudCordSetup-linux-amd64)


```shell
sh -c "$(curl -sS https://raw.githubusercontent.com/xohus/cloudcord/refs/heads/main/misc/install.sh)"
```

## Installing CloudCord Devbuild

### Dependencies

[Git](https://git-scm.com/download) and [Node.JS LTS](https://nodejs.dev/en/) are required.

Install `pnpm`:

> :exclamation: This next command may need to be run as admin/root depending on your system, and you may need to close and reopen your terminal for pnpm to be in your PATH.

```shell
npm i -g pnpm
```

> :exclamation: **IMPORTANT** Make sure you aren't using an admin/root terminal from here onwards. It **will** mess up your Discord/CloudCord instance and you **will** most likely have to reinstall.

Clone CloudCord:

```shell
git clone https://github.com/xohus/cloudcord
cd CloudCord
```

Install dependencies:

```shell
pnpm install --frozen-lockfile
```

Build CloudCord:

```shell
pnpm build
```

Inject CloudCord into your desktop client:

```shell
pnpm inject
```

Build CloudCord for web:

```shell
pnpm buildWeb
```

After building CloudCord's web extension, locate the appropriate ZIP file in the `dist` directory and follow your browser’s guide for installing custom extensions, if supported.

Note: Firefox extension zip requires Firefox for developers

## Credits

Thank you to [Vendicated](https://github.com/Vendicated) for creating [Vencord](https://github.com/Vendicated/Vencord) & [Suncord](https://github.com/verticalsync/Suncord) by [verticalsync](https://github.com/verticalsync) for helping when needed.

## Star History

<a href="https://star-history.com/#xohus/cloudcord&Timeline">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=xohus/cloudcord&type=Timeline&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=xohus/cloudcord&type=Timeline" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=xohus/cloudcord&type=Timeline" />
  </picture>
</a>

## Disclaimer

Discord is trademark of Discord Inc., and solely mentioned for the sake of descriptivity.
Mentioning it does not imply any affiliation with or endorsement by Discord Inc.
Vencord is not connected to CloudCord and as such, all donation links go to Vendicated's donation link.

<details>
<summary>Using CloudCord violates Discord's terms of service</summary>

Client modifications are against Discord’s Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods! So you should generally be fine if you don’t use plugins that implement abusive behaviour. But no worries, all inbuilt plugins are safe to use!

Regardless, if your account is essential to you and getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to CloudCord), just to be safe.

Additionally, make sure not to post screenshots with CloudCord in a server where you might get banned for it.

</details>
