/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Generates the CloudCord tweak plugins in src/cloudcordplugins/<Name>/index.ts
 * from the list below. Run: node scripts/generateTweaks.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const hide = sel => `${sel} { display: none !important; }`;

// [Name, description, css, tags?]
const TWEAKS = [
    // Clutter
    ["HideNitroTab", "Hides the Nitro tab in the DM list", hide(`a[href="/store"], [data-list-item-id$="___nitro"]`), ["Utility"]],
    ["HideShopTab", "Hides the Shop tab in the DM list", hide(`a[href="/shop"], [data-list-item-id$="___shop"]`), ["Utility"]],
    ["HideQuestsTab", "Hides the Quests tab in the DM list", hide(`a[href="/quest-home"], [data-list-item-id$="___quests"]`), ["Utility"]],
    ["HideGiftButton", "Hides the gift button in the chat bar", hide(`button[aria-label="Send a gift"]`), ["Chat"]],
    ["HideGifButton", "Hides the GIF button in the chat bar", hide(`button[aria-label="Open GIF picker"]`), ["Chat"]],
    ["HideStickerButton", "Hides the sticker button in the chat bar", hide(`button[aria-label="Open sticker picker"]`), ["Chat"]],
    ["HideEmojiButton", "Hides the emoji button in the chat bar", hide(`button[aria-label="Select emoji"]`), ["Chat"]],
    ["HideAppsButton", "Hides the apps button in the chat bar", hide(`button[aria-label="Apps"]`), ["Chat"]],
    ["HideUploadButton", "Hides the upload button in the chat bar", hide(`[class*="attachWrapper"]`), ["Chat"]],
    ["HideActiveNow", "Hides the Active Now column on the Friends page", hide(`[class*="nowPlayingColumn"]`)],
    ["HideHelpButton", "Hides the help button in the top bar", hide(`a[href*="support.discord.com"][class*="anchor"], [aria-label="Help"]`)],
    ["HideInboxButton", "Hides the inbox button in the top bar", hide(`[aria-label="Inbox"]`)],
    ["HideDiscoverButton", "Hides the Discover button in the server list", hide(`[data-list-item-id="guildsnav___guild-discover-button"]`)],
    ["HideAddServerButton", "Hides the add-a-server button in the server list", hide(`[data-list-item-id="guildsnav___create-join-button"]`)],
    ["HideDownloadAppsButton", "Hides the download-apps button in the server list", hide(`[data-list-item-id="guildsnav___app-download-button"]`)],
    ["HideCallButtons", "Hides the voice and video call buttons in DMs", hide(`[aria-label="Start Voice Call"], [aria-label="Start Video Call"]`), ["Voice"]],
    ["HidePinsButton", "Hides the pinned messages button in the channel header", hide(`[aria-label="Pinned Messages"]`)],
    ["HideThreadsButton", "Hides the threads button in the channel header", hide(`[aria-label="Threads"]`)],
    ["HideNotificationBell", "Hides the notification settings bell in the channel header", hide(`[aria-label="Notification Settings"]`)],
    ["HideMemberListButton", "Hides the member list toggle in the channel header", hide(`[aria-label="Hide Member List"], [aria-label="Show Member List"]`)],
    ["HideDmSearch", "Hides the find-or-start-a-conversation box", hide(`[class*="privateChannels"] [class*="searchBar"]`)],
    ["HideBoostGoal", "Hides the server boost goal bar", hide(`[class*="boostProgressBar"], [class*="progressBar"][class*="guild"]`)],
    ["HideServerBanner", "Hides the banner at the top of the channel list", hide(`[class*="animatedContainer"][class*="bannerImage"], [class*="bannerImage"]`)],
    ["HideChannelTopic", "Hides channel topics in the header", hide(`[class*="topic_"][class*="expandable"], section[aria-label="Channel header"] [class*="topic_"]`)],
    ["HideUserPanelActivity", "Hides your activity line in the user panel", hide(`[class*="panels"] [class*="activityPanel"]`)],
    ["HideStreamPreviews", "Hides live stream previews in voice channels", hide(`[class*="streamPreview"]`), ["Voice"]],
    ["HideKeyboardTips", "Hides the keyboard tips under the chat bar", hide(`[class*="typingDots"] ~ [class*="tip"], [class*="channelTextAreaTips"]`), ["Chat"]],
    ["HideCharacterCount", "Hides the character counter while typing", hide(`[class*="characterCount"]`), ["Chat"]],
    ["HideSendButton", "Hides the send button in the chat bar", hide(`button[aria-label="Send Message"]`), ["Chat"]],
    ["HideNewMessagesBar", "Hides the new messages bar at the top of chat", hide(`[class*="newMessagesBar"]`), ["Chat"]],
    ["HideJumpToPresent", "Hides the jump-to-present bar", hide(`[class*="jumpToPresentBar"]`), ["Chat"]],
    ["HideTypingIndicator", "Hides the someone-is-typing line", hide(`[class*="typing_"][class*="base"], [class*="typingDots"]`), ["Chat"]],
    ["HideUnreadPills", "Hides the unread mention pills in the server list", hide(`[class*="unreadMentionsIndicator"]`)],
    ["HideMentionBadges", "Hides red mention count badges", hide(`[class*="numberBadge"]`)],
    ["HideEmptyFolders", "Hides the gap left by empty server folders", hide(`[class*="folder"][class*="expanded"]:empty`)],

    // Chat content
    ["HideClanTags", "Hides server tags next to names", hide(`[class*="clanTag"], [class*="chipletContainer"]`), ["Chat"]],
    ["HideAvatarDecorations", "Hides avatar decorations", hide(`[class*="avatarDecoration"]`)],
    ["HideProfileEffects", "Hides profile effects", hide(`[class*="profileEffects"]`)],
    ["HideNameplates", "Hides nameplates in the member and DM lists", hide(`[class*="nameplate"]`)],
    ["HideRoleIcons", "Hides role icons next to names", hide(`img[class*="roleIcon"]`), ["Chat"]],
    ["HideBotTags", "Hides APP and BOT tags", hide(`[class*="botTag"]`), ["Chat"]],
    ["HideReactions", "Hides message reactions", hide(`[class*="reactions_"]`), ["Chat"]],
    ["HideEmbeds", "Hides link embeds in chat", hide(`article[class*="embed"]`), ["Chat"]],
    ["HideStickers", "Hides stickers in chat", hide(`[class*="stickerAsset"]`), ["Chat"]],
    ["HideSystemMessages", "Hides join, boost and pin messages", hide(`[class*="systemMessage"]`), ["Chat"]],
    ["HideEditedLabel", "Hides the (edited) label", hide(`[class*="edited_"]`), ["Chat"]],
    ["HideReplyPreviews", "Hides the line showing which message a reply is to", hide(`[class*="repliedMessage"]`), ["Chat"]],
    ["HideTimestamps", "Hides message timestamps", hide(`[class*="messageListItem"] time, [class*="timestamp_"]`), ["Chat"]],
    ["HideBadges", "Hides profile badges", hide(`[class*="badgeList"]`)],
    ["HideStatusEmojis", "Hides emojis in custom statuses", hide(`[class*="customStatus"] img[class*="emoji"]`)],
    ["HideCustomStatuses", "Hides custom status text in member lists", hide(`[class*="memberInner"] [class*="activity"], [class*="member_"] [class*="subText"]`)],
    ["HideMemberActivities", "Hides game and music activities in the member list", hide(`[class*="member_"] [class*="activityText"]`)],
    ["HideVoiceUserAvatars", "Hides avatars of people in voice channels", hide(`[class*="voiceUser"] [class*="avatar"]`), ["Voice"]],
    ["HideImageAltText", "Hides alt text shown under images", hide(`[class*="altText"]`), ["Chat"]],
    ["HideSpoilerWarnings", "Hides the spoiler label on spoilered images", hide(`[class*="spoilerWarning"]`), ["Chat"]],

    // Layout
    ["FocusMode", "Hides the member list for a wider chat", hide(`[class*="membersWrap"]`), ["Chat"]],
    ["CenteredChat", "Keeps chat in a centered, readable column", `[class*="messagesWrapper"] ol[class*="scrollerInner"] { max-width: 1100px; margin: 0 auto; }`, ["Chat"]],
    ["CompactServerList", "Makes the server list narrower", `nav[aria-label="Servers sidebar"] { width: 60px !important; } nav[aria-label="Servers sidebar"] [class*="listItem"] { margin-bottom: 4px; }`],
    ["WiderChannelList", "Makes the channel list wider", `[class*="sidebar_"] { width: 280px !important; }`],
    ["NarrowChannelList", "Makes the channel list narrower", `[class*="sidebar_"] { width: 200px !important; }`],
    ["BiggerServerIcons", "Makes server icons larger", `nav[aria-label="Servers sidebar"] [class*="listItem"] svg[class*="svg"] { transform: scale(1.1); }`],
    ["BiggerAvatarsInChat", "Makes avatars in chat larger", `[class*="messageListItem"] img[class*="avatar"] { width: 48px !important; height: 48px !important; }`, ["Chat"]],
    ["SmallerAvatarsInChat", "Makes avatars in chat smaller", `[class*="messageListItem"] img[class*="avatar"] { width: 32px !important; height: 32px !important; }`, ["Chat"]],
    ["RoundedChatBar", "Rounds the chat bar into a pill", `[class*="channelTextArea"] [class*="scrollableContainer"], form [class*="channelTextArea"] { border-radius: 24px !important; }`, ["Chat"]],
    ["SquareAvatars", "Shows avatars as rounded squares", `img[class*="avatar"], [class*="avatar"] foreignObject { border-radius: 22% !important; mask: none !important; }`],
    ["RoundServerIcons", "Keeps server icons fully round", `nav[aria-label="Servers sidebar"] [class*="wrapper"] foreignObject { mask: none !important; border-radius: 50%; }`],
    ["FloatingChatBar", "Lifts the chat bar off the bottom edge", `form [class*="channelTextArea"] { margin-bottom: 8px; box-shadow: 0 4px 16px rgb(0 0 0 / 25%); }`, ["Chat"]],
    ["CompactMessages", "Tighter spacing between messages", `[class*="messageListItem"] [class*="cozy"] { padding-top: 1px !important; padding-bottom: 1px !important; } [class*="groupStart"] { margin-top: 8px !important; }`, ["Chat"]],
    ["SpaciousMessages", "More breathing room between messages", `[class*="groupStart"] { margin-top: 22px !important; }`, ["Chat"]],
    ["StickyDateDividers", "Keeps the current day label at the top while scrolling", `[class*="divider"][class*="hasContent"] { position: sticky; top: 0; z-index: 2; background: var(--background-base-lower, var(--background-primary)); }`, ["Chat"]],

    // Text
    ["LargerChatText", "Makes chat text larger", `[class*="messageContent"] { font-size: 17px !important; line-height: 1.45 !important; }`, ["Chat"]],
    ["SmallerChatText", "Makes chat text smaller", `[class*="messageContent"] { font-size: 14px !important; }`, ["Chat"]],
    ["BiggerJumboEmojis", "Makes emoji-only messages bigger", `img[class*="emoji"][class*="jumboable"] { width: 64px !important; height: 64px !important; }`, ["Chat"]],
    ["BiggerCodeBlocks", "Larger, easier to read code blocks", `code[class*="hljs"], [class*="codeContainer"] code { font-size: 15px !important; line-height: 1.5 !important; }`, ["Chat"]],
    ["HighlightLinks", "Underlines links in chat so they stand out", `[class*="messageContent"] a { text-decoration: underline !important; text-underline-offset: 2px; }`, ["Chat"]],
    ["BoldUsernames", "Makes usernames in chat bolder", `[class*="username_"] { font-weight: 700 !important; }`, ["Chat"]],
    ["ReadableLineLength", "Wraps long messages at a comfortable width", `[class*="messageContent"] { max-width: 80ch; }`, ["Chat"]],
    ["MonospaceChat", "Shows chat text in a monospace font", `[class*="messageContent"] { font-family: var(--font-code) !important; }`, ["Chat"]],
    ["HighContrastText", "Brighter text for readability", `:root { --text-default: #ffffff; --text-normal: #ffffff; --text-muted: #c7c9d1; }`],

    // Colours and effects
    ["AmoledMode", "Pure black backgrounds for OLED screens", `.theme-dark, .theme-midnight { --background-primary: #000; --background-secondary: #000; --background-secondary-alt: #050505; --background-tertiary: #000; --background-base-low: #000; --background-base-lower: #000; --background-base-lowest: #000; --background-surface-high: #0a0a0a; --chat-background-default: #000; }`],
    ["CloudCordAccent", "Uses the CloudCord accent colour across Discord", `:root { --brand-500: #7c5cff; --brand-560: #6d4ef0; --brand-600: #5b3ce6; --brand-experiment: #7c5cff; }`],
    ["NoAnimations", "Turns off Discord's animations and transitions", `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`],
    ["SmoothScrolling", "Smooth scrolling everywhere", `* { scroll-behavior: smooth; }`],
    ["ThinScrollbars", "Thinner scrollbars", `::-webkit-scrollbar { width: 6px !important; height: 6px !important; } ::-webkit-scrollbar-thumb { border-radius: 6px !important; }`],
    ["HideScrollbars", "Hides scrollbars but keeps scrolling", `::-webkit-scrollbar { width: 0 !important; height: 0 !important; }`],
    ["NoShadows", "Removes drop shadows for a flatter look", `* { box-shadow: none !important; }`],
    ["SoftCorners", "Rounder corners on cards, popouts and modals", `[class*="popout"], [class*="card_"], [class*="modal"], [class*="menu_"] { border-radius: 14px !important; }`],
    ["GrayscaleImages", "Shows images in grayscale until hovered", `[class*="imageWrapper"] img { filter: grayscale(1); transition: filter .2s; } [class*="imageWrapper"]:hover img { filter: none; }`, ["Media"]],
    ["BlurImagesUntilHover", "Blurs images in chat until you hover them", `[class*="imageWrapper"] img, [class*="imageWrapper"] video { filter: blur(18px); transition: filter .2s; } [class*="imageWrapper"]:hover img, [class*="imageWrapper"]:hover video { filter: none; }`, ["Media"]],
    ["DimInactiveChannels", "Fades out channels with no unread messages", `[class*="containerDefault"] [class*="modeMuted"], [class*="containerDefault"]:not(:has([class*="unread"])) [class*="name_"] { opacity: .6; }`],
    ["HighlightMentions", "Makes messages that mention you stand out more", `[class*="mentioned"] { background: rgb(124 92 255 / 18%) !important; box-shadow: inset 3px 0 0 #7c5cff; }`, ["Chat"]],
    ["HoverHighlightMessages", "Highlights the message under your cursor", `[class*="messageListItem"]:hover { background: rgb(255 255 255 / 4%); }`, ["Chat"]],
    ["ColorfulMentions", "Gives @mentions a CloudCord purple pill", `[class*="mention"][class*="interactive"] { background: rgb(124 92 255 / 25%) !important; color: #c9bcff !important; border-radius: 6px; }`, ["Chat"]],
    ["TransparentChatBar", "See-through chat bar", `form [class*="channelTextArea"] [class*="scrollableContainer"] { background: rgb(0 0 0 / 25%) !important; backdrop-filter: blur(6px); }`, ["Chat"]],
    ["HideGuildBoostTag", "Hides the boost gem next to server names", hide(`[class*="premiumGuildIcon"], [aria-label*="Server Boost"] svg`)],
    ["HideVoicePanelTips", "Hides tips in the voice connection panel", hide(`[class*="rtcConnectionStatus"] [class*="tip"]`), ["Voice"]],
    ["HideFriendRequestsBadge", "Hides the pending friend requests counter", hide(`a[href="/channels/@me"] [class*="numberBadge"]`)],
    ["MutedChannelsFaded", "Fades out muted channels in the channel list", `[class*="modeMuted"] { opacity: .45 !important; }`],
    ["CompactMemberList", "Tighter spacing in the member list", `[class*="member_"] { padding-top: 0 !important; padding-bottom: 0 !important; height: 38px !important; }`],
    ["RoundedImages", "Rounder corners on images and videos in chat", `[class*="imageWrapper"], [class*="imageWrapper"] img, [class*="wrapperPlaying"] { border-radius: 12px !important; }`, ["Media"]],
];

const root = join(import.meta.dirname, "..", "src", "cloudcordplugins");
for (const [name, description, css, tags] of TWEAKS) {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.ts"), `/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Generated by scripts/generateTweaks.mjs; edit the list there.
 */

import { defineTweak } from "@utils/cloudcordTweak";

export default defineTweak(${JSON.stringify(name)}, ${JSON.stringify(description)}, ${JSON.stringify(css)}${tags ? ", " + JSON.stringify(tags) : ""});
`);
}
console.log(`wrote ${TWEAKS.length} tweaks`);
