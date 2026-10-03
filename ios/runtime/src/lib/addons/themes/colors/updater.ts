import { settings } from "@lib/api/settings";
import { findByProps, findByPropsLazy, findByStoreNameLazy } from "@metro";
import { parseColorManifest } from "./parser";
import { ColorManifest, InternalColorDefinition } from "./types";
const tokenRef = findByProps("SemanticColor");
const origRawColor = { ...tokenRef?.RawColor };
const AppearanceManager = findByPropsLazy("updateTheme");
const ThemeStore = findByStoreNameLazy("ThemeStore");
let sequence = 0;
export const _colorRef: {
    key: `bn-theme-${string}`; current: InternalColorDefinition | null;
    readonly origRaw: Record<string, string>; lastSetDiscordTheme: string;
} = { current: null, key: "bn-theme-0", origRaw: origRawColor, lastSetDiscordTheme: "darker" };
export function updateBunnyColor(manifest: ColorManifest | null, { update = true } = {}) {
    if (settings.safeMode?.enabled) return;
    const current = manifest ? parseColorManifest(manifest) : null;
    const existing = String(ThemeStore?.theme ?? "darker");
    if (!existing.startsWith("bn-theme-")) _colorRef.lastSetDiscordTheme = existing;
    _colorRef.current = current;
    _colorRef.key = `bn-theme-${++sequence}`;
    // Discord 344 validates its native theme enum. Custom colors override the
    // resolver; no invented theme name or new entry in frozen token tables.
    if (update) {
        if (typeof AppearanceManager?.setShouldSyncAppearanceSettings === "function")
            AppearanceManager.setShouldSyncAppearanceSettings(false);
        if (typeof AppearanceManager?.updateTheme === "function")
            AppearanceManager.updateTheme(current?.reference ?? _colorRef.lastSetDiscordTheme);
    }
}
