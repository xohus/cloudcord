type ImageRequest = { width?: unknown; height?: unknown; original: boolean; frozen?: boolean; };

// Adapted from FixImagesQuality by Nuckyz and Ven (GPL-3.0-or-later).
export function getCxAttachmentImageUrl(source: unknown, { width, height, original, frozen }: ImageRequest) {
    if (typeof source !== "string" || source.length > 8192 || /[\s\x00-\x1f\x7f\\]/u.test(source)) return;
    const match = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)(\/attachments\/\d+\/\d+\/[^/?#]+\.(png|jpe?g|gif|webp|avif|bmp))(?:\?([^#]*))?$/i.exec(source);
    if (!match) return;
    const [, path, extension, query] = match;
    const proxy = !original || frozen === true;
    if (!original && (typeof width !== "number" || typeof height !== "number" || !Number.isFinite(width)
        || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 65536 || height > 65536)) return;

    // Preserve raw signature parameters and any unrelated query fields.
    const fields = query?.split("&").filter(field => field && !/^(?:width|height|format|animated)=/i.test(field)
        && (proxy || !/^quality=/i.test(field))) ?? [];
    if (proxy) {
        const format = frozen && extension.toLowerCase() === "gif" ? "webp" : query?.match(/(?:^|&)format=(webp|png|jpe?g|gif|avif)(?:&|$)/i)?.[1];
        if (format) fields.push("format=" + format);
        const animated = frozen === undefined ? query?.match(/(?:^|&)animated=(?:true|false)(?:&|$)/i)?.[0].replace(/^&|&$/g, "") : "animated=" + !frozen;
        if (animated) fields.push(animated);
        if (!original && typeof width === "number" && typeof height === "number") {
            const scale = Math.min(1, Math.sqrt(2_400_000 / (width * height)), 2400 / Math.max(width, height));
            fields.push("width=" + Math.max(1, Math.floor(width * scale)), "height=" + Math.max(1, Math.floor(height * scale)));
        }
    }
    return `https://${proxy ? "media.discordapp.net" : "cdn.discordapp.com"}${path}${fields.length ? "?" + fields.join("&") : ""}`;
}
