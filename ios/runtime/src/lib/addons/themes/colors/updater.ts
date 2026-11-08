import { settings } from "@lib/api/settings";
import { findByProps, findByPropsLazy, findByStoreNameLazy } from "@metro";
import { parseColorManifest } from "./parser";
import { ColorManifest, InternalColorDefinition } from "./types";
const tokenRef = findByProps("SemanticColor");
const origRawColor = { ...tokenRef?.RawColor };
const AppearanceManager = findByPropsLazy("updateTheme");
const ThemeStore = findByStoreNameLazy("ThemeStore");
let sequence = 0;
const colorListeners = new Set<() => void>();

type ColorOverlay = { darkOnly?: boolean; raw?: Readonly<Record<string, string>>; semantic?: Readonly<Record<string, string>>; };
const overlays = new Set<ColorOverlay>();
const emptyOverlay = { raw: Object.create(null), semantic: Object.create(null) };
let darkOverlay = emptyOverlay;
let lightOverlay = emptyOverlay;

function rebuildColorOverlays() {
    const merge = (dark: boolean) => {
        const raw: Record<string, string> = Object.create(null);
        const semantic: Record<string, string> = Object.create(null);
        for (const entry of overlays) {
            if (entry.darkOnly && !dark) continue;
            Object.assign(raw, entry.raw);
            Object.assign(semantic, entry.semantic);
        }
        return { raw, semantic };
    };
    darkOverlay = merge(true);
    lightOverlay = merge(false);
}

export function getColorOverlay(theme?: unknown): { raw: Record<string, string>; semantic: Record<string, string>; } | undefined {
    if (!overlays.size || settings.safeMode?.enabled) return;
    const mode = _colorRef.current?.reference ?? theme ?? ThemeStore?.theme;
    return typeof mode === "string" && mode.startsWith("light") ? lightOverlay : darkOverlay;
}

export function registerColorOverlay(overlay: ColorOverlay) {
    const entry = { ...overlay };
    function refresh() {
        rebuildColorOverlays();
        if (settings.safeMode?.enabled || typeof AppearanceManager?.updateTheme !== "function") return;
        const theme = _colorRef.current?.reference ?? ThemeStore?.theme ?? _colorRef.lastSetDiscordTheme;
        AppearanceManager.updateTheme(theme);
    }
    overlays.add(entry);
    try {
        refresh();
    } catch (error) {
        overlays.delete(entry);
        rebuildColorOverlays();
        throw error;
    }
    return () => { if (overlays.delete(entry)) refresh(); };
}

export function subscribeThemeColors(listener: () => void) {
    colorListeners.add(listener);
    return () => { colorListeners.delete(listener); };
}

export function getThemeColors() {
    return _colorRef.current;
}
export const _colorRef: {
    key: `bn-theme-${string}`; current: InternalColorDefinition | null;
    readonly origRaw: Record<string, string>; lastSetDiscordTheme: string;
} = { current: null, key: "bn-theme-0", origRaw: origRawColor, lastSetDiscordTheme: "darker" };
let baseTheme: InternalColorDefinition | null = null;
let temporaryTheme: InternalColorDefinition | undefined;

export function updateBunnyColor(manifest: ColorManifest | null, { update = true, mode }: {
    update?: boolean;
    mode?: "dark" | "light";
} = {}) {
    if (settings.safeMode?.enabled) return;
    baseTheme = manifest ? parseColorManifest(manifest, mode) : null;
    if (!temporaryTheme) publishTheme(baseTheme, update);
}

export function applyTemporaryTheme(manifest: ColorManifest, mode?: "dark" | "light") {
    if (settings.safeMode?.enabled || temporaryTheme) throw new Error("Cannot apply a temporary theme");
    const theme = parseColorManifest(manifest, mode);
    temporaryTheme = theme;
    try {
        publishTheme(theme, true);
    } catch (error) {
        temporaryTheme = undefined;
        publishTheme(baseTheme, false);
        throw error;
    }
    return () => {
        if (temporaryTheme !== theme) return;
        temporaryTheme = undefined;
        publishTheme(baseTheme, !settings.safeMode?.enabled);
    };
}

function publishTheme(current: InternalColorDefinition | null, update: boolean) {
    const existing = String(ThemeStore?.theme ?? "darker");
    // Capture the native theme before the first override. Switching between
    // custom themes or disabling one must not save its temporary native mode.
    if (!_colorRef.current && !existing.startsWith("bn-theme-")) _colorRef.lastSetDiscordTheme = existing;
    _colorRef.current = current;
    _colorRef.key = `bn-theme-${++sequence}`;
    for (const listener of colorListeners) listener();
    // Discord 344 validates its native theme enum. Custom colors override the
    // resolver; no invented theme name or new entry in frozen token tables.
    if (update) {
        if (typeof AppearanceManager?.setShouldSyncAppearanceSettings === "function")
            AppearanceManager.setShouldSyncAppearanceSettings(false);
        if (typeof AppearanceManager?.updateTheme === "function")
            AppearanceManager.updateTheme(current?.reference ?? _colorRef.lastSetDiscordTheme);
    }
}
