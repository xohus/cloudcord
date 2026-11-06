export const cxClientFunctions = {
    roleMembers: { permission: "guild.members", input: "role" },
    spotifyTrack: { permission: "spotify.activity", input: "text" },
    spotifyAlbum: { permission: "spotify.activity", input: "text" },
    spotifyArtist: { permission: "spotify.activity", input: "text" },
} as const;

export type CxClientFunction = keyof typeof cxClientFunctions;

type SpotifyTrack = {
    id?: unknown;
    album?: { id?: unknown; };
    artists?: readonly { id?: unknown; external_urls?: { spotify?: unknown; }; }[];
};

export function formatCxSpotify(action: Exclude<CxClientFunction, "roleMembers">, text: string, track?: SpotifyTrack | null) {
    if (!track) return;
    const artist = track.artists?.[0];
    const external = artist?.external_urls?.spotify;
    const artistId = typeof external === "string" ? /^https:\/\/open\.spotify\.com\/artist\/([a-z0-9]{22})(?:\?[^#]*)?$/i.exec(external)?.[1] : undefined;
    const [type, id] = action === "spotifyTrack" ? ["track", track.id]
        : action === "spotifyAlbum" ? ["album", track.album?.id] : ["artist", artistId ?? artist?.id];
    if (typeof id !== "string" || !/^[a-z0-9]{22}$/i.test(id)) return;
    return [text.trim(), "https://open.spotify.com/" + type + "/" + id].filter(Boolean).join(" ");
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
type UnreadStores = {
    guilds: { getGuilds: () => Record<string, { id: string; }>; };
    channels: { getChannels: (guildId: string) => { SELECTABLE?: ChannelRow[]; VOCAL?: ChannelRow[]; }; };
    threads?: { getActiveJoinedThreadsForGuild: (guildId: string) => Record<string, Record<string, ChannelRow>>; };
    read: { hasUnread: (channelId: string) => boolean; lastMessageId: (channelId: string) => string | null | undefined; };
};

export function markCxServersRead(stores: UnreadStores, acknowledge: (channels: { channelId: string; messageId: string; readStateType: 0; }[]) => void) {
    const channels = new Map<string, { channelId: string; messageId: string; readStateType: 0; }>();
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
