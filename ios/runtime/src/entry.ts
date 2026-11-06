import type { Metro } from "@metro/types";
import { version } from "bunny-build-info";
(globalThis as any).__CLOUDCORD_RUNTIME_REVISION__ = "development";
// Rain can expose its identity directly or alias it under CloudCord in native code.
const root = globalThis as any;
const rain = root.__RAIN_LOADER__;
const existingLoader = root.__CLOUDCORD_LOADER__;
if (rain && (!existingLoader || existingLoader === rain)) {
    root.__CLOUDCORD_ORIGINAL_RAIN__ = true;
    root.__CLOUDCORD_LOADER__ = existingLoader ?? {
        ...rain, loaderName: "CloudCord", cloudcordAutoUpdateVersion: 3
    };
    root.__PYON_LOADER__ = root.__CLOUDCORD_LOADER__;
}
const { instead } = require("spitroast");

// @ts-ignore - window is defined later in the bundle, so we assign it early
globalThis.window = globalThis;

// Keep recovery outside the settings/profile import graph: that graph may be
// the very thing that failed. Never reload Discord or hold its launch queue.
let recoveryStarted = false;
function recoverStartupUpdate() {
    if (recoveryStarted) return;
    recoveryStarted = true;
    try {
        const { BundleUpdaterManager } = require("@lib/api/native/modules");
        if (typeof BundleUpdaterManager?.checkForUpdates !== "function") return;
        const state = { status: "checking", error: "" };
        (globalThis as any).__CLOUDCORD_STARTUP_RECOVERY__ = state;
        let timeout: ReturnType<typeof setTimeout>;
        void Promise.race([
            Promise.resolve().then(() => BundleUpdaterManager.checkForUpdates()),
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Update check timed out")), 22000);
            })
        ]).then(() => {
            state.status = "checked";
            console.log("CloudCord recovery update check completed; reopen Discord to apply a downloaded update.");
        }, error => {
            state.status = "failed";
            state.error = String(error?.message ?? error);
            console.log("CloudCord recovery update check failed", state.error);
        }).finally(() => clearTimeout(timeout));
    } catch (error) {
        console.log("CloudCord recovery updater unavailable", error);
    }
}

async function initializeCloudCord() {
    // Install recovery before any settings/profile/cache imports can fail.
    try { require("./recoveryGesture").installRecoveryGesture(); } catch {}
    try {
        // Rain can attach after Metro already exists, without setting window.modules.
        // Prepare a private view for both early and late injection paths.
        const registry = window.modules; // __c resets Metro, it is not a registry getter.
        if (!registry) throw new Error("Discord's module registry is not available yet");
        (globalThis as any).__CLOUDCORD_MODULE_VIEW__ = registry instanceof Map
            ? Object.fromEntries(registry) : { ...registry };

        // Legacy React Native needs mutable module exports before Discord
        // starts. On Discord 344+ this bundle is attached after startup;
        // replacing these globals then corrupts active account/navigation
        // stores and can leave the client on an infinite loading screen.
        if (!(globalThis as any).__CLOUDCORD_BRIDGELESS__) {
            Object.freeze = Object.seal = Object;
        }

        await require("@metro/internals/caches").initMetroCache();
        // Register core navigation before importing the optional runtime graph.
        // A top-level import failure in fonts/plugins/profile code otherwise
        // prevents index.ts's supposedly independent settings block from running.
        const core = (globalThis as any).__CLOUDCORD_CORE_SETTINGS_BOOTSTRAP__ ??= {
            registered: false, patched: false, errors: [] as string[], unloads: [] as (() => void)[]
        };
        if ((globalThis as any).__CLOUDCORD_LOADER__?.loaderName !== "RealCord") {
            for (const [key, load] of [
                ["registered", () => require("@core/ui/settings").default()],
                ["patched", () => require("@ui/settings").patchSettings()]
            ] as const) {
                if (core[key]) continue;
                try {
                    const cleanup = load();
                    if (typeof cleanup === "function") core.unloads.push(cleanup);
                    core[key] = true;
                } catch (error: any) {
                    core.errors.push(`${key}: ${String(error?.message || error)}`);
                }
            }
        }
        // Rain injects before AppRegistry starts. Optional async work (plugins,
        // theme setup, network updates) must not hold Discord's launch queue.
        // Keep rejection handling without awaiting it before resumeDeferred().
        const startup = require(".").default();
        if (startup && typeof startup.catch === "function") {
            startup.catch((error: unknown) => {
                console.error("CloudCord optional startup failed", error);
                recoverStartupUpdate();
            });
        }
    } catch (e) {
        recoverStartupUpdate();
        const stack = e instanceof Error ? e.stack : undefined;
        console.log(stack ?? e?.toString?.() ?? e);
        let build = "unavailable";
        // Reporting a startup failure must not itself import a failing native
        // module and create a second unhandled promise rejection.
        try {
            const { NativeClientInfoModule } = require("@lib/api/native/modules");
            build = String(NativeClientInfoModule?.getConstants?.()?.Build ?? build);
        } catch {}
        const message = [
            "Failed to load CloudCord!\n",
            `Build Number: ${build}`,
            `CloudCord: ${version}`,
            `Runtime: ${String((globalThis as any).__CLOUDCORD_RUNTIME_REVISION__ ?? "unknown").slice(0, 12)}`,
            stack || e?.toString?.(),
        ].join("\n");
        try {
            if (typeof alert === "function") alert(message);
        } catch (reportError) {
            console.log("CloudCord startup alert unavailable", reportError);
        }
    }
}

if (typeof window.__r === "undefined") {
    // Used for storing the current require function for the global.__r getter defined below
    var _requireFunc: any;

    // Calls from the native side are deferred until the index.ts(x) is loaded
    interface DeferredQueue {
        object: any;
        method: string;
        resume?: (queue: DeferredQueue) => void;
        args: any[];
    }

    const deferredCalls: Array<DeferredQueue> = [];
    const unpatches: Array<() => void> = [];

    const deferMethodExecution = (
        object: any, 
        method: string, 
        condition?: (...args: any[]) => boolean, 
        resume?: (queue: DeferredQueue) => void, 
        returnWith?: (queue: DeferredQueue) => any
    ) => {
        const restore = instead(method, object, function (this: any, args: any[], original: any) {
            if (!condition || condition(...args)) {
                const queue: DeferredQueue = { object, method, args, resume };
                deferredCalls.push(queue);
                return returnWith ? returnWith(queue) : undefined;
            }

            // If the condition is not met, we execute the original method immediately
            return original.apply(this, args);
        });

        unpatches.push(restore);
    }

    const resumeDeferred = () => {
        for (const queue of deferredCalls) {
            const { object, method, args, resume } = queue;

            if (resume) {
                resume(queue);
            } else {
                object[method](...args);
            }
        }

        deferredCalls.length = 0;
    }

    const onceIndexRequired = (originalRequire: Metro.RequireFn) => {
        // We hold calls from the native side
        if (window.__fbBatchedBridge) {
            const batchedBridge = window.__fbBatchedBridge;
            deferMethodExecution(
                batchedBridge,
                "callFunctionReturnFlushedQueue",
                // If the call is to AppRegistry, we want to defer it because it is not yet registered (Revenge delays it)
                // Same goes to the non-callable modules, which are not registered yet, so we ensure that only registered ones can get through
                (...args) => args[0] === "AppRegistry" || !batchedBridge.getCallableModule(args[0]),
                ({ args }) => {
                    if (batchedBridge.getCallableModule(args[0])) {
                        batchedBridge.__callFunction(...args);
                    }
                },
                () => batchedBridge.flushedQueue()
            );
        }

        // Introduced since RN New Architecture
        if (window.RN$AppRegistry) {
            deferMethodExecution(window.RN$AppRegistry, "runApplication");
        }

        const startDiscord = async () => {
            await initializeCloudCord();
            
            for (const unpatch of unpatches) unpatch();
            unpatches.length = 0;

            originalRequire(0);
            resumeDeferred();
        };

        startDiscord();
    }

    Object.defineProperties(globalThis, {
        __r: {
            configurable: true,
            get: () => _requireFunc,
            set(v) {
                // _requireFunc is required here, because using 'this' here errors for some unknown reason
                _requireFunc = function patchedRequire(a: number) {
                    // Initializing index.ts(x)
                    if (a === 0) {
                        _requireFunc = v;
                        onceIndexRequired(v);
                    } else return v(a);
                };
            }
        },
        __d: {
            configurable: true,
            get() {
                // @ts-ignore - I got an error where 'Object' is undefined *sometimes*, which is literally never supposed to happen
                if (window.Object && !window.modules) {
                    window.modules = window.__c?.();
                }
                return this.value;
            },
            set(v) { this.value = v; }
        }
    });
} else {
    initializeCloudCord();
}
