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
import { ipcMain } from "electron";
import { copyFileSync, existsSync, renameSync, unlinkSync, writeFileSync } from "original-fs";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { ASAR_FILE, serializeErrors } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
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

    const data = await githubGet<any>(`/compare/${gitHash}...main`);

    return data.commits.map((c: any) => ({
        hash: c.sha,
        author: c.author?.login ?? c.commit?.author?.name ?? "Ghost",
        message: c.commit.message.split("\n")[0]
    }));
}

async function fetchUpdates() {
    const data = await githubGet<any>("/releases/latest");

    const hash = data.name?.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
        return false;

    const asset = data.assets.find((a: any) => a.name === ASAR_FILE);
    const checksum = data.assets.find((a: any) => a.name === `${ASAR_FILE}.sha256`);
    if (!asset || !checksum)
        throw new Error(`Latest CloudCord release is missing ${ASAR_FILE} or its checksum`);

    PendingUpdate = {
        asarUrl: asset.browser_download_url,
        checksumUrl: checksum.browser_download_url
    };

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
