import { awaitStorage } from "@core/vendetta/storage";
import { loaderConfig } from "@lib/api/settings";
import { NativeModules } from "react-native";

const CURRENT_RUNTIME_URL = "https://raw.githubusercontent.com/xohus/cloudcord/main/dist/cc.js";

async function invokeLegacyReload() {
    const reader = NativeModules.FileReaderModule ?? NativeModules.RCTFileReaderModule;
    if (typeof reader?.readAsDataURL !== "function") return false;

    await reader.readAsDataURL({
        rain: { method: "updater.reload", args: [] }
    });
    return true;
}

export async function initLegacyRuntimeRefresh() {
    const nativeLoader = (globalThis as any).__CLOUDCORD_LOADER__;
    if (!nativeLoader || Number(nativeLoader.cloudcordAutoUpdateVersion ?? 0) >= 2) return;

    await awaitStorage(loaderConfig as any);

    const config = loaderConfig as any;
    config.customLoadUrl ??= { enabled: false, url: "" };

    if (config.customLoadUrl.enabled && config.customLoadUrl.url) return;

    config.customLoadUrl.url = CURRENT_RUNTIME_URL;
    config.customLoadUrl.enabled = true;

    try {
        await invokeLegacyReload();
    } catch {}
}
