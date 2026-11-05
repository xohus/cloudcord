import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

function getNativeModule<T = any>(...names: string[]): T | undefined {
    for (const name of names) {
        if (globalThis.__turboModuleProxy) {
            try {
                const module = globalThis.__turboModuleProxy(name);
                if (module) return module as T;
            } catch { /* The runtime may expose the module through the legacy proxy instead. */ }
        }

        try {
            const module = nmp?.[name];
            if (module) return module as T;
        } catch { /* Some iOS proxies throw for missing names; try the legacy alias. */ }
    }

    return undefined;
}

export const NativeCacheModule = getNativeModule<RNModules.MMKVManager>(
    "NativeCacheModule", "MMKVManager"
)!;
export const NativeFileModule = getNativeModule<RNModules.FileManager>(
    "NativeFileModule", "RTNFileManager", "DCDFileManager"
)!;
export const NativeClientInfoModule = getNativeModule<RNModules.ClientInfoModule>(
    "NativeClientInfoModule", "RTNClientInfoManager", "InfoDictionaryManager"
)!;
export const NativeDeviceModule = getNativeModule(
    "NativeDeviceModule", "RTNDeviceManager", "DCDDeviceManager"
)!;
export const NativeThemeModule = getNativeModule(
    "NativeThemeModule", "RTNThemeManager", "DCDTheme"
)!;
const nativeUpdater = getNativeModule(
    "BundleUpdaterManager"
)!;
export const BundleUpdaterManager = (globalThis as any).__CLOUDCORD_ORIGINAL_RAIN__
    ? require("../runtimeUpdates").createRainUpdater(NativeFileModule)
    : nativeUpdater;
export const ImageLoader = getNativeModule(
    "ImageLoader"
)!;
