import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the NoReplyMention plugin by DustyAngel47, rae, pylix and outfoxxed.
let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.noreplymention",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "NoReplyMention",
            description: "Replies don't ping the person you reply to",
            authors: [{ name: "DustyAngel47" }, { name: "rae" }, { name: "pylix" }, { name: "outfoxxed" }],
        },
    },
    start() {
        unpatch = onSendMessage((_message, options) => {
            if (!options?.messageReference) return;
            options.allowedMentions = { parse: ["users", "roles", "everyone"], ...options.allowedMentions, replied_user: false };
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
