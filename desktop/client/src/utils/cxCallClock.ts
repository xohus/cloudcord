/* SPDX-License-Identifier: GPL-3.0-or-later */

import { isCxProfileUserId } from "./cxProfileMenu";

type VoiceSelection = {
    getVoiceChannelId(): string | null | undefined;
    addChangeListener(listener: () => void): void;
    removeChangeListener(listener: () => void): void;
};
type VoiceConnection = { state?: string; streamKey?: unknown; };
type VoiceDispatcher = {
    subscribe(type: "RTC_CONNECTION_STATE", listener: (event: VoiceConnection) => void): void;
    unsubscribe(type: "RTC_CONNECTION_STATE", listener: (event: VoiceConnection) => void): void;
};

export function createCxCallClock() {
    const listeners = new Set<() => void>();
    let channel: string | undefined;
    let elapsed: string | undefined;
    let started = 0;
    let bound = false;

    function publish(nextChannel: string | undefined, nextElapsed: string | undefined) {
        if (nextChannel === channel && nextElapsed === elapsed) return;
        channel = nextChannel;
        elapsed = nextElapsed;
        for (const listener of [...listeners]) listener();
    }

    return {
        read: (id?: string) => id === undefined || id === channel ? elapsed : undefined,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        bind(selection: VoiceSelection, dispatcher: VoiceDispatcher) {
            if (bound) throw new Error("A call timer is already enabled");
            let timer: ReturnType<typeof setInterval> | undefined;
            let selected = false, subscribed = false, active = true;
            function tick() {
                if (!active) return;
                const id = selection.getVoiceChannelId();
                if (!isCxProfileUserId(id)) {
                    clearInterval(timer);
                    timer = undefined;
                    publish(undefined, undefined);
                    return;
                }
                const now = Date.now();
                if (id !== channel) started = now;
                const seconds = Math.max(0, Math.floor((now - started) / 1000));
                const text = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
                    .map(value => String(value).padStart(2, "0")).join(":");
                timer ??= setInterval(tick, 1000);
                publish(id, text);
            }
            function onRtc(event: VoiceConnection) {
                if (event?.state !== "RTC_DISCONNECTED" || "streamKey" in event) return;
                started = Date.now();
                tick();
            }
            function stop() {
                if (!active) return;
                active = false;
                bound = false;
                clearInterval(timer);
                if (selected) selection.removeChangeListener(tick);
                if (subscribed) dispatcher.unsubscribe("RTC_CONNECTION_STATE", onRtc);
                publish(undefined, undefined);
            }
            bound = true;
            try {
                selection.addChangeListener(tick);
                selected = true;
                dispatcher.subscribe("RTC_CONNECTION_STATE", onRtc);
                subscribed = true;
                tick();
                return stop;
            } catch (error) { stop(); throw error; }
        },
    };
}
