import type { RestAPI } from "@vencord/discord-types";

function giftRoute(url: unknown, code: string | undefined) {
    if (!code || typeof url !== "string") return;
    const match = /^(?:(?:https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com)?\/api(?:\/v\d+)?)?\/entitlements\/gift-codes\/([a-z0-9-]+)(\/redeem)?(?:[?#].*)?$/i.exec(url);
    if (match?.[1] === code) return match[2] ? "redeem" : "resolve";
}

export function installGiftPreview(
    rest: Pick<RestAPI, "get" | "post">,
    getCode: () => string | undefined,
    resolve: (code: string) => object,
    onRedeem: () => void,
) {
    let active = true;
    const { get, post } = rest;
    const getPreview: RestAPI["get"] = function (this: unknown, request, ...args: unknown[]) {
        const code = active ? getCode() : undefined;
        if (code && giftRoute(request?.url, code) === "resolve") {
            const body = resolve(code);
            return Promise.resolve({ ok: true, status: 200, body, text: JSON.stringify(body), headers: {} });
        }
        return Reflect.apply(get, this, [request, ...args]);
    };
    const postPreview: RestAPI["post"] = function (this: unknown, request, ...args: unknown[]) {
        if (active && giftRoute(request?.url, getCode()) === "redeem") {
            onRedeem();
            return Promise.reject({ ok: false, status: 400, body: { code: 50050, message: "This gift is only a preview on this device." } });
        }
        return Reflect.apply(post, this, [request, ...args]);
    };
    try {
        rest.get = getPreview;
        rest.post = postPreview;
        if (rest.get !== getPreview || rest.post !== postPreview) throw new Error("Discord gift requests are read-only");
    } catch (error) {
        active = false;
        if (rest.get === getPreview) rest.get = get;
        if (rest.post === postPreview) rest.post = post;
        throw error;
    }
    return () => {
        active = false;
        if (rest.get === getPreview) rest.get = get;
        if (rest.post === postPreview) rest.post = post;
    };
}
