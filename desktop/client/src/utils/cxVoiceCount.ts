/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

export type CxVoiceCountOptions = { showEmpty: boolean; hideLimit: boolean; };
export type CxVoiceCountChannel = { id?: string; type?: number; userLimit?: number; user_limit?: number; };
type VoiceCountStore = {
    getVoiceStatesForChannel(channel: string): unknown;
    addChangeListener(listener: () => void): void;
    removeChangeListener(listener: () => void): void;
};

export function getCxVoiceStateCount(states: unknown) {
    if (states && typeof states === "object" && !Array.isArray(states)) return Object.keys(states).length;
}

export function isCxVoiceCountChannel(channel: CxVoiceCountChannel | undefined): channel is CxVoiceCountChannel & { id: string; } {
    return isCxProfileUserId(channel?.id) && (channel.type === 2 || channel.type === 13);
}

export function createCxVoiceCount() {
    const listeners = new Set<() => void>();
    let binding: { store: VoiceCountStore; options: CxVoiceCountOptions; enabled: () => boolean; } | undefined;
    function publish() {
        for (const listener of [...listeners]) listener();
    }
    return {
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        read(channel: CxVoiceCountChannel) {
            if (!binding?.enabled() || !isCxVoiceCountChannel(channel)) return;
            const count = getCxVoiceStateCount(binding.store.getVoiceStatesForChannel(channel.id));
            if (count === undefined || count === 0 && !binding.options.showEmpty) return;
            const limit = channel.userLimit ?? channel.user_limit;
            return !binding.options.hideLimit && typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0
                ? count + "/" + limit : String(count);
        },
        bind(store: VoiceCountStore, options: CxVoiceCountOptions, enabled = () => true) {
            if (binding) throw new Error("Voice counts are already enabled");
            if (typeof store?.getVoiceStatesForChannel !== "function" || typeof store.addChangeListener !== "function"
                || typeof store.removeChangeListener !== "function") throw new Error("Discord's voice count is unavailable");
            store.addChangeListener(publish);
            const current = { store, options, enabled };
            binding = current;
            publish();
            return () => {
                if (binding !== current) return;
                binding = undefined;
                store.removeChangeListener(publish);
                publish();
            };
        },
    };
}

export function isCxVoiceCountFull(value: string) {
    const [count, limit] = value.split("/");
    return limit !== undefined && Number(count) >= Number(limit);
}
