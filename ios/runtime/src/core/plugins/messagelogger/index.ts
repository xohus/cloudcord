import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";
import { FluxDispatcher } from "@metro/common";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of MessageLogger (by rushii, Vee, AutumnVN, Nickyux, Kyuuhachi and justjxke) and MessageLoggerEnhanced (by Syncxv and Key): deleted
// messages stay visible, marked as deleted, and edits keep the earlier text underneath.
// Only messages seen while CloudCord is open can be kept.
const settings = pluginSettings("cloudcord.messagelogger", { logDeletes: true, logEdits: true, ignoreBots: true, ignoreSelf: false });
const DELETED_MARK = "\n-# 🗑️ deleted";
let stopIntercept: (() => void) | undefined;

function keep(message: any) {
    if (!message || typeof message.content !== "string") return false;
    if (settings.get("ignoreBots") && message.author?.bot) return false;
    if (settings.get("ignoreSelf") && message.author?.id === findByStoreName("UserStore")?.getCurrentUser?.()?.id) return false;
    return true;
}

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.messagelogger",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "MessageLogger",
            description: "Keeps deleted messages visible and shows what edited messages said before",
            authors: ["rushii", "Vee", "AutumnVN", "Nickyux", "Kyuuhachi", "justjxke", "Syncxv", "Key"].map(name => ({ name })),
        },
    },
    start() {
        stopIntercept = intercept(payload => {
            if (payload.type === "MESSAGE_DELETE" && settings.get("logDeletes") && !payload.__cloudcordLogged) {
                const message = findByStoreName("MessageStore")?.getMessage?.(payload.channelId, payload.id);
                if (!keep(message) || message.content.endsWith(DELETED_MARK)) return undefined;
                // Block the delete and mark the message instead.
                setTimeout(() => FluxDispatcher.dispatch({
                    type: "MESSAGE_UPDATE",
                    message: { ...(message.toJS?.() ?? message), id: payload.id, channel_id: payload.channelId, content: message.content + DELETED_MARK },
                    __cloudcordLogged: true,
                }), 0);
                return false;
            }
            if (payload.type === "MESSAGE_UPDATE" && settings.get("logEdits") && !payload.__cloudcordLogged) {
                const next = payload.message;
                const previous = next?.id ? findByStoreName("MessageStore")?.getMessage?.(next.channel_id, next.id) : null;
                if (!keep(previous) || typeof next?.content !== "string" || next.content === previous.content) return undefined;
                const history = previous.content.split("\n-# ✏️ ")[0];
                return { message: { ...next, content: `${next.content}\n-# ✏️ before: ${history.slice(0, 500)}` } };
            }
            return undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        intro: "Only messages you've seen while CloudCord is open can be kept. Nothing is sent to anyone.",
        fields: [
            { key: "logDeletes", type: "switch", label: "Keep deleted messages" },
            { key: "logEdits", type: "switch", label: "Show what edited messages said before" },
            { key: "ignoreBots", type: "switch", label: "Ignore bots" },
            { key: "ignoreSelf", type: "switch", label: "Ignore my own messages" },
        ],
    }),
});
