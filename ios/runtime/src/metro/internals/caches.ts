import { fileExists, readFile, writeFile } from "@lib/api/native/fs";
import { NativeClientInfoModule } from "@lib/api/native/modules";
import { withTimeout } from "@lib/utils/asyncTimeout";
import { debounce } from "es-toolkit";

import { ModuleFlags, ModulesMapInternal } from "./enums";

const CACHE_VERSION = 103;
const BUNNY_METRO_CACHE_PATH = "caches/metro_modules.json";

type ModulesMap = {
    [flag in number | `_${ModulesMapInternal}`]?: ModuleFlags;
};

let _metroCache = null as unknown as ReturnType<typeof buildInitCache>;

const getModuleView = () => (globalThis as any).__CLOUDCORD_MODULE_VIEW__ ?? window.modules ?? {};
const isBridgeless = () => (globalThis as any).__CLOUDCORD_BRIDGELESS__ === true;
let canPersist = false;

export const getMetroCache = () => _metroCache;

function buildInitCache(buildNumber: string | undefined, preloadLegacyModules: boolean) {
    const cache = {
        _v: CACHE_VERSION,
        _buildNumber: buildNumber,
        _modulesCount: Object.keys(getModuleView()).length,
        flagsIndex: {} as Record<string, number>,
        findIndex: {} as Record<string, ModulesMap | undefined>,
        polyfillIndex: {} as Record<string, ModulesMap | undefined>
    } as const;

    // Keep prewarming for older bridged releases only. Recent Discord builds
    // can still use the bridge, and forcing dormant modules there can run
    // navigation or account initialization during the splash screen.
    if (preloadLegacyModules) {
        setTimeout(() => {
            for (const id in getModuleView()) {
                require("./modules").requireModule(id);
            }
        }, 100);
    }

    _metroCache = cache;
    return cache;
}

/** @internal */
export async function initMetroCache() {
    let buildNumber: string | undefined;
    let preloadLegacyModules = false;
    try {
        const client = NativeClientInfoModule?.getConstants?.();
        buildNumber = client?.Build;
        const majorVersion = Number.parseInt(client?.Version ?? "", 10);
        preloadLegacyModules = !isBridgeless() && majorVersion > 0 && majorVersion < 344;
        canPersist = !!buildNumber && !isBridgeless();
        if (canPersist) {
            const cached = await withTimeout((async () => {
                if (!await fileExists(BUNNY_METRO_CACHE_PATH)) return undefined;
                return JSON.parse(await readFile(BUNNY_METRO_CACHE_PATH));
            })(), 1500, "Metro cache read timed out");
            if (cached?._v === CACHE_VERSION && cached._buildNumber === buildNumber &&
                cached._modulesCount === Object.keys(getModuleView()).length &&
                [cached.flagsIndex, cached.findIndex, cached.polyfillIndex].every(value =>
                    value && typeof value === "object" && !Array.isArray(value))) {
                _metroCache = cached;
                return;
            }
        }
    } catch {
        canPersist = false;
    }
    buildInitCache(buildNumber, preloadLegacyModules);
}

const saveCache = debounce(() => {
    if (canPersist) void writeFile(BUNNY_METRO_CACHE_PATH, JSON.stringify(_metroCache)).catch(() => {});
}, 1000);

function extractExportsFlags(moduleExports: any) {
    if (!moduleExports) return undefined;

    const bit = ModuleFlags.EXISTS;
    return bit;
}

/** @internal */
export function indexExportsFlags(moduleId: number, moduleExports: any) {
    const flags = extractExportsFlags(moduleExports);
    if (flags && flags !== ModuleFlags.EXISTS) {
        _metroCache.flagsIndex[moduleId] = flags;
    }
}

/** @internal */
export function indexBlacklistFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.BLACKLISTED;
}

/** @internal */
export function indexAssetModuleFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.ASSET;
}

/** @internal */
export function getCacherForUniq(uniq: string, allFind: boolean) {
    const indexObject = _metroCache.findIndex[uniq] ??= {};

    return {
        cacheId(moduleId: number, exports: any) {
            indexObject[moduleId] ??= extractExportsFlags(exports);

            saveCache();
        },
        // Finish may not be called by single find
        finish(notFound: boolean) {
            if (isBridgeless()) return;
            if (allFind) indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            if (notFound) indexObject[`_${ModulesMapInternal.NOT_FOUND}`] = 1;

            saveCache();
        }
    };
}

/** @internal */
export function getPolyfillModuleCacher(name: string) {
    const indexObject = _metroCache.polyfillIndex[name] ??= {};

    return {
        getModules() {
            return require("@metro/internals/modules").getCachedPolyfillModules(name);
        },
        cacheId(moduleId: number) {
            indexObject[moduleId] = 1;
            saveCache();
        },
        finish() {
            if (isBridgeless()) return;
            indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            saveCache();
        }
    };
}
