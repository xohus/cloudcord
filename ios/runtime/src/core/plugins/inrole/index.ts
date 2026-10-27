import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { findByStoreName } from "@metro";
import { messageUtil } from "@metro/common";

// Mobile version of the InRole plugin by nin0dev, as /inrole. Only lists members Discord has loaded.
let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.inrole",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "InRole",
            description: "Adds /inrole to list who has a role (members Discord has loaded)",
            authors: ["nin0dev"].map(name => ({ name })),
        },
    },
    start() {
        unregister = registerCommand({
            name: "inrole",
            description: "List members who have a role",
            options: [{ name: "role", displayName: "role", description: "The role", type: ApplicationCommandOptionType.ROLE ?? 8, required: true }],
            execute(args: any[], ctx: any) {
                const roleId = String(args.find(arg => arg?.name === "role")?.value ?? "");
                const guildId = ctx?.guild?.id ?? findByStoreName("ChannelStore")?.getChannel?.(ctx.channel.id)?.guild_id;
                if (!guildId) { messageUtil.sendBotMessage(ctx.channel.id, "Use this in a server."); return; }
                const members: any[] = findByStoreName("GuildMemberStore")?.getMembers?.(guildId) ?? [];
                const users = findByStoreName("UserStore");
                const names = members.filter(m => m?.roles?.includes?.(roleId)).map(m => { const u = users?.getUser?.(m.userId); return u ? (u.globalName || u.username) : m.userId; });
                messageUtil.sendBotMessage(ctx.channel.id, names.length
                    ? `**${names.length} member${names.length === 1 ? "" : "s"}** with <@&${roleId}>:\n${names.slice(0, 80).join(", ")}${names.length > 80 ? ", …" : ""}`
                    : "Nobody loaded has that role. Open the member list to load more members.");
            },
        } as any);
    },
    stop() { unregister?.(); unregister = undefined; },
});
