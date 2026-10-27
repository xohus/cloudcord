import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { findByStoreName } from "@metro";

// Mobile version of the AtSomeone plugin by Joona.
let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.atsomeone",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "AtSomeone",
            description: "Adds /someone, which mentions a random member of the server",
            authors: [{ name: "Joona" }],
        },
    },
    start() {
        unregister = registerCommand({
            name: "someone",
            description: "Mention a random member of this server",
            options: [{ name: "message", displayName: "message", description: "Text to send with the mention", type: ApplicationCommandOptionType.STRING, required: false }],
            execute(args: any[], ctx: any) {
                const guildId = ctx?.guild?.id ?? findByStoreName("ChannelStore")?.getChannel?.(ctx?.channel?.id)?.guild_id;
                const ids: string[] = guildId ? findByStoreName("GuildMemberStore")?.getMemberIds?.(guildId) ?? [] : [];
                const me = findByStoreName("UserStore")?.getCurrentUser?.()?.id;
                const others = ids.filter(id => id !== me);
                const text = args.find(arg => arg?.name === "message")?.value ?? "";
                if (!others.length) return { content: text || "Nobody to mention here." };
                const pick = others[Math.floor(Math.random() * others.length)];
                return { content: `<@${pick}> ${text}`.trim() };
            },
        } as any);
    },
    stop() { unregister?.(); unregister = undefined; },
});
