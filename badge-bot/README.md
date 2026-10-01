# cloudcord badge bot

Fill the private file `%LOCALAPPDATA%/CloudCord/badge-bot.json` with `BOT_TOKEN`,
`CLIENT_ID`, and `GUILD_ID`. The shared service key is already configured locally.
Never upload this file or a bot token to GitHub.

Run `npm install`, then `npm start` in this folder. Invite the bot with `bot`
and `applications.commands` scopes; administrator permission is not required.
Only the configured guild's actual owner can run any badge command, including
list. Guild admins and co-owners do not inherit access. Ownership is checked
fresh for every command using Discord's guild `owner_id`.

- `/badge add userid name png`
- `/badge edit userid badgeid name png` (name or PNG may be changed)
- `/badge remove userid badgeid`
- `/badge list userid`

PNGs: at most 512 KB, 512 × 512 pixels. Up to ten custom badges per user.
These are CloudCord display badges, not official Discord badges. Editing a
custom badge does not alter Discord-owned badges. Clients need the updated
CloudCordCustomBadges plugin; reopen the profile after changes (up to 30 seconds).

The popup blocker is a separate plugin: enable CloudCordPopupBlocker and choose
categories or exact titles in its settings. All categories start off. Only
dismissible dialogs are closed; banners, toasts, and protected dialogs remain.
