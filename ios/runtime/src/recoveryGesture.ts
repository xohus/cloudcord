// Deliberately independent of Metro finders, settings, React hooks and profiles.
// This module must remain usable when those imports fail during startup.
export function createSwipeDetector(open: () => void, now = Date.now) {
    let start: Map<number, { x: number; y: number }> | undefined;
    let began = 0, fired = false, cooldown = 0;
    return (event: any) => {
        const touches = event?.nativeEvent?.touches;
        if (!Array.isArray(touches)) return;
        if (touches.length === 0) { start = undefined; fired = false; return; }
        if (touches.length !== 3) { start = undefined; return; }
        if (fired || now() < cooldown) return;
        if (!touches.every(t => Number.isFinite(t.identifier) && Number.isFinite(t.pageX) && Number.isFinite(t.pageY))) return;
        if (!start) {
            start = new Map(touches.map(t => [t.identifier, { x: t.pageX, y: t.pageY }]));
            began = now();
            return;
        }
        if (now() - began > 1400) { fired = true; return; }
        const deltas = touches.map(t => {
            const origin = start!.get(t.identifier);
            return origin && { x: t.pageX - origin.x, y: t.pageY - origin.y };
        });
        if (deltas.some(d => !d || Math.abs(d.x) > 65 || d.y < -25)) { fired = true; return; }
        if (deltas.every(d => d!.y >= 90)) {
            fired = true;
            cooldown = now() + 2000;
            open();
        }
    };
}

export function attachRecoveryGesture(rn: any, open: () => void) {
    const view = rn?.View;
    if (!view || typeof view.render !== "function") return;
    const original = view.render;
    const seen = new WeakSet<object>();
    const detect = createSwipeDetector(open);
    const observe = (event: any) => {
        try {
            // Touch events bubble through nested Views; process each only once.
            const native = event?.nativeEvent;
            if (!native || seen.has(native)) return;
            seen.add(native);
            detect(event);
        } catch { /* Recovery must never break Discord's touch handling. */ }
    };
    const handlers = ["onTouchStart", "onTouchMove", "onTouchEnd", "onTouchCancel"];
    const cancel = () => detect({ nativeEvent: { touches: [] } });
    const wrapped = function (this: any, props: any, ref: any) {
        const next = { ...props };
        for (const name of handlers) {
            const previous = props?.[name];
            const listener = name === "onTouchCancel" ? cancel : observe;
            next[name] = typeof previous === "function" ? function (this: any, event: any) {
                listener(event);
                return previous.call(this, event);
            } : listener;
        }
        return original.call(this, next, ref);
    };
    view.render = wrapped;
    if (view.render !== wrapped) return;
    return () => { if (view.render === wrapped) view.render = original; };
}

export function installRecoveryGesture() {
    const root = globalThis as any;
    if (root.__CLOUDCORD_RECOVERY_GESTURE__) return;
    const status = root.__CLOUDCORD_RECOVERY_GESTURE__ = { state: "waiting", stop: () => {} };
    let stopped = false, attempts = 0, timer: any, detach: (() => void) | undefined;
    let menuOpen = false, busy = false;
    function attach(rn: any) {
        if (!rn || typeof rn.Alert?.alert !== "function") return false;
        const alert = rn.Alert;
        const open = () => {
            if (menuOpen || busy || stopped) return;
            menuOpen = true;
            // Present after touch dispatch, never while React is processing it.
            setTimeout(() => {
                if (stopped) { menuOpen = false; return; }
                const run = async (restart: boolean) => {
                    menuOpen = false;
                    if (busy) return;
                    busy = true;
                    let deadline: any;
                    try {
                        const updater = require("@lib/api/native/modules").BundleUpdaterManager;
                        const method = restart ? updater?.reload : updater?.download ?? updater?.checkForUpdates;
                        if (typeof method !== "function") throw new Error("This loader does not expose this recovery action. Use the shake menu instead.");
                        await Promise.race([
                            Promise.resolve().then(() => method.call(updater)),
                            new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error("Recovery timed out. Try again when connected.")), 30000); })
                        ]);
                        alert.alert("CloudCord recovery", "Update requested. Fully close and reopen Discord to apply a downloaded update.");
                    } catch (error: any) {
                        alert.alert("CloudCord recovery", String(error?.message || error));
                    } finally { clearTimeout(deadline); busy = false; }
                };
                try {
                    const core = root.__CLOUDCORD_CORE_SETTINGS_BOOTSTRAP__;
                    const revision = String(root.__CLOUDCORD_RUNTIME_REVISION__ ?? "unknown").slice(0, 12);
                    const settingsState = core?.registered && core?.patched ? "registered" : core?.errors?.length ? "failed to attach" : "not ready";
                    alert.alert("CloudCord recovery", `Runtime: ${revision}\nSettings: ${settingsState}\n\nDownload the latest CloudCord bundle without reinstalling the app. Your account and settings stay in place.`, [
                        { text: "Cancel", style: "cancel", onPress: () => { menuOpen = false; } },
                        { text: "Download update", onPress: () => { void run(false); } },
                        { text: "Update & restart", onPress: () => { void run(true); } }
                    ], { cancelable: true, onDismiss: () => { menuOpen = false; } });
                } catch { menuOpen = false; }
            }, 0);
        };
        detach = attachRecoveryGesture(rn, open);
        return Boolean(detach);
    }
    const checked = new WeakSet<object>();
    function scan() {
        if (stopped) return;
        try {
            const registry = root.modules;
            const modules = registry instanceof Map ? registry.values() : Object.values(registry ?? {});
            for (const module of modules as Iterable<any>) {
                if (!module?.isInitialized || module.hasError) continue;
                const exports = module.publicModule?.exports;
                if (!exports || typeof exports !== "object" || checked.has(exports)) continue;
                // Inspect keys before accessing React Native's lazy getters.
                if (!Object.prototype.hasOwnProperty.call(exports, "AppRegistry") || !Object.prototype.hasOwnProperty.call(exports, "View")) { checked.add(exports); continue; }
                if (attach(exports)) { status.state = "ready"; return; }
            }
        } catch { /* Retry partial React Native initialization without forcing it. */ }
        if (++attempts < 30) timer = setTimeout(scan, 1000);
        else status.state = "unavailable";
    }
    status.stop = () => { stopped = true; clearTimeout(timer); detach?.(); status.state = "stopped"; };
    scan();
}
