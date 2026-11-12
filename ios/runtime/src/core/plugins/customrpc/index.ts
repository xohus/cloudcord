import { defineCorePlugin } from "..";
import { FluxDispatcher } from "@metro/common";
import { findByProps } from "@metro";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the CustomRPC plugin by captain, AutumnVN and nin0dev: shows a custom
// activity ("Playing …") on your profile while CloudCord is open.
const settings = pluginSettings("cloudcord.customrpc", { name: "", details: "", state: "", type: "0", appId: "", imageBig: "", imageBigTooltip: "", imageSmall: "", imageSmallTooltip: "" });
const TYPES: Record<string, string> = { "0": "Playing", "1": "Streaming", "2": "Listening to", "3": "Watching", "5": "Competing in" };

type Store = { name?: string; details?: string; state?: string; type?: string; appId?: string; imageBig?: string; imageBigTooltip?: string; imageSmall?: string; imageSmallTooltip?: string; };

export function buildActivity(store: Store, startedAt: number, assets?: { large?: string; small?: string; }) {
    const name = String(store.name || "").trim();
    if (!name) return null;
    const activity: any = {
        application_id: String(store.appId || "").trim() || "0",
        name,
        details: String(store.details || "").trim() || undefined,
        state: String(store.state || "").trim() || undefined,
        type: Number(store.type) in TYPES ? Number(store.type) : 0,
        timestamps: { start: startedAt },
        flags: 1 << 0,
    };
    if (assets?.large || assets?.small) {
        activity.assets = {
            large_image: assets.large, large_text: String(store.imageBigTooltip || "").trim() || undefined,
            small_image: assets.small, small_text: String(store.imageSmallTooltip || "").trim() || undefined,
        };
    }
    return activity;
}

// Image links become Discord "external assets" through the application, the same way the
// desktop plugin and Discord's own SDK do it. Asset keys from the developer portal pass through.
const assetCache = new Map<string, string>();
export async function resolveImage(appId: string, image: string, http: any = findByProps("get", "post", "del")): Promise<string | undefined> {
    const value = String(image || "").trim();
    if (!value) return undefined;
    if (!/^https?:\/\//.test(value)) return value;
    if (!/^\d{17,20}$/.test(appId)) return undefined;
    const key = appId + " " + value;
    if (assetCache.has(key)) return assetCache.get(key);
    try {
        const response = await http.post({ url: `/applications/${appId}/external-assets`, body: { urls: [value] } });
        const path = (response?.body ?? response)?.[0]?.external_asset_path;
        if (path) { assetCache.set(key, "mp:" + path); return "mp:" + path; }
    } catch { /* show the activity without this image */ }
    return undefined;
}

const setActivity = (activity: any) => FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: "CustomRPC" });
let timer: ReturnType<typeof setInterval> | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.customrpc",
        version: "1.1.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "CustomRPC",
            description: "Shows a custom activity (Playing, Watching…) on your profile, with pictures",
            authors: [{ name: "captain" }, { name: "AutumnVN" }, { name: "nin0dev" }],
        },
    },
    start() {
        const startedAt = Date.now();
        let last = "";
        // Settings can change while running; re-send only when they do.
        const update = async () => {
            const store: Store = Object.fromEntries(["name", "details", "state", "type", "appId", "imageBig", "imageBigTooltip", "imageSmall", "imageSmallTooltip"].map(key => [key, (settings.get as any)(key)]));
            const appId = String(store.appId || "").trim();
            const assets = { large: await resolveImage(appId, store.imageBig || ""), small: await resolveImage(appId, store.imageSmall || "") };
            const activity = buildActivity(store, startedAt, assets);
            const key = JSON.stringify(activity && { ...activity, timestamps: null });
            if (key !== last) { last = key; setActivity(activity); }
        };
        void settings.ready.then(update);
        timer = setInterval(() => void update(), 5000);
    },
    stop() { clearInterval(timer); timer = undefined; setActivity(null); },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        intro: "Fill in a name to show the activity. Activity types: 0 Playing, 1 Streaming, 2 Listening, 3 Watching, 5 Competing. Pictures need an Application ID: make an application at discord.com/developers and paste its ID.",
        fields: [
            { key: "name", type: "text", label: "Name", placeholder: "CloudCord" },
            { key: "details", type: "text", label: "Details (first line)" },
            { key: "state", type: "text", label: "State (second line)" },
            { key: "type", type: "text", label: "Activity type", placeholder: "0" },
            { key: "appId", type: "text", label: "Application ID (needed for pictures)" },
            { key: "imageBig", type: "text", label: "Large picture", placeholder: "https://i.imgur.com/….png", hint: "A direct image link (Imgur, Tenor media link) or an asset name from your application" },
            { key: "imageBigTooltip", type: "text", label: "Large picture text (shown on hover)" },
            { key: "imageSmall", type: "text", label: "Small picture", placeholder: "https://i.imgur.com/….png" },
            { key: "imageSmallTooltip", type: "text", label: "Small picture text (shown on hover)" },
        ],
    }),
});
