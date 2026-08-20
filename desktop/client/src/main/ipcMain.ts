/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./updater";
import "./ipcPlugins";
import "./settings";

import { debounce } from "@shared/debounce";
import { IpcEvents } from "@shared/IpcEvents";
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, shell, systemPreferences } from "electron";
import monacoHtml from "file://monacoWin.html?minify&base64";
import { FSWatcher, mkdirSync, readFileSync, watch, writeFileSync } from "fs";
import { open, readdir, readFile, unlink } from "fs/promises";
import { release } from "os";
import { join, normalize } from "path";

import { registerCspIpcHandlers } from "./csp/manager";
import { ALLOWED_PROTOCOLS, QUICK_CSS_PATH, SETTINGS_DIR, THEMES_DIR } from "./utils/constants";
import { makeLinksOpenExternally } from "./utils/externalLinks";

const RENDERER_CSS_PATH = join(__dirname, "renderer.css");

mkdirSync(THEMES_DIR, { recursive: true });

registerCspIpcHandlers();

function getSenderWindow(sender: Electron.WebContents) {
    return BrowserWindow.fromWebContents(sender)
        ?? BrowserWindow.getFocusedWindow()
        ?? BrowserWindow.getAllWindows().find(window => !window.isDestroyed() && window.getTitle() === "Discord");
}

ipcMain.handle(IpcEvents.WINDOW_MINIMIZE, ({ sender }) => getSenderWindow(sender)?.minimize());
ipcMain.handle(IpcEvents.WINDOW_MAXIMIZE, ({ sender }) => {
    const window = getSenderWindow(sender);
    if (!window) return;
    window.isMaximized() ? window.unmaximize() : window.maximize();
});
ipcMain.handle(IpcEvents.WINDOW_CLOSE, ({ sender }) => getSenderWindow(sender)?.close());

const BOTCORD_ALLOWED_PATHS = [
    /^\/users\/@me(?:\/guilds)?$/,
    /^\/users\/@me\/channels$/,
    /^\/guilds\/\d{17,20}\/channels$/,
    /^\/guilds\/\d{17,20}\/members\?limit=(?:[1-9]\d{0,2}|1000)$/,
    /^\/channels\/\d{17,20}\/messages\?limit=(?:[1-9]|[1-4]\d|50)$/,
    /^\/channels\/\d{17,20}\/messages$/,
];

ipcMain.handle(IpcEvents.BOTCORD_API_REQUEST, async (_, token: string, path: string, options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    files?: Array<{ name: string; type: string; data: string; }>;
} = {}) => {
    const cleanToken = token.replace(/^Bot\s+/i, "").trim();
    if (cleanToken.length < 20 || /\s/.test(cleanToken))
        return { ok: false, status: 0, error: "Invalid bot token" };
    if (!BOTCORD_ALLOWED_PATHS.some(pattern => pattern.test(path)))
        return { ok: false, status: 0, error: "BotCord blocked an unsupported Discord API path" };
    const method = options.method ?? "GET";
    const isMessageCreate = /^\/channels\/\d{17,20}\/messages$/.test(path);
    const isDmCreate = path === "/users/@me/channels";
    if (method === "POST" ? !isMessageCreate && !isDmCreate : isMessageCreate || isDmCreate)
        return { ok: false, status: 0, error: "BotCord blocked an invalid request method" };

    try {
        for (let attempt = 0; attempt < 3; attempt++) {
            const response = await net.fetch(`https://discord.com/api/v10${path}`, {
                method,
                headers: {
                    Authorization: `Bot ${cleanToken}`,
                    Accept: "application/json",
                    "User-Agent": "DiscordBot (https://github.com/xohus/cloudcord, 1.0)",
                    ...(!options.files?.length && method === "POST" ? { "Content-Type": "application/json" } : {})
                },
                body: method === "POST"
                    ? options.files?.length
                        ? (() => {
                            const form = new FormData();
                            form.append("payload_json", JSON.stringify(options.body ?? {}));
                            for (const [index, file] of options.files.slice(0, 4).entries()) {
                                const bytes = Buffer.from(file.data, "base64");
                                if (bytes.length > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller");
                                form.append(`files[${index}]`, new Blob([new Uint8Array(bytes)], { type: file.type }), file.name);
                            }
                            return form;
                        })()
                        : JSON.stringify(options.body ?? {})
                    : undefined
            });
            const text = await response.text();
            let data: unknown = null;
            try { data = text ? JSON.parse(text) : null; } catch { data = text; }
            if (response.ok) return { ok: true, status: response.status, data };

            if ((response.status === 429 || method === "GET" && response.status >= 500) && attempt < 2) {
                const retryAfter = Math.min(Number((data as any)?.retry_after ?? 0) * 1000 || 400 * (attempt + 1), 5000);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                continue;
            }

            const discordMessage = (data as any)?.message;
            const error = response.status === 403
                ? method === "POST"
                    ? "This bot cannot send messages or open this DM with its current permissions"
                    : "This bot needs View Channel and Read Message History permissions"
                : discordMessage || `Discord request failed (${response.status})`;
            return { ok: false, status: response.status, error: `${error} (${response.status})` };
        }
        return { ok: false, status: 0, error: "Discord did not respond after three attempts" };
    } catch (error: any) {
        return { ok: false, status: 0, error: error?.message || "Discord network request failed" };
    }
});

export function ensureSafePath(basePath: string, path: string) {
    const normalizedBasePath = normalize(basePath + "/");
    const newPath = join(basePath, path);
    const normalizedPath = normalize(newPath);
    return normalizedPath.startsWith(normalizedBasePath) ? normalizedPath : null;
}

function readCss() {
    return readFile(QUICK_CSS_PATH, "utf-8").catch(() => "");
}

async function listThemes(): Promise<{ fileName: string; content: string; }[]> {
    try {
        const files = await readdir(THEMES_DIR);
        return await Promise.all(files.map(async fileName => ({ fileName, content: await getThemeData(fileName) })));
    } catch {
        return [];
    }
}

function getThemeData(fileName: string) {
    fileName = fileName.replace(/\?v=\d+$/, "");
    const safePath = ensureSafePath(THEMES_DIR, fileName);
    if (!safePath) return Promise.reject(`Unsafe path ${fileName}`);
    return readFile(safePath, "utf-8");
}

ipcMain.handle(IpcEvents.OPEN_QUICKCSS, () => shell.openPath(QUICK_CSS_PATH));

ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_, url) => {
    try {
        var { protocol } = new URL(url);
    } catch {
        throw "Malformed URL";
    }
    if (!ALLOWED_PROTOCOLS.includes(protocol))
        throw "Disallowed protocol.";

    shell.openExternal(url);
});

ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readCss());
ipcMain.handle(IpcEvents.SET_QUICK_CSS, (_, css) =>
    writeFileSync(QUICK_CSS_PATH, css)
);

ipcMain.handle(IpcEvents.GET_THEMES_DIR, () => THEMES_DIR);
ipcMain.handle(IpcEvents.GET_THEMES_LIST, () => listThemes());
ipcMain.handle(IpcEvents.GET_THEME_DATA, (_, fileName) => getThemeData(fileName));
ipcMain.handle(IpcEvents.DELETE_THEME, (_, fileName) => {
    const safePath = ensureSafePath(THEMES_DIR, fileName);
    if (!safePath) return Promise.reject(`Unsafe path ${fileName}`);
    return unlink(safePath);
});
ipcMain.handle(IpcEvents.GET_THEME_SYSTEM_VALUES, () => {
    let accentColor = systemPreferences.getAccentColor?.() ?? "";

    if (accentColor.length && accentColor[0] !== "#") {
        accentColor = `#${accentColor}`;
    }

    return {
        "os-accent-color": accentColor
    };
});

ipcMain.handle(IpcEvents.OPEN_THEMES_FOLDER, () => shell.openPath(THEMES_DIR));
ipcMain.handle(IpcEvents.OPEN_SETTINGS_FOLDER, () => shell.openPath(SETTINGS_DIR));

ipcMain.handle(IpcEvents.INIT_FILE_WATCHERS, ({ sender }) => {
    let quickCssWatcher: FSWatcher | undefined;
    let rendererCssWatcher: FSWatcher | undefined;

    open(QUICK_CSS_PATH, "a+").then(fd => {
        fd.close();
        quickCssWatcher = watch(QUICK_CSS_PATH, { persistent: false }, debounce(async () => {
            sender.postMessage(IpcEvents.QUICK_CSS_UPDATE, await readCss());
        }, 50));
    }).catch(() => { });

    const themesWatcher = watch(THEMES_DIR, { persistent: false }, debounce(() => {
        sender.postMessage(IpcEvents.THEME_UPDATE, void 0);
    }));

    if (IS_DEV) {
        rendererCssWatcher = watch(RENDERER_CSS_PATH, { persistent: false }, async () => {
            sender.postMessage(IpcEvents.RENDERER_CSS_UPDATE, await readFile(RENDERER_CSS_PATH, "utf-8"));
        });
    }

    sender.once("destroyed", () => {
        quickCssWatcher?.close();
        themesWatcher.close();
        rendererCssWatcher?.close();
    });
});

ipcMain.on(IpcEvents.GET_MONACO_THEME, e => {
    e.returnValue = nativeTheme.shouldUseDarkColors ? "vs-dark" : "vs-light";
});

let monacoWin: BrowserWindow | null = null;

ipcMain.handle(IpcEvents.OPEN_MONACO_EDITOR, async () => {
    if (monacoWin && !monacoWin.isDestroyed()) {
        monacoWin.show();
        monacoWin.focus();
        return;
    }

    monacoWin = new BrowserWindow({
        title: "CloudCord QuickCSS Editor",
        autoHideMenuBar: true,
        darkTheme: true,
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#1e1e1e" : "white",
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    monacoWin.once("closed", () => { monacoWin = null; });

    makeLinksOpenExternally(monacoWin);

    await monacoWin.loadURL(`data:text/html;base64,${monacoHtml}`);
});

app.on("before-quit", async event => {
    if (monacoWin && !monacoWin.isDestroyed() && !monacoWin.isVisible()) {
        const result = await dialog.showMessageBox({
            type: "question",
            buttons: ["Cancel", "Close Anyway"],
            defaultId: 0,
            title: "QuickCSS Editor Open",
            message: "QuickCSS editor is still open in the background.",
            detail: "Do you want to close Discord anyway? This will also close the QuickCSS editor."
        });

        if (result.response === 1) {
            app.exit();
        }
    }
});

ipcMain.handle(IpcEvents.GET_RENDERER_CSS, () => readFile(RENDERER_CSS_PATH, "utf-8"));

if (IS_DISCORD_DESKTOP) {
    ipcMain.on(IpcEvents.PRELOAD_GET_RENDERER_JS, e => {
        e.returnValue = readFileSync(join(__dirname, "renderer.js"), "utf-8");
    });
}

ipcMain.on(IpcEvents.SUPPORTS_WINDOWS_MATERIAL, e => {
    e.returnValue = process.platform === "win32" && Number(release().split(".")[2]) >= 22621;
});
