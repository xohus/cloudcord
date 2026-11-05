/** Observe settings dependencies as Discord loads them, without requiring them. */
export function observeSettingsModules(visit: (exports: any, path?: string) => void) {
    const modules = (globalThis as any).__CLOUDCORD_MODULE_VIEW__ ?? (globalThis as any).modules;
    const pending = new Map<any, { original: any; observed: any }>();
    let active = true;
    const inspect = (exports: any, path?: string) => {
        if (!active || exports == null) return;
        try { visit(exports, path); }
        catch (error) { console.warn("CloudCord settings module could not be attached", error); }
    };

    // The private module view is an object on both Map and legacy Metro builds.
    // Do not use a finder here: it can force dormant factories or cache a miss.
    const entries = modules instanceof Map ? modules.values() : Object.values(modules ?? {});
    for (const definition of entries as Iterable<any>) {
        if (!definition || definition.hasError) continue;
        if (definition.isInitialized) {
            inspect(definition.publicModule?.exports, definition.__filePath);
            continue;
        }
        const original = definition.factory;
        if (typeof original !== "function") continue;
        const observed = function(this: any, ...args: any[]) {
            // Preserve arguments, return value, exceptions and initialization order.
            // In particular, never replace Metro's import functions.
            const result = original.apply(this, args);
            pending.delete(definition);
            inspect(args[4]?.exports ?? definition.publicModule?.exports, definition.__filePath);
            return result;
        };
        try {
            definition.factory = observed;
            pending.set(definition, { original, observed });
        } catch { /* A frozen module record cannot be observed. */ }
    }
    return () => {
        active = false;
        for (const [definition, { original, observed }] of pending) {
            if (definition.factory === observed) definition.factory = original;
        }
        pending.clear();
    };
}
