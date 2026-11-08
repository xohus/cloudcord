/* SPDX-License-Identifier: GPL-3.0-or-later */

export type CxMutedVoiceOptions = { serverMute: boolean; ignoreDeafened: boolean; cooldownSeconds: number; };

type MediaStore = {
    getSpeakingWhileMuted(): boolean;
    isMute(): boolean;
    isSelfMute(): boolean;
    isSelfDeaf(): boolean;
    addChangeListener(listener: () => void): void;
    removeChangeListener(listener: () => void): void;
};

export function bindCxMutedVoice(store: MediaStore | undefined, inCall: () => boolean, play: () => void,
    options: CxMutedVoiceOptions, enabled = () => true) {
    if (typeof store?.getSpeakingWhileMuted !== "function" || typeof store.isMute !== "function"
        || typeof store.isSelfMute !== "function" || typeof store.isSelfDeaf !== "function"
        || typeof store.addChangeListener !== "function" || typeof store.removeChangeListener !== "function")
        throw new Error("Discord's speaking-while-muted detection is unavailable");

    let active = true;
    let nextAlert = -Infinity;
    const onChange = () => {
        const now = Date.now();
        if (!active || !enabled() || !inCall() || now < nextAlert || !store.getSpeakingWhileMuted()
            || !store.isMute() || !options.serverMute && !store.isSelfMute()
            || options.ignoreDeafened && store.isSelfDeaf()) return;
        nextAlert = now + options.cooldownSeconds * 1000;
        try { play(); } catch { /* Sound playback is optional and must not interrupt the voice store. */ }
    };
    store.addChangeListener(onChange);
    return () => {
        if (!active) return;
        active = false;
        store.removeChangeListener(onChange);
    };
}
