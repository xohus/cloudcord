/*
 * CloudCord server clone
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Copies a server you can see into a new server you own, through the same API calls
// Discord makes when you set a server up by hand. Shared by desktop and mobile.
// It goes slowly on purpose and waits whenever Discord asks it to (rate limits).

export interface CloneRest {
    get(request: { url: string; }): Promise<{ body: any; status?: number; }>;
    post(request: { url: string; body?: any; attachments?: any[]; }): Promise<{ body: any; status?: number; }>;
    patch(request: { url: string; body?: any; }): Promise<{ body: any; status?: number; }>;
    del(request: { url: string; }): Promise<any>;
}

export interface CloneOptions {
    rest: CloneRest;
    sourceGuildId: string;
    /** Name for the new server; defaults to the source name. */
    name?: string;
    onProgress?: (step: string, done: number, total: number) => void;
    /** What to copy; everything by default. */
    include?: Partial<Record<"roles" | "channels" | "emojis" | "stickers" | "settings", boolean>>;
    /** Pause between calls, in ms. */
    pace?: number;
    /** Set to stop between steps. */
    signal?: { cancelled: boolean; };
}

export interface CloneResult {
    guildId: string;
    skipped: string[];
}

const CDN = "https://cdn.discordapp.com";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Channel types: 0 text, 2 voice, 4 category, 5 announcement, 13 stage, 15 forum, 16 media.
// Announcement, stage and media channels need Community; fall back to the nearest basic type.
const FALLBACK_TYPE: Record<number, number> = { 5: 0, 13: 2, 15: 0, 16: 0 };

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Base64 without relying on btoa/FileReader, which mobile doesn't always have. */
export function toBase64(bytes: Uint8Array) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
        out += BASE64[a >> 2] + BASE64[((a & 3) << 4) | ((b ?? 0) >> 4)]
            + (b === undefined ? "=" : BASE64[((b & 15) << 2) | ((c ?? 0) >> 6)])
            + (c === undefined ? "=" : BASE64[c & 63]);
    }
    return out;
}

async function imageDataUrl(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`image ${response.status}`);
    const type = response.headers.get("content-type") || (url.includes(".gif") ? "image/gif" : "image/png");
    return `data:${type};base64,${toBase64(new Uint8Array(await response.arrayBuffer()))}`;
}

const iconUrl = (kind: string, id: string, hash?: string | null) =>
    hash ? `${CDN}/${kind}/${id}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=1024` : null;

/** Plans the work so the progress count is known up front. Exported for tests. */
export function planChannels(channels: any[]) {
    const categories = channels.filter(channel => channel.type === 4).sort((a, b) => a.position - b.position);
    const rest = channels.filter(channel => channel.type !== 4 && [0, 2, 5, 13, 15, 16].includes(channel.type))
        .sort((a, b) => (a.parent_id || "").localeCompare(b.parent_id || "") || a.position - b.position);
    return [...categories, ...rest];
}

export async function cloneServer(options: CloneOptions): Promise<CloneResult> {
    const { rest, sourceGuildId } = options;
    const include = { roles: true, channels: true, emojis: true, stickers: true, settings: true, ...options.include };
    const pace = options.pace ?? 700;
    const skipped: string[] = [];
    let done = 0, total = 1;
    const progress = (step: string) => options.onProgress?.(step, done, total);
    const check = () => { if (options.signal?.cancelled) throw new Error("Cancelled"); };

    // One call, waiting and retrying when Discord rate-limits us.
    const call = async <T>(run: () => Promise<T>): Promise<T> => {
        for (let attempt = 0; ; attempt++) {
            check();
            try {
                const result = await run();
                await sleep(pace);
                return result;
            } catch (error: any) {
                const status = error?.status ?? error?.body?.status;
                const retry = Number(error?.body?.retry_after ?? error?.retry_after);
                if (status === 429 && attempt < 5) { await sleep(Math.ceil((retry || 2) * 1000) + 250); continue; }
                throw error;
            }
        }
    };
    const body = (response: any) => response?.body ?? response;

    progress("Reading the server");
    const guild = body(await call(() => rest.get({ url: `/guilds/${sourceGuildId}` })));
    const roles: any[] = include.roles ? body(await call(() => rest.get({ url: `/guilds/${sourceGuildId}/roles` }))) || [] : [];
    const channels: any[] = include.channels ? planChannels(body(await call(() => rest.get({ url: `/guilds/${sourceGuildId}/channels` }))) || []) : [];
    const emojis: any[] = include.emojis ? (guild.emojis || body(await call(() => rest.get({ url: `/guilds/${sourceGuildId}/emojis` }))) || []) : [];
    const stickers: any[] = include.stickers ? (guild.stickers || body(await call(() => rest.get({ url: `/guilds/${sourceGuildId}/stickers` })).catch(() => ({ body: [] }))) || []) : [];
    const copyRoles = roles.filter(role => role.id !== sourceGuildId && !role.managed).sort((a, b) => a.position - b.position);
    total = 2 + copyRoles.length + channels.length + emojis.length + stickers.length + (include.settings ? 1 : 0);

    progress("Creating the server");
    let icon: string | null = null;
    try { const url = iconUrl("icons", sourceGuildId, guild.icon); if (url) icon = await imageDataUrl(url); } catch { skipped.push("server icon"); }
    const created = body(await call(() => rest.post({ url: "/guilds", body: { name: (options.name || guild.name || "Server").slice(0, 100), icon } })));
    const guildId = created.id;
    done++;

    // A new server starts with a couple of default channels; clear them for a faithful copy.
    if (include.channels) {
        const defaults: any[] = body(await call(() => rest.get({ url: `/guilds/${guildId}/channels` }))) || [];
        for (const channel of defaults) { try { await call(() => rest.del({ url: `/channels/${channel.id}` })); } catch { } }
    }
    done++;

    // Roles, lowest first, so the order matches; @everyone keeps its permissions.
    const roleMap = new Map<string, string>([[sourceGuildId, guildId]]);
    const everyone = roles.find(role => role.id === sourceGuildId);
    if (everyone) { try { await call(() => rest.patch({ url: `/guilds/${guildId}/roles/${guildId}`, body: { permissions: everyone.permissions } })); } catch { skipped.push("@everyone permissions"); } }
    for (const role of copyRoles) {
        progress(`Role ${role.name}`);
        try {
            let roleIcon: string | null = null;
            const url = iconUrl("role-icons", role.id, role.icon);
            if (url) { try { roleIcon = await imageDataUrl(url); } catch { } }
            const made = body(await call(() => rest.post({ url: `/guilds/${guildId}/roles`, body: {
                name: role.name, permissions: role.permissions, color: role.color, hoist: role.hoist, mentionable: role.mentionable,
                ...(roleIcon ? { icon: roleIcon } : {}), ...(role.unicode_emoji ? { unicode_emoji: role.unicode_emoji } : {}),
            } })));
            roleMap.set(role.id, made.id);
        } catch { skipped.push(`role "${role.name}"`); }
        done++;
    }
    if (copyRoles.length) {
        const positions = copyRoles.filter(role => roleMap.has(role.id)).map((role, index) => ({ id: roleMap.get(role.id), position: index + 1 }));
        try { await call(() => rest.patch({ url: `/guilds/${guildId}/roles`, body: positions })); } catch { skipped.push("role order"); }
    }

    // Categories first, then channels inside them, with permissions mapped to the new roles.
    const channelMap = new Map<string, string>();
    const overwrites = (list: any[] = []) => list
        .filter(item => item.type === 1 || roleMap.has(item.id))
        .map(item => ({ id: item.type === 1 ? item.id : roleMap.get(item.id), type: item.type, allow: item.allow, deny: item.deny }));
    for (const channel of channels) {
        progress(`Channel ${channel.name}`);
        const payload: any = {
            name: channel.name, type: channel.type, topic: channel.topic ?? undefined, nsfw: channel.nsfw ?? false,
            position: channel.position, rate_limit_per_user: channel.rate_limit_per_user ?? 0,
            bitrate: channel.type === 2 || channel.type === 13 ? Math.min(channel.bitrate || 64000, 96000) : undefined,
            user_limit: channel.user_limit ?? undefined, rtc_region: channel.rtc_region ?? undefined,
            parent_id: channel.parent_id ? channelMap.get(channel.parent_id) : undefined,
            permission_overwrites: overwrites(channel.permission_overwrites),
            default_auto_archive_duration: channel.default_auto_archive_duration ?? undefined,
            available_tags: channel.type === 15 || channel.type === 16 ? (channel.available_tags || []).map((tag: any) => ({ name: tag.name, moderated: tag.moderated, emoji_name: tag.emoji_name ?? null })) : undefined,
        };
        try {
            const made = body(await call(() => rest.post({ url: `/guilds/${guildId}/channels`, body: payload })));
            channelMap.set(channel.id, made.id);
        } catch {
            // Community-only types: create the closest basic channel instead.
            const fallback = FALLBACK_TYPE[channel.type];
            try {
                if (fallback === undefined) throw new Error("no fallback");
                const made = body(await call(() => rest.post({ url: `/guilds/${guildId}/channels`, body: { ...payload, type: fallback, available_tags: undefined } })));
                channelMap.set(channel.id, made.id);
                skipped.push(`#${channel.name} became a ${fallback === 2 ? "voice" : "text"} channel (needs Community)`);
            } catch { skipped.push(`channel #${channel.name}`); }
        }
        done++;
    }

    // Emojis and stickers are re-uploaded; a new server has limited slots.
    for (const emoji of emojis) {
        progress(`Emoji :${emoji.name}:`);
        try {
            const image = await imageDataUrl(`${CDN}/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}`);
            await call(() => rest.post({ url: `/guilds/${guildId}/emojis`, body: { name: emoji.name, image, roles: (emoji.roles || []).map((id: string) => roleMap.get(id)).filter(Boolean) } }));
        } catch { skipped.push(`emoji :${emoji.name}:`); }
        done++;
    }
    for (const sticker of stickers) {
        progress(`Sticker ${sticker.name}`);
        try {
            // Format 1 png, 2 apng, 4 gif. Lottie (3) stickers can't be uploaded by users.
            if (sticker.format_type === 3) throw new Error("lottie");
            const extension = sticker.format_type === 4 ? "gif" : "png";
            const response = await fetch(`https://media.discordapp.net/stickers/${sticker.id}.${extension}`);
            if (!response.ok) throw new Error(`sticker ${response.status}`);
            const file = new Blob([await response.arrayBuffer()], { type: extension === "gif" ? "image/gif" : "image/png" });
            await call(() => rest.post({
                url: `/guilds/${guildId}/stickers`,
                attachments: [{ name: "file", file, filename: `${sticker.name}.${extension}` }],
                body: { name: sticker.name, tags: sticker.tags || "⭐", description: sticker.description || "" },
            }));
        } catch { skipped.push(`sticker "${sticker.name}"`); }
        done++;
    }

    // Server settings last, once the channels they point at exist.
    if (include.settings) {
        progress("Server settings");
        const settings: any = {
            description: guild.description ?? undefined, verification_level: guild.verification_level,
            default_message_notifications: guild.default_message_notifications, explicit_content_filter: guild.explicit_content_filter,
            afk_timeout: guild.afk_timeout, afk_channel_id: guild.afk_channel_id ? channelMap.get(guild.afk_channel_id) : undefined,
            system_channel_id: guild.system_channel_id ? channelMap.get(guild.system_channel_id) : undefined,
            system_channel_flags: guild.system_channel_flags, preferred_locale: guild.preferred_locale,
        };
        try { await call(() => rest.patch({ url: `/guilds/${guildId}`, body: settings })); } catch { skipped.push("server settings"); }
        // Banner and invite background need boosts; try, and note it if Discord says no.
        for (const [field, kind, hash] of [["banner", "banners", guild.banner], ["splash", "splashes", guild.splash]] as const) {
            const url = iconUrl(kind, sourceGuildId, hash);
            if (!url) continue;
            try { await call(async () => rest.patch({ url: `/guilds/${guildId}`, body: { [field]: await imageDataUrl(url) } })); }
            catch { skipped.push(`server ${field} (needs boosts)`); }
        }
        done++;
    }

    progress("Done");
    return { guildId, skipped };
}
