// Shared behavior for the original GPL-3.0-or-later CloudCord notification ports.
export const incomingPermissions = {
    stickers: "messages.filterstickers",
    "silence-users": "messages.silencementions",
    "reply-pings": "replies.controlping",
    calls: "calls.suppressring",
    keywords: "messages.watchlocal",
    users: "messages.watchlocal",
} as const;

type IncomingKind = keyof typeof incomingPermissions;
export type IncomingRule = { kind: IncomingKind; values: string[]; always?: boolean };

export function parseIncomingRule(name: string, input: string): IncomingRule {
    if (!Object.prototype.hasOwnProperty.call(incomingPermissions, name)) throw new Error("Unknown incoming rule");
    const kind = name as IncomingKind;
    let always = false;
    if (kind === "reply-pings") {
        const match = /^(always|never)(?::(.*))?$/.exec(input);
        if (!match) throw new Error("Reply pings require always or never, followed by optional exception IDs");
        always = match[1] === "always";
        input = match[2] ?? "";
    }
    const values = input.split(kind === "keywords" ? /,/ : /[\s,]+/).map(value => value.trim()).filter(Boolean);
    if (values.length > 24) throw new Error("Too many incoming rule values");
    if (kind !== "keywords" && !(kind === "stickers" && input === "*") && values.some(value => !/^\d{17,20}$/.test(value)))
        throw new Error("Incoming rules need Discord IDs");
    return { kind, values: [...new Set(values)], always };
}

export type IncomingPayload = Record<string, any> & { type: string };
type IncomingContext = {
    currentUser: () => string | undefined;
    channel: (id: string) => { name?: string; recipients?: readonly (string | { id: string })[] } | undefined;
    replyAuthor: (channel: string, message: string) => { id: string } | undefined;
    notify: (body: string) => void;
};

function stripStickers(message: IncomingPayload["message"], rule: IncomingRule) {
    const stickers = message?.sticker_items ?? message?.stickerItems ?? message?.stickers;
    if (!Array.isArray(stickers) || !stickers.length) return message;
    const kept = rule.values[0] === "*" ? [] : stickers.filter(sticker => !rule.values.includes(String(sticker?.id)));
    if (kept.length === stickers.length) return message;
    return { ...message, sticker_items: kept, stickerItems: kept, stickers: kept };
}

export function applyIncomingRule(rule: IncomingRule, payload: IncomingPayload, context: IncomingContext) {
    const { type, message } = payload;
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
    if (!me || author === me) return;
    const mentions = Array.isArray(message.mentions) ? message.mentions : [];
    const isMe = (mention: string | { id?: string }) => (typeof mention === "string" ? mention : mention?.id) === me;
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
