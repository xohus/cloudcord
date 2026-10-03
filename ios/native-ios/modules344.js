// Non-blocking Metro registry capture used by current bridgeless Discord.
// This mirrors the bootstrap used by actively maintained iOS loaders: it does
// not delay Discord or replace its require function.
(() => {
    if (globalThis.__CLOUDCORD_METRO_CAPTURE__) return;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "__d");
    // A late executor callback may encounter an already initialized Metro.
    // Keep its definition function rather than replacing it with undefined.
    let define = globalThis.__d;
    if (descriptor && !descriptor.configurable) {
        globalThis.modules ??= globalThis.__c?.();
        return;
    }
    Object.defineProperty(globalThis, "__d", {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get() {
            globalThis.modules ??= globalThis.__c?.();
            return descriptor?.get ? descriptor.get.call(globalThis) : define;
        },
        set(value) {
            if (descriptor?.set) descriptor.set.call(globalThis, value);
            else define = value;
        }
    });
    globalThis.__CLOUDCORD_METRO_CAPTURE__ = true;
})();
