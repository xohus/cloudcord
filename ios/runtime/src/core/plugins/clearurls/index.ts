import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the ClearURLs plugin by adryd and thororen.
const TRACKING_PARAMS = [
    /^utm_/i, /^fbclid$/i, /^gclid$/i, /^dclid$/i, /^msclkid$/i, /^mc_(cid|eid)$/i, /^igshid$/i, /^igsh$/i,
    /^si$/i, /^feature$/i, /^ref_src$/i, /^ref_url$/i, /^_hsenc$/i, /^_hsmi$/i, /^yclid$/i, /^twclid$/i,
    /^s$/i, /^t$/i, /^share_id$/i, /^spm$/i, /^vero_(id|conv)$/i, /^wt_?mc$/i, /^oly_(anon|enc)_id$/i, /^rb_clickid$/i
];
// Short single-letter params are only tracking on these sites.
const SHORT_PARAM_SITES = /(^|\.)(twitter\.com|x\.com)$/i;

// Plain string parsing: React Native's URL class doesn't implement hostname or searchParams.
export function clean(url: string) {
    const match = url.match(/^(https?:\/\/([^/?#]+)[^?#]*)\?([^#]*)(#.*)?$/i);
    if (!match) return url;
    const [, base, host, query, hash = ""] = match;
    const kept = query.split("&").filter(pair => {
        if (!pair) return false;
        const key = decodeURIComponent(pair.split("=")[0].replace(/\+/g, " "));
        if (key.length <= 1 && !SHORT_PARAM_SITES.test(host)) return true;
        return !TRACKING_PARAMS.some(re => re.test(key));
    });
    return kept.length === query.split("&").filter(Boolean).length ? url : base + (kept.length ? "?" + kept.join("&") : "") + hash;
}

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.clearurls",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "ClearURLs",
            description: "Removes tracking parameters from links you send",
            authors: [{ name: "adryd" }, { name: "thororen" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string") message.content = message.content.replace(/https?:\/\/[^\s<>]+/g, clean);
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
