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

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { createHash } from "crypto";
import { app, ipcMain } from "electron";
import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "original-fs";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { ASAR_FILE, serializeErrors } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
// Plain release downloads aren't rate limited like the GitHub API (60 requests an hour
// per IP without a login), so update checks use them and never depend on the API.
const RELEASE_BASE = `https://github.com/${gitRemote}/releases/download/new_beta_t_desktop`;
let PendingUpdate: { asarUrl: string; checksumUrl: string; } | null = null;

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

async function calculateGitChanges() {
    const isOutdated = await fetchUpdates();
    if (!isOutdated) return [];

    // The change list is a nice-to-have: if the API is rate limited the update still goes ahead.
    try {
        const data = await githubGet<any>(`/compare/${gitHash}...main`);
        return data.commits.map((c: any) => ({
            hash: c.sha,
            author: c.author?.login ?? c.commit?.author?.name ?? "Ghost",
            message: c.commit.message.split("\n")[0]
        }));
    } catch {
        return [{ hash: "latest", author: "CloudCord", message: "A new CloudCord update is ready" }];
    }
}

async function fetchUpdates() {
    const checksumUrl = `${RELEASE_BASE}/${ASAR_FILE}.sha256`;
    const expected = (await fetchBuffer(checksumUrl)).toString("utf8").trim().split(/\s+/)[0]?.toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected ?? ""))
        throw new Error("The CloudCord release checksum is unreadable");

    const asarPath = __dirname;
    if (asarPath.toLowerCase().endsWith(".asar") && createHash("sha256").update(readFileSync(asarPath)).digest("hex") === expected)
        return false;

    PendingUpdate = { asarUrl: `${RELEASE_BASE}/${ASAR_FILE}`, checksumUrl };
    return true;
}

function validateAsar(data: Buffer) {
    if (data.length < 1024 || data.readUInt32LE(0) !== 4)
        throw new Error("Downloaded CloudCord update is not a valid ASAR archive");

    const headerLength = data.readUInt32LE(12);
    if (headerLength <= 0 || headerLength > data.length - 16)
        throw new Error("Downloaded CloudCord update has an invalid ASAR header");

    const header = JSON.parse(data.subarray(16, 16 + headerLength).toString("utf8"));
    if (!header?.files?.["package.json"] || !header?.files?.["patcher.js"])
        throw new Error("Downloaded CloudCord update is missing required runtime files");
}

async function applyUpdates() {
    if (!PendingUpdate) return true;

    const pending = PendingUpdate;
    const [data, checksumData] = await Promise.all([
        fetchBuffer(pending.asarUrl),
        fetchBuffer(pending.checksumUrl)
    ]);
    const expectedHash = checksumData.toString("utf8").trim().split(/\s+/)[0]?.toLowerCase();
    const actualHash = createHash("sha256").update(data).digest("hex");
    if (!expectedHash || expectedHash !== actualHash)
        throw new Error("Downloaded CloudCord update failed SHA-256 verification");

    validateAsar(data);

    const asarPath = __dirname;
    if (!asarPath.toLowerCase().endsWith(".asar"))
        throw new Error(`Refusing to update unexpected runtime path: ${asarPath}`);

    if (createHash("sha256").update(readFileSync(asarPath)).digest("hex") === actualHash) {
        PendingUpdate = null;
        return false;
    }

    const newPath = `${asarPath}.new`;
    const backupPath = `${asarPath}.backup`;
    writeFileSync(newPath, data, { flush: true });

    try {
        if (existsSync(backupPath)) unlinkSync(backupPath);
        copyFileSync(asarPath, backupPath);
        unlinkSync(asarPath);
        renameSync(newPath, asarPath);
    } catch (error) {
        if (existsSync(newPath)) unlinkSync(newPath);
        if (!existsSync(asarPath) && existsSync(backupPath)) renameSync(backupPath, asarPath);
        throw error;
    }

    PendingUpdate = null;

    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));

// Renderer reloads do not reload Electron's cached main-process modules.
// Check each load, verify the published archive, then restart only if it changed.
let reloadUpdateRunning = false;
app.on("browser-window-created", (_event, window) => {
    window.webContents.on("did-finish-load", async () => {
        if (reloadUpdateRunning || window.isDestroyed()) return;
        const url = window.webContents.getURL();
        if (!/^https:\/\/(?:canary\.|ptb\.)?discord\.com\//.test(url)) return;
        reloadUpdateRunning = true;
        try {
            if (await fetchUpdates() && await applyUpdates()) {
                app.relaunch();
                app.quit();
            }
        } catch (error) {
            console.warn("[CloudCord] Runtime update unavailable; keeping current version", error);
        } finally {
            reloadUpdateRunning = false;
        }
    });
});
