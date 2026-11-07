export function reverseText(text: string) {
    return [...text].reverse().join("");
}

const httpsOrigin = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/i;

export function parseCxHttpsOrigin(value: string) {
    if (!httpsOrigin.test(value)) throw new Error("Use a bare HTTPS domain for link rewrites");
    return value.toLowerCase();
}

export function rewriteCxOrigin(text: string, rules: ReadonlyMap<string, string>) {
    const match = /^(https:\/\/[^/?#\s]+)(\/[^?#\s]*)?(\?[^#\s]*)?(?:#[^\s]*)?$/i.exec(text.trim());
    if (!match || /[\x00-\x20\x7f\\<>"']/u.test(match[0])) return text;
    const [, origin, path = "/", query = ""] = match;
    const destination = rules.get(origin.toLowerCase());
    return destination ? destination + path + query : text;
}

export function rewriteCxLinks(text: string, rules: ReadonlyMap<string, string>) {
    return text.replace(/(^|[\s<("'[{])https?:\/\/([a-z0-9.-]+)/gi,
        (original, before: string, host: string, offset: number) => {
            const end = offset + original.length;
            const next = text[end];
            if (next && !/[/?#\s<>]/.test(next) && !/^["')\]},!]+(?=$|[\s<>])/.test(text.slice(end))) return original;
            const domain = host.replace(/\.+$/, "");
            const destination = rules.get("https://" + domain.toLowerCase());
            return destination ? before + destination + host.slice(domain.length) : original;
        });
}

// Ingtoninator by zyqunix and BioTomateDE.
function ingtonify(text: string) {
    const links = [...text.matchAll(/https?:\/\/[^\s]+\.[^\s]+/gi)];
    const words = [...text.matchAll(/\p{L}+/gu)].filter(({ 0: word, index }) =>
        !/^(?:i)$/i.test(word) && !/[aeouy]$/i.test(word) &&
        !links.some(link => index! >= link.index! && index! < link.index! + link[0].length)
    );
    const match = words[Math.floor(Math.random() * words.length)];
    if (!match) return text;
    const word = match[0];
    const upper = word.toUpperCase();
    const overlap = upper.match(/(?:INGTON|INGTO|INGT|ING|IN|I)$/)?.[0].length ?? 0;
    const suffix = "INGTON".slice(overlap);
    const end = match.index! + word.length;
    return text.slice(0, end) + (word === upper ? suffix : suffix.toLowerCase()) + text.slice(end);
}

// ClearURLs by adryd and thororen. These are the bundled mobile tracking rules.
const tracking = /^(?:utm_.*|fbclid|gclid|dclid|msclkid|mc_(?:cid|eid)|igshid|igsh|si|feature|ref_src|ref_url|_hsenc|_hsmi|yclid|twclid|share_id|spm|vero_(?:id|conv)|wt_?mc|oly_(?:anon|enc)_id|rb_clickid)$/i;
function cleanTrackingLink(url: string) {
    const match = /^(https?:\/\/([^/?#]+)[^?#]*)\?([^#]*)(#.*)?$/i.exec(url);
    if (!match) return url;
    const [, base, host, query, fragment = ""] = match;
    const pairs = query.split("&");
    const kept = pairs.filter(pair => {
        const name = pair.split("=")[0];
        try {
            const key = decodeURIComponent(name.replace(/\+/g, " "));
            if (/^[st]$/i.test(key)) return !/(^|\.)(?:twitter\.com|x\.com)(?::\d+)?$/i.test(host);
            return !tracking.test(key);
        } catch {
            return true;
        }
    });
    const rest = kept.filter(Boolean).join("&");
    return kept.length === pairs.length ? url : base + (rest ? "?" + rest : "") + fragment;
}

// PolishWording by Samwich and WKoA.
const contractions = {
    "wasn't": "was not", "can't": "cannot", "don't": "do not", "won't": "will not", "isn't": "is not", "aren't": "are not",
    "haven't": "have not", "hasn't": "has not", "hadn't": "had not", "doesn't": "does not", "didn't": "did not",
    "shouldn't": "should not", "wouldn't": "would not", "couldn't": "could not", "that's": "that is", "what's": "what is",
    "there's": "there is", "how's": "how is", "where's": "where is", "when's": "when is", "who's": "who is", "why's": "why is",
    "you'll": "you will", "i'll": "I will", "they'll": "they will", "it'll": "it will", "i'm": "I am", "you're": "you are",
    "they're": "they are", "he's": "he is", "she's": "she is", "i've": "I have", "you've": "you have", "we've": "we have",
    "they've": "they have", "you'd": "you would", "he'd": "he would", "she'd": "she would", "it'd": "it would",
    "we'd": "we would", "they'd": "they would", "y'all": "you all", "here's": "here is",
};
const expanded = new Map(Object.entries(contractions));
const missing = new Map([...expanded.keys()].map(word => [word.replace("'", ""), word]));
const wordPattern = (words: Map<string, string>) => new RegExp("\\b(?:" + [...words.keys()].join("|") + ")\\b", "gi");
const missingPattern = wordPattern(missing);
const expandedPattern = wordPattern(expanded);
export const polishOptions = new Set(["apostrophes", "expand", "capitalize", "punctuation"]);

function preserveCase(original: string, replacement: string) {
    if (original === original.toUpperCase()) return replacement.toUpperCase();
    if (original[0] === original[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
    return replacement;
}

function polishWording(input: string, options = "apostrophes") {
    if (input.includes("\uE000")) return input;
    const selected = new Set(options.split(",").map(option => option.trim()));
    const protectedText: string[] = [];
    let text = input.replace(/\x60{3}[\s\S]*?\x60{3}|\x60[^\x60]*\x60|https?:\/\/[^\s<>]+|<(?:[@#:][^>\s]+|a:[^>\s]+)>/gi, match =>
        "\uE000" + (protectedText.push(match) - 1) + "\uE000"
    );
    if (selected.has("apostrophes") || selected.has("expand"))
        text = text.replace(missingPattern, word => preserveCase(word, missing.get(word.toLowerCase())!));
    if (selected.has("capitalize"))
        text = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, before, letter) => before + letter.toUpperCase()).replace(/\bi\b/g, "I");
    if (selected.has("expand"))
        text = text.replace(expandedPattern, word => preserveCase(word, expanded.get(word.toLowerCase())!));
    if (selected.has("punctuation") && text.trim() && !/[\uE000.!?…:;)\]"'*_~\x60]\s*$|\p{Extended_Pictographic}\s*$/u.test(text))
        text = text.replace(/\s*$/, ".");
    return text.replace(/\uE000(\d+)\uE000/g, (_, index) => protectedText[Number(index)]);
}

// SendTimestamps by Vee, GGTyler and Grzesiek11.
export function formatLocalTime(hour: number, minute: number, meridiem: string | undefined, now: Date) {
    if (minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return;
    if (meridiem) hour = hour % 12 + (meridiem.toUpperCase() === "PM" ? 12 : 0);
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target < now) {
        target.setDate(target.getDate() + 1);
        target.setHours(hour, minute, 0, 0);
    }
    return "<t:" + Math.floor(target.getTime() / 1000) + ":t>";
}

export const messageTransforms = {
    reverse: reverseText,
    // NormalizeMessageLinks by bb010g.
    normalizeDiscordLinks: (text: string) => text.replace(/https:\/\/(?:canary\.|ptb\.)discord(?:app)?\.com\/channels\//g, "https://discord.com/channels/"),
    // Unindent by Vee.
    unindentCode: (text: string) => text.replace(/(```[^\n`]*\n)([\s\S]*?)(```)/g, (_, opening, code: string, closing) => {
        const lines = code.split("\n");
        let minimum = Infinity;
        for (const line of lines) {
            if (line.trim()) minimum = Math.min(minimum, /^[\t ]*/.exec(line)![0].length);
        }
        if (!Number.isFinite(minimum) || minimum === 0) return opening + code + closing;
        return opening + lines.map(line => line.replace(/^[\t ]+/, indent => indent.slice(minimum))).join("\n") + closing;
    }),
    // WriteUpperCase by Samwich and KrystalSkull.
    capitalizeSentences: (text: string, exclusions = "http, https, ok") => {
        const prefixes = exclusions.split(",").map(prefix => prefix.trim().toLowerCase()).filter(Boolean);
        return text.split(/([.!?]+['")\]]*\s+)/).map((part, index) =>
            index % 2 || prefixes.some(prefix => part.toLowerCase().startsWith(prefix)) ? part : part.charAt(0).toUpperCase() + part.slice(1)).join("");
    },
    ingtonify,
    polishWording,
    clearTrackingLinks: (text: string) => text.replace(/https?:\/\/[^\s<>]+/gi, match => {
        let url = match.replace(/[.,;!?]+$/, "");
        const extraClosing = (url.match(/\)/g)?.length ?? 0) - (url.match(/\(/g)?.length ?? 0);
        if (extraClosing > 0) url = url.replace(/\)+$/, ending => ending.slice(0, -extraClosing));
        return cleanTrackingLink(url) + match.slice(url.length);
    }),
    // Signature by Vee, Rini, ImBanana and KrystalSkull.
    signature: (text: string, signature = "a chronic discord user") => text.trim() ? text + "\n> " + signature : text,
    // SilentMessageToggle by Nuckyz, CatNoir and Z1xus.
    silentMessage: (text: string) => text.trim() && !/^@silent(?:\s|$)/.test(text) ? "@silent " + text : text,
    // AutoVaporwave and ZeroWidthSanitizer by rootpoi, kraethis, and ewlle.
    fullwidth: (text: string) => text.replace(/[ -~]/g, char => char === " " ? "　" : String.fromCharCode(char.charCodeAt(0) + 0xfee0)),
    stripInvisible: (text: string) => text.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff\u00ad]/g, ""),
    sendTimestamps: (text: string) => {
        const now = new Date();
        return text.replace(/\x60{3}[\s\S]*?\x60{3}|\x60{2}[\s\S]*?\x60{2}|\x60(\d{1,2}):(\d{2}) ?(am|pm)?\x60/gi,
            (match, hour, minute, meridiem) => hour === undefined ? match : formatLocalTime(Number(hour), Number(minute), meridiem, now) ?? match);
    },
};
