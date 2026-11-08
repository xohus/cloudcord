// CloudCord appearance tweaks. CX sources select a target and never supply
// a CSS selector or a Discord component name.
export const cxAppearanceTargets = {
    "bot-tags": {
        plugin: "HideBotTags", label: "APP and BOT tags",
        css: '[class*="botTag"] { display: none !important; }',
        mobile: ["BotTag"],
    },
    "role-icons": {
        plugin: "HideRoleIcons", label: "role icons",
        css: 'img[class*="roleIcon"] { display: none !important; }',
        mobile: ["RoleIcon"],
    },
    "server-tags": {
        plugin: "HideClanTags", label: "server tags",
        css: '[class*="clanTag"], [class*="chipletContainer"] { display: none !important; }',
        mobile: ["GuildTag"],
    },
    "typing-indicator": {
        plugin: "HideTypingIndicator", label: "the typing indicator",
        css: '[class*="typing_"][class*="base"], [class*="typingDots"] { display: none !important; }',
        mobile: ["TypingIndicator", "TypingIndicatorInner"],
    },
    "jump-to-present": {
        plugin: "HideJumpToPresent", label: "the jump-to-present bar",
        css: '[class*="jumpToPresentBar"] { display: none !important; }',
        mobile: ["JumpToPresentButton"],
    },
    "message-reactions": {
        plugin: "HideReactions", label: "message reactions",
        css: '[class*="reactions_"] { display: none !important; }',
        mobile: ["MessageReactions", "MessageReactionsContent"],
    },
    "profile-effects": {
        plugin: "HideProfileEffects", label: "profile effects",
        css: '[class*="profileEffects"] { display: none !important; }',
        mobile: ["ProfileEffect", "WrappedProfileEffect"],
    },
    "new-messages-bar": {
        plugin: "HideNewMessagesBar", label: "the new messages bar",
        css: '[class*="newMessagesBar"] { display: none !important; }',
        mobile: ["NewMessagesChatBar"],
    },
    "voice-stream-previews": {
        plugin: "HideStreamPreviews", label: "voice-channel stream previews",
        css: '[class*="streamPreview"] { display: none !important; }',
        mobile: ["VoicePanelStreamPreview"],
    },
    "voice-user-avatars": {
        plugin: "HideVoiceUserAvatars", label: "avatars next to users in voice channels",
        css: '[class*="voiceUser"] [class*="avatar"] { display: none !important; }',
        mobile: {
            renderTree: "modules/guild_sidebar/native/VoiceUserItem.tsx",
            hideComponents: ["Avatar"],
        },
    },
    "nameplates": {
        plugin: "HideNameplates", label: "nameplates",
        css: '[class*="nameplate"] { display: none !important; }',
        mobile: ["Nameplate"],
    },
    "avatar-decorations": {
        plugin: "HideAvatarDecorations", label: "avatar decorations",
        css: '[class*="avatarDecoration"] { display: none !important; }',
        mobile: ["CutoutableAvatarDecoration"],
    },
    "server-banner": {
        plugin: "HideServerBanner", label: "the channel list server banner",
        css: '[class*="animatedContainer"][class*="bannerImage"], [class*="bannerImage"] { display: none !important; }',
        mobile: ["ReanimatedGuildBanner"],
    },
    "server-boost-progress": {
        plugin: "HideBoostGoal", label: "the server boost progress bar",
        css: '[class*="boostProgressBar"], [class*="progressBar"][class*="guild"] { display: none !important; }',
        mobile: { hideComponentPaths: ["modules/guild_boosting/native/marketing_redesign/GuildBoostingMarketingProgressBar.tsx"] },
    },
    "server-boost-gem": {
        plugin: "HideGuildBoostTag", label: "the server boost gem",
        css: '[class*="premiumGuildIcon"], [aria-label*="Server Boost"] svg { display: none !important; }',
        mobile: { hideComponentPaths: ["modules/premium/powerups/native/GuildPowerupsBoostGem.tsx"] },
    },
    "chat-gift-button": {
        plugin: "HideGiftButton", label: "the chat gift button",
        css: 'button[aria-label="Send a gift"] { display: none !important; }',
        mobile: ["PremiumAnimatedGiftButton"],
    },
    "chat-emoji-button": {
        plugin: "HideEmojiButton", label: "the composer expression picker shortcut",
        css: 'button[aria-label="Select emoji"] { display: none !important; }',
        mobile: { hideComponentPaths: ["modules/chat_input/native/accessories/ChatInputExpressionButton.tsx"] },
    },
    "chat-gif-picker": {
        plugin: "HideGifButton", label: "the GIF picker shortcut",
        css: 'button[aria-label="Open GIF picker"] { display: none !important; }',
        mobile: { expressionPickerTab: "gif" },
    },
    "chat-sticker-picker": {
        plugin: "HideStickerButton", label: "the sticker picker shortcut",
        css: 'button[aria-label="Open sticker picker"] { display: none !important; }',
        mobile: { expressionPickerTab: "sticker" },
    },
    "add-server-button": {
        plugin: "HideAddServerButton", label: "the add-a-server button",
        css: '[data-list-item-id="guildsnav___create-join-button"] { display: none !important; }',
        mobile: ["GuildsBarCreateJoinButton"],
    },
    "profile-badges": {
        plugin: "HideBadges", label: "profile badge rows",
        css: '[class*="badgeList"] { display: none !important; }',
        mobile: ["ProfileBadgeRows"],
    },
    "custom-status-emojis": {
        plugin: "HideStatusEmojis", label: "emojis in custom status bubbles",
        css: '[class*="customStatus"] img[class*="emoji"] { display: none !important; }',
        mobile: { customStatusEmojis: ["CustomStatusBubble", "UserProfileCustomStatusBubble"] },
    },
    "member-activities": {
        plugin: "HideMemberActivities", label: "game and music activity text in the member list",
        css: '[class*="member_"] [class*="activityText"] { display: none !important; }',
        mobile: { memberActivityText: true },
    },
    "member-custom-status": {
        plugin: "HideCustomStatuses", label: "custom statuses in the member list",
        css: '[class*="memberInner"] [class*="activity"], [class*="member_"] [class*="subText"] { display: none !important; }',
        mobile: { memberCustomStatus: true },
    },
    "reply-previews": {
        plugin: "HideReplyPreviews", label: "reply previews in chat",
        css: '[class*="repliedMessage"] { display: none !important; }',
        mobile: ["ReplyMessageContent"],
    },
    "chat-apps-button": {
        plugin: "HideAppsButton", label: "the chat apps button",
        css: 'button[aria-label="Apps"] { display: none !important; }',
        mobile: ["ChatInputActionButtonApps"],
    },
    "chat-upload-button": {
        plugin: "HideUploadButton", label: "the chat attachment button",
        css: '[class*="attachWrapper"] { display: none !important; }',
        mobile: {
            renderTree: "modules/chat_input/native/action_buttons/ChatInputActions.tsx",
            hideControlIcons: ["MediaKeyboardButtonIcon", "ImageIcon"],
            hideLongPressMenu: true,
        },
    },
    "channel-threads-button": {
        plugin: "HideThreadsButton", label: "the threads shortcut in the channel header",
        css: '[aria-label="Threads"] { display: none !important; }',
        mobile: {
            renderComponent: "ChannelActionButtons",
            hideControlIcons: ["ThreadIcon"],
        },
    },
    "chat-character-counter": {
        plugin: "HideCharacterCount", label: "the chat character counter",
        css: '[class*="characterCount"] { display: none !important; }',
        mobile: ["ChatInputCharCounter"],
    },
    "chat-send-button": {
        plugin: "HideSendButton", label: "the chat send button",
        css: 'button[aria-label="Send Message"] { display: none !important; }',
        mobile: ["ChatInputSendButton"],
    },
    "dm-call-buttons": {
        plugin: "HideCallButtons", label: "the buttons to start calls in DMs",
        css: '[aria-label="Start Voice Call"], [aria-label="Start Video Call"] { display: none !important; }',
        mobile: {
            renderTree: "modules/main_tabs_v2/native/channel/header/PrivateChannelButtons.tsx",
            hideIcons: ["PhoneCallIcon", "VideoIcon"],
            keepWhilePresent: ["PhoneHangUpIcon", "VoiceNormalIcon"],
        },
    },
    "dm-list-search": {
        plugin: "HideDmSearch", label: "the search button in the DM list",
        css: '[class*="privateChannels"] [class*="searchBar"] { display: none !important; }',
        mobile: {
            renderTree: "modules/main_tabs_v2/native/tabs/messages/MessagesHeader.tsx",
            hideLabels: ["5h0QOP"],
        },
    },
    "message-embeds": {
        plugin: "HideEmbeds", label: "link embeds in chat",
        css: 'article[class*="embed"] { display: none !important; }',
        mobile: ["EmbedCard"],
    },
    "message-edited-label": {
        plugin: "HideEditedLabel", label: "the edited label in chat",
        css: '[class*="edited_"] { display: none !important; }',
        mobile: { messagePresentation: "edited" },
    },
    "message-timestamps": {
        plugin: "HideTimestamps", label: "timestamps next to chat messages",
        css: '[class*="messageListItem"] time, [class*="timestamp_"] { display: none !important; }',
        mobile: { messagePresentation: "timestamps" },
    },
    "message-stickers": {
        plugin: "HideStickers", label: "stickers in chat",
        css: '[class*="stickerAsset"] { display: none !important; }',
        mobile: { messagePresentation: "stickers" },
    },
    "active-now": {
        plugin: "HideActiveNow", label: "the active friends panel",
        css: '[class*="nowPlayingColumn"] { display: none !important; }',
        mobile: ["MessagesItemHappeningNow"],
    },
    "channel-topic": {
        plugin: "HideChannelTopic", label: "channel topics",
        css: '[class*="topic_"][class*="expandable"], section[aria-label="Channel header"] [class*="topic_"] { display: none !important; }',
        mobile: ["ChannelDetailsTopic"],
    },
    "shop-entry": {
        plugin: "HideShopTab", label: "the Shop entry",
        css: 'a[href="/shop"], [data-list-item-id$="___shop"] { display: none !important; }',
        mobile: ["CollectiblesShopEntryButton"],
    },
    "help-entry": {
        plugin: "HideHelpButton", label: "the Help entry",
        css: 'a[href*="support.discord.com"][class*="anchor"], [aria-label="Help"] { display: none !important; }',
        mobile: { settingsEntry: "modules/user_settings/defs/native/SupportSetting.tsx" },
    },
    "nitro-entry": {
        plugin: "HideNitroTab", label: "the Nitro entry",
        css: 'a[href="/store"], [data-list-item-id$="___nitro"] { display: none !important; }',
        mobile: { settingsEntry: "modules/user_settings/defs/native/PremiumSetting.tsx" },
    },
    "quests-entry": {
        plugin: "HideQuestsTab", label: "the Quests entry",
        css: 'a[href="/quest-home"], [data-list-item-id$="___quests"] { display: none !important; }',
        mobile: { settingsEntry: "modules/user_settings/defs/native/QuestHomeSetting.tsx" },
    },
    "inbox-button": {
        plugin: "HideInboxButton", label: "the notifications entry",
        css: '[aria-label="Inbox"] { display: none !important; }',
        mobile: ["YouBarNotificationsButton"],
    },
    "notification-settings": {
        plugin: "HideNotificationBell", label: "the channel notification settings shortcut",
        css: '[aria-label="Notification Settings"] { display: none !important; }',
        mobile: ["NotificationSettingsButton"],
    },
    "pinned-messages-button": {
        plugin: "HidePinsButton", label: "the pinned messages shortcut",
        css: '[aria-label="Pinned Messages"] { display: none !important; }',
        mobile: { tableRow: { key: "rowPinnedMessages" } },
    },
    "friend-requests-badge": {
        plugin: "HideFriendRequestsBadge", label: "the pending friend requests counter",
        css: 'a[href="/channels/@me"] [class*="numberBadge"] { display: none !important; }',
        mobile: { tableRow: { subLabelFor: "fyA115" } },
    },
    "image-alt-text": {
        plugin: "HideImageAltText", label: "the image description control",
        css: '[class*="altText"] { display: none !important; }',
        mobile: ["MediaModalOverlayAltTextButton"],
    },
    "spoiler-media-label": {
        plugin: "HideSpoilerWarnings", label: "the spoiler label on images",
        css: '[class*="spoilerWarning"] { display: none !important; }',
        mobile: {
            renderTree: "modules/media_viewer/native/components/MediaModalSpoilerOverlay.tsx",
            hideText: ["F+x38C"],
        },
    },
    "spoiler-outline": {
        plugin: "ReadableSpoilers", label: "outline concealed spoilers",
        css: '[class*="spoilerContent"]:not([class*="spoilerContentHidden"]), span[class*="spoilerText"]:not([class*="hidden"]) {}'
            + '[class*="spoilerContent"], [class*="spoilerWarning"] { outline: 1px dashed rgb(1 205 254 / 70%); outline-offset: 1px; border-radius: 4px; box-shadow: 0 0 6px rgb(255 113 206 / 35%); }',
        style: { spoilerOutline: { borderWidth: 1, borderColor: "rgba(1, 205, 254, 0.7)", borderStyle: "dashed", borderRadius: 4 } },
    },
    "contrast-text": {
        plugin: "HighContrastText", label: "increase text contrast",
        css: ":root { --text-default: #ffffff; --text-normal: #ffffff; --text-muted: #c7c9d1; }",
        style: {
            semantic: { TEXT_DEFAULT: "#ffffff", TEXT_NORMAL: "#ffffff", TEXT_STRONG: "#ffffff", TEXT_MUTED: "#c7c9d1", TEXT_SUBTLE: "#c7c9d1" },
        },
    },
    "cloudcord-accent": {
        plugin: "CloudCordAccent", label: "apply the CloudCord accent",
        css: ":root { --brand-500: #7c5cff; --brand-560: #6d4ef0; --brand-600: #5b3ce6; --brand-experiment: #7c5cff; }",
        style: {
            raw: { BRAND_500: "#7c5cff", BRAND_560: "#6d4ef0", BRAND_600: "#5b3ce6" },
            semantic: { TEXT_LINK: "#7c5cff", TEXT_BRAND: "#7c5cff", ICON_BRAND: "#7c5cff", BACKGROUND_BRAND: "#7c5cff" },
        },
    },
    "amoled-background": {
        plugin: "AmoledMode", label: "use black backgrounds in dark mode",
        css: ".theme-dark, .theme-midnight { --background-primary: #000; --background-secondary: #000; --background-secondary-alt: #050505; --background-tertiary: #000; --background-base-low: #000; --background-base-lower: #000; --background-base-lowest: #000; --background-surface-high: #0a0a0a; --chat-background-default: #000; }",
        style: {
            darkOnly: true,
            semantic: {
                BACKGROUND_PRIMARY: "#000000", BACKGROUND_SECONDARY: "#000000", BACKGROUND_SECONDARY_ALT: "#050505",
                BACKGROUND_TERTIARY: "#000000", BACKGROUND_MOBILE_PRIMARY: "#000000", BACKGROUND_MOBILE_SECONDARY: "#000000",
                BACKGROUND_BASE_LOW: "#000000", BACKGROUND_BASE_LOWER: "#000000", BACKGROUND_BASE_LOWEST: "#000000",
                BACKGROUND_SURFACE_HIGH: "#0a0a0a", CHAT_BACKGROUND_DEFAULT: "#000000",
            },
        },
    },
    "code-block-size": {
        plugin: "BiggerCodeBlocks", label: "increase code block text size",
        css: 'code[class*="hljs"], [class*="codeContainer"] code { font-size: 15px !important; line-height: 1.5 !important; }',
        style: { component: "MarkupCodeBlock", key: "codeBlock", values: { fontSize: 15, lineHeight: 22.5 } },
    },
    "colorful-mentions": {
        plugin: "ColorfulMentions", label: "tint inline mentions purple",
        css: '[class*="mention"][class*="interactive"] { background: rgb(124 92 255 / 25%) !important; color: #c9bcff !important; border-radius: 6px; }',
        style: {
            semantic: { MENTION_BACKGROUND: "#7c5cff40", MENTION_FOREGROUND: "#c9bcff" },
        },
    },
    "highlight-mentions": {
        plugin: "HighlightMentions", label: "highlight messages that mention you in purple",
        css: '[class*="mentioned"] { background: rgb(124 92 255 / 18%) !important; box-shadow: inset 3px 0 0 #7c5cff; }',
        style: { mentionHighlight: "#7c5cff2e" },
    },
    "underlined-links": {
        plugin: "HighlightLinks", label: "underline message links",
        css: '[class*="messageContent"] a { text-decoration: underline !important; text-underline-offset: 2px; }',
        style: { component: "MarkupLink", key: "link", values: { textDecorationLine: "underline" } },
    },
    "floating-chat-bar": {
        plugin: "FloatingChatBar", label: "lift the chat bar above the bottom edge",
        css: 'form [class*="channelTextArea"] { margin-bottom: 8px; box-shadow: 0 4px 16px rgb(0 0 0 / 25%); }',
        style: {
            component: "FloatingChatInputContainer",
            values: { marginBottom: 8, shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
        },
    },
    "rounded-chat-bar": {
        plugin: "RoundedChatBar", label: "round the chat bar",
        css: '[class*="channelTextArea"] [class*="scrollableContainer"], form [class*="channelTextArea"] { border-radius: 24px !important; }',
        style: { component: "FloatingChatInputContainer", values: { borderRadius: 24 } },
    },
    "transparent-chat-bar": {
        plugin: "TransparentChatBar", label: "make the chat input background translucent",
        css: 'form [class*="channelTextArea"] [class*="scrollableContainer"] { background: rgb(0 0 0 / 25%) !important; backdrop-filter: blur(6px); }',
        style: {
            semantic: {
                MOBILE_CHATINPUT_BACKGROUND_DEFAULT: "#00000040",
                MOBILE_CHATINPUT_BACKGROUND_ACTIVE: "#00000040",
            },
        },
    },
    "round-server-icons": {
        plugin: "RoundServerIcons", label: "round server icons",
        css: 'nav[aria-label="Servers sidebar"] [class*="wrapper"] foreignObject { mask: none !important; border-radius: 50%; }',
        style: { component: "GuildsBarAnimatedItemWrapper", props: { circle: true }, skipWhenTrue: "preventClipping" },
    },
    "bigger-server-icons": {
        plugin: "BiggerServerIcons", label: "make server icons larger",
        css: 'nav[aria-label="Servers sidebar"] [class*="listItem"] svg[class*="svg"] { transform: scale(1.1); }',
        style: { serverIconScale: 1.1 },
    },
    "empty-server-folders": {
        plugin: "HideEmptyFolders", label: "empty expanded server folders",
        css: '[class*="folder"][class*="expanded"]:empty { display: none !important; }',
        mobile: { emptyServerFolders: true },
    },
    "scrollbars": {
        plugin: "HideScrollbars", label: "scroll indicators",
        css: '::-webkit-scrollbar { width: 0 !important; height: 0 !important; }',
        mobile: { scrollIndicators: true },
    },
    "server-unread-pills": {
        plugin: "HideUnreadPills", label: "the server sidebar unread pills",
        css: '[class*="unreadMentionsIndicator"] { display: none !important; }',
        mobile: ["GuildsBarUnreadBars"],
    },
    "mention-badges": {
        plugin: "HideMentionBadges", label: "mention count badges",
        css: '[class*="numberBadge"] { display: none !important; }',
        mobile: { mentionBadges: true },
    },
    "centered-chat": {
        plugin: "CenteredChat", label: "center the message list on wide screens",
        css: '[class*="messagesWrapper"] ol[class*="scrollerInner"] { max-width: 1100px; margin: 0 auto; }',
        style: { centeredMessageList: "modules/messages/native/Messages.tsx", width: 1100 },
    },
    "readable-line-length": {
        plugin: "ReadableLineLength", label: "limit the width of long message lines",
        css: '[class*="messageContent"] { max-width: 80ch; }',
        style: { messageWidthRenderer: "modules/messages/native/renderer/createMessageContent.tsx", width: 640 },
    },
    "wider-channel-list": {
        plugin: "WiderChannelList", label: "make the channel list wider",
        css: '[class*="sidebar_"] { width: 280px !important; }',
        style: { drawerWidthDelta: 40 },
    },
    "narrower-channel-list": {
        plugin: "NarrowChannelList", label: "make the channel list narrower",
        css: '[class*="sidebar_"] { width: 200px !important; }',
        style: { drawerWidthDelta: -40 },
    },
    "compact-member-list": {
        plugin: "CompactMemberList", label: "reduce the spacing in the server member list",
        css: '[class*="member_"] { padding-top: 0 !important; padding-bottom: 0 !important; height: 38px !important; }',
        style: { compactMemberList: true },
    },
    "muted-channel-opacity": {
        plugin: "MutedChannelsFaded", label: "fade muted channels",
        css: '[class*="modeMuted"] { opacity: .45 !important; }',
        style: { renderedComponents: ["ChannelContent", "ChannelContentComponent"], condition: "muted", values: { opacity: 0.45 } },
    },
    "inactive-channel-opacity": {
        plugin: "DimInactiveChannels", label: "dim channel names without unread messages",
        css: '[class*="containerDefault"] [class*="modeMuted"], [class*="containerDefault"]:not(:has([class*="unread"])) [class*="name_"] { opacity: .6; }',
        style: { renderedComponents: ["ChannelTitle"], condition: "inactive", values: { opacity: 0.6 } },
    },
    "reduced-motion": {
        plugin: "NoAnimations", label: "reduce interface animations and transitions",
        css: "*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }",
        style: { reducedMotion: true },
    },
    "blur-chat-media": {
        plugin: "BlurImagesUntilHover", label: "conceal chat images and videos until you reveal them",
        css: '[class*="imageWrapper"] img, [class*="imageWrapper"] video { filter: blur(18px); transition: filter .2s; } '
            + '[class*="imageWrapper"]:hover img, [class*="imageWrapper"]:hover video { filter: none; }',
        style: { blurredMedia: "all" },
    },
    "blur-nsfw-attachments": {
        plugin: "BlurNSFW", label: "conceal attachments in age-restricted channels until you reveal them",
        css: '.cc-cx-nsfw-media [class*="imageContainer"], .cc-cx-nsfw-media [class*="wrapperPaused"] { filter: blur(10px); transition: filter .2s; } '
            + '.cc-cx-nsfw-media [class*="imageContainer"]:hover, .cc-cx-nsfw-media [class*="wrapperPaused"]:hover { filter: blur(0); }',
        style: { blurredMedia: "nsfw" },
    },
} as const;

export type CxAppearanceTarget = keyof typeof cxAppearanceTargets;
type TargetOf<Kind extends "mobile" | "style"> = {
    [Key in CxAppearanceTarget]: Kind extends keyof typeof cxAppearanceTargets[Key] ? Key : never;
}[CxAppearanceTarget];
export type CxHideTarget = TargetOf<"mobile">;
export type CxStyleTarget = TargetOf<"style">;
