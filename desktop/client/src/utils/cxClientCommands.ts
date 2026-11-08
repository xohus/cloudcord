export const cxClientFunctions = {
    roleMembers: { permission: "guild.members", input: "role" },
    randomMember: { permission: "guild.randommember", input: "text" },
    spotifyTrack: { permission: "spotify.activity", input: "text" },
    spotifyAlbum: { permission: "spotify.activity", input: "text" },
    spotifyArtist: { permission: "spotify.activity", input: "text" },
} as const;

export type CxClientFunction = keyof typeof cxClientFunctions;

// WikiLookup by rootpoi, kraethis and ewlle (GPL-3.0-or-later).
async function lookupWikipedia(input: string, signal: AbortSignal) {
    const query = input.trim();
    if (!query || query.length > 120 || query === "." || query === "..") return "Enter a Wikipedia article title up to 120 characters.";
    const escaped = (value: string) => value.replace(/@/g, "＠").replace(/[\\\x60*_~|<>[\]]/g, "\\$&");
    const title = encodeURIComponent(query);
    const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + title, {
        credentials: "omit",
        redirect: "error",
        headers: { "Api-User-Agent": "CloudCord (https://getcloudcord.com)" },
        signal,
    });
    if (response.status === 404) return "No Wikipedia article found for **" + escaped(query) + "**.";
    if (!response.ok) throw new Error("Wikipedia lookup failed");
    const data: { type?: unknown; title?: unknown; extract?: unknown; content_urls?: { desktop?: { page?: unknown; }; }; } = await response.json();
    if (data.type === "disambiguation" || typeof data.extract !== "string" || !data.extract.trim()) {
        return "**" + escaped(query) + "** is ambiguous. Try a more specific title.";
    }
    const heading = typeof data.title === "string" ? data.title : query;
    const page = data.content_urls?.desktop?.page;
    const url = typeof page === "string" && /^https:\/\/en\.wikipedia\.org\/wiki\/[^\s<>]{1,500}$/.test(page)
        ? page : "https://en.wikipedia.org/wiki/" + title;
    const excerpt = escaped(data.extract.trim().slice(0, 1200));
    return "**" + escaped(heading.slice(0, 120)) + "**\n" + excerpt.slice(0, 1600) + "\n<" + url + ">";
}

export const cxExternalLookups = {
    wikipedia: { permission: "lookup.wikipedia", run: lookupWikipedia },
} as const;
export type CxExternalLookup = keyof typeof cxExternalLookups;

// Adapted from CloudCord mobile's Translate command by Vee, AshtonMemer and koish1.
export async function translateCxText(text: string, target: string, signal: AbortSignal) {
    const query = Object.entries({ client: "gtx", sl: "auto", tl: target, dt: "t", q: text })
        .map(([key, value]) => key + "=" + encodeURIComponent(value)).join("&");
    if (query.length > 16_000) throw new Error("Translation input is too long");
    const response = await fetch("https://translate.googleapis.com/translate_a/single?" + query, {
        credentials: "omit", redirect: "error", signal,
    });
    if (!response.ok) throw new Error("Translation request failed");
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("Invalid translation response");
    const translated = data[0].map(part => Array.isArray(part) && typeof part[0] === "string" ? part[0] : "").join("");
    if (!translated.trim() || translated.length > 4000) throw new Error("Invalid translation text");
    const language = typeof data[2] === "string" && /^[a-z]{2,3}(?:-[a-z]{2,8})?$/i.test(data[2]) ? data[2] : "auto";
    return { translated, language };
}

type SpotifyTrack = {
    id?: unknown;
    album?: { id?: unknown; };
    artists?: readonly { id?: unknown; external_urls?: { spotify?: unknown; }; }[];
};

export function formatCxSpotify(action: Exclude<CxClientFunction, "roleMembers" | "randomMember">, text: string, track?: SpotifyTrack | null) {
    if (!track) return;
    const artist = track.artists?.[0];
    const external = artist?.external_urls?.spotify;
    const artistId = typeof external === "string" ? /^https:\/\/open\.spotify\.com\/artist\/([a-z0-9]{22})(?:\?[^#]*)?$/i.exec(external)?.[1] : undefined;
    const [type, id] = action === "spotifyTrack" ? ["track", track.id]
        : action === "spotifyAlbum" ? ["album", track.album?.id] : ["artist", artistId ?? artist?.id];
    if (typeof id !== "string" || !/^[a-z0-9]{22}$/i.test(id)) return;
    return [text.trim(), "https://open.spotify.com/" + type + "/" + id].filter(Boolean).join(" ");
}

export function formatCxRandomMember(text: string, members: readonly RoleMember[], currentUser: string | undefined) {
    const ids = members.map(member => member?.userId).filter(id => id !== currentUser && /^\d{15,22}$/.test(id));
    const member = ids[Math.floor(Math.random() * ids.length)];
    if (member) return ("<@" + member + "> " + text).trim();
}

export type CxFriendInviteAction = "create" | "list" | "revoke";
type FriendInvite = { code?: unknown; expires_at?: unknown; uses?: unknown; max_uses?: unknown; };
type FriendInvites = {
    createFriendInvite: () => Promise<FriendInvite>;
    getAllFriendInvites: () => Promise<FriendInvite[]>;
    revokeFriendInvites: () => Promise<unknown>;
};

function inviteDetails(invite: FriendInvite, list: boolean) {
    if (typeof invite?.code !== "string" || !/^[a-z0-9-]{1,48}$/i.test(invite.code)) return;
    const timestamp = typeof invite.expires_at === "string" ? Date.parse(invite.expires_at) : NaN;
    const expiry = Number.isFinite(timestamp) ? " · Expires <t:" + Math.round(timestamp / 1000) + ":R>" : "";
    const max = Number.isSafeInteger(invite.max_uses) ? invite.max_uses : "?";
    const uses = Number.isSafeInteger(invite.uses) ? invite.uses : "?";
    return "discord.gg/" + invite.code + expiry + (list ? " · Used " + uses + "/" + max : " · Max uses: " + max);
}

export async function runCxFriendInvites(action: CxFriendInviteAction, api: FriendInvites | undefined) {
    if (!api) throw new Error("Friend invites are unavailable");
    if (action === "create") return inviteDetails(await api.createFriendInvite(), false) ?? "Discord did not return an invite link.";
    if (action === "revoke") {
        await api.revokeFriendInvites();
        return "All friend invites have been revoked.";
    }
    const invites = await api.getAllFriendInvites();
    const lines = invites.slice(0, 15).map(invite => inviteDetails(invite, true)).filter(Boolean);
    if (!lines.length) return "You have no active friend invites.";
    return lines.join("\n") + (invites.length > 15 ? "\n… " + (invites.length - 15) + " more." : "");
}

type RoleMember = { userId: string; roles?: readonly string[]; nick?: string | null; };
type UserName = { globalName?: string | null; username?: string; };

export function formatCxRoleMembers(role: string, guild: string | undefined, members: readonly RoleMember[], getUser: (id: string) => UserName | undefined) {
    if (!guild) return "Use this in a server.";
    const matching = members.filter(member => role === guild || member?.roles?.includes(role));
    if (!matching.length) return "Nobody loaded has that role. Open the member list to load more members.";
    const names = matching.slice(0, 32).map(({ userId, nick }) => {
        const user = getUser(userId);
        return (nick || user?.globalName || user?.username || userId).slice(0, 64).replace(/[\\*_~`<>@\r\n]/g, char =>
            char === "@" ? "＠" : char === "\r" || char === "\n" ? " " : "\\" + char
        );
    });
    return "**" + matching.length + " loaded member" + (matching.length === 1 ? "" : "s") + "** with <@&" + role + ">:\n"
        + names.join(", ") + (matching.length > names.length ? ", …" : "");
}

type ChannelRow = { channel?: { id?: string; }; };
type ReadChannel = { channelId: string; messageId: string; readStateType: 0; };
type UnreadStores = {
    guilds: { getGuilds: () => Record<string, { id: string; }>; };
    channels: { getChannels: (guildId: string) => { SELECTABLE?: ChannelRow[]; VOCAL?: ChannelRow[]; }; };
    threads?: { getActiveJoinedThreadsForGuild: (guildId: string) => Record<string, Record<string, ChannelRow>>; };
    read: { hasUnread: (channelId: string) => boolean; lastMessageId: (channelId: string) => string | null | undefined; };
};

export function markCxServersRead(stores: UnreadStores, acknowledge: (channels: ReadChannel[]) => void) {
    const channels = new Map<string, ReadChannel>();
    for (const { id } of Object.values(stores.guilds.getGuilds())) {
        const listed = stores.channels.getChannels(id);
        const threads = Object.values(stores.threads?.getActiveJoinedThreadsForGuild(id) ?? {}).flatMap(group => Object.values(group));
        for (const row of [...(listed?.SELECTABLE ?? []), ...(listed?.VOCAL ?? []), ...threads]) {
            const channelId = row?.channel?.id;
            if (!channelId || channels.has(channelId) || !stores.read.hasUnread(channelId)) continue;
            const messageId = stores.read.lastMessageId(channelId);
            if (messageId) channels.set(channelId, { channelId, messageId, readStateType: 0 });
        }
    }
    if (!channels.size) return "Everything is already read.";
    acknowledge([...channels.values()]);
    return "Marked " + channels.size + " channel" + (channels.size === 1 ? "" : "s") + " as read.";
}

export async function markCxServersReadAndWait(stores: UnreadStores, acknowledge: (channels: ReadChannel[]) => unknown) {
    let result: unknown;
    const summary = markCxServersRead(stores, channels => { result = acknowledge(channels); });
    await result;
    return summary;
}

type ChannelSelection = { channelId?: unknown; messageId?: unknown; jumpToMessageId?: unknown; };
type ChannelOpenRead = {
    dispatcher: {
        subscribe: (event: "CHANNEL_SELECT", listener: (event: ChannelSelection) => void) => void;
        unsubscribe: (event: "CHANNEL_SELECT", listener: (event: ChannelSelection) => void) => void;
        dispatch: (event: { type: "BULK_ACK"; context: "APP"; channels: ReadChannel[]; } | { type: "CHANNEL_LOCAL_ACK"; channelId: string; }) => unknown;
    };
    selected: () => string | null | undefined;
    user: () => string | undefined;
    read: UnreadStores["read"];
    jump: (target: { channelId: string; messageId: string; flash: false; }) => unknown;
    enabled?: () => boolean;
};

export function bindCxChannelOpenRead({ dispatcher, selected, user, read, jump, enabled = () => true }: ChannelOpenRead) {
    if (typeof dispatcher?.subscribe !== "function" || typeof read?.lastMessageId !== "function") throw new Error("Discord channel read state is unavailable");
    let pending: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;
    let previous: string | undefined;
    let previousUser: string | undefined;
    function onSelect({ channelId, messageId: targetId, jumpToMessageId }: ChannelSelection) {
        const account = user();
        if (targetId || jumpToMessageId) {
            clearTimeout(pending);
            generation++;
            previous = undefined;
            return;
        }
        if (enabled() && channelId === previous && account === previousUser) return;
        clearTimeout(pending);
        const request = ++generation;
        previous = undefined;
        if (!enabled() || !account || typeof channelId !== "string" || !/^\d{17,20}$/.test(channelId)) return;
        previous = channelId;
        previousUser = account;
        pending = setTimeout(async () => {
            try {
                if (!enabled() || user() !== account || selected() !== channelId || !read.hasUnread(channelId)) return;
                const messageId = read.lastMessageId(channelId);
                if (!messageId || !/^\d{17,20}$/.test(messageId)) return;
                await dispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels: [{ channelId, messageId, readStateType: 0 }] });
                if (user() !== account) return;
                await dispatcher.dispatch({ type: "CHANNEL_LOCAL_ACK", channelId });
                if (request === generation && enabled() && user() === account && selected() === channelId)
                    await jump({ channelId, messageId, flash: false });
            } catch { /* Let Discord continue to handle the channel normally. */ }
        }, 0);
    }
    dispatcher.subscribe("CHANNEL_SELECT", onSelect);
    return () => { generation++; clearTimeout(pending); dispatcher.unsubscribe("CHANNEL_SELECT", onSelect); };
}
