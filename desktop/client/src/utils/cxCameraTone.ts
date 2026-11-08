/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

type VoiceState = { userId?: unknown; channelId?: unknown; selfVideo?: unknown; };
type CameraEvent = "VOICE_STATE_UPDATES" | "VOICE_CHANNEL_SELECT" | "LOGOUT";
type CameraPayload = { voiceStates?: readonly VoiceState[]; };
export type CxCameraToneOptions = { scope: "all" | "dm-only" | "server-only"; };
type CameraContext = {
    account: () => string | undefined;
    selected: () => { id: string; private: boolean; } | undefined;
    states: (channel: string) => unknown;
    play: (on: boolean) => void;
    enabled?: () => boolean;
    dispatcher: {
        subscribe(type: CameraEvent, listener: (payload: CameraPayload) => void): void;
        unsubscribe(type: CameraEvent, listener: (payload: CameraPayload) => void): void;
    };
};

export function bindCxCameraTone(context: CameraContext, options: CxCameraToneOptions) {
    const states = new Map<string, boolean>();
    const cleanups: (() => void)[] = [];
    let account: string | undefined, channel: string | undefined;
    let active = true;
    function reset() { states.clear(); channel = undefined; account = undefined; }
    function remember(state: VoiceState) {
        const { userId, selfVideo } = state;
        if (!isCxProfileUserId(userId) || typeof selfVideo !== "boolean") return;
        if (states.size >= 512 && !states.has(userId)) states.delete(states.keys().next().value!);
        states.set(userId, selfVideo);
    }
    function sync() {
        const me = context.account(), current = context.selected();
        if (!active || context.enabled?.() === false || !isCxProfileUserId(me) || !isCxProfileUserId(current?.id)
            || options.scope === (current.private ? "server-only" : "dm-only")) {
            reset();
            return;
        }
        if (account !== me || channel !== current.id) {
            states.clear();
            account = me;
            channel = current.id;
            const initial = context.states(channel);
            if (initial && typeof initial === "object") {
                for (const state of Object.values(initial)) {
                    if (state && typeof state === "object" && state.channelId === channel) remember(state);
                }
            }
            return;
        }
        return channel;
    }
    function update(payload: CameraPayload) {
        const id = sync();
        if (!id || !Array.isArray(payload?.voiceStates)) return;
        for (const state of payload.voiceStates) {
            if (!isCxProfileUserId(state?.userId)) continue;
            if (state.channelId !== id) {
                if (state.channelId !== undefined) states.delete(state.userId);
                continue;
            }
            const before = states.get(state.userId);
            remember(state);
            if (before !== undefined && typeof state.selfVideo === "boolean" && before !== state.selfVideo) {
                try { context.play(state.selfVideo); } catch { /* Discord's sound playback is optional. */ }
            }
        }
    }
    function stop() {
        active = false;
        reset();
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
    try {
        for (const [event, handler] of [
            ["VOICE_STATE_UPDATES", update], ["VOICE_CHANNEL_SELECT", sync], ["LOGOUT", reset],
        ] as const) {
            context.dispatcher.subscribe(event, handler);
            cleanups.push(() => context.dispatcher.unsubscribe(event, handler));
        }
        sync();
        return stop;
    } catch (error) { stop(); throw error; }
}
