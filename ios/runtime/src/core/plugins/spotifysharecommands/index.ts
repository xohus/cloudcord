import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { findByStoreName } from "@metro";
import { messageUtil } from "@metro/common";

// Mobile version of the SpotifyShareCommands plugin by katlyn.
function track() {
    const store = findByStoreName("SpotifyStore");
    return store?.getTrack?.() ?? store?.getActivity?.()?.metadata ?? null;
}
const share = (pick: (track: any) => string | null | undefined, missing: string) => (_: any[], ctx: any) => {
    const current = track();
    const link = current ? pick(current) : null;
    if (!link) { messageUtil.sendBotMessage(ctx.channel.id, missing); return; }
    return { content: link };
};

const COMMANDS = [
    { name: "track", description: "Send the Spotify track you're playing", execute: share(t => t.id ? `https://open.spotify.com/track/${t.id}` : null, "You're not listening to anything on Spotify.") },
    { name: "album", description: "Send the album you're playing on Spotify", execute: share(t => t.album?.id ? `https://open.spotify.com/album/${t.album.id}` : null, "No album to share.") },
    { name: "artist", description: "Send the artist you're playing on Spotify", execute: share(t => t.artists?.[0]?.external_urls?.spotify ?? (t.artists?.[0]?.id ? `https://open.spotify.com/artist/${t.artists[0].id}` : null), "No artist to share.") },
];

let unregisters: (() => void)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.spotifysharecommands",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SpotifyShareCommands",
            description: "Share what you're playing on Spotify with /track, /album and /artist",
            authors: [{ name: "katlyn" }],
        },
    },
    start() { unregisters = COMMANDS.map(command => registerCommand({ ...command, options: [] } as any)); },
    stop() { unregisters.forEach(unregister => unregister()); unregisters = []; },
});
