/* SPDX-License-Identifier: GPL-3.0-or-later */

type PingStore = { getLastPing(): number | undefined; getChannelId(): string | undefined; isConnected(): boolean; };
type PingEvent = "RTC_CONNECTION_PING" | "RTC_CONNECTION_STATE";
type Dispatcher = {
    subscribe(type: PingEvent, listener: () => void): void;
    unsubscribe(type: PingEvent, listener: () => void): void;
};

export function createCxVoicePing() {
    const listeners = new Set<() => void>();
    const events = ["RTC_CONNECTION_PING", "RTC_CONNECTION_STATE"] as const;
    let read: ((channelId?: string) => string | undefined) | undefined;
    const notify = () => { for (const listener of listeners) listener(); };
    return {
        read: (channelId?: string) => read?.(channelId),
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        bind(store: PingStore | undefined, dispatcher: Dispatcher, enabled = () => true) {
            if (read) throw new Error("Voice latency is already enabled");
            if (typeof store?.getLastPing !== "function" || typeof store.getChannelId !== "function"
                || typeof store.isConnected !== "function") throw new Error("Discord’s voice latency is unavailable");
            read = channelId => {
                if (!enabled() || !store.isConnected() || channelId && store.getChannelId() !== channelId) return;
                const ping = store.getLastPing();
                return typeof ping === "number" && Number.isFinite(ping) && ping >= 0 ? Math.round(ping) + " ms" : undefined;
            };
            const subscribed: PingEvent[] = [];
            function stop() {
                if (!subscribed.length) return;
                read = undefined;
                for (const event of subscribed.splice(0)) dispatcher.unsubscribe(event, notify);
                notify();
            }
            try {
                for (const event of events) {
                    dispatcher.subscribe(event, notify);
                    subscribed.push(event);
                }
                notify();
                return stop;
            } catch (error) {
                read = undefined;
                stop();
                throw error;
            }
        },
    };
}
