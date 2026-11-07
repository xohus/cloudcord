import { validateCxMediaLink } from "./cxExpressionLinks";

const gifHost = /(?:^|\.)(?:tenor|giphy|imgur)\.com$/i;

function imageParts(input: unknown) {
    const link = validateCxMediaLink(input);
    if (!link) return;
    const [, host, path] = /^https?:\/\/([^:/?#]+)(?::\d+)?(\/[^?#]*)?/i.exec(link) ?? [];
    if (!host) return;
    return { link, host, filename: path?.slice(path.lastIndexOf("/") + 1) ?? "" };
}

// Adapted from ImageFilename and BetterGifAltText by Ven (GPL-3.0-or-later).
export function getCxImageTitle(input: unknown, full = false) {
    const image = imageParts(input);
    if (!image) return;
    if (gifHost.test(image.host)) return image.link;
    if (/\.(?:png|jpe?g|gif|webp|avif)$/i.test(image.filename)) return full ? image.link : image.filename;
}

export function getCxGifDescription(input: unknown, alt: unknown, knownGif = false) {
    if (alt != null && alt !== "" && alt !== "GIF") return;
    const image = imageParts(input);
    if (!image || !image.filename || !knownGif && !gifHost.test(image.host) && !/\.gif$/i.test(image.filename)) return;
    let name = image.filename;
    try { name = decodeURIComponent(name); } catch { /* The filename may contain malformed escapes. */ }
    name = name.replace(/\.(?:gif|webp|mp4)$/i, "").replace(/[\d\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/gu, "")
        .split(/[,\-_\s]+/g).filter(Boolean).slice(0, 20).join(" ");
    if (!/\p{L}/u.test(name)) return;
    return "GIF - " + (name.length > 300 ? name.slice(0, 300) + "…" : name);
}
