const URL = "https://getcloudcord.com/api/proxy/raw/dist/cc.js";
let pending: Promise<void> | undefined;
export function createRainUpdater(files: any) {
    const download = () => pending ??= (async () => {
        const response = await fetch(URL + "?t=" + Date.now(), { headers: { "X-CC-Client": "1" }, cache: "no-store" });
        if (!response.ok) throw new Error("runtime download failed (" + response.status + ")");
        const code = await response.text();
        if (code.length < 10000 || !code.includes("CloudCord")) throw new Error("invalid runtime response");
        await files.writeFile("documents", "rain/bundle.js", code, "utf8");
    })().finally(() => { pending = undefined; });
    return {
        download, checkForUpdates: download,
        reload: async () => {
            await download();
            const bridge = (globalThis as any).__RAIN_BRIDGE_CALL_SYNC__;
            if (typeof bridge !== "function") throw new Error("Rain reload bridge unavailable");
            const result = bridge({ rain: { method: "updater.reload", args: [] } });
            if (result?.error) throw new Error(result.error);
        }
    };
}
