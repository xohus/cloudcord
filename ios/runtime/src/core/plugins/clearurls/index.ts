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

function clean(url: string) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return url; }
    let changed = false;
    for (const key of [...parsed.searchParams.keys()]) {
        if (key.length <= 1 && !SHORT_PARAM_SITES.test(parsed.hostname)) continue;
        if (TRACKING_PARAMS.some(re => re.test(key))) { parsed.searchParams.delete(key); changed = true; }
    }
    return changed ? parsed.toString() : url;
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
