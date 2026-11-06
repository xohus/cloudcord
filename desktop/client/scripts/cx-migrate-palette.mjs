import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Only the CSS palette subset with an equivalent CX representation is accepted.
export function migrateCxPalette(css, name) {
    if (css.length > 512 * 1024) throw new Error("Theme source exceeds 512 KB");
    if (typeof name !== "string" || !name.trim() || name.length > 64 || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(name))
        throw new Error("Enter a theme name between 1 and 64 characters");

    const source = css.replace(/\/\*[\s\S]*?\*\//g, " ").trim();
    const rule = /^:root\s*\{([^{}]*)\}$/.exec(source);
    if (!rule) throw new Error("This theme needs a manual port. CX palette migration accepts a single :root block without imports or selectors.");

    const colors = new Map();
    for (const declaration of rule[1].split(";")) {
        if (!declaration.trim()) continue;
        const match = /^\s*--(background-primary|brand-500)\s*:\s*#([a-f0-9]{3}|[a-f0-9]{6})\s*$/i.exec(declaration);
        if (!match || match[1] !== match[1].toLowerCase() || colors.has(match[1]))
            throw new Error("This theme has a property or value that needs a manual port.");
        const [, key, digits] = match;
        colors.set(key, "#" + (digits.length === 3 ? [...digits].map(digit => digit.repeat(2)).join("") : digits));
    }

    const background = colors.get("background-primary");
    if (!background) throw new Error("The palette needs --background-primary.");
    const accent = colors.get("brand-500");
    return [
        `theme ${JSON.stringify(name)}:`,
        `  background: ${background}`,
        ...(accent ? [`  accent: ${accent}`] : []),
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
