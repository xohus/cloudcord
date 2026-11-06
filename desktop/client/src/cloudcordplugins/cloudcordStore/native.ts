/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { THEMES_DIR } from "@main/utils/constants";
import { IpcMainInvokeEvent } from "electron";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join, resolve, sep } from "path";

const STORE_URL = "https://api.betterdiscord.app/v3/store/themes";
const ALLOWED_SOURCE = /^https:\/\/raw\.githubusercontent\.com\//;

// The store API sends no CORS headers, so the renderer asks the main process.
export async function fetchThemeStore(_: IpcMainInvokeEvent): Promise<string> {
    const res = await fetch(STORE_URL, { headers: { "User-Agent": "CloudCord" } });
    if (!res.ok) throw new Error(`Theme store returned ${res.status}`);
    return res.text();
}

function themePath(fileName: string) {
    if (!/^[\w .()+-]+\.theme\.css$/i.test(fileName)) return null;
    const base = resolve(THEMES_DIR);
    const full = resolve(join(base, fileName));
    return full.startsWith(base + sep) ? full : null;
}

export async function installTheme(_: IpcMainInvokeEvent, url: string, fileName: string) {
    if (!ALLOWED_SOURCE.test(url)) throw new Error("Unsupported theme source");
    const path = themePath(fileName);
    if (!path) throw new Error("Invalid theme file name");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    mkdirSync(THEMES_DIR, { recursive: true });
    writeFileSync(path, await res.text(), "utf-8");
}

export async function uninstallTheme(_: IpcMainInvokeEvent, fileName: string) {
    const path = themePath(fileName);
    if (path && existsSync(path)) rmSync(path);
}
