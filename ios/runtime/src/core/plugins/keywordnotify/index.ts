import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";
import { showToast } from "@lib/ui/toasts";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the KeywordNotify plugin by camila314 and x3rt.
const settings = pluginSettings("cloudcord.keywordnotify", { keywords: "", ignoreBots: true });
export function matchesKeyword(text: string, keywords: string) {
    return keywords.split(",").map(k => k.trim()).filter(Boolean).some(k => {
        const regex = k.match(/^\/(.+)\/([a-z]*)$/);
        if (regex) { try { return new RegExp(regex[1], regex[2] || "i").test(text); } catch { return false; } }
        return text.toLowerCase().includes(k.toLowerCase());
    });
}
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.keywordnotify",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "KeywordNotify",
            description: "Shows a notice when a message contains your keywords",
            authors: ["camila314","x3rt"].map(name => ({ name })),
        },
    },
    start() {
        stop = intercept(payload => {
            const message = payload.type === "MESSAGE_CREATE" && !payload.optimistic ? payload.message : null;
            if (!message?.content || (settings.get("ignoreBots") && message.author?.bot)) return undefined;
            if (message.author?.id === findByStoreName("UserStore")?.getCurrentUser?.()?.id) return undefined;
            if (matchesKeyword(message.content, String(settings.get("keywords") || ""))) {
                const name = message.author?.global_name || message.author?.username || "Someone";
                setTimeout(() => showToast(`${name}: ${message.content.slice(0, 80)}`), 0);
            }
            return undefined;
        });
    },
    stop() { stop?.(); stop = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "keywords", type: "text", label: "Keywords", hint: "Separate with commas. Use /pattern/ for a regular expression." },
            { key: "ignoreBots", type: "switch", label: "Ignore bots" },
        ],
    }),
});
