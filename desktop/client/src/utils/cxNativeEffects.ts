export const cxNativeEffects = {
    "silent-typing": { permission: "typing.suppress", label: "Stop sending your typing indicator" },
    "static-typing-dots": { permission: "appearance.style", label: "Keep Discord's typing dots still" },
    "plus-reactions": { permission: "messages.reactshortcut", label: "React to the matching previous message when you send a plus shortcut" },
    "fix-file-extensions": { permission: "uploads.rename", label: "Use supported filename extensions for listed attachment formats" },
    "pending-friend-count": { permission: "appearance.hide", label: "Hide the pending friend request count" },
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
    "copy-media-link": { permission: "media.clipboard", label: "Add a clipboard action to media and link menus" },
    "attachment-image-quality": { permission: "media.imagequality", label: "Improve attachment previews and load originals in the media viewer" },
    "original-attachment-images": { permission: "media.imagequality", label: "Load original attachment images in chat and the media viewer" },
    "image-filename": { permission: "media.labels", label: "Show image filenames and GIF links" },
    "image-full-url": { permission: "media.labels", label: "Show the full URL of images and GIFs" },
    "descriptive-gif-alt": { permission: "media.labels", label: "Use meaningful filenames for GIFs with generic alt text" },
    "preserve-image-links": { permission: "media.labels", label: "Show image links alongside their chat previews" },
    "double-click-edit": { permission: "messages.openeditor", label: "Open the editor for your own message on double-click or double-tap" },
    "double-click-reply": { permission: "messages.openreply", label: "Open a reply to another user's message on double-click or double-tap" },
    "scroll-to-latest": { permission: "channels.markonopen", label: "Open channels at the latest message and mark them read" },
    "sticker-links": { permission: "stickers.links", label: "Add Copy Sticker Link and Open Sticker Link actions" },
} as const;

export type CxNativeEffect = keyof typeof cxNativeEffects;
export const cxAvatarResolutions = [256, 512, 1024, 2048, 4096] as const;
export type CxAvatarResolution = typeof cxAvatarResolutions[number];

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
