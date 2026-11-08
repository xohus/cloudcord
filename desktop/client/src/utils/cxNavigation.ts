/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

type NavigationControl = "jump-without-unblocking" | "jump-to-first-message" | "read-all-servers-button";

export function createCxNavigationControls() {
    const active = new Map<NavigationControl, { count: number; stop?: () => void; }>();
    return {
        has: (control: NavigationControl) => active.has(control),
        register(control: NavigationControl, install?: () => () => void) {
            let binding = active.get(control);
            if (!binding) {
                binding = { count: 0, stop: install?.() };
                active.set(control, binding);
            }
            let registered = true;
            binding.count++;
            return () => {
                if (!registered) return;
                registered = false;
                if (--binding.count === 0) {
                    active.delete(control);
                    binding.stop?.();
                }
            };
        },
    };
}

export type CxNavigationChannel = { id?: string; type?: number; isForumPost?: () => boolean; };

// JumpToTop by Kaerion (GPL-3.0-or-later).
export function getCxFirstMessageTarget(channel: CxNavigationChannel | undefined, allowForumPost = false) {
    if (!channel || !isCxProfileUserId(channel.id) || !allowForumPost && channel.isForumPost?.()) return;
    if (channel.type === undefined || ![0, 1, 2, 3, 5, 10, 11, 12, 13].includes(channel.type)) return;
    return { channelId: channel.id, messageId: channel.id, flash: false, jumpType: "INSTANT" } as const;
}

// JumpTo by Samwich and thororen (GPL-3.0-or-later).
type JumpChannel = CxNavigationChannel & { guild_id?: string | null; };
type JumpMessage = { id?: string; channel_id?: string; author?: { id?: string; }; hit?: boolean; };
type JumpRequest = { url: string; query: Record<string, string | number>; };
type JumpResponse = { body?: JumpMessage[] | { messages?: JumpMessage[][]; }; };

export function createCxJumpActions(
    get: (request: JumpRequest) => Promise<JumpResponse>,
    jump: (channelId: string, messageId: string, guildId?: string | null) => void,
    notify: (message: string) => void,
) {
    let latest = 0;
    return (channel: JumpChannel | undefined, stillActive: () => boolean, authorId?: string) => {
        const target = getCxFirstMessageTarget(channel, true);
        const guild = channel?.guild_id;
        if (!target || guild != null && !isCxProfileUserId(guild) || authorId !== undefined && (!guild || !isCxProfileUserId(authorId))) return [];
        const id = target.channelId;
        return [true, false].map(first => ({
            label: first ? "Jump to First Message" : "Jump to Last Message",
            async run() {
                if (!stillActive()) return;
                const request = ++latest;
                try {
                    let messageId: string | undefined = first ? target.messageId : undefined;
                    if (authorId && guild) {
                        const { body } = await get({ url: "/guilds/" + guild + "/messages/search", query: {
                            author_id: authorId, channel_id: id, sort_by: "timestamp", sort_order: first ? "asc" : "desc",
                        } });
                        const results = Array.isArray(body) ? [] : body?.messages?.flat() ?? [];
                        messageId = results.find(message => message.channel_id === id && message.author?.id === authorId && message.hit !== false)?.id;
                    } else if (!first) {
                        const { body } = await get({ url: "/channels/" + id + "/messages", query: { limit: 1 } });
                        if (Array.isArray(body)) messageId = body.find(message => message.channel_id === id)?.id;
                    }
                    if (request !== latest || !stillActive()) return;
                    if (isCxProfileUserId(messageId)) jump(id, messageId, guild);
                    else notify(authorId ? "No messages found from this user in this channel." : "No messages found in this channel.");
                } catch {
                    if (request === latest && stillActive()) notify("Couldn't jump to the message.");
                }
            },
        }));
    };
}
