/*
 * CloudCord fake messages
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Local-only fake conversations, shared by desktop and mobile. Messages are added to a
// channel through Discord's own dispatcher, the same way Discord shows its local
// messages, and are never sent: actions on them (reply, edit, delete, react) are caught
// here before they reach Discord's API.

export const MAX_FAKE_PEOPLE = 10;
export const MAX_FAKE_LINES = 200;

export interface FakePerson {
    /** Stable id inside the conversation. */
    key: string;
    /** A real Discord user (friend or user ID), or empty for a made-up person. */
    userId?: string;
    /** Display name; for real users it overrides their name when set. */
    name?: string;
    username?: string;
    /** Picture URL for made-up people (or to override a real user's picture). */
    avatarUrl?: string;
}

export interface FakeLine {
    key: string;
    person: string;
    text: string;
    /** Minutes before "now" this line appears to be sent, so the conversation reads in order. */
    minutesAgo: number;
}

export interface FakeConversation {
    id: string;
    name: string;
    channelId: string;
    people: FakePerson[];
    lines: FakeLine[];
}

const DISCORD_EPOCH = 1420070400000n;

/** A snowflake for a timestamp, with a sequence so several lines in the same minute stay unique. */
export function snowflakeAt(time: number, sequence: number) {
    return String(((BigInt(Math.floor(time)) - DISCORD_EPOCH) << 22n) | BigInt(sequence & 0xfff));
}

/** A permanent, numeric id for a made-up person, so Discord treats them like any user. */
export function newPersonId() {
    const random = Math.floor(Math.random() * 0x3fffff);
    // A date in 2016 keeps it far from real recent accounts while looking like a normal id.
    return snowflakeAt(Date.UTC(2016, 0, 1) + Math.floor(Math.random() * 1e10), random);
}

export function newKey() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Cleans up stored data: limits, missing people, empty text. */
export function normalizeConversation(input: any): FakeConversation | null {
    if (!input || typeof input !== "object" || !/^\d{15,22}$/.test(String(input.channelId || ""))) return null;
    const people: FakePerson[] = (Array.isArray(input.people) ? input.people : []).slice(0, MAX_FAKE_PEOPLE).map((person: any) => ({
        key: String(person?.key || newKey()),
        userId: /^\d{15,22}$/.test(String(person?.userId || "")) ? String(person.userId) : undefined,
        name: typeof person?.name === "string" ? person.name.slice(0, 32) : undefined,
        username: typeof person?.username === "string" ? person.username.slice(0, 32) : undefined,
        avatarUrl: /^https:\/\//.test(String(person?.avatarUrl || "")) ? String(person.avatarUrl) : undefined,
    })).filter((person: FakePerson) => person.userId || person.name);
    const keys = new Set(people.map(person => person.key));
    const lines: FakeLine[] = (Array.isArray(input.lines) ? input.lines : []).slice(0, MAX_FAKE_LINES).map((line: any) => ({
        key: String(line?.key || newKey()),
        person: String(line?.person || ""),
        text: String(line?.text || "").slice(0, 4000),
        minutesAgo: Math.max(0, Math.min(60 * 24 * 365, Number(line?.minutesAgo) || 0)),
    })).filter((line: FakeLine) => keys.has(line.person) && line.text.trim());
    return { id: String(input.id || newKey()), name: String(input.name || "Fake conversation").slice(0, 60), channelId: String(input.channelId), people, lines };
}

export interface FakeMessagesOptions {
    dispatcher: { dispatch(event: any): any; subscribe?(type: string, cb: (event: any) => void): void; unsubscribe?(type: string, cb: (event: any) => void): void; };
    /** Discord's REST wrapper (get/post/patch/put/del). Writes on fake messages are caught here. */
    rest?: any;
    /** The stored conversations. */
    getConversations: () => FakeConversation[];
    /** A real user's current data (UserStore.getUser), or null. */
    getUser: (id: string) => any;
    /** The channel's guild, if any. */
    getGuildId: (channelId: string) => string | null | undefined;
    /** Remove one line after the user deletes it from chat. */
    removeLine?: (conversationId: string, lineKey: string) => void;
    /** Tell the user an action on a fake message isn't possible. */
    explain?: () => void;
    /** Discord's avatar helpers, so made-up people can have their own picture. */
    iconUtils?: any;
}

export function installFakeMessages(options: FakeMessagesOptions) {
    const cleanups: (() => void)[] = [];
    // message id -> where it came from, for every fake message currently shown
    const shown = new Map<string, { conversation: string; line: string; channelId: string; }>();
    const avatars = new Map<string, string>();
    // The time a conversation was first shown; lines keep their spacing relative to it.
    const anchors = new Map<string, number>();

    const author = (person: FakePerson) => {
        const real = person.userId ? options.getUser(person.userId) : null;
        const id = person.userId || personIds.get(person.key) || "";
        if (person.avatarUrl) avatars.set(id, person.avatarUrl);
        return {
            id,
            username: person.username || real?.username || (person.name || "user").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 32) || "user",
            global_name: person.name || real?.globalName || real?.global_name || real?.username || null,
            avatar: person.avatarUrl ? null : real?.avatar ?? null,
            discriminator: real?.discriminator ?? "0",
            public_flags: real?.publicFlags ?? 0,
            bot: false,
        };
    };
    // Made-up people need a numeric id that stays the same while CloudCord runs.
    const personIds = new Map<string, string>();
    const idFor = (person: FakePerson) => {
        if (person.userId) return person.userId;
        if (!personIds.has(person.key)) personIds.set(person.key, newPersonId());
        return personIds.get(person.key)!;
    };

    const messagesFor = (conversation: FakeConversation) => {
        const anchor = anchors.get(conversation.id) ?? Date.now();
        anchors.set(conversation.id, anchor);
        const people = new Map(conversation.people.map(person => [person.key, person]));
        const guildId = options.getGuildId(conversation.channelId) || undefined;
        return conversation.lines
            .map((line, index) => ({ line, index, time: anchor - line.minutesAgo * 60_000 }))
            .sort((a, b) => a.time - b.time || a.index - b.index)
            .map(({ line, index, time }) => {
                const person = people.get(line.person)!;
                idFor(person);
                // Mix in the conversation, so two conversations in one channel never share an id.
                let salt = 0;
                for (const char of conversation.id) salt = (salt * 31 + char.charCodeAt(0)) & 0xfff;
                const id = snowflakeAt(time, (salt + index + 1) & 0xfff);
                shown.set(id, { conversation: conversation.id, line: line.key, channelId: conversation.channelId });
                return {
                    id, type: 0, content: line.text, channel_id: conversation.channelId, guild_id: guildId,
                    timestamp: new Date(time).toISOString(), edited_timestamp: null, flags: 0,
                    author: author(person), attachments: [], embeds: [], mentions: [], mention_roles: [],
                    mention_everyone: false, pinned: false, tts: false, components: [], cloudcordFake: true,
                };
            });
    };

    /** Shows (or re-shows) every conversation for a channel. */
    const show = (channelId?: string) => {
        for (const raw of options.getConversations()) {
            const conversation = normalizeConversation(raw);
            if (!conversation || (channelId && conversation.channelId !== channelId)) continue;
            for (const message of messagesFor(conversation)) {
                try {
                    options.dispatcher.dispatch({ type: "MESSAGE_CREATE", channelId: conversation.channelId, message, optimistic: false, isPushNotification: false });
                } catch { /* one bad line must not stop the rest */ }
            }
        }
    };

    /** Removes a conversation's messages from chat (they are not deleted anywhere else). */
    const hide = (conversationId: string) => {
        for (const [id, origin] of [...shown]) {
            if (origin.conversation !== conversationId) continue;
            try { options.dispatcher.dispatch({ type: "MESSAGE_DELETE", channelId: origin.channelId, id }); } catch { }
            shown.delete(id);
        }
    };

    // Discord replaces a channel's messages when it loads them; put the fake ones back.
    const reload = (event: any) => {
        const channelId = event?.channelId;
        if (!channelId) return;
        if (!options.getConversations().some(conversation => conversation?.channelId === channelId)) return;
        setTimeout(() => show(channelId), 0);
    };
    for (const type of ["LOAD_MESSAGES_SUCCESS", "CHANNEL_SELECT"]) {
        try {
            options.dispatcher.subscribe?.(type, reload);
            cleanups.push(() => options.dispatcher.unsubscribe?.(type, reload));
        } catch { }
    }

    // Writes on a fake message never reach Discord.
    const wrap = (object: any, key: string, handler: (original: Function, args: any[]) => any) => {
        try {
            const original = object?.[key];
            if (typeof original !== "function") return;
            const replacement = function (this: any, ...args: any[]) { return handler(original.bind(this), args); };
            object[key] = replacement;
            if (object[key] !== replacement) return;
            cleanups.push(() => { if (object[key] === replacement) object[key] = original; });
        } catch { /* a readonly helper must not stop startup */ }
    };
    const fakeTarget = (args: any[]) => {
        const url = String(args[0]?.url ?? args[0] ?? "");
        const match = url.match(/\/channels\/\d+\/messages\/(\d+)/);
        return match && shown.has(match[1]) ? { id: match[1], url } : null;
    };
    for (const method of ["del", "delete", "patch", "put", "post"]) {
        wrap(options.rest, method, (original, args) => {
            const target = fakeTarget(args);
            if (!target) return original(...args);
            const origin = shown.get(target.id)!;
            if ((method === "del" || method === "delete") && !/\/reactions\//.test(target.url)) {
                try { options.dispatcher.dispatch({ type: "MESSAGE_DELETE", channelId: origin.channelId, id: target.id }); } catch { }
                shown.delete(target.id);
                options.removeLine?.(origin.conversation, origin.line);
                return Promise.resolve({ ok: true, status: 204, body: null });
            }
            options.explain?.();
            return Promise.reject(Object.assign(new Error("This is a fake message on your device."), { status: 400, body: { message: "This is a fake message on your device." } }));
        });
    }

    // Made-up people's pictures.
    for (const key of ["getUserAvatarURL", "getAvatarURL"]) {
        wrap(options.iconUtils, key, (original, args) => {
            const user = args[0];
            const url = user?.id ? avatars.get(String(user.id)) : undefined;
            return url ?? original(...args);
        });
    }

    return {
        show, hide,
        isFake: (messageId: string) => shown.has(String(messageId)),
        stop: () => {
            for (const id of [...new Set([...shown.values()].map(origin => origin.conversation))]) hide(id);
            for (const cleanup of cleanups.reverse()) cleanup();
        },
    };
}
