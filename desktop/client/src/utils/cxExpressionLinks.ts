const snowflake = /^\d{17,20}$/;

// Compatible with CopyEmojiMarkdown and CopyStickerLinks (GPL-3.0-or-later).
export function formatCxEmojiMarkdown(emoji: {
    id?: unknown; name?: unknown; alt?: unknown; src?: unknown; animated?: unknown; surrogate?: unknown;
} | undefined) {
    if (!emoji) return;
    if (typeof emoji.surrogate === "string" && /^[^\x00-\x7f<>]{1,32}$/u.test(emoji.surrogate) && !emoji.id) return emoji.surrogate;
    const label = emoji.name ?? emoji.alt;
    if (typeof label !== "string" || typeof emoji.id !== "string" || !snowflake.test(emoji.id)) return;
    const name = label.replace(/^:|:$/g, "").replace(/~\d+$/, "");
    if (!/^[a-z0-9_]{1,32}$/i.test(name)) return;
    const animated = emoji.animated === true || typeof emoji.src === "string"
        && (/\.gif(?:\?|$)/i.test(emoji.src) || /[?&]animated=true(?:&|$)/i.test(emoji.src));
    return `<${animated ? "a" : ""}:${name}:${emoji.id}>`;
}

export function formatCxStickerLink(sticker: { id?: unknown; format_type?: unknown; formatType?: unknown; } | undefined) {
    const id = sticker?.id;
    if (typeof id !== "string" || !snowflake.test(id)) return;
    const format = sticker?.format_type ?? sticker?.formatType;
    if (format === 4) return `https://media.discordapp.net/stickers/${id}.gif?size=512&lossless=true`;
    if (format !== 1 && format !== 2 && format !== 3) return;
    return `https://cdn.discordapp.com/stickers/${id}.${format === 3 ? "json" : "png"}?size=512&lossless=true`;
}

export function validateCxStickerLink(link: unknown) {
    if (typeof link === "string" && /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/stickers\/\d{17,20}\.(?:png|json|gif|webp)(?:\?[a-z0-9_=&-]{1,128})?$/i.test(link))
        return link;
}

export function validateCxMediaLink(link: unknown) {
    if (typeof link !== "string" || link.length > 8192 || /[\s\x00-\x1f\x7f\\<>"\u202a-\u202e\u2066-\u2069]/u.test(link)) return;
    if (/^https?:\/\/(?:[a-z\d.-]+|\[[a-f\d:]+\])(?::\d{1,5})?(?:[/?#]|$)/i.test(link)) return link;
}

export function getCxSteamLink(input: unknown) {
    if (typeof input !== "string") return;
    const link = validateCxMediaLink(input.replace(/^steam:\/\/openurl\//i, ""));
    const match = link && /^https?:\/\/(steamcommunity\.com|store\.steampowered\.com|help\.steampowered\.com|s\.team)(\/[^?#]*)?([?#].*)?$/i.exec(link);
    if (!match) return;
    const host = match[1].toLowerCase();
    const path = match[2] ?? "/";
    if (/%(?:2e|2f|5c)|(?:^|\/)\.{1,2}(?:\/|$)/i.test(path)) return;
    if (host === "steamcommunity.com" && /^\/(?:linkfilter|openid)(?:\/|$)/i.test(path)) return;
    if (host === "s.team" && !/^\/a\/\d+\/?$|^\/p\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(path)) return;
    if (host === "store.steampowered.com" && /^\/(?:steamlink|m\/launchapp)(?:\/|$)/i.test(path)) return;
    const https = "https://" + host + path + (match[3] ?? "");
    return { https, steam: "steam://openurl/" + https, mobile: host !== "help.steampowered.com" };
}
