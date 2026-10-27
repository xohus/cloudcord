import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByStoreName } from "@metro";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the SilenceUsers plugin by DKA: their messages still show, but their
// @mentions of you don't ping or add to badge counts.
const settings = pluginSettings("cloudcord.silenceusers", { mutedUserIds: "" });
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.silenceusers",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SilenceUsers",
            description: "Mentions from people you choose don't ping you; their messages still show",
            authors: ["DKA"].map(name => ({ name })),
        },
    },
    start() {
        stop = intercept(payload => {
            const message = payload.type === "MESSAGE_CREATE" ? payload.message : null;
            if (!message?.author?.id || !new Set(String(settings.get("mutedUserIds") || "").split(/[\s,]+/).filter(Boolean)).has(message.author.id)) return undefined;
            const me = findByStoreName("UserStore")?.getCurrentUser?.()?.id;
            return { message: { ...message, mention_everyone: false, mention_roles: [], mentions: (message.mentions ?? []).filter((m: any) => (m?.id ?? m) !== me) } };
        });
    },
    stop() { stop?.(); stop = undefined; },
    SettingsComponent: () => SettingsPage({ store: settings.store, fields: [{ key: "mutedUserIds", type: "text", label: "User IDs to silence", hint: "Separate with commas" }] }),
});
