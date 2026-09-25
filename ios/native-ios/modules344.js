// Non-blocking Metro registry capture used by current bridgeless Discord.
// This mirrors the bootstrap used by actively maintained iOS loaders: it does
// not delay Discord or replace its require function.
Object.defineProperties(globalThis, {
    __d: {
        configurable: true,
        get() {
            globalThis.modules ??= globalThis.__c?.();
            return this.value;
        },
        set(value) {
            this.value = value;
        }
    }
});
