import { defineCorePlugin } from "..";
import { intercept } from "@lib/api/flux";
import { findByProps } from "@metro";

import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the NewGuildSettings plugin by Glitch, Nuckyz, carince, Mopi and GabiRP.
const settings = pluginSettings("cloudcord.newguildsettings", { guild: true, everyone: true, role: true, events: true, highlights: true });
let stopIntercept: (() => void) | undefined;
// Servers loaded at startup also arrive as GUILD_CREATE; only ones joined later count.
let ready = false;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.newguildsettings",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "NewGuildSettings",
            description: "Mutes servers you join and turns off their @everyone, role and event pings",
            authors: ["Glitchy", "Nuckyz", "carince", "Mopi", "GabiRP"].map(name => ({ name })),
        },
    },
    start() {
        ready = false;
        setTimeout(() => { ready = true; }, 15_000);
        stopIntercept = intercept(payload => {
            if (payload.type === "CONNECTION_OPEN") { ready = false; setTimeout(() => { ready = true; }, 15_000); }
            if (payload.type !== "GUILD_JOIN_SUCCESS" && !(payload.type === "GUILD_CREATE" && ready)) return undefined;
            const guildId = payload.guild?.id ?? payload.guildId;
            const actions = findByProps("updateGuildNotificationSettings");
            if (!guildId || !actions) return undefined;
            setTimeout(() => actions.updateGuildNotificationSettings(guildId, {
                muted: settings.get("guild"),
                suppress_everyone: settings.get("everyone"),
                suppress_roles: settings.get("role"),
                mute_scheduled_events: settings.get("events"),
                notify_highlights: settings.get("highlights") ? 1 : 0,
            }), 1000);
            return undefined;
        });
    },
    stop() { stopIntercept?.(); stopIntercept = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        intro: "Applied to each server you join from now on.",
        fields: [
            { key: "guild", type: "switch", label: "Mute the server" },
            { key: "everyone", type: "switch", label: "Turn off @everyone and @here" },
            { key: "role", type: "switch", label: "Turn off role mentions" },
            { key: "events", type: "switch", label: "Mute new events" },
            { key: "highlights", type: "switch", label: "Turn off highlights" },
        ],
    }),
});
