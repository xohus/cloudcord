import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";
import { showToast } from "@lib/ui/toasts";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the MessageNotifier plugin by cassie and mochie.
const settings = pluginSettings("cloudcord.messagenotifier", { users: "" });
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.messagenotifier",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "MessageNotifier",
            description: "Shows a notice when people you choose send a message",
            authors: ["cassie","mochie"].map(name => ({ name })),
        },
    },
    start() {
        stop = intercept(payload => {
            const message = payload.type === "MESSAGE_CREATE" && !payload.optimistic ? payload.message : null;
            if (!message?.author?.id || !new Set(String(settings.get("users") || "").split(/[\s,]+/).filter(Boolean)).has(message.author.id)) return undefined;
            const channel = findByStoreName("ChannelStore")?.getChannel?.(message.channel_id);
            const where = channel?.name ? ` in #${channel.name}` : "";
            const name = message.author.global_name || message.author.username || "Someone";
            setTimeout(() => showToast(`${name}${where}: ${String(message.content || "sent an attachment").slice(0, 80)}`), 0);
            return undefined;
        });
    },
    stop() { stop?.(); stop = undefined; },
    SettingsComponent: () => SettingsPage({ store: settings.store, fields: [{ key: "users", type: "text", label: "User IDs", hint: "Separate with commas" }] }),
});
