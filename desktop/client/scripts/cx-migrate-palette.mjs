import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";

const colorFields = new Map([
    ["background-primary", "background"],
    ["background-secondary", "surface"],
    ["background-tertiary", "sidebar"],
    ["text-normal", "text"],
    ["text-muted", "muted"],
    ["brand-500", "accent"],
]);

function pngChunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type, "ascii"), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4);
    const checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
}

// Bake the strict CSS gradient subset into the same offline PNG that both
// renderers can load. The chat's normal cover sizing applies to this image.
function gradientWallpaper(value) {
    const gradient = /^linear-gradient\(\s*(-?\d{1,3}(?:\.\d{1,3})?)deg\s*,\s*(.+)\)$/i.exec(value);
    if (!gradient) return;
    const stops = gradient[2].split(",").map(stop => {
        const match = /^\s*#([0-9a-f]{6})\s+(\d{1,3}(?:\.\d{1,3})?)%\s*$/i.exec(stop);
        if (!match) return;
        return { rgb: Buffer.from(match[1], "hex"), position: Number(match[2]) };
    });
    if (stops.length < 2 || stops.length > 8 || stops.some((stop, i) =>
        !stop || stop.position > 100 || (i > 0 && stop.position <= stops[i - 1]?.position)
    )) return;
    const angle = Number(gradient[1]) * Math.PI / 180;
    const xDirection = Math.sin(angle);
    const yDirection = -Math.cos(angle);
    const extent = Math.abs(xDirection) + Math.abs(yDirection);
    const size = 256;
    const stride = size * 3 + 1;
    const pixels = Buffer.alloc(size * stride);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const position = 50 + 100 * ((x / (size - 1) - 0.5) * xDirection + (y / (size - 1) - 0.5) * yDirection) / extent;
        const end = stops.findIndex(stop => stop.position >= position);
        const right = stops[end < 0 ? stops.length - 1 : end];
        const left = stops[end > 0 ? end - 1 : end < 0 ? stops.length - 1 : 0];
        const blend = left === right ? 0 : (position - left.position) / (right.position - left.position);
        for (let channel = 0; channel < 3; channel++)
            pixels[y * stride + x * 3 + 1 + channel] = Math.round(left.rgb[channel] * (1 - blend) + right.rgb[channel] * blend);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size, 0);
    header.writeUInt32BE(size, 4);
    header[8] = 8;
    header[9] = 2;
    const png = Buffer.concat([
        Buffer.from("89504e470d0a1a0a", "hex"),
        pngChunk("IHDR", header),
        pngChunk("IDAT", deflateSync(pixels)),
        pngChunk("IEND", Buffer.alloc(0)),
    ]);
    return "data:image/png;base64," + png.toString("base64");
}

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
            const image = /^url\((["']?)(data:image\/(?:png;base64,iVBORw0KGgo|jpeg;base64,\/9j\/)[A-Za-z0-9+/]+={0,2})\1\)$/.exec(value)?.[2]
                ?? gradientWallpaper(value);
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
