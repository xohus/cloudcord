import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { findByProps } from "@metro";
import { messageUtil } from "@metro/common";

// Mobile version of the FriendInvites plugin by afn and Dziurwa.
const when = (date: string) => `<t:${Math.round(new Date(date).getTime() / 1000)}:R>`;
const reply = (ctx: any, content: string) => messageUtil.sendBotMessage(ctx.channel.id, content);
const invitesModule = () => {
    const module = findByProps("createFriendInvite");
    if (!module) throw new Error("Friend invites aren't available in this Discord version");
    return module;
};
const run = (task: (ctx: any) => Promise<void>) => (_: any[], ctx: any) => {
    void task(ctx).catch((error: any) => reply(ctx, `Friend invites failed: ${error?.message || "try again"}`));
};

const COMMANDS = [
    {
        name: "create friend invite", description: "Make a friend invite link",
        execute: run(async ctx => {
            const invite = await invitesModule().createFriendInvite();
            reply(ctx, `discord.gg/${invite.code} · Expires ${when(invite.expires_at)} · Max uses: \`${invite.max_uses}\``);
        })
    },
    {
        name: "view friend invites", description: "List your friend invite links",
        execute: run(async ctx => {
            const invites: any[] = await invitesModule().getAllFriendInvites();
            reply(ctx, invites.map(i => `_discord.gg/${i.code}_ · Expires ${when(i.expires_at)} · Used \`${i.uses}/${i.max_uses}\``).join("\n") || "You have no active friend invites.");
        })
    },
    {
        name: "revoke friend invites", description: "Revoke all your friend invite links",
        execute: run(async ctx => {
            await invitesModule().revokeFriendInvites();
            reply(ctx, "All friend invites have been revoked.");
        })
    },
];

let unregisters: (() => void)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.friendinvites",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "FriendInvites",
            description: "Create, view and revoke friend invite links with commands",
            authors: [{ name: "afn" }, { name: "Dziurwa" }],
        },
    },
    start() { unregisters = COMMANDS.map(command => registerCommand({ ...command, options: [] } as any)); },
    stop() { unregisters.forEach(unregister => unregister()); unregisters = []; },
});
