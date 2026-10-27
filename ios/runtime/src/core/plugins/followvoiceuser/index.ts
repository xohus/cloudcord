import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";

import { pluginSettings, SettingsPage } from "../shared/settings";
import { joinVoice, myVoiceChannelId, VoiceState } from "../shared/voice";

// Mobile version of the FollowVoiceUser plugin by TheArmagan.
const settings = pluginSettings("cloudcord.followvoiceuser", { userId: "" });
let stopIntercept: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.followvoiceuser",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "FollowVoiceUser",
            description: "Follows a friend into whatever voice channel they join",
            authors: [{ name: "TheArmagan" }],
        },
    },
    start() {
        stopIntercept = intercept(payload => {
            if (payload.type !== "VOICE_STATE_UPDATES") return undefined;
            const target = String(settings.get("userId") || "").trim();
            if (!target) return undefined;
            const state = (payload.voiceStates as VoiceState[] | undefined)?.find(s => s.userId === target);
            if (state?.channelId && state.channelId !== myVoiceChannelId()) setTimeout(() => joinVoice(state.channelId!), 0);
            return undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [{ key: "userId", type: "text", label: "User ID to follow", hint: "Long-press them, then Copy ID. Leave empty to stop following." }],
    }),
});
