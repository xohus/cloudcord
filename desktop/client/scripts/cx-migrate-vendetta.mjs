import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const colorPattern = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const namePattern = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

// Preserve the selected mode's original colors. The primary palette also provides
// the portable defaults for clients with different token names.
export function migrateCxVendetta(manifest, mode, name = manifest?.name, wallpaper) {
    if (mode !== "dark" && mode !== "light") throw new Error("Choose dark or light mode");
    if (typeof name !== "string" || !name.trim() || name.length > 64 || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(name))
        throw new Error("Enter a theme name between 1 and 64 characters");
    if (manifest?.spec !== 2) throw new Error("This converter accepts spec 2 color themes");
    if (manifest.background?.url && !wallpaper) throw new Error("Convert wallpaper themes with an explicit local image, or use a source without wallpapers");
    if (wallpaper && (!manifest.background?.url || wallpaper.length > 384 * 1024
        || !/^data:image\/(?:png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/)[A-Za-z0-9+/]+={0,2}$/.test(wallpaper)
        || wallpaper.slice(wallpaper.indexOf(",") + 1).length % 4 !== 0))
        throw new Error("Expected an embedded PNG or JPEG for the theme wallpaper");
    const opacity = manifest.background?.alpha;
    if (wallpaper && opacity !== undefined && !Number.isFinite(opacity)) throw new Error("Invalid wallpaper opacity");
    const blur = manifest.background?.blur;
    if (wallpaper && blur !== undefined && (!Number.isFinite(blur) || blur < 0 || blur > 32)) throw new Error("Invalid wallpaper blur");
    const { semanticColors = {}, rawColors } = manifest;
    const semantic = tokenEntries(semanticColors, (colors, token) => {
        if (!Array.isArray(colors) || !colors.length || colors.length > 3 || colors.some(color => !normalizeColor(color)))
            throw new Error("Invalid semantic colors for " + token);
        return colors[mode === "light" ? 1 : 0] ?? colors[0];
    });
    const raw = tokenEntries(rawColors, color => color);
    const accents = [rawColors?.BRAND_500, semanticColors.TEXT_LINK?.[0]];
    const palette = {
        background: semanticColors.BACKGROUND_PRIMARY?.[0],
        surface: semanticColors.BACKGROUND_SECONDARY?.[0],
        sidebar: semanticColors.BACKGROUND_TERTIARY?.[0],
        text: semanticColors.TEXT_NORMAL?.[0],
        muted: semanticColors.TEXT_MUTED?.[0],
        accent: accents.find(color => normalizeColor(color)?.length === 7),
    };
    if (!palette.background) throw new Error("Theme is missing BACKGROUND_PRIMARY");
    return [
        'theme ' + JSON.stringify(name) + ':',
        '  mode: ' + mode,
        ...Object.entries(palette).filter(([, color]) => color !== undefined).map(([key, color]) => {
            const normalized = normalizeColor(color);
            if (normalized?.length !== 7) throw new Error("Portable palette requires an opaque color for " + key);
            return '  ' + key + ': ' + normalized;
        }),
        ...semantic.map(([token, color]) => '  semantic ' + token + ': ' + color),
        ...raw.map(([token, color]) => '  raw ' + token + ': ' + color),
        ...(wallpaper ? [
            '  wallpaper: ' + JSON.stringify(wallpaper),
            '  wallpaper-opacity: ' + Math.round(Math.min(1, Math.max(0, opacity ?? 1)) * 100),
            ...(blur ? ['  wallpaper-blur: ' + Math.round(blur * 100) / 100] : []),
        ] : []),
    ].join("\n") + "\n";
}

function normalizeColor(value) {
    if (typeof value !== "string") return;
    if (colorPattern.test(value)) return value;
    if (value === "transparent") return "#00000000";
    if (/^#[0-9a-f]{3}$/i.test(value)) return "#" + [...value.slice(1)].map(digit => digit.repeat(2)).join("");
}

function tokenEntries(table, read) {
    if (table === undefined) return [];
    if (!table || typeof table !== "object" || Array.isArray(table)) throw new Error("Invalid theme color table");
    const entries = Object.entries(table).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    if (entries.length > 256) throw new Error("Too many theme color tokens");
    return entries.map(([token, value]) => {
        if (!namePattern.test(token) || token.length > 64) throw new Error("Invalid theme color token " + token);
        const color = normalizeColor(read(value, token));
        if (!color) throw new Error("Invalid color for " + token);
        return [token, color];
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [file, mode, name, image] = process.argv.slice(2);
    try {
        if (!file) throw new Error('Usage: node cx-migrate-vendetta.mjs theme.json dark|light ["Theme name" [wallpaper.png|wallpaper.jpg]]');
        const type = /\.png$/i.test(image ?? "") ? "png" : "jpeg";
        const wallpaper = image ? "data:image/" + type + ";base64," + (await readFile(image)).toString("base64") : undefined;
        process.stdout.write(migrateCxVendetta(JSON.parse(await readFile(file, "utf8")), mode, name, wallpaper));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
