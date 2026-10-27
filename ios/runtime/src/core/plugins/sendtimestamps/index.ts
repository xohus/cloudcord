import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the SendTimestamps plugin by Vee, GGTyler and Grzesiek11.
// `5:30 PM` or `17:30` in backticks becomes a Discord timestamp everyone sees in their own time zone.
export function parseTime(time: string, now = Date.now()) {
    const clean = time.slice(1, -1).replace(/(\d)(AM|PM)$/i, "$1 $2");
    let seconds = new Date(`${new Date(now).toDateString()} ${clean}`).getTime() / 1000;
    if (Number.isNaN(seconds)) return time;
    if (now / 1000 > seconds) seconds += 86400; // a time already past today means tomorrow
    return `<t:${Math.round(seconds)}:t>`;
}

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.sendtimestamps",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SendTimestamps",
            description: "Write a time like `5:30 PM` in backticks and it's sent as a timestamp in everyone's own time zone",
            authors: [{ name: "Vee" }, { name: "GGTyler" }, { name: "Grzesiek11" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string") message.content = message.content.replace(/`\d{1,2}:\d{2} ?(?:AM|PM)?`/gi, match => parseTime(match));
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
