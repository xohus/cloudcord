/* SPDX-License-Identifier: GPL-3.0-or-later */

// ReverseImageSearch by Ven and Nuckyz.
import { validateCxMediaLink } from "./cxExpressionLinks";

const engines = {
    Google: "https://lens.google.com/uploadbyurl?url=",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    IQDB: "https://iqdb.org/?url=",
    Bing: "https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:",
    TinEye: "https://www.tineye.com/search?url=",
    ImgOps: "https://imgops.com/start?url=",
};

export type CxSearchMediaSource = {
    shareURI?: unknown; sourceURI?: unknown; uri?: unknown; obscure?: unknown;
    videoURI?: unknown; attachment?: { content_type?: string; };
};

export function getCxImageSearchOptions(input: unknown, source?: CxSearchMediaSource) {
    const link = validateCxMediaLink(input);
    if (!link || link.length > 4096) return [];
    if (source) {
        const mime = source.attachment?.content_type;
        if (source.videoURI || (typeof mime === "string" && mime
            ? !mime.startsWith("image/")
            : !/\.(?:avif|bmp|gif|heic|ico|jpe?g|png|svg|webp)$/i.test(link.split(/[?#]/, 1)[0]))) return [];
    }
    let query: string;
    try { query = encodeURIComponent(link); }
    catch { return []; }
    return Object.entries(engines).map(([label, endpoint]) => ({ label, url: endpoint + query }));
}
