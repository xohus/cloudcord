import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { messageUtil } from "@metro/common";

// Mobile version of the ScheduledMessages plugin by mmeta and prism. Messages wait in memory, so they're
// sent only while CloudCord stays open; closing the app cancels them.
let timers: ReturnType<typeof setTimeout>[] = [];
let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.scheduledmessages",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "ScheduledMessages",
            description: "Adds /schedule to send a message after some minutes (while the app stays open)",
            authors: [{ name: "mmeta" }, { name: "prism" }],
        },
    },
    start() {
        unregister = registerCommand({
            name: "schedule",
            description: "Send a message after some minutes",
            options: [
                { name: "message", displayName: "message", description: "What to send", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "minutes", displayName: "minutes", description: "Minutes from now (1 to 1440)", type: ApplicationCommandOptionType.INTEGER, required: true },
            ],
            execute(args: any[], ctx: any) {
                const content = String(args.find(arg => arg?.name === "message")?.value ?? "");
                const minutes = Math.min(1440, Math.max(1, Number(args.find(arg => arg?.name === "minutes")?.value) || 0));
                const channelId = ctx.channel.id;
                const timer = setTimeout(() => { timers = timers.filter(t => t !== timer); messageUtil.sendMessage(channelId, { content }); }, minutes * 60_000);
                timers.push(timer);
                const at = Math.round((Date.now() + minutes * 60_000) / 1000);
                messageUtil.sendBotMessage(channelId, `Scheduled for <t:${at}:t>. Keep CloudCord open until then.`);
            },
        } as any);
    },
    stop() {
        timers.forEach(clearTimeout); timers = [];
        unregister?.(); unregister = undefined;
    },
});
