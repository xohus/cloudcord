/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

type VoiceState = { userId?: unknown; guildId?: unknown; channelId?: unknown; };
type VoicePayload = { guildId?: unknown; voiceStates?: readonly VoiceState[]; };
export type CxVoiceMemberOptions = { human: boolean; minutesOnly: boolean; excludeSelf: boolean; };
const events = ["VOICE_STATE_UPDATES", "PASSIVE_UPDATE_V1", "PASSIVE_UPDATE_V2", "CONNECTION_OPEN", "LOGOUT"] as const;
type VoiceEvent = typeof events[number];
type Context = {
    account: () => string | undefined;
    state: (user: string) => VoiceState | undefined;
    channelGuild: (channel: string) => string | undefined;
    enabled?: () => boolean;
    dispatcher: {
        subscribe(type: VoiceEvent, listener: (payload: VoicePayload) => void): void;
        unsubscribe(type: VoiceEvent, listener: (payload: VoicePayload) => void): void;
    };
};

export function createCxVoiceMemberClock() {
    let context: Context | undefined;
    let options: CxVoiceMemberOptions | undefined;
    let account: string | undefined;
    let ticker: ReturnType<typeof setInterval> | undefined;
    const entries = new Map<string, { channel: string; guild: string; start: number; }>();
    const listeners = new Map<() => void, string>();

    function publish() {
        for (const listener of [...listeners.keys()]) listener();
    }

    function syncTicker() {
        if (context && listeners.size) ticker ??= setInterval(publish, 1000);
        else {
            clearInterval(ticker);
            ticker = undefined;
        }
    }

    function update(user: string, state: VoiceState, guild: string | undefined, now: number) {
        const channel = state.channelId;
        const previous = entries.get(user);
        if (!isCxProfileUserId(channel) || !guild) {
            if (previous && (!guild || guild === previous.guild)) entries.delete(user);
            return;
        }
        if (previous?.channel === channel && previous.guild === guild) return;
        if (entries.size >= 4096 && !previous) entries.delete(entries.keys().next().value!);
        entries.set(user, { channel, guild, start: now });
    }

    function syncMember(user: string) {
        if (!context || !account || context.enabled?.() === false || !isCxProfileUserId(user)) return;
        const state = context.state(user);
        if (!isCxProfileUserId(state?.channelId)) return;
        const guild = isCxProfileUserId(state.guildId) ? state.guildId : context.channelGuild(state.channelId);
        if (isCxProfileUserId(guild)) update(user, state, guild, Date.now());
    }

    return {
        read(user: string, channel?: string) {
            if (!context || !options || context.enabled?.() === false || context.account() !== account
                || !isCxProfileUserId(user) || options.excludeSelf && user === account) return;
            const entry = entries.get(user);
            if (!entry || channel != null && entry.channel !== channel) return;
            const total = Math.max(0, Math.floor((Date.now() - entry.start) / 1000));
            const days = Math.floor(total / 86400), hours = Math.floor(total / 3600) % 24;
            const minutes = Math.floor(total / 60) % 60, seconds = total % 60;
            if (options.human) return [
                days && days + "d", hours && hours + "h", minutes + "m", !options.minutesOnly && seconds + "s",
            ].filter(Boolean).join(" ");
            const parts = [minutes];
            if (hours || days || options.minutesOnly) parts.unshift(hours);
            if (days) parts.unshift(days);
            if (!options.minutesOnly) parts.push(seconds);
            return parts.map((value, index) => index === 0 && days ? String(value) : String(value).padStart(2, "0")).join(":");
        },
        subscribe(user: string, listener: () => void) {
            listeners.set(listener, user);
            if (!entries.has(user)) syncMember(user);
            syncTicker();
            return () => { listeners.delete(listener); syncTicker(); };
        },
        bind(next: Context, preferences: CxVoiceMemberOptions) {
            if (context) throw new Error("Voice member timers are already enabled");
            account = next.account();
            context = next;
            options = preferences;
            let active = true;
            const cleanups: (() => void)[] = [];
            function stop() {
                if (!active) return;
                active = false;
                context = undefined;
                options = undefined;
                account = undefined;
                for (const cleanup of cleanups.splice(0).reverse()) cleanup();
                entries.clear();
                syncTicker();
                publish();
            }
            function observe(type: VoiceEvent, payload: VoicePayload) {
                if (!active) return;
                const current = next.account();
                if (current !== account || type === "LOGOUT") {
                    entries.clear();
                    account = type === "LOGOUT" ? undefined : current;
                    publish();
                }
                if (next.enabled?.() === false) {
                    if (entries.size) { entries.clear(); publish(); }
                    return;
                }
                if (type === "CONNECTION_OPEN" || type === "PASSIVE_UPDATE_V2") {
                    // V2 can be incremental. Read the merged store for visible rows.
                    for (const user of new Set(listeners.values())) syncMember(user);
                    return;
                }
                if (!account || !Array.isArray(payload?.voiceStates)) return;
                const passive = type === "PASSIVE_UPDATE_V1";
                if (!passive && type !== "VOICE_STATE_UPDATES") return;
                const guild = isCxProfileUserId(payload.guildId) ? payload.guildId : undefined;
                if (passive && !guild) return;
                const seen = passive ? new Set<string>() : undefined;
                const now = Date.now();
                for (const state of payload.voiceStates) {
                    if (!isCxProfileUserId(state?.userId) || state.channelId === undefined) continue;
                    const stateGuild = passive ? guild : isCxProfileUserId(state.guildId) ? state.guildId : guild
                        ?? (isCxProfileUserId(state.channelId) ? next.channelGuild(state.channelId) : entries.get(state.userId)?.guild);
                    if (!isCxProfileUserId(stateGuild)) continue;
                    if (isCxProfileUserId(state.channelId)) seen?.add(state.userId);
                    update(state.userId, state, stateGuild, now);
                }
                if (seen) for (const [user, entry] of entries) {
                    if (entry.guild === guild && !seen.has(user)) entries.delete(user);
                }
            }
            try {
                for (const event of events) {
                    const listener = (payload: VoicePayload) => observe(event, payload);
                    next.dispatcher.subscribe(event, listener);
                    cleanups.push(() => next.dispatcher.unsubscribe(event, listener));
                }
                for (const user of new Set(listeners.values())) syncMember(user);
                syncTicker();
                publish();
                return stop;
            } catch (error) { stop(); throw error; }
        },
    };
}
