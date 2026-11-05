/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ensureSafePath } from "@main/ipcMain";
import { THEMES_DIR } from "@main/utils/constants";
import { IpcMainInvokeEvent } from "electron";
import { existsSync, writeFileSync } from "fs";

import type { Theme } from "./types";
import { installCatalogEntry, loadCatalog } from "./catalogNative";

export async function fetchCatalog(_: IpcMainInvokeEvent) { return loadCatalog(); }
export async function installCatalogTheme(_: IpcMainInvokeEvent, id: number) { return installCatalogEntry(id); }

function getThemePath(theme: Theme): string | null {
    if (!theme?.name) return null;
    return ensureSafePath(THEMES_DIR, `${theme.name}.theme.css`);
}

export async function themeExists(_: IpcMainInvokeEvent, theme: Theme) {
    const path = getThemePath(theme);
    return path ? existsSync(path) : false;
}

export async function downloadTheme(_: IpcMainInvokeEvent, theme: Theme) {
    if (!theme?.content || !theme?.name || !theme?.id) return;

    const path = getThemePath(theme);
    if (!path) throw new Error("Invalid theme name");

    try {
        writeFileSync(path, theme.content);
        return true;
    } catch {
        return false;
    }
}
