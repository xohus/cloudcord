import { defineCorePlugin } from "..";
import { instead } from "@lib/api/patcher";
import { findByStoreName } from "@metro";
import { messageUtil } from "@metro/common";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the SplitLargeMessages plugin by Reycko.
const settings = pluginSettings("cloudcord.splitlargemessages", { maxLength: "", delaySeconds: "1", hardSplit: false });

export function splitMessage(content: string, max: number, hardSplit = false) {
    const chunks: string[] = [];
    let rest = content.trim();
    while (rest.length > max) {
        const soft = Math.max(rest.lastIndexOf(" ", max), rest.lastIndexOf("\n", max));
        const at = hardSplit || soft <= 0 ? max : soft;
        chunks.push(rest.slice(0, at));
        rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
}

let unpatch: (() => unknown) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.splitlargemessages",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SplitLargeMessages",
            description: "Sends messages over the length limit as several messages instead of a file",
            authors: [{ name: "Reycko" }],
        },
    },
    start() {
        unpatch = instead("sendMessage", messageUtil, (args: any[], original: Function) => {
            const [channelId, message] = args;
            const content = message?.content;
            const nitro = findByStoreName("UserStore")?.getCurrentUser?.()?.premiumType === 2;
            const max = Number(settings.get("maxLength")) || (nitro ? 4000 : 2000);
            const slowmode = Number(findByStoreName("ChannelStore")?.getChannel?.(channelId)?.rateLimitPerUser ?? 0) > 0;
            if (typeof content !== "string" || content.length <= max || slowmode) return original(...args);
            const chunks = splitMessage(content, max, settings.get("hardSplit"));
            const delay = Math.max(0, Number(settings.get("delaySeconds")) || 0) * 1000;
            // The first part goes out with the original options (reply etc.); the rest follow in order.
            const first = original(channelId, { ...message, content: chunks[0] }, ...args.slice(2));
            void (async () => {
                for (const chunk of chunks.slice(1)) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    await original(channelId, { content: chunk });
                }
            })();
            return first;
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "maxLength", type: "text", label: "Split above this many characters", placeholder: "Automatic (2000, or 4000 with Nitro)" },
            { key: "delaySeconds", type: "text", label: "Seconds between parts", placeholder: "1" },
            { key: "hardSplit", type: "switch", label: "Split exactly at the limit", hint: "Otherwise splits at the last space or new line" },
        ],
    }),
});
