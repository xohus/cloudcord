/** Observe settings dependencies as Discord loads them, without requiring them. */
export function observeSettingsModules(visit: (exports: any, path?: string) => void) {
    const root = globalThis as any;
    const modules = root.__CLOUDCORD_MODULE_VIEW__ ?? root.modules;
    const pending = new Map<any, { original: any; observed: any }>();
    const seen = new WeakSet<object>();
    let active = true;
    const inspect = (exports: any, path?: string) => {
        if (!active || exports == null) return;
        try { visit(exports, path); }
        catch (error) { console.warn("CloudCord settings module could not be attached", error); }
    };

    // The private module view is an object on both Map and legacy Metro builds.
    // Do not use a finder here: it can force dormant factories or cache a miss.
    const observe = (definition: any) => {
        if (!definition || typeof definition !== "object" || definition.hasError || seen.has(definition)) return;
        seen.add(definition);
        if (definition.isInitialized) {
            inspect(definition.publicModule?.exports, definition.__filePath);
            return;
        }
        const original = definition.factory;
        if (typeof original !== "function") return;
        const observed = function(this: any, ...args: any[]) {
            // Preserve arguments, return value, exceptions and initialization order.
            // In particular, never replace Metro's import functions.
            const result = original.apply(this, args);
            pending.delete(definition);
            if (definition.factory === observed) definition.factory = original;
            inspect(args[4]?.exports ?? definition.publicModule?.exports, definition.__filePath);
            return result;
        };
        try {
            definition.factory = observed;
            pending.set(definition, { original, observed });
        } catch { /* A frozen module record cannot be observed. */ }
    };
    // The startup view is a snapshot. Split bundles can define settings later;
    // observe definitions after Metro registers them, before their first import.
    const originalDefine = root.__d;
    const define = function(this: any, ...args: any[]) {
        const result = originalDefine.apply(this, args);
        if (active) try {
            const registry = root.modules;
            const id = args[1];
            const definition = registry instanceof Map ? registry.get(id) : registry?.[id];
            if (definition) {
                if (modules instanceof Map) modules.set(id, definition);
                else if (modules) modules[id] = definition;
                observe(definition);
            }
        } catch (error) { console.warn("CloudCord settings definition could not be observed", error); }
        return result;
    };
    if (typeof originalDefine === "function") try { root.__d = define; } catch {}
    const liveModules = root.modules; // __c clears Metro; never call it after definitions exist.
    for (const registry of [modules, liveModules]) {
        const entries = registry instanceof Map ? registry.values() : Object.values(registry ?? {});
        for (const definition of entries as Iterable<any>) observe(definition);
    }
    return () => {
        active = false;
        if (root.__d === define) root.__d = originalDefine;
        for (const [definition, { original, observed }] of pending) {
            if (definition.factory === observed) definition.factory = original;
        }
        pending.clear();
    };
}
