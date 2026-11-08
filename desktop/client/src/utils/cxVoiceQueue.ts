/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";
import { getCxVoiceStateCount } from "./cxVoiceCount";

export type CxVoiceQueueOptions = { autoJoin: boolean; quiet: boolean; };
type QueueRoom = { name: string; limit: number; occupants: number; };
type QueueContext = {
    account: () => string | undefined;
    currentVoice: () => string | null | undefined;
    room: (channel: string) => QueueRoom | undefined;
    join: (channel: string) => void;
    prompt: (title: string, body: string, label: string, confirm: () => void, cancel: () => void) => void;
    sound: () => void;
    enabled?: () => boolean;
};

export function getCxVoiceQueueRoom(channel: { name?: string; type?: number; userLimit?: number; user_limit?: number; }, states: unknown) {
    const limit = channel.userLimit ?? channel.user_limit;
    const occupants = getCxVoiceStateCount(states);
    if (channel.type !== 2 || typeof limit !== "number" || occupants === undefined) return;
    return { name: channel.name || "the voice channel", limit, occupants };
}

export function createCxVoiceQueue(context: QueueContext, options: CxVoiceQueueOptions) {
    let active = true;
    let pending: { id: string; account: string; } | undefined;
    let promptToken: object | undefined;
    function room(id: string, account: string) {
        if (!active || context.enabled?.() === false || context.account() !== account || context.currentVoice() === id) return;
        const channel = context.room(id);
        if (channel && Number.isSafeInteger(channel.limit) && channel.limit > 0
            && Number.isSafeInteger(channel.occupants) && channel.occupants >= 0) return channel;
    }
    function offer(title: string, body: string, label: string, confirm: () => void) {
        const token = {};
        promptToken = token;
        const dismiss = () => {
            if (promptToken !== token) return false;
            promptToken = undefined;
            return true;
        };
        try {
            context.prompt(title, body, label, () => { if (dismiss() && active) confirm(); }, () => { dismiss(); });
        } catch { dismiss(); }
    }
    function setPending(id: string, account: string) {
        promptToken = undefined;
        pending = { id, account };
    }
    function joinWhenOpen(id: string, account: string) {
        const channel = room(id, account);
        if (!channel) return;
        if (channel.occupants < channel.limit) context.join(id);
        else setPending(id, account);
    }
    function update() {
        if (!pending) return;
        const { id, account } = pending;
        const channel = room(id, account);
        if (!channel) {
            pending = undefined;
            return;
        }
        if (channel.occupants >= channel.limit) return;
        pending = undefined;
        if (!options.quiet) {
            try { context.sound(); } catch { /* Audio is optional. */ }
        }
        if (options.autoJoin) {
            const token = {};
            promptToken = token;
            void Promise.resolve().then(() => {
                if (promptToken !== token) return;
                promptToken = undefined;
                joinWhenOpen(id, account);
            }).catch(() => { /* The slot may have been taken. */ });
        } else offer("A voice slot is open", `Join ${channel.name}?`, "Join", () => joinWhenOpen(id, account));
    }
    function waitFor(id: string, account: string) {
        if (!room(id, account)) return;
        setPending(id, account);
        update();
    }
    return {
        menu(id: unknown) {
            const account = context.account();
            if (!isCxProfileUserId(account) || !isCxProfileUserId(id)) return;
            const channel = room(id, account);
            if (!channel) return;
            const waiting = pending?.id === id && pending.account === account;
            if (!waiting && channel.occupants < channel.limit) return;
            return {
                label: waiting ? "Leave Queue" : "Join Queue",
                run() {
                    const latest = room(id, account);
                    if (!latest) return;
                    if (waiting) {
                        if (pending?.id === id && pending.account === account) pending = undefined;
                    } else waitFor(id, account);
                },
            };
        },
        promptFull(id: unknown) {
            const account = context.account();
            if (!isCxProfileUserId(account) || !isCxProfileUserId(id)) return false;
            const channel = room(id, account);
            if (!channel || channel.occupants < channel.limit) return false;
            if (pending?.id === id && pending.account === account) return true;
            offer("Voice channel is full", `Wait for a slot in ${channel.name}?`, "Wait", () => waitFor(id, account));
            return true;
        },
        update,
        reset() { pending = undefined; promptToken = undefined; },
        stop() { active = false; pending = undefined; promptToken = undefined; },
    };
}
