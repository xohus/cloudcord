const URL = "https://getcloudcord.com/api/proxy/raw/dist/cc.js";
let pending: Promise<void> | undefined;
export function startAutoUpdates(prefs: any, updater: any) {
    let stopped = false, checking = false;
    const check = async () => {
        if (stopped || checking || prefs.cloudcordAutoUpdate === false) return;
        checking = true;
        prefs.cloudcordUpdateStatus = "Checking for updates…";
        try {
            if (typeof updater?.checkForUpdates !== "function") throw new Error("This loader cannot check for updates.");
            await updater.checkForUpdates();
            if (!stopped) prefs.cloudcordUpdateStatus = "Latest runtime saved. Reopen Discord to apply it.";
        } catch (error: any) {
            if (!stopped) prefs.cloudcordUpdateStatus = "Update failed: " + (error?.message || "connection unavailable") + ". Retrying automatically.";
        } finally { checking = false; }
    };
    void check();
    const retry = setTimeout(() => void check(), 45000);
    const interval = setInterval(() => void check(), 5 * 60 * 1000);
    return () => { stopped = true; clearTimeout(retry); clearInterval(interval); };
}
export function createRainUpdater(files: any) {
    const download = () => pending ??= (async () => {
        let timeout: any;
        const response = await Promise.race([
            fetch(URL + "?t=" + Date.now(), { headers: { "X-CC-Client": "1" }, cache: "no-store" }),
            new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("download timed out")), 20000); })
        ]).finally(() => clearTimeout(timeout));
        if (!response.ok) throw new Error("runtime download failed (" + response.status + ")");
        const code = await response.text();
        if (code.length < 10000 || !code.includes("CloudCord")) throw new Error("invalid runtime response");
        if (typeof files?.writeFile !== "function") throw new Error("runtime file writer unavailable");
        const path = await files.writeFile("documents", "rain/bundle.js", code, "utf8");
        if (path && typeof files.readFile === "function" && await files.readFile(path, "utf8") !== code) throw new Error("saved runtime did not match download");
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
