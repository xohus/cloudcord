import { getMetroCache, indexBlacklistFlag, indexExportsFlags } from "@metro/internals/caches";
import { Metro } from "@metro/types";

import { ModuleFlags, ModulesMapInternal } from "./enums";

const { before, instead } = require("spitroast");

export const metroModules: Metro.ModuleList = window.modules;
const metroRequire = (id: string | number) => window.__r(+id);

// eslint-disable-next-line func-call-spacing
const moduleSubscriptions = new Map<number, Set<() => void>>();
const blacklistedIds = new Set<number>();
const noopHandler = () => undefined;
const functionToString = Function.prototype.toString;

let patchedInspectSource = false;
let patchedImportTracker = false;
let patchedNativeComponentRegistry = false;
let _importingModuleId: number = -1;

/**
 * Builds a diagnostics-only view of Metro without requiring dormant modules.
 * Never include export values: they may contain account data, tokens, or messages.
 */
export function getSafeModuleCompatibilityReport() {
    const report: Array<{
        id: number;
        initialized: boolean;
        hasError: boolean;
        filePath?: string;
        exportKeys?: string[];
        defaultExportKeys?: string[];
        defaultDisplayName?: string;
    }> = [];

    for (const rawId of Object.keys(metroModules)) {
        const id = Number(rawId);
        const module = metroModules[id] as any;
        const item: (typeof report)[number] = {
            id,
            initialized: module?.isInitialized === true,
            hasError: module?.hasError === true,
        };

        if (typeof module?.__filePath === "string") item.filePath = module.__filePath.slice(0, 300);

        // Reading exports is safe only after Discord itself initialized the module.
        // Reflective access is individually guarded because some exports are proxies.
        if (item.initialized && !item.hasError) {
            try {
                const exports = module?.publicModule?.exports;
                if (exports != null && (typeof exports === "object" || typeof exports === "function")) {
                    item.exportKeys = Reflect.ownKeys(exports)
                        .filter((key): key is string => typeof key === "string")
                        .slice(0, 150);
                    const defaultExport = exports.default;
                    if (defaultExport != null && (typeof defaultExport === "object" || typeof defaultExport === "function")) {
                        item.defaultExportKeys = Reflect.ownKeys(defaultExport)
                            .filter((key): key is string => typeof key === "string")
                            .slice(0, 100);
                        const displayName = defaultExport.displayName ?? defaultExport.constructor?.displayName;
                        if (typeof displayName === "string") item.defaultDisplayName = displayName.slice(0, 120);
                    }
                }
            } catch {
                // A hostile/proxied export must not make Diagnostics crash Discord.
            }
        }
        report.push(item);
    }

    return {
        moduleCount: report.length,
        initializedCount: report.filter(module => module.initialized).length,
        errorCount: report.filter(module => module.hasError).length,
        modules: report,
    };
}

for (const key in metroModules) {
    const id = Number(key);
    const metroModule = metroModules[id];

    // On Discord 344, wrapping factories that Discord has not executed yet
    // changes the initialization path of account, guild and navigation stores.
    // Observe only modules Discord already initialized before CloudCord starts.
    if ((globalThis as any).__CLOUDCORD_BRIDGELESS__ && !metroModule?.isInitialized)
        continue;

    const cache = getMetroCache().flagsIndex[id];
    if (cache & ModuleFlags.BLACKLISTED) {
        blacklistModule(id);
        continue;
    }

    if (metroModule!.factory) {
        instead("factory", metroModule, ((args: Parameters<Metro.FactoryFn>, origFunc: Metro.FactoryFn) => {
            const originalImportingId = _importingModuleId;
            _importingModuleId = id;

            const { 1: metroRequire, 4: moduleObject } = args;

            args[2 /* metroImportDefault */] = id => {
                const exps = metroRequire(id);
                return exps && exps.__esModule ? exps.default : exps;
            };

            args[3 /* metroImportAll */] = id => {
                const exps = metroRequire(id);
                if (exps && exps.__esModule) return exps;

                const importAll: Record<string, any> = {};
                if (exps) Object.assign(importAll, exps);
                importAll.default = exps;
                return importAll;
            };

            origFunc(...args);
            if (!isBadExports(moduleObject.exports)) {
                onModuleRequire(moduleObject.exports, id);
            } else {
                blacklistModule(id);
            }

            _importingModuleId = originalImportingId;
        }) as any); // If only spitroast had better types
    }
}

/** Makes the module associated with the specified ID non-enumberable. */
function blacklistModule(id: number) {
    Object.defineProperty(metroModules, id, { enumerable: false });
    blacklistedIds.add(id);
    indexBlacklistFlag(Number(id));
}

function isBadExports(exports: any) {
    return !exports
        || exports === window
        || exports["<!@ pylix was here :fuyusquish: \n Hi pylix! -cocobo1!@>"] === null
        || (exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0)
        || (exports.default?.[Symbol.toStringTag] === "IntlMessagesProxy");
}

function onModuleRequire(moduleExports: any, id: Metro.ModuleID) {
    indexExportsFlags(id, moduleExports);

    // Temporary
    moduleExports.initSentry &&= () => undefined;
    if (moduleExports.default?.track && moduleExports.default.trackMaker)
        moduleExports.default.track = () => Promise.resolve();

    if (moduleExports.registerAsset) {
        require("@lib/api/assets/patches").patchAssets(moduleExports);
    }

    // There are modules registering the same native component
    if (!patchedNativeComponentRegistry && ["customBubblingEventTypes", "customDirectEventTypes", "register", "get"].every(x => moduleExports[x])) {
        instead("register", moduleExports, ([name, cb]: any, origFunc: any) => {
            try {
                return origFunc(name, cb);
            } catch {
                return name;
            }
        });

        patchedNativeComponentRegistry = true;
    }


    // Hook DeveloperExperimentStore
    if (moduleExports?.default?.constructor?.displayName === "DeveloperExperimentStore") {
        moduleExports.default = new Proxy(moduleExports.default, {
            get(target, property, receiver) {
                if (property === "isDeveloper") {
                    // Hopefully won't explode accessing it here :3
                    const { settings } = require("@lib/api/settings");
                    return settings.enableDiscordDeveloperSettings ?? false;
                }

                return Reflect.get(target, property, receiver);
            }
        });
    }

    if (!patchedImportTracker && moduleExports.fileFinishedImporting) {
        before("fileFinishedImporting", moduleExports, ([filePath]: [string]) => {
            if (_importingModuleId === -1 || !filePath) return;
            metroModules[_importingModuleId]!.__filePath = filePath;
        });
        patchedImportTracker = true;
    }

    // Funny infinity recursion caused by a race condition
    if (!patchedInspectSource && window["__core-js_shared__"]) {
        const inspect = (f: unknown) => typeof f === "function" && functionToString.apply(f, []);
        window["__core-js_shared__"].inspectSource = inspect;
        patchedInspectSource = true;
    }

    //
    if (moduleExports.findHostInstance_DEPRECATED) {
        const prevExports = metroModules[id - 1]?.publicModule.exports;
        const inc = prevExports.default?.reactProfilingEnabled ? 1 : -1;
        if (!metroModules[id + inc]?.isInitialized) {
            blacklistModule(id + inc);
        }
    }

    // Hindi timestamps moment
    if (moduleExports.isMoment) {
        instead("defineLocale", moduleExports, (args: [string], orig: (lcl: string) => string) => {
            const origLocale = moduleExports.locale();
            orig(...args);
            moduleExports.locale(origLocale);
        });
    }

    const subs = moduleSubscriptions.get(Number(id));
    if (subs) {
        subs.forEach(s => s());
        moduleSubscriptions.delete(Number(id));
    }
}

export function getImportingModuleId() {
    return _importingModuleId;
}

export function subscribeModule(id: number, cb: () => void): () => void {
    const subs = moduleSubscriptions.get(id) ?? new Set();

    subs.add(cb);
    moduleSubscriptions.set(id, subs);

    return () => subs.delete(cb);
}

export function requireModule(id: Metro.ModuleID) {
    if (!(globalThis as any).__CLOUDCORD_BRIDGELESS__ && !metroModules[0]?.isInitialized) metroRequire(0);
    if (blacklistedIds.has(id)) return undefined;

    // Discord 344's bridgeless runtime owns module initialization order.
    // Requiring dormant modules during discovery can initialize account and
    // navigation stores before their native dependencies are ready.
    if ((globalThis as any).__CLOUDCORD_BRIDGELESS__ && !metroModules[id]?.isInitialized)
        return undefined;

    if (Number(id) === -1) return require("@metro/polyfills/redesign");

    if (metroModules[id]?.isInitialized && !metroModules[id]?.hasError) {
        return metroRequire(id);
    }

    // Disable Internal RN error reporting logic
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(noopHandler);

    let moduleExports;
    try {
        moduleExports = metroRequire(id);
    } catch {
        blacklistModule(id);
        moduleExports = undefined;
    }

    // Done initializing! Now, revert our hacks
    ErrorUtils.setGlobalHandler(originalHandler);

    return moduleExports;
}

export function* getModules(uniq: string, all = false) {
    yield [-1, require("@metro/polyfills/redesign")];

    let cache = getMetroCache().findIndex[uniq];
    if (all && !cache?.[`_${ModulesMapInternal.FULL_LOOKUP}`]) cache = undefined;
    if (cache?.[`_${ModulesMapInternal.NOT_FOUND}`]) return;

    for (const id in cache) {
        if (id[0] === "_") continue;
        const exports = requireModule(Number(id));
        if (isBadExports(exports)) continue;
        yield [id, exports];
    }

    for (const id in metroModules) {
        const exports = requireModule(Number(id));
        if (isBadExports(exports)) continue;
        yield [id, exports];
    }
}

export function* getCachedPolyfillModules(name: string) {
    const cache = getMetroCache().polyfillIndex[name]!;

    for (const id in cache) {
        const exports = requireModule(Number(id));
        if (isBadExports(exports)) continue;
        yield [id, exports];
    }

    if (!cache[`_${ModulesMapInternal.FULL_LOOKUP}`]) {
        for (const id in metroModules) {
            const exports = requireModule(Number(id));
            if (isBadExports(exports)) continue;
            yield [id, exports];
        }
    }
}

export interface WaitForOptions {
    count?: number;
}

export type ModuleFilter<T = any> = {
    (exports: any): T | undefined;
    key?: string;
}

export function waitFor<T = any>(
    filter: ModuleFilter<T>,
    callback: (exports: T, id: Metro.ModuleID) => void,
    options: WaitForOptions = {}
): () => void {
    const { count = 1 } = options;
    let currentCount = 0;
    const unsubscribers: Array<() => void> = [];
    let isActive = true;

    const cleanup = () => {
        if (!isActive) return;
        isActive = false;
        unsubscribers.forEach(unsub => unsub());
        unsubscribers.length = 0;
    };

    function checkModule(id: Metro.ModuleID): boolean {
        if (!isActive) return true;

        const exports = requireModule(id);
        if (isBadExports(exports)) return false;

        const result = filter(exports);
        if (!result) return false;

        callback(result, id);
        
        if (++currentCount >= count) {
            cleanup();
            return true;
        }

        return false;
    }

    if (filter.key) {
        const cache = getMetroCache().findIndex[filter.key];
        if (cache) {
            for (const id in cache) {
                if (id[0] === "_") continue;
                const numId = Number(id);
                
                if (metroModules[numId]?.isInitialized) {
                    if (checkModule(numId)) return cleanup;
                } else {
                    const unsub = subscribeModule(numId, () => {
                        checkModule(numId);
                    });
                    unsubscribers.push(unsub);
                }
            }
        }
    }

    for (const id in metroModules) {
        if (!isActive) break;
        const numId = Number(id);
        
        if (metroModules[numId]?.isInitialized && !metroModules[numId]?.hasError) {
            if (checkModule(numId)) return cleanup;
        }
    }

    if (isActive) {
        for (const id in metroModules) {
            const numId = Number(id);
            if (!metroModules[numId]?.isInitialized) {
                const unsub = subscribeModule(numId, () => {
                    checkModule(numId);
                });
                unsubscribers.push(unsub);
            }
        }
    }

    return cleanup;
}

export function waitForModule<T = any>(
    filter: ModuleFilter<T>,
    options: WaitForOptions = {}
): Promise<T> {
    return new Promise((resolve) => {
        waitFor(filter, (exports) => resolve(exports), options);
    });
}
