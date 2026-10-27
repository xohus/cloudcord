import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";
import { showToast } from "@lib/ui/toasts";

import { myId, VoiceState } from "../shared/voice";

// Mobile version of the VoiceJoinMessages plugin by Sqaaakoi and thororen.
let stopIntercept: (() => void) | undefined;
const lastChannel = new Map<string, string | null>();

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.voicejoinmessages",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "VoiceJoinMessages",
            description: "Shows a notice when a friend joins a voice channel",
            authors: [{ name: "Sqaaakoi" }, { name: "thororen" }],
        },
    },
    start() {
        stopIntercept = intercept(payload => {
            if (payload.type !== "VOICE_STATE_UPDATES") return undefined;
            const relationships = findByStoreName("RelationshipStore");
            for (const state of (payload.voiceStates as VoiceState[] | undefined) ?? []) {
                const before = lastChannel.get(state.userId) ?? state.oldChannelId ?? null;
                lastChannel.set(state.userId, state.channelId ?? null);
                if (!state.channelId || state.channelId === before || state.userId === myId() || !relationships?.isFriend?.(state.userId)) continue;
                const user = findByStoreName("UserStore")?.getUser?.(state.userId);
                const channel = findByStoreName("ChannelStore")?.getChannel?.(state.channelId);
                const name = user?.globalName || user?.username || "A friend";
                setTimeout(() => showToast(`${name} joined ${channel?.name ? `🔊 ${channel.name}` : "a voice channel"}`), 0);
            }
            return undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; lastChannel.clear(); },
});
