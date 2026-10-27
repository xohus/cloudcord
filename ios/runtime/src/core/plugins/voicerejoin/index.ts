import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";

import { pluginSettings, SettingsPage } from "../shared/settings";
import { joinVoice, myVoiceChannelId } from "../shared/voice";

// Mobile version of the VoiceRejoin plugin by omaw and keircn.
const settings = pluginSettings("cloudcord.voicerejoin", { lastChannel: "", lastSeen: 0, minutes: "10" });
let stopIntercept: (() => void) | undefined;
let rejoined = false;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.voicerejoin",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "VoiceRejoin",
            description: "Rejoins the call you were in when Discord restarts",
            authors: [{ name: "omaw" }, { name: "Key" }],
        },
    },
    start() {
        rejoined = false;
        stopIntercept = intercept(payload => {
            if (payload.type === "VOICE_CHANNEL_SELECT") {
                // Leaving on purpose clears it, so only calls cut off by a restart are rejoined.
                settings.store.lastChannel = payload.channelId ?? "";
                settings.store.lastSeen = Date.now();
            } else if (payload.type === "CONNECTION_OPEN" && !rejoined) {
                rejoined = true;
                const channel = settings.get("lastChannel");
                const recent = Date.now() - Number(settings.get("lastSeen") || 0) < (Number(settings.get("minutes")) || 10) * 60_000;
                if (channel && recent && !myVoiceChannelId()) setTimeout(() => joinVoice(channel), 3000);
            }
            return undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [{ key: "minutes", type: "text", label: "Rejoin if Discord restarted within this many minutes", placeholder: "10" }],
    }),
});
