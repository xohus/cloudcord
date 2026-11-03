// Desktop only: a hashed machine ID that lets CloudCord moderation ban a device, not just an account.
// The web build has no native helper, so it sends nothing.
let deviceId: Promise<string | null> | null = null;
function cloudcordDeviceId() {
    const native = (globalThis as any).VencordNative?.pluginHelpers?.ProfileSpoofer;
    return deviceId ??= typeof native?.getDeviceId === "function" ? native.getDeviceId().catch(() => null) : Promise.resolve(null);
}

/** Bounded JSON requests for profile sync. The deadline also covers response
 * body decoding, and still rejects when a userscript fetch ignores abort. */
export async function fetchProfileResponse(url: string, options: RequestInit = {}, timeoutMs = 15000) {
    // Off when the user turns off "Send device ID" in ProfileSpoofer's settings.
    if (/^https:\/\/getcloudcord\.com\//.test(url) && (globalThis as any).Vencord?.Settings?.plugins?.ProfileSpoofer?.sendDeviceId !== false) {
        const id = await cloudcordDeviceId();
        if (id) options = { ...options, headers: { ...Object.fromEntries(new Headers(options.headers).entries()), "X-CloudCord-HWID": id } };
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error("CloudCord profile request timed out. Your local changes are saved."));
            controller.abort();
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            (async () => {
                const response = await fetch(url, { ...options, signal: controller.signal });
                let payload: any = null;
                try { payload = await response.json(); }
                catch { if (response.ok) throw new Error("CloudCord profile service returned invalid JSON. Your local changes are saved."); }
                return { ok: response.ok, status: response.status, headers: response.headers, json: async () => payload };
            })(),
            deadline
        ]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
}
