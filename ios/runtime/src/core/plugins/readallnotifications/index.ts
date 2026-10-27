import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { findByStoreName } from "@metro";
import { FluxDispatcher, messageUtil } from "@metro/common";

// Mobile version of the ReadAllNotificationsButton plugin by kemo and KrystalSkull, as /readall.
export function unreadChannels() {
    const guilds = findByStoreName("GuildStore")?.getGuilds?.() ?? {};
    const channelsStore = findByStoreName("GuildChannelStore");
    const threads = findByStoreName("ActiveJoinedThreadsStore");
    const readState = findByStoreName("ReadStateStore");
    const channels: { channelId: string; messageId: string; readStateType: number; }[] = [];
    for (const guild of Object.values<any>(guilds)) {
        const listed = channelsStore?.getChannels?.(guild.id) ?? {};
        const threadRows = Object.values<any>(threads?.getActiveJoinedThreadsForGuild?.(guild.id) ?? {}).flatMap(group => Object.values<any>(group));
        for (const row of [...(listed.SELECTABLE ?? []), ...(listed.VOCAL ?? []), ...threadRows]) {
            const id = row?.channel?.id;
            if (id && readState?.hasUnread?.(id)) channels.push({ channelId: id, messageId: readState.lastMessageId(id), readStateType: 0 });
        }
    }
    return channels;
}

let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.readallnotifications",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "ReadAllNotifications",
            description: "Adds /readall, which marks every server as read",
            authors: [{ name: "kemo" }, { name: "krystalskullofficial" }],
        },
    },
    start() {
        unregister = registerCommand({
            name: "readall",
            description: "Mark every server as read",
            options: [],
            execute(_: any[], ctx: any) {
                const channels = unreadChannels();
                if (channels.length) FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels });
                messageUtil.sendBotMessage(ctx.channel.id, channels.length ? `Marked ${channels.length} channel${channels.length === 1 ? "" : "s"} as read.` : "Everything is already read.");
            },
        } as any);
    },
    stop() { unregister?.(); unregister = undefined; },
});
