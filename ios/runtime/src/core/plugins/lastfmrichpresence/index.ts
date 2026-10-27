import { defineCorePlugin } from "..";
import { FluxDispatcher } from "@metro/common";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the LastFMRichPresence plugin by dzshn, RuiNtD, blahajZip and archeruwu:
// shows the song you're scrobbling on Last.fm as "Listening to" on your profile.
const settings = pluginSettings("cloudcord.lastfmrichpresence", { username: "", apiKey: "" });
// The public Last.fm key the desktop plugin ships with; your own key can replace it.
const SHARED_API_KEY = "790c37d90400163a5a5fe00d6ca32ef0";
const DISCORD_APP_ID = "1108588077900898414";

export function activityFromLastfm(data: any) {
    const track = data?.recenttracks?.track?.[0];
    if (!track || track["@attr"]?.nowplaying !== "true") return null;
    const artist = track.artist?.["#text"] || track.artist?.name || "";
    const album = track.album?.["#text"] || "";
    const image = (track.image ?? []).find((i: any) => i.size === "extralarge")?.["#text"];
    return {
        application_id: DISCORD_APP_ID,
        name: artist ? `${artist} - ${track.name}` : track.name,
        details: track.name,
        state: artist ? `by ${artist}` : undefined,
        type: 2,
        assets: image ? { large_image: `mp:external/${image.replace(/^https?:\/\//, "")}`, large_text: album || undefined } : undefined,
        flags: 1 << 0,
    };
}

const setActivity = (activity: any) => FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: "LastFM" });
let timer: ReturnType<typeof setInterval> | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.lastfmrichpresence",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "LastFMRichPresence",
            description: "Shows what you're scrobbling on Last.fm as \"Listening to\" on your profile",
            authors: [{ name: "dzshn" }, { name: "RuiNtD" }, { name: "blahajZip" }, { name: "archeruwu" }],
        },
    },
    start() {
        let last = "";
        const update = async () => {
            const user = String(settings.get("username") || "").trim();
            if (!user) return;
            const key = String(settings.get("apiKey") || "").trim() || SHARED_API_KEY;
            try {
                const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&limit=1&format=json`);
                const activity = response.ok ? activityFromLastfm(await response.json()) : null;
                const next = JSON.stringify(activity);
                if (next !== last) { last = next; setActivity(activity); }
            } catch { /* try again on the next poll */ }
        };
        void settings.ready.then(update);
        timer = setInterval(update, 15_000);
    },
    stop() { clearInterval(timer); timer = undefined; setActivity(null); },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "username", type: "text", label: "Last.fm username" },
            { key: "apiKey", type: "text", label: "Your Last.fm API key (optional)" },
        ],
    }),
});
