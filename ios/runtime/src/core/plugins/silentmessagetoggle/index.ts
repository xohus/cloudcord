import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the SilentMessageToggle plugin by Nuckyz, CatNoir and Z1xus.
// Mobile has no message-bar button for it, so while this plugin is on every message is sent silently.
let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.silentmessagetoggle",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SilentMessageToggle",
            description: "While on, your messages are sent silently (no push notifications)",
            authors: [{ name: "Nuckyz" }, { name: "CatNoir" }, { name: "Z1xus" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            // Discord's own @silent prefix: the message is delivered without notifications.
            if (typeof message.content === "string" && message.content.trim() && !message.content.startsWith("@silent ")) message.content = "@silent " + message.content;
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
