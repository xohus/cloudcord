import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the IgnoreCalls plugin by TheArmagan and thororen.
const settings = pluginSettings("cloudcord.ignorecalls", { ids: "" });
const ignored = () => new Set(String(settings.get("ids") || "").split(/[\s,]+/).filter(Boolean));

let stopIntercept: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.ignorecalls",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "IgnoreCalls",
            description: "Don't ring for calls from people or group DMs you choose",
            authors: [{ name: "TheArmagan" }, { name: "thororen" }],
        },
    },
    start() {
        stopIntercept = intercept(payload => {
            if (payload.type !== "CALL_CREATE" && payload.type !== "CALL_UPDATE") return undefined;
            const me = findByStoreName("UserStore")?.getCurrentUser?.()?.id;
            const ringing: string[] = Array.isArray(payload.ringing) ? payload.ringing : [];
            if (!me || !ringing.includes(me)) return undefined;
            const list = ignored();
            const recipients: string[] = findByStoreName("ChannelStore")?.getChannel?.(payload.channelId)?.recipients ?? [];
            const fromIgnored = list.has(String(payload.channelId)) || (recipients.length === 1 && list.has(String(recipients[0])));
            // Take yourself off the ringing list so the call shows but doesn't ring.
            return fromIgnored ? { ringing: ringing.filter(id => id !== me) } : undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [{ key: "ids", type: "text", label: "User or group DM IDs to ignore", hint: "Separate with commas. Long-press a user or DM, then Copy ID." }],
    }),
});
