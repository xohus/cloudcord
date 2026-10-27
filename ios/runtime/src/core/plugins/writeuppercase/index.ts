import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";
import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the WriteUpperCase plugin by Samwich and KrystalSkull.
const settings = pluginSettings("cloudcord.writeuppercase", { blockedWords: "http, https, ok" });

export function capitalise(content: string, blocked: string) {
    const skip = blocked.split(",").map(word => word.trim().toLowerCase()).filter(Boolean);
    return content.split(/(?<=[.!?]+['")\]]*)(\s+)/).map((part, i) =>
        i % 2 === 1 || skip.some(word => part.toLowerCase().startsWith(word)) ? part : part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.writeuppercase",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "WriteUpperCase",
            description: "Capitalises the first letter of each sentence you send",
            authors: [{ name: "Samwich" }, { name: "KrystalSkull" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string") message.content = capitalise(message.content, settings.get("blockedWords"));
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [{ key: "blockedWords", type: "text", label: "Words not to capitalise", hint: "Separate with commas" }],
    }),
});
