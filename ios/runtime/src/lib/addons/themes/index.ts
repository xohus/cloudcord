import { awaitStorage, createFileBackend, createMMKVBackend, createStorage, wrapSync } from "@core/vendetta/storage";
import { writeFile } from "@lib/api/native/fs";
import { getStoredTheme, getThemeFilePath, isPyonLoader, isThemeSupported } from "@lib/api/native/loader";
import { awaitStorage as newAwaitStorage } from "@lib/api/storage";
import { safeFetch } from "@lib/utils";
import { Platform } from "react-native";
import { settings } from "@lib/api/settings";
import initColors from "./colors";
import { applyAndroidAlphaKeys, normalizeToHex } from "./colors/parser";
import { colorsPref } from "./colors/preferences";
import { VendettaThemeManifest } from "./colors/types";
import { updateBunnyColor } from "./colors/updater";

export interface VdThemeInfo {
    id: string;
    selected: boolean;
    data: VendettaThemeManifest;
}

export const themes = wrapSync(createStorage<Record<string, VdThemeInfo>>(createMMKVBackend("VENDETTA_THEMES")));

/**
 * @internal
 */
export async function writeThemeToNative(theme: VdThemeInfo | {}) {
    if (typeof theme !== "object") throw new Error("Theme must be an object");

    // Save the current theme as current-theme.json. When supported by loader,
    // this json will be written to appropriate path and be used to theme the native side.
    await createFileBackend(getThemeFilePath() || "theme.json").set(theme);
}

// Process data for some compatiblity with native side
function processData(data: VendettaThemeManifest) {
    if (data.semanticColors) {
        const { semanticColors } = data;

        for (const key in semanticColors) {
            for (const index in semanticColors[key]) {
                semanticColors[key][index] &&= normalizeToHex(semanticColors[key][index] as string) || false;
            }
        }
    }

    if (data.rawColors) {
        const { rawColors } = data;

        for (const key in rawColors) {
            const normalized = normalizeToHex(rawColors[key]);
            if (normalized) data.rawColors[key] = normalized;
        }

        if (Platform.OS === "android") applyAndroidAlphaKeys(rawColors);
    }

    if (data.spec === undefined) {
        if (!('theme_color_map' in data)) {
          data.spec = 2;
        }
        //If not then Enmity theme and no spec
    }

    return data;
}

function validateTheme(themeJSON: any): boolean {
    if (typeof themeJSON !== "object" || themeJSON === null || Array.isArray(themeJSON)) return false;
    const record = (value: any) => value != null && typeof value === "object" && !Array.isArray(value);
    if (themeJSON.spec === 3) return record(themeJSON.main);
    if (themeJSON.spec !== undefined && themeJSON.spec !== 2) return false;
    // Older Vendetta themes omit spec. processData normalizes these to v2,
    // but rejecting them here previously made that compatibility unreachable.
    return themeJSON.spec === 2 || record(themeJSON.theme_color_map) ||
        record(themeJSON.semanticColors) || record(themeJSON.rawColors);
}

export async function fetchTheme(url: string, selected?: boolean, refresh = false) {
    let themeJSON: any;

    try {
        themeJSON = await (await safeFetch(url, { cache: "no-store" })).json();
    } catch {
        throw new Error(`Failed to fetch theme at ${url}`);
    }

    // Validate theme
    if (!validateTheme(themeJSON)) throw new Error(`Invalid theme at ${url}`);

    const previous = themes[url];
    if (refresh && !previous) return;
    const wasSelected = refresh ? !!previous?.selected : selected ?? !!previous?.selected;
    const theme = {
        id: url,
        selected: wasSelected,
        data: processData(themeJSON),
    };
    themes[url] = theme;

    if (wasSelected) await selectTheme(theme);
}

export async function installTheme(url: string) {
    if (typeof url !== "string" || url in themes) throw new Error("Theme already installed");
    await fetchTheme(url);
}

export function selectTheme(theme: VdThemeInfo | null, write = true) {
    if (theme) theme.selected = true;
    Object.keys(themes).forEach(
        k => themes[k].selected = themes[k].id === theme?.id
    );

    if (theme == null && write) {
        updateBunnyColor(null, { update: true });
        return writeThemeToNative({});
    } else if (theme) {
        updateBunnyColor(theme.data, { update: true });
        return writeThemeToNative(theme);
    }
}

export async function removeTheme(id: string) {
    const theme = themes[id];
    if (theme.selected) await selectTheme(null);
    delete themes[id];

    return theme.selected;
}

export async function updateThemes() {
    await awaitStorage(themes);
    await Promise.allSettled(Object.keys(themes).map(id => fetchTheme(id, undefined, true)));
}

export function getCurrentTheme() {
    return Object.values(themes).find(t => t.selected) ?? null;
}

/**
 * @internal
 */
export function getThemeFromLoader(): VdThemeInfo | null {
    return getStoredTheme();
}

/**
 * @internal
 */
export async function initThemes() {
    if (!isThemeSupported()) return;

    try {
        await awaitStorage(settings, themes);
        if (settings.safeMode?.enabled) return;
        if (isPyonLoader()) {
            writeFile("../vendetta_theme.json", "null");
        }

        await newAwaitStorage(colorsPref);

        const currentTheme = getCurrentTheme() ?? getThemeFromLoader();
        initColors(currentTheme?.data ?? null);

        updateThemes().catch(e => console.error("Failed to update themes", e));
    } catch (e) {
        console.error("Failed to initialize themes", e);
    }
}
