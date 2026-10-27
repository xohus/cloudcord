import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";
import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the Signature plugin by Ven, Rini, ImBanana and KrystalSkull.
const settings = pluginSettings("cloudcord.signature", { name: "a chronic discord user", newLine: true });

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.signature",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "Signature",
            description: "Adds a signature to the end of messages you send",
            authors: [{ name: "Ven" }, { name: "Rini" }, { name: "ImBanana" }, { name: "KrystalSkull" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            const name = String(settings.get("name") || "").trim();
            if (typeof message.content !== "string" || !message.content.trim() || !name) return;
            message.content += `${settings.get("newLine") ? "\n" : " "}> ${name}`;
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "name", type: "text", label: "Signature", placeholder: "a chronic discord user" },
            { key: "newLine", type: "switch", label: "Put the signature on its own line" },
        ],
    }),
});
