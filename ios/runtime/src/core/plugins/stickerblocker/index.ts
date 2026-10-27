import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the StickerBlocker plugin by Samwich.
const settings = pluginSettings("cloudcord.stickerblocker", { blockedStickers: "", blockAll: false });
const strip = (message: any) => {
    const blocked = new Set(String(settings.get("blockedStickers") || "").split(/[\s,]+/).filter(Boolean));
    const items: any[] = message?.sticker_items ?? message?.stickerItems ?? [];
    const kept = settings.get("blockAll") ? [] : items.filter(sticker => !blocked.has(String(sticker?.id)));
    return kept.length === items.length ? null : { ...message, sticker_items: kept, stickerItems: kept, stickers: kept };
};
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.stickerblocker",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "StickerBlocker",
            description: "Hides stickers you choose, or all stickers",
            authors: ["Samwich"].map(name => ({ name })),
        },
    },
    start() {
        stop = intercept(payload => {
            if (payload.type === "MESSAGE_CREATE" || payload.type === "MESSAGE_UPDATE") { const next = strip(payload.message); return next ? { message: next } : undefined; }
            if (payload.type === "LOAD_MESSAGES_SUCCESS" && Array.isArray(payload.messages)) {
                let changed = false;
                const messages = payload.messages.map((m: any) => { const next = strip(m); if (next) changed = true; return next ?? m; });
                return changed ? { messages } : undefined;
            }
            return undefined;
        });
    },
    stop() { stop?.(); stop = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "blockedStickers", type: "text", label: "Sticker IDs to hide", hint: "Separate with commas" },
            { key: "blockAll", type: "switch", label: "Hide all stickers" },
        ],
    }),
});
