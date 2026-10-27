import { defineCorePlugin } from "..";

import { filterMessages } from "../shared/messageFilter";
import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the ClientSideBlock plugin by Samwich and KamiRu: hides everything a
// chosen user posts, only on this device.
const settings = pluginSettings("cloudcord.clientsideblock", { usersToBlock: "" });
let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.clientsideblock",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "ClientSideBlock",
            description: "Hides messages from people you choose, only on this device",
            authors: ["Samwich","KamiRu"].map(name => ({ name })),
        },
    },
    start() { stop = filterMessages(message => !!message.author?.id && new Set(String(settings.get("usersToBlock") || "").split(/[\s,]+/).filter(Boolean)).has(message.author.id)); },
    stop() { stop?.(); stop = undefined; },
    SettingsComponent: () => SettingsPage({ store: settings.store, fields: [{ key: "usersToBlock", type: "text", label: "User IDs to hide", hint: "Separate with commas" }] }),
});
