import { defineCorePlugin } from "..";
import { instead } from "@lib/api/patcher";
import { findByProps, findByStoreName } from "@metro";
import { messageUtil } from "@metro/common";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the MessageBurst plugin by port: a quick follow-up message is merged
// into your previous one (by editing it) when nobody else has spoken in between.
const settings = pluginSettings("cloudcord.messageburst", { seconds: "3", useSpace: false });
let unpatch: (() => unknown) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.messageburst",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "MessageBurst",
            description: "Merges quick follow-up messages into your previous one",
            authors: ["port"].map(name => ({ name })),
        },
    },
    start() {
        unpatch = instead("sendMessage", messageUtil, (args: any[], original: Function) => {
            const [channelId, message, , options] = args;
            const content = message?.content;
            const editor = findByProps("editMessage", "startEditMessage");
            const list: any[] = (() => { const m = findByStoreName("MessageStore")?.getMessages?.(channelId); return m?.toArray?.() ?? m?._array ?? []; })();
            const last = list[list.length - 1];
            const me = findByStoreName("UserStore")?.getCurrentUser?.()?.id;
            const windowMs = (Number(settings.get("seconds")) || 3) * 1000;
            const recent = last && last.author?.id === me && Date.now() - new Date(last.timestamp).getTime() < windowMs;
            if (!editor || !recent || typeof content !== "string" || !content.trim() || options?.messageReference || last.attachments?.length) return original(...args);
            const merged = last.content + (settings.get("useSpace") ? " " : "\n") + content;
            if (merged.length > 2000) return original(...args);
            editor.editMessage(channelId, last.id, { content: merged });
            return Promise.resolve();
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "seconds", type: "text", label: "Merge messages sent within this many seconds", placeholder: "3" },
            { key: "useSpace", type: "switch", label: "Join with a space instead of a new line" },
        ],
    }),
});
