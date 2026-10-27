import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the TalkInReverse plugin by Tolgchu.
let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.talkinreverse",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "TalkInReverse",
            description: "Reverses every message you send",
            authors: [{ name: "Tolgchu" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string") message.content = [...message.content].reverse().join("");
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
