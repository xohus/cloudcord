import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the ReplyPingControl plugin by ant0n, MrDiamond and Key: choose whether
// replies to you ping you, with exceptions.
const settings = pluginSettings("cloudcord.replypingcontrol", { alwaysPing: false, whitelist: "", blacklist: "" });
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.replypingcontrol",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "ReplyPingControl",
            description: "Choose whether replies to you ping you, with exceptions",
            authors: ["ant0n","MrDiamond","Key"].map(name => ({ name })),
        },
    },
    start() {
        stop = intercept(payload => {
            const message = payload.type === "MESSAGE_CREATE" ? payload.message : null;
            const me = findByStoreName("UserStore")?.getCurrentUser?.()?.id;
            if (!message || !me || message.referenced_message?.author?.id !== me || message.author?.id === me) return undefined;
            const author = String(message.author?.id);
            const mentions: any[] = message.mentions ?? [];
            const pinged = mentions.some(m => (m?.id ?? m) === me);
            const always = settings.get("alwaysPing") ? !new Set(String(settings.get("blacklist") || "").split(/[\s,]+/).filter(Boolean)).has(author) : new Set(String(settings.get("whitelist") || "").split(/[\s,]+/).filter(Boolean)).has(author);
            if (always && !pinged) return { message: { ...message, mentions: [...mentions, message.referenced_message.author] } };
            if (!always && pinged) return { message: { ...message, mentions: mentions.filter(m => (m?.id ?? m) !== me) } };
            return undefined;
        });
    },
    stop() { stop?.(); stop = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "alwaysPing", type: "switch", label: "Always ping me on replies", hint: "Off: replies never ping you, except from the always-ping list" },
            { key: "whitelist", type: "text", label: "Always ping from these user IDs", hint: "Used when the switch is off" },
            { key: "blacklist", type: "text", label: "Never ping from these user IDs", hint: "Used when the switch is on" },
        ],
    }),
});
