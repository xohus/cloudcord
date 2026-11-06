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
} as const;

export type CxAppearanceTarget = keyof typeof cxAppearanceTargets;
