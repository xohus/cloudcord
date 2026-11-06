import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const colorFields = new Map([
    ["background-primary", "background"],
    ["background-secondary", "surface"],
    ["background-tertiary", "sidebar"],
    ["text-normal", "text"],
    ["text-muted", "muted"],
    ["brand-500", "accent"],
]);

// Only the CSS palette subset with an equivalent CX representation is accepted.
export function migrateCxPalette(css, name) {
    if (css.length > 512 * 1024) throw new Error("Theme source exceeds 512 KB");
    if (typeof name !== "string" || !name.trim() || name.length > 64 || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(name))
        throw new Error("Enter a theme name between 1 and 64 characters");

    const source = css.replace(/\/\*[\s\S]*?\*\//g, " ").trim();
    const rule = /^:root\s*\{([^{}]*)\}$/.exec(source);
    if (!rule) throw new Error("This theme needs a manual port. CX palette migration accepts a single :root block without imports or selectors.");

    const fields = new Map();
    let wallpaper, opacity;
    // The supported embedded image format contains a single ;base64 delimiter.
    for (const declaration of rule[1].split(/;(?!base64,)/)) {
        if (!declaration.trim()) continue;
        const property = /^\s*--([a-z0-9-]+)\s*:\s*(.*?)\s*$/s.exec(declaration);
        const [, key, value] = property ?? [];
        const field = colorFields.get(key);
        const digits = /^#([a-f0-9]{3}|[a-f0-9]{6})$/i.exec(value)?.[1];
        if (field && digits && !fields.has(field)) {
            fields.set(field, "#" + (digits.length === 3 ? [...digits].map(digit => digit.repeat(2)).join("") : digits));
            continue;
        }
        if (key === "background-image" && !wallpaper) {
            const image = /^url\((["']?)(data:image\/(?:png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/)[A-Za-z0-9+/]+={0,2})\1\)$/.exec(value)?.[2];
            if (image && image.length <= 384 * 1024 && image.slice(image.indexOf(",") + 1).length % 4 === 0) {
                wallpaper = image;
                continue;
            }
        }
        if (key === "background-opacity" && opacity === undefined && /^(?:100|[1-9]?[0-9])%$/.test(value)) {
            opacity = value.slice(0, -1);
            continue;
        }
        throw new Error("This theme has a property or value that needs a manual port.");
    }
    if (!fields.has("background")) throw new Error("The palette needs --background-primary.");
    if (opacity !== undefined && !wallpaper) throw new Error("The palette needs an embedded wallpaper for background opacity.");
    return [
        `theme ${JSON.stringify(name)}:`,
        ...[...fields].map(([field, value]) => `  ${field}: ${value}`),
        ...(wallpaper ? [`  wallpaper: ${JSON.stringify(wallpaper)}`] : []),
        ...(opacity !== undefined ? [`  wallpaper-opacity: ${opacity}`] : []),
    ].join("\n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [file, name] = process.argv.slice(2);
    try {
        if (!file || !name) throw new Error('Usage: node cx-migrate-palette.mjs input.css "Theme name"');
        console.log(migrateCxPalette(await readFile(file, "utf8"), name).trimEnd());
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
