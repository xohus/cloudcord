import { isCxProfileUserId } from "./cxProfileMenu";

export const cxNativeEffects = {
    "silent-typing": { permission: "typing.suppress", label: "Stop sending your typing indicator" },
    "static-typing-dots": { permission: "appearance.style", label: "Keep Discord's typing dots still" },
    "code-block-gap": { permission: "appearance.style", label: "Remove the extra blank line after fenced code blocks" },
    "force-owner-crown": { permission: "appearance.style", label: "Show the server owner’s native crown in the member list" },
    "spotify-song-name": { permission: "appearance.style", label: "Show the song title in Spotify activity status" },
    "sort-reactions-by-count": { permission: "appearance.style", label: "Show the most-used reactions first under each message" },
    "plus-reactions": { permission: "messages.reactshortcut", label: "React to the matching previous message when you send a plus shortcut" },
    "fix-file-extensions": { permission: "uploads.rename", label: "Use supported filename extensions for listed attachment formats" },
    "pending-friend-count": { permission: "appearance.hide", label: "Hide the pending friend request count" },
    "hide-role-headers": { permission: "appearance.hide", label: "Hide role section headers in the server member list" },
    "animated-assets": { permission: "appearance.style", label: "Animate avatars, banners, and server icons" },
    "floor-relative-time": { permission: "appearance.style", label: "Round relative timestamps down" },
    "avatar-resolution": { permission: "appearance.avatarresolution", label: "Request higher-resolution Discord avatars" },
    "stop-auto-unread": { permission: "notifications.preventautoupgrade", label: "Keep your chosen channel notification settings" },
    "flat-attachments": { permission: "appearance.style", label: "Show chat attachments individually without the media grid" },
    "split-long-messages": { permission: "messages.split", label: "Split long drafts into at most eight messages when slowmode is off" },
    "unicode-emoji-autocomplete": { permission: "appearance.hide", label: "Show only standard Unicode emoji in chat autocomplete" },
    "local-emoji-autocomplete": { permission: "appearance.hide", label: "Show Unicode emoji and emoji from the current server in chat autocomplete" },
    "hide-disabled-emojis": { permission: "appearance.hide", label: "Hide unavailable emoji in Discord’s emoji picker" },
    "copy-emoji-markdown": { permission: "emoji.clipboard", label: "Add a Copy Emoji Markdown action to the emoji menu" },
    "reverse-image-search": { permission: "media.search", label: "Add a Search Image action with a choice of search engines" },
    "copy-media-link": { permission: "media.clipboard", label: "Add a clipboard action to media and link menus" },
    "open-steam-links": { permission: "links.steam", label: "Send clicked Steam links to the Steam app" },
    "profile-media": { permission: "profilemenu.media", label: "Add View and Download actions for Discord avatars and banners" },
    "copy-channel-name": { permission: "channels.clipboard", label: "Add Copy Channel Name and Copy Category Name actions" },
    "hide-suggested-channels": { permission: "appearance.hide", label: "Hide the suggested channels section" },
    "copy-text-attachment": { permission: "attachments.clipboard", label: "Copy the contents of the selected text attachment" },
    "attachment-image-quality": { permission: "media.imagequality", label: "Improve attachment previews and load originals in the media viewer" },
    "original-attachment-images": { permission: "media.imagequality", label: "Load original attachment images in chat and the media viewer" },
    "image-filename": { permission: "media.labels", label: "Show image filenames and GIF links" },
    "image-full-url": { permission: "media.labels", label: "Show the full URL of images and GIFs" },
    "descriptive-gif-alt": { permission: "media.labels", label: "Use meaningful filenames for GIFs with generic alt text" },
    "preserve-image-links": { permission: "media.labels", label: "Show image links alongside their chat previews" },
    "double-click-edit": { permission: "messages.openeditor", label: "Open the editor for your own message on double-click or double-tap" },
    "double-click-reply": { permission: "messages.openreply", label: "Open a reply to another user's message on double-click or double-tap" },
    "quick-mention": { permission: "messages.insertmention", label: "Insert the selected message author's mention into the current draft" },
    "keep-long-drafts": { permission: "drafts.long", label: "Preserve long drafts in Discord’s local draft store" },
    "bypass-pin-prompt": { permission: "messages.pin", label: "Use Discord’s Pin and Unpin actions without a confirmation prompt" },
    "pin-message-shortcut": { permission: "messages.pin", label: "Pin or unpin the selected message with one menu action" },
    "toggle-message-embeds": { permission: "messages.toggleembeds", label: "Suppress or unsuppress embeds in the selected message" },
    "repeat-message": { permission: "messages.repeat", label: "Send the selected message again with its attachments and stickers" },
    "scroll-to-latest": { permission: "channels.markonopen", label: "Open channels at the latest message and mark them read" },
    "show-voice-ping": { permission: "voice.latency", label: "Show your live call latency in milliseconds" },
    "voice-channel-count": { permission: "voice.channelcount", label: "Show occupancy and capacity in the channel list" },
    "webcam-start-notifier": { permission: "voice.cameratone", label: "Play different tones when someone turns their camera on or off" },
    "wait-for-slot": { permission: "voice.waitslot", label: "Queue for a full voice channel and respond when a slot opens" },
    "all-call-time-counter": { permission: "voice.membertime", label: "Show elapsed call time next to members in server voice channels" },
    "call-time-counter": { permission: "voice.calltime", label: "Show the elapsed time in your current call" },
    "jump-without-unblocking": { permission: "messages.jumpblocked", label: "Skip the blocked, ignored, or spam author prompt when jumping to a message" },
    "jump-to-message-menu": { permission: "channels.searchjump", label: "Jump to the first or last message from channel and message menus" },
    "jump-to-first-message": { permission: "channels.jump", label: "Add a channel header button to jump to the first message" },
    "read-all-servers-button": { permission: "servers.markread", label: "Add a server list button to mark loaded server channels as read" },
    "sticker-links": { permission: "stickers.links", label: "Add Copy Sticker Link and Open Sticker Link actions" },
    "clean-channel-names": { permission: "appearance.style", label: "Remove decorations from displayed channel names" },
    "title-channel-names": { permission: "appearance.style", label: "Format displayed server channel names as titles" },
} as const;

export type CxNativeEffect = keyof typeof cxNativeEffects;
export const cxAvatarResolutions = [256, 512, 1024, 2048, 4096] as const;
export type CxAvatarResolution = typeof cxAvatarResolutions[number];

export type CxSpotifyActivity = { type?: unknown; name?: unknown; details?: unknown; state?: unknown; };

export function getCxSpotifySongName(activity?: CxSpotifyActivity | null) {
    if (activity?.type === 2 && activity.name === "Spotify" && typeof activity.details === "string" && activity.details.trim()) {
        return activity.details;
    }
}

// SortReactions by rootpoi, kraethis, and ewlle (GPL-3.0-or-later).
export function sortCxReactions<T extends { count: number; }>(reactions: readonly T[]) {
    return reactions.length < 2 ? reactions : [...reactions].sort((a, b) => b.count - a.count);
}

export function getCxPinAction(message: { id?: string; channel_id?: string; pinned?: boolean; }, channel: string, canPin: boolean) {
    if (!canPin || !isCxProfileUserId(channel) || message.channel_id !== channel
        || !isCxProfileUserId(message.id) || typeof message.pinned !== "boolean") return;
    return { id: message.id, method: message.pinned ? "unpinMessage" as const : "pinMessage" as const,
        label: message.pinned ? "Unpin Without Confirmation" : "Pin Without Confirmation" };
}

type CxEmbedMessage = {
    id?: string;
    channel_id?: string;
    author?: { id?: string; };
    flags?: unknown;
    embeds?: readonly unknown[];
    messageSnapshots?: readonly { message?: { embeds?: readonly unknown[]; }; }[];
    message_snapshots?: CxEmbedMessage["messageSnapshots"];
};

export function getCxEmbedToggle(message: CxEmbedMessage, channelId: string, userId: string | undefined, permissions: {
    canEmbed: boolean; canManage: boolean;
}) {
    const { id, flags } = message;
    if (!isCxProfileUserId(id) || !isCxProfileUserId(channelId) || message.channel_id !== channelId
        || !isCxProfileUserId(userId) || typeof flags !== "number" || !Number.isSafeInteger(flags) || flags < 0
        || (message.author?.id === userId ? !permissions.canEmbed : !permissions.canManage)) return;
    const suppressed = (flags & 4) !== 0;
    if (!suppressed && !message.embeds?.length
        && !(message.messageSnapshots ?? message.message_snapshots)?.some(snapshot => snapshot.message?.embeds?.length)) return;
    return { id, flags: flags + (suppressed ? -4 : 4), label: suppressed ? "Unsuppress Embeds" : "Suppress Embeds" };
}

type RepeatAttachment = { filename?: string; url?: string; size?: number; };
export type CxRepeatMessage = {
    id?: string;
    content?: string;
    attachments?: readonly RepeatAttachment[];
    messageSnapshots?: readonly { message?: { attachments?: readonly RepeatAttachment[]; }; }[];
    message_snapshots?: CxRepeatMessage["messageSnapshots"];
    stickerItems?: readonly { id?: string; }[];
    sticker_items?: CxRepeatMessage["stickerItems"];
};

export function buildCxRepeatMessage(message: CxRepeatMessage, channelId: string, reply: boolean) {
    if (!isCxProfileUserId(message.id) || !isCxProfileUserId(channelId)) return;
    const attachments = [
        ...(message.attachments ?? []),
        ...(message.messageSnapshots ?? message.message_snapshots ?? []).flatMap(snapshot => snapshot.message?.attachments ?? []),
    ].flatMap(({ filename, url }) => {
        if (typeof filename !== "string" || typeof url !== "string"
            || !/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/[^\s<>]+$/i.test(url)) return [];
        return [" - " + filename.replace(/[\r\n]+/g, " ") + " (" + url + ")"];
    });
    const text = typeof message.content === "string" ? message.content : "";
    const content = attachments.length ? text + "\nAttachments:\n" + attachments.join("\n") : text;
    const stickerIds = (message.stickerItems ?? message.sticker_items ?? []).map(sticker => sticker.id).filter(isCxProfileUserId);
    if (!content.trim() && !stickerIds.length) return;
    return {
        content,
        options: {
            allowedMentions: { parse: [] as string[], replied_user: false },
            messageReference: reply ? { channel_id: channelId, message_id: message.id } : undefined,
            stickerIds,
        },
    };
}

export function getCxMessageGesture(message: {
    author?: { id?: string; }; content?: string; type?: number; flags?: number; deleted?: boolean; state?: string;
} | undefined, currentUser: string | undefined, gestures: { edit: number; reply: number; }) {
    const author = message?.author?.id;
    if (!message || !author || !currentUser || message.deleted || ((message.flags ?? 0) & 64) !== 0
        || message.state && message.state !== "SENT" || message.type !== 0 && message.type !== 19) return;
    if (author === currentUser) return gestures.edit && typeof message.content === "string" && message.content ? "edit" : undefined;
    if (gestures.reply) return "reply";
}

// FixFileExtensions by thororen (GPL-3.0-or-later).
const extensionGroups = {
    ogg: ["ogv", "oga", "ogx", "ogm", "spx", "aac", "wma"],
    jpg: ["jpe", "jif", "jfi", "pjpeg", "pjp", "bmp", "tiff", "tif"],
    svg: ["svgz", "ai", "eps"],
    mp4: ["m4v", "m4r", "m4p", "avi", "mkv", "wmv", "flv", "3gp"],
    m4a: ["m4b", "aiff"],
    mov: ["movie", "qt", "asf", "rm", "rmvb"],
    png: ["ico", "cur"],
};
const replacementExtensions = new Map(Object.entries(extensionGroups)
    .flatMap(([extension, aliases]) => aliases.map(alias => [alias, extension] as const)));

export function fixCxFileExtensions(files: unknown) {
    if (!Array.isArray(files)) return;
    for (const file of files) {
        try {
            const filename = file?.filename;
            if (typeof filename !== "string") continue;
            const parts = /^(.*[^/\\.])\.([a-z0-9]+)$/i.exec(filename);
            if (!parts || /\.tar$/i.test(parts[1])) continue;
            const replacement = replacementExtensions.get(parts[2].toLowerCase());
            if (replacement) file.filename = parts[1] + "." + replacement;
        } catch { /* A read-only or unrecognized entry should still upload. */ }
    }
}

type Rounding = (value: number) => number;
type MomentRounding = {
    relativeTimeRounding: { (): Rounding; (rule: Rounding): boolean; };
};
const roundingUsers = new WeakMap<MomentRounding, { previous: Rounding; applied: Rounding; count: number; }>();

export function floorCxRelativeTime(target: MomentRounding | undefined, enabled = () => true) {
    if (typeof target?.relativeTimeRounding !== "function") throw new Error("Discord relative timestamps are unavailable");
    let state = roundingUsers.get(target);
    if (!state) {
        const previous = target.relativeTimeRounding();
        const round = (value: number) => enabled() ? Math.floor(value) : previous(value);
        if (!target.relativeTimeRounding(round)) throw new Error("Could not change Discord relative timestamps");
        state = { previous, applied: round, count: 0 };
        roundingUsers.set(target, state);
    }
    state.count++;
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        if (--state.count === 0) {
            roundingUsers.delete(target);
            if (target.relativeTimeRounding() === state.applied) target.relativeTimeRounding(state.previous);
        }
    };
}

type MethodOverride = (args: unknown[], invoke: (args: unknown[]) => unknown) => unknown;
const overrideLayers = new WeakMap<object, {
    target: object;
    key: string;
    previous: PropertyDescriptor | undefined;
    active: () => boolean;
}>();

export function overrideCxMethods(target: object | undefined, overrides: Record<string, MethodOverride>, enabled = () => true) {
    const cleanups: (() => void)[] = [];
    let active = true;
    function stop() {
        active = false;
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
    if (!target) throw new Error("Discord's module is unavailable");
    const methods = target as Record<string, unknown>;
    try {
        for (const [key, override] of Object.entries(overrides)) {
            const original = methods[key];
            if (typeof original !== "function") continue;
            const previous = Object.getOwnPropertyDescriptor(target, key);
            function wrapped(this: unknown, ...args: unknown[]) {
                const invoke = (next: unknown[]) => Reflect.apply(original as (...args: unknown[]) => unknown, this, next);
                return active && enabled() ? override(args, invoke) : invoke(args);
            }
            if (previous && !previous.configurable) {
                if (!("value" in previous) || !previous.writable) continue;
                Object.defineProperty(target, key, { value: wrapped });
            } else {
                Object.defineProperty(target, key, { value: wrapped, writable: true, configurable: true, enumerable: previous?.enumerable ?? false });
            }
            overrideLayers.set(wrapped, { target, key, previous, active: () => active });
            cleanups.push(() => {
                const current = Object.getOwnPropertyDescriptor(target, key);
                if (current?.value !== wrapped) return;
                let restore = previous;
                while (typeof restore?.value === "function") {
                    const layer = overrideLayers.get(restore.value);
                    if (!layer || layer.target !== target || layer.key !== key || layer.active()) break;
                    restore = layer.previous;
                }
                if (restore) Object.defineProperty(target, key, restore);
                else Reflect.deleteProperty(target, key);
            });
        }
        if (!cleanups.length) throw new Error("Discord's methods are unavailable or read-only");
    } catch (error) {
        stop();
        throw error;
    }
    return stop;
}

// NoServerEmojis by UlyssesZhan (GPL-3.0-or-later).
export function filterCxEmojiAutocomplete(store: object | undefined, mode: "unicode" | "local",
    intentions?: { CHAT?: number; AUTO_SUGGESTION?: number; }, enabled?: () => boolean) {
    const methods = store as { searchWithoutFetchingLatest?: unknown; getSearchResultsOrder?: unknown; } | undefined;
    if (typeof methods?.searchWithoutFetchingLatest !== "function" || typeof methods.getSearchResultsOrder !== "function")
        throw new Error("Discord's emoji search is unavailable");
    type Channel = { guild_id?: string | null; getGuildId?: () => string | null | undefined; };
    type Emoji = { type?: number; guildId?: string; };
    let shouldKeep: ((emoji: Emoji | null | undefined) => boolean) | undefined;
    return overrideCxMethods(store, {
        searchWithoutFetchingLatest(args, invoke) {
            const options = args[0] as { intention?: number; count?: number; channel?: Channel; } | undefined;
            if (options?.intention == null || !(options.intention === intentions?.AUTO_SUGGESTION
                || options.intention === (intentions?.CHAT ?? 3) && typeof options.count === "number" && options.count > 0)) return invoke(args);
            const channel = options.channel;
            const guild = channel?.getGuildId?.() ?? channel?.guild_id;
            const previous = shouldKeep;
            shouldKeep = emoji => emoji?.type !== 1 || mode === "local" && Boolean(guild) && emoji.guildId === guild;
            try { return invoke(args); }
            finally { shouldKeep = previous; }
        },
        getSearchResultsOrder(args, invoke) {
            const [emojis, ...rest] = args;
            if (!shouldKeep || !Array.isArray(emojis)) return invoke(args);
            const filtered = emojis.filter(shouldKeep);
            return invoke(filtered.length === emojis.length ? args : [filtered, ...rest]);
        },
    }, enabled);
}

export function animateCxAssets(target: object | undefined, bannerTakesOptions: boolean, enabled?: () => boolean) {
    const animateArgument: MethodOverride = (args, invoke) => {
        const next = [...args];
        next[1] = true;
        return invoke(next);
    };
    const animateOptions: MethodOverride = ([options, ...args], invoke) =>
        options && typeof options === "object" ? invoke([{ ...options, canAnimate: true }, ...args]) : invoke([options, ...args]);
    return overrideCxMethods(target, {
        getUserAvatarURL: animateArgument,
        getGuildMemberAvatarURL: animateArgument,
        getUserBannerURL: bannerTakesOptions ? animateOptions : animateArgument,
        getGuildIconURL: animateOptions,
    }, enabled);
}

export function raiseCxAvatarResolution(target: object | undefined, size: CxAvatarResolution, enabled?: () => boolean) {
    const avatarUrl = /^(https:\/\/|\/\/)(?:cdn\.discordapp\.com|media\.discordapp\.net)\/(?:guilds\/\d+\/users\/\d+\/)?avatars\/\d+\/[\w-]+\.(?:png|webp|gif|jpe?g|avif)(\?[^#\s]*)?$/i;
    return overrideCxMethods(target, {
        getUserAvatarURL(args, invoke) {
            const url = invoke(args);
            if (typeof url !== "string") return url;
            const match = avatarUrl.exec(url);
            if (!match) return url;
            const existingSize = /([?&])size=([^&]*)/i;
            const existing = Number(existingSize.exec(url)?.[2] ?? 0);
            if (existing >= size) return url;
            if (existingSize.test(url)) return url.replace(existingSize, "$1size=" + size);
            return url + (/[?&]$/.test(url) ? "" : match[2] ? "&" : "?") + "size=" + size;
        },
    }, enabled);
}
