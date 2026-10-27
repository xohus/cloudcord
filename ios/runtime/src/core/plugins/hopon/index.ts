import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";
import { url as linking } from "@metro/common";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the HopOn plugin by ImLvna.
const settings = pluginSettings("cloudcord.hopon", { pattern: "hop on", url: "" });
let stopIntercept: (() => void) | undefined;
let lastOpened = 0;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.hopon",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "HopOn",
            description: "Opens a link you choose when a message in the channel you're viewing matches your pattern",
            authors: [{ name: "lillith <3" }],
        },
    },
    start() {
        stopIntercept = intercept(payload => {
            if (payload.type !== "MESSAGE_CREATE" || payload.optimistic) return undefined;
            const link = String(settings.get("url") || "").trim();
            if (!/^https?:\/\//i.test(link) || Date.now() - lastOpened < 10_000) return undefined;
            if (payload.channelId !== findByStoreName("SelectedChannelStore")?.getChannelId?.()) return undefined;
            let re: RegExp;
            try { re = new RegExp(String(settings.get("pattern") || ""), "i"); } catch { return undefined; }
            if (typeof payload.message?.content === "string" && re.test(payload.message.content)) {
                lastOpened = Date.now();
                setTimeout(() => linking?.openURL?.(link), 0);
            }
            return undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "pattern", type: "text", label: "Message pattern (regular expression)", placeholder: "hop on" },
            { key: "url", type: "text", label: "Link to open", placeholder: "https://…", hint: "Opens at most once every 10 seconds" },
        ],
    }),
});
