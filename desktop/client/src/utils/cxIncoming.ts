import { parseCxHttpsOrigin } from "./cxMessageTransforms";
import { decodeCxProfileColors } from "./cxProfileColors";

// Shared behavior for the original GPL-3.0-or-later CloudCord notification ports.
export const incomingPermissions = {
    stickers: "messages.filterstickers",
    "silence-users": "messages.silencementions",
    "reply-pings": "replies.controlping",
    "reply-ping-default": "replies.suppressping",
    calls: "calls.suppressring",
    keywords: "messages.watchlocal",
    users: "messages.watchlocal",
    "ping-alerts": "messages.pingalerts",
    "hide-users": "messages.filterlocal",
    "hide-keywords": "messages.filterlocal",
    "hide-blocked": "messages.filterlocal",
    "hide-system": "messages.filterlocal",
    "hide-profile-themes": "appearance.style",
    "profile-bio-colors": "appearance.style",
    "friends-voice": "voice.notifyfriends",
    "follow-voice": "voice.followfriend",
    "friend-removals": "friends.notifyremoval",
    "open-link": "links.openonmessage",
} as const;

type IncomingKind = keyof typeof incomingPermissions;
export type IncomingRule = { kind: IncomingKind; values: string[]; always?: boolean; matcher?: RegExp; messageTypes?: ReadonlySet<number>; link?: string };

const systemMessageTypes = { pins: [6], joins: [7], boosts: [8, 9, 10, 11] } as const;

export function parseIncomingRule(name: string, input: string): IncomingRule {
    if (!Object.prototype.hasOwnProperty.call(incomingPermissions, name)) throw new Error("Unknown incoming rule");
    const kind = name as IncomingKind;
    if (kind === "ping-alerts") {
        const values = [...new Set(input.split(",").map(value => value.trim()))];
        if (values.some(value => !["mentions", "friends", "dms", "active", "include-muted"].includes(value))
            || !values.some(value => ["mentions", "friends", "dms"].includes(value))) {
            throw new Error("Choose mentions, friends, or dms, with optional active and include-muted");
        }
        return { kind, values };
    }
    if (kind === "open-link") {
        const [phrase, link, extra] = input.split("|").map(part => part.trim());
        if (!phrase || phrase.length > 80 || link === undefined || extra !== undefined)
            throw new Error("Use a short phrase followed by | and an HTTPS destination");
        if (!link) return { kind, values: [phrase] };
        const match = /^(https:\/\/[^/?#]+)(?:[/?#][a-z0-9._~%!$&()*+,;=:@/?#-]*)?$/i.exec(link);
        if (!match) throw new Error("Use an HTTPS destination without credentials or a custom scheme");
        try { parseCxHttpsOrigin(match[1]); }
        catch { throw new Error("Use an HTTPS destination without credentials or a custom scheme"); }
        return { kind, values: [phrase], link };
    }
    if (kind === "profile-bio-colors") {
        if (input !== "prefer-native" && input !== "prefer-bio") throw new Error("Choose prefer-native or prefer-bio");
        return { kind, values: [input] };
    }
    let always = false;
    if (kind === "reply-pings") {
        const match = /^(always|never)(?::(.*))?$/.exec(input);
        if (!match) throw new Error("Reply pings require always or never, followed by optional exception IDs");
        always = match[1] === "always";
        input = match[2] ?? "";
    }
    const textual = kind === "keywords" || kind === "hide-keywords";
    const values = [...new Set(input.split(textual ? /,/ : /[\s,]+/).map(value => value.trim()).filter(Boolean))];
    if (values.length > 24) throw new Error("Too many incoming rule values");
    if (kind === "follow-voice" && values.length > 1) throw new Error("Choose one friend ID to follow");
    if (kind === "reply-ping-default" && input.trim()) throw new Error("Reply ping defaults take no options");
    if (kind === "friend-removals" && values.length) throw new Error("Friend removal notices take no options");
    if (kind === "hide-profile-themes" && values.length) throw new Error("Profile theme hiding takes no options");
    if (kind === "hide-system") {
        if (!values.length || values.some(value => !Object.prototype.hasOwnProperty.call(systemMessageTypes, value)))
            throw new Error("Choose pins, joins, or boosts");
        return { kind, values, messageTypes: new Set(values.flatMap<number>(value => systemMessageTypes[value as keyof typeof systemMessageTypes])) };
    }
    if (kind === "hide-blocked") {
        if (!values.length || values.some(value => value !== "blocked" && value !== "ignored"))
            throw new Error("Choose blocked, ignored, or both");
    } else if (!textual && !(kind === "stickers" && input === "*") && values.some(value => !/^\d{17,20}$/.test(value))) {
        throw new Error("Incoming rules need Discord IDs");
    }
    if (kind === "hide-keywords" && values.length) {
        const phrases = values.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        return { kind, values, matcher: new RegExp("\\b(?:" + phrases.join("|") + ")\\b", "i") };
    }
    return { kind, values, always };
}

export type IncomingPayload = Record<string, any> & { type: string };
type NotificationChannel = { name?: string; type?: number; guild_id?: string; parent_id?: string;
    recipients?: readonly (string | { id: string })[]; isMuted?: () => boolean; };
type NotificationMuteStore = {
    isMuted?: (guild: string) => boolean;
    isChannelMuted?: (guild: string | null, channel: string) => boolean;
    isCategoryMuted?: (guild: string, channel: string) => boolean;
    isGuildOrCategoryOrChannelMuted?: (guild: string, channel: string) => boolean;
    getMutedChannels?: () => readonly string[];
};
export type CxMessageAlert = { title: string; body: string; author: string; channel: string; message: string; guild?: string; };

export function isCxNotificationMuted(id: string, channel: NotificationChannel, store?: NotificationMuteStore) {
    const guild = channel.guild_id;
    if (channel.isMuted?.() || store?.isChannelMuted?.(guild ?? null, id)) return true;
    if (!guild) return store?.getMutedChannels?.()?.includes?.(id) === true;
    return store?.isGuildOrCategoryOrChannelMuted?.(guild, id) === true
        || store?.isMuted?.(guild) === true || store?.isCategoryMuted?.(guild, id) === true
        || Boolean(channel.parent_id && store?.isChannelMuted?.(guild, channel.parent_id));
}

type IncomingContext = {
    currentUser: () => string | undefined;
    channel: (id: string) => NotificationChannel | undefined;
    replyAuthor: (channel: string, message: string) => { id: string } | undefined;
    notify: (body: string) => void;
    blocked?: (user: string) => boolean;
    ignored?: (user: string) => boolean;
    selectedChannel?: () => string | undefined;
    pingAlerts?: {
        status: (id: string) => string | undefined;
        isFriend: (id: string) => boolean;
        muted: (id: string, channel: NotificationChannel) => boolean;
        notify: (alert: CxMessageAlert) => void;
    };
    openLink?: (link: string, channel: string, user: string) => void;
};

const lastLinkOpen = new WeakMap<IncomingContext, number>();

function stripStickers(message: IncomingPayload["message"], rule: IncomingRule) {
    const stickers = message?.sticker_items ?? message?.stickerItems ?? message?.stickers;
    if (!Array.isArray(stickers) || !stickers.length) return message;
    const kept = rule.values[0] === "*" ? [] : stickers.filter(sticker => !rule.values.includes(String(sticker?.id)));
    if (kept.length === stickers.length) return message;
    return { ...message, sticker_items: kept, stickerItems: kept, stickers: kept };
}

function stripProfileTheme(profile: Record<string, unknown> | undefined) {
    if (!profile || typeof profile !== "object" || !(Array.isArray(profile.theme_colors) || Array.isArray(profile.themeColors))) return profile;
    const next = { ...profile };
    delete next.theme_colors;
    delete next.themeColors;
    return next;
}

export function applyIncomingRule(rule: IncomingRule, payload: IncomingPayload, context: IncomingContext) {
    const { type, message } = payload;
    if (rule.kind === "reply-ping-default") {
        if (type === "CREATE_PENDING_REPLY" && payload.shouldMention === true) return { shouldMention: false };
        return;
    }
    if (rule.kind === "friends-voice" || rule.kind === "follow-voice" || rule.kind === "friend-removals") return;
    if (rule.kind === "profile-bio-colors") {
        if (type !== "USER_PROFILE_FETCH_SUCCESS") return;
        const envelope = payload.userProfile ?? payload;
        const profile = envelope.user_profile ?? envelope;
        if (rule.values[0] === "prefer-native" && [profile.theme_colors, profile.themeColors]
            .some(colors => Array.isArray(colors) && colors.length)) return;
        const colors = decodeCxProfileColors(profile.bio);
        if (!colors) return;
        const change = { theme_colors: colors, themeColors: colors };
        const patch = profile === envelope ? change : { user_profile: { ...profile, ...change } };
        return envelope === payload ? patch : { userProfile: { ...envelope, ...patch } };
    }
    if (rule.kind === "hide-profile-themes") {
        if (type !== "USER_PROFILE_FETCH_SUCCESS") return;
        const envelope = payload.userProfile ?? payload;
        const id = envelope.user?.id ?? payload.userId;
        const me = context.currentUser();
        if (!me || typeof id !== "string" || id === me) return;
        const userProfile = envelope.user_profile;
        const guildProfile = envelope.guild_member_profile;
        const user = stripProfileTheme(userProfile);
        const guild = stripProfileTheme(guildProfile);
        const profile = !userProfile ? stripProfileTheme(envelope) : envelope;
        if (user === userProfile && guild === guildProfile && profile === envelope) return;
        const patch = {
            ...(user !== userProfile ? { user_profile: user } : {}),
            ...(guild !== guildProfile ? { guild_member_profile: guild } : {}),
        };
        if (envelope !== payload) return { userProfile: { ...profile, ...patch } };
        return profile === envelope ? patch : { ...patch, theme_colors: undefined, themeColors: undefined };
    }
    if (rule.kind === "hide-users" || rule.kind === "hide-keywords" || rule.kind === "hide-blocked" || rule.kind === "hide-system") {
        if (!rule.values.length || payload.optimistic) return;
        if (type !== "MESSAGE_CREATE" && type !== "MESSAGE_UPDATE" && type !== "LOAD_MESSAGES_SUCCESS") return;
        const me = rule.kind === "hide-system" ? undefined : context.currentUser();
        if (!me && rule.kind !== "hide-system") return;
        const hide = (item: IncomingPayload["message"]) => {
            if (!item) return false;
            if (rule.kind === "hide-system") return rule.messageTypes?.has(item.type) === true;
            const channel = item.channel_id ?? item.channelId ?? payload.channelId ?? payload.channel_id;
            const user = item.author?.id ?? (type === "MESSAGE_UPDATE" && typeof channel === "string" && typeof item.id === "string"
                ? context.replyAuthor(channel, item.id)?.id : undefined);
            if (typeof user !== "string" || user === me) return false;
            if (rule.kind === "hide-users") return rule.values.includes(user);
            if (rule.kind === "hide-blocked")
                return rule.values.includes("blocked") && context.blocked?.(user) === true
                    || rule.values.includes("ignored") && context.ignored?.(user) === true;
            const fields = [item.content];
            if (Array.isArray(item.embeds)) for (const embed of item.embeds.slice(0, 10)) {
                fields.push(embed?.title ?? embed?.rawTitle, embed?.description ?? embed?.rawDescription);
            }
            return fields.some(field => typeof field === "string" && rule.matcher?.test(field.slice(0, 4000)));
        };
        if (type === "LOAD_MESSAGES_SUCCESS") {
            if (!Array.isArray(payload.messages)) return;
            const messages = payload.messages.filter(item => !hide(item));
            if (messages.length !== payload.messages.length) return { messages };
        } else if (hide(message)) {
            return false as const;
        }
        return;
    }
    if (rule.kind === "stickers") {
        if (type === "MESSAGE_CREATE" || type === "MESSAGE_UPDATE") {
            const next = stripStickers(message, rule);
            return next !== message ? { message: next } : undefined;
        }
        if (type === "LOAD_MESSAGES_SUCCESS" && Array.isArray(payload.messages)) {
            const messages = payload.messages.map(item => stripStickers(item, rule));
            if (messages.some((item, index) => item !== payload.messages[index])) return { messages };
        }
        return;
    }
    if (rule.kind === "calls") {
        if ((type !== "CALL_CREATE" && type !== "CALL_UPDATE") || !Array.isArray(payload.ringing) || !rule.values.length) return;
        const me = context.currentUser();
        if (!me || !payload.ringing.includes(me)) return;
        const id = payload.channelId ?? payload.channel_id;
        if (typeof id !== "string") return;
        const recipients = context.channel(id)?.recipients;
        const peer = recipients?.length === 1 ? recipients[0] : undefined;
        if (rule.values.includes(id) || rule.values.includes(typeof peer === "string" ? peer : peer?.id ?? ""))
            return { ringing: payload.ringing.filter(user => user !== me) };
        return;
    }
    if (type !== "MESSAGE_CREATE" || payload.optimistic || typeof message?.author?.id !== "string") return;
    const me = context.currentUser();
    const author = message.author.id;
    if (rule.kind === "open-link") {
        const channel = message.channel_id ?? message.channelId ?? payload.channelId;
        if (!rule.link || !me || !context.openLink || typeof channel !== "string" || context.selectedChannel?.() !== channel
            || message.state === "SENDING" || context.blocked?.(author)
            || typeof message.content !== "string" || !message.content.slice(0, 4000).toLowerCase().includes(rule.values[0].toLowerCase())) return;
        const now = Date.now();
        const last = lastLinkOpen.get(context);
        if (last !== undefined && now - last < 10_000) return;
        lastLinkOpen.set(context, now);
        context.openLink(rule.link, channel, me);
        return;
    }
    if (!me || author === me) return;
    const mentions = Array.isArray(message.mentions) ? message.mentions : [];
    const isMe = (mention: string | { id?: string }) => (typeof mention === "string" ? mention : mention?.id) === me;
    if (rule.kind === "ping-alerts") {
        const channelId = message.channel_id ?? message.channelId;
        const alerts = context.pingAlerts;
        if (!alerts || typeof channelId !== "string" || !/^\d{17,20}$/.test(channelId)
            || typeof message.id !== "string" || !/^\d{17,20}$/.test(message.id)
            || message.state === "SENDING" || alerts.status(me) === "dnd"
            || !rule.values.includes("active") && context.selectedChannel?.() === channelId) return;
        const channel = context.channel(channelId);
        if (!channel) return;
        const dm = channel.type === 1 || channel.type === 3;
        if (!(rule.values.includes("mentions") && mentions.some(isMe)
            || rule.values.includes("friends") && !dm && alerts.isFriend(author)
            || rule.values.includes("dms") && dm)) return;
        if (!rule.values.includes("include-muted") && (alerts.muted(channelId, channel) || context.blocked?.(author)
            || dm && channel.recipients?.some(recipient => context.blocked?.(typeof recipient === "string" ? recipient : recipient.id)))) return;

        const names = new Map(mentions.flatMap(mention => typeof mention?.username === "string" && typeof mention?.id === "string"
            ? [[mention.id, mention.username] as const] : []));
        const content = typeof message.content === "string" ? message.content.slice(0, 4000) : "";
        const body = content.replace(/<@!?(\d{17,20})>/g, (token, id: string) => names.has(id) ? "@" + names.get(id) : token);
        const authorName = typeof message.author.username === "string" ? message.author.username : "Someone";
        const channelName = channel.name || (channel.type === 3 ? "Group DM" : dm ? "DM" : "Server");
        alerts.notify({ title: authorName.slice(0, 64) + " in " + channelName.slice(0, 64),
            body: body.slice(0, 200) + (body.length > 200 ? "…" : ""),
            author, channel: channelId, message: message.id, guild: channel.guild_id });
        return;
    }
    if (rule.kind === "silence-users") {
        if (rule.values.includes(author)) {
            return { message: { ...message, mention_everyone: false, mention_roles: [], mentions: mentions.filter(mention => !isMe(mention)) } };
        }
        return;
    }
    if (rule.kind === "reply-pings") {
        const ref = message.message_reference ?? message.messageReference;
        const channelId = ref?.channel_id ?? ref?.channelId ?? message.channel_id;
        const messageId = ref?.message_id ?? ref?.messageId;
        const replyAuthor = (message.referenced_message ?? message.referencedMessage)?.author
            ?? (typeof channelId === "string" && typeof messageId === "string" ? context.replyAuthor(channelId, messageId) : undefined);
        if (replyAuthor?.id !== me) return;
        const shouldPing = rule.always !== rule.values.includes(author);
        if (shouldPing === mentions.some(isMe)) return;
        return { message: { ...message, mentions: shouldPing ? [...mentions, replyAuthor] : mentions.filter(mention => !isMe(mention)) } };
    }
    const content = typeof message.content === "string" ? message.content.slice(0, 4000) : "";
    const matches = rule.kind === "users" ? rule.values.includes(author)
        : !message.author.bot && rule.values.some(value => content.toLowerCase().includes(value.toLowerCase()));
    if (matches) {
        const channel = typeof message.channel_id === "string" ? context.channel(message.channel_id)?.name : undefined;
        const name = message.author.global_name ?? message.author.globalName ?? message.author.username ?? "Someone";
        context.notify(String(name).slice(0, 64) + (channel ? " in #" + channel.slice(0, 64) : "") + ": " + (content || "sent an attachment").slice(0, 80));
    }
}
