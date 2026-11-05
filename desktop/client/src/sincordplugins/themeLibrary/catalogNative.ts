import { THEMES_DIR } from "@main/utils/constants";
import { ensureSafePath } from "@main/ipcMain";
import { CatalogTheme, parseThemeCatalog } from "@utils/themeCatalog";
import { closeSync, existsSync, mkdirSync, openSync, unlinkSync, writeFileSync } from "fs";

let catalog: CatalogTheme[] | undefined;
let fetchedAt = 0;
let pending: Promise<CatalogTheme[]> | undefined;

async function downloadText(url: string) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!response.ok) throw new Error(`Download failed (${response.status}). Please try again.`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The download was empty.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 4 * 1024 * 1024) throw new Error("The theme download is too large.");
            chunks.push(value);
        }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks).toString("utf8");
}

export function loadCatalog() {
    if (catalog && Date.now() - fetchedAt < 15 * 60 * 1000) return Promise.resolve(catalog);
    return pending ??= (async () => {
        const result = parseThemeCatalog(JSON.parse(await downloadText("https://api.betterdiscord.app/v3/store/themes")));
        if (!result.length) throw new Error("No supported themes were returned. Please try again later.");
        catalog = result;
        fetchedAt = Date.now();
        return result;
    })().finally(() => { pending = undefined; });
}

export async function installCatalogEntry(id: number) {
    const theme = (await loadCatalog()).find(t => t.id === id);
    if (!theme) throw new Error("This theme is no longer in the catalogue. Refresh and try again.");
    const path = ensureSafePath(THEMES_DIR, theme.fileName);
    if (!path) throw new Error("Invalid theme filename.");
    if (existsSync(path)) return { fileName: theme.fileName, installed: false };
    const css = await downloadText(theme.source);
    if (!css.trim() || /^\s*</.test(css)) throw new Error("The download was not a CSS theme.");
    mkdirSync(THEMES_DIR, { recursive: true });
    // Never overwrite a user's existing or edited theme, including if it was
    // created while the network request was running.
    let fd: number;
    try { fd = openSync(path, "wx"); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") return { fileName: theme.fileName, installed: false };
        throw error;
    }
    try { writeFileSync(fd, css, "utf8"); }
    catch (error) { closeSync(fd); unlinkSync(path); throw error; }
    closeSync(fd);
    return { fileName: theme.fileName, installed: true };
}
