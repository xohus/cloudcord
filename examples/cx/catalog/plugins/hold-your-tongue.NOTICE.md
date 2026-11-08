# HoldYourTongue

This CX port adapts Kaan’s GPL-3.0 BetterDiscord plugin. Change the case-insensitive phrases in the CX source and optionally add a prompt. The message stays in Discord’s normal composer flow, including its own warnings. [Pinned original](https://github.com/zrodevkaan/BDPlugins/blob/8419ffe6f4e180fe9a755cd3bf82c5649c173b99/Plugins/HoldYourTongue/HoldYourTongue.plugin.js) · [Upstream license](https://github.com/zrodevkaan/BDPlugins/blob/8419ffe6f4e180fe9a755cd3bf82c5649c173b99/LICENSE)

```cx
  before send confirm-keywords ["example phrase","another phrase"] with "Your message contains {words}."
```
