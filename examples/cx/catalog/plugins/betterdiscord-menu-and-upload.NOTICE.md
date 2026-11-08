# BetterDiscord menu and upload ports

- **foreignCopyHandler** independently implements foreignSeal’s channel and category name copy action. On mobile the action appears in Discord’s channel long-press sheet. [Pinned original](https://github.com/foreignSeal/BetterDiscord-plugins/blob/0a25c44e24fa1990f31b17f154b5056b988656b4/src/foreignCopyHandler/foreignCopyHandler.plugin.js)
- **FileNameRandomization** adapts Kaan’s GPL-3.0 plugin. The catalog preset uses ten mixed-case alphanumeric characters when the uploader selects **Use anonymous filename** for the file. CX source can select case, add literal prefixes and suffixes, and use the `{random}`, `{timestamp}`, and `{original}` fields. Omit `manual` from the rule to apply it to every attachment while the plugin is enabled. [Pinned original](https://github.com/zrodevkaan/BDPlugins/blob/8419ffe6f4e180fe9a755cd3bf82c5649c173b99/Plugins/FileNameRandomization/FileNameRandomization.plugin.js) · [Upstream license](https://github.com/zrodevkaan/BDPlugins/blob/8419ffe6f4e180fe9a755cd3bf82c5649c173b99/LICENSE)

```cx
  before upload anonymise format "upload-{timestamp}-{random}" random 10 lowercase manual
```
