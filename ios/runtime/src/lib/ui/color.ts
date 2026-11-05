import { findByStoreNameLazy } from "@metro/wrappers";

const ThemeStore = findByStoreNameLazy("ThemeStore");
const fallbackSemantic: Record<string, string> = {
    CARD_BACKGROUND_DEFAULT: "#1e1f22", CARD_SECONDARY_BG: "#1e1f22",
    TEXT_DEFAULT: "#f2f3f5", TEXT_NORMAL: "#f2f3f5",
    MOBILE_TEXT_HEADING_PRIMARY: "#f2f3f5", TEXT_MUTED: "#949ba4",
    BORDER_SUBTLE: "#3f4147", INTERACTIVE_ICON_DEFAULT: "#b5bac1"
};
const fallbackRaw: Record<string, string> = { WHITE: "#ffffff", BLACK: "#000000" };
let nativeColors: any;
let legacyColors: any;
let nextLookup = 0;

function getColors() {
    if (nativeColors || Date.now() < nextLookup) return;
    // Error screens can import this before Discord's theme module is ready.
    // Inspect only initialized exports; never force factories or cache a miss
    // permanently. Bound repeated misses while the startup modules settle.
    nextLookup = Date.now() + 250;
    const registry = (globalThis as any).__CLOUDCORD_MODULE_VIEW__ ?? (globalThis as any).modules;
    const entries = registry instanceof Map ? registry.values() : Object.values(registry ?? {});
    for (const record of entries as Iterable<any>) {
        if (!record?.isInitialized || record.hasError) continue;
        try {
            const root = record.publicModule?.exports;
            for (const value of [root, root?.default]) {
                if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
                if (value.colors && (value.unsafe_rawColors || value.meta || value.internal)) {
                    nativeColors = value;
                    return;
                }
                if (value.ThemeColorMap && value.Colors) legacyColors = value;
            }
        } catch { /* An unrelated lazy export must not prevent startup. */ }
    }
}

function colorTable(kind: "semantic" | "raw") {
    getColors();
    return kind === "semantic"
        ? nativeColors?.colors ?? legacyColors?.ThemeColorMap ?? fallbackSemantic
        : nativeColors?.unsafe_rawColors ?? legacyColors?.Colors ?? fallbackRaw;
}

function liveColors(kind: "semantic" | "raw") {
    return new Proxy({} as Record<string, any>, {
        get: (_, key) => colorTable(kind)[key],
        has: (_, key) => key in colorTable(kind),
        ownKeys: () => Reflect.ownKeys(colorTable(kind)),
        getOwnPropertyDescriptor: (_, key) => key in colorTable(kind)
            ? { configurable: true, enumerable: true, value: colorTable(kind)[key] } : undefined
    });
}

export const semanticColors = liveColors("semantic");
export const rawColors = liveColors("raw") as Record<string, string>;

function getResolver() {
    getColors();
    return nativeColors?.meta ?? nativeColors?.internal;
}

export function isSemanticColor(value: any): boolean {
    const resolver = getResolver();
    return typeof resolver?.isSemanticColor === "function" ? resolver.isSemanticColor(value) : false;
}

export function resolveSemanticColor(value: any, theme?: string): string | undefined {
    const resolver = getResolver();
    if (typeof resolver?.resolveSemanticColor !== "function") return typeof value === "string" ? value : undefined;
    if (!theme) {
        try { theme = ThemeStore.theme; } catch { /* ThemeStore may also load later. */ }
    }
    return resolver.resolveSemanticColor(theme ?? "dark", value);
}
