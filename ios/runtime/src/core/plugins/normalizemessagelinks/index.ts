import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the NormalizeMessageLinks plugin by bb010g.
let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.normalizemessagelinks",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "NormalizeMessageLinks",
            description: "Removes canary. and ptb. from Discord message links you send",
            authors: ["bb010g"].map(name => ({ name })),
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string") message.content = message.content.replace(/https:\/\/(?:canary\.|ptb\.)discord(app)?\.com\/channels\//g, "https://discord.com/channels/");
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
