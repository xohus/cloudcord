/** Bounded JSON requests for profile sync. The deadline also covers response
 * body decoding, and still rejects when a userscript fetch ignores abort. */
export async function fetchProfileResponse(url: string, options: RequestInit = {}, timeoutMs = 15000) {
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
