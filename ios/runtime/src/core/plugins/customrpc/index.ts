import { defineCorePlugin } from "..";
import { FluxDispatcher } from "@metro/common";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the CustomRPC plugin by captain, AutumnVN and nin0dev: shows a custom
// activity ("Playing …") on your profile while CloudCord is open.
const settings = pluginSettings("cloudcord.customrpc", { name: "", details: "", state: "", type: "0", appId: "" });
const TYPES: Record<string, string> = { "0": "Playing", "1": "Streaming", "2": "Listening to", "3": "Watching", "5": "Competing in" };

export function buildActivity(store: { name?: string; details?: string; state?: string; type?: string; appId?: string; }, startedAt: number) {
    const name = String(store.name || "").trim();
    if (!name) return null;
    return {
        application_id: String(store.appId || "").trim() || "0",
        name,
        details: String(store.details || "").trim() || undefined,
        state: String(store.state || "").trim() || undefined,
        type: Number(store.type) in TYPES ? Number(store.type) : 0,
        timestamps: { start: startedAt },
        flags: 1 << 0,
    };
}

const setActivity = (activity: any) => FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: "CustomRPC" });
let timer: ReturnType<typeof setInterval> | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.customrpc",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "CustomRPC",
            description: "Shows a custom activity (Playing, Watching…) on your profile",
            authors: [{ name: "captain" }, { name: "AutumnVN" }, { name: "nin0dev" }],
        },
    },
    start() {
        const startedAt = Date.now();
        let last = "";
        // Settings can change while running; re-send only when they do.
        const update = () => {
            const activity = buildActivity({ name: settings.get("name"), details: settings.get("details"), state: settings.get("state"), type: settings.get("type"), appId: settings.get("appId") }, startedAt);
            const key = JSON.stringify(activity && { ...activity, timestamps: null });
            if (key !== last) { last = key; setActivity(activity); }
        };
        void settings.ready.then(update);
        timer = setInterval(update, 5000);
    },
    stop() { clearInterval(timer); timer = undefined; setActivity(null); },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        intro: "Fill in a name to show the activity. Activity types: 0 Playing, 1 Streaming, 2 Listening, 3 Watching, 5 Competing.",
        fields: [
            { key: "name", type: "text", label: "Name", placeholder: "CloudCord" },
            { key: "details", type: "text", label: "Details (first line)" },
            { key: "state", type: "text", label: "State (second line)" },
            { key: "type", type: "text", label: "Activity type", placeholder: "0" },
            { key: "appId", type: "text", label: "Application ID (optional, for images)" },
        ],
    }),
});
