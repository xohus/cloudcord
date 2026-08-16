/*
 * CloudCord shared profile transport
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

const ORIGIN = "https://cloudcord-profiles.ggxohus.workers.dev";
const API = `${ORIGIN}/v1/profiles`;

async function call(path: string, init?: RequestInit) {
    try {
        const response = await fetch(`${API}${path}`, init);
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
    } catch (error) {
        return { ok: false, status: 0, text: error instanceof Error ? error.message : String(error) };
    }
}

export function publish(_: IpcMainInvokeEvent, profile: unknown) {
    return call("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
}

export function update(_: IpcMainInvokeEvent, id: string, editToken: string, profile: unknown) {
    return call(`/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${editToken}` }, body: JSON.stringify(profile) });
}

export function get(_: IpcMainInvokeEvent, id: string) {
    return call(`/${encodeURIComponent(id)}`);
}

export async function pingUsage(_: IpcMainInvokeEvent, installId: string) {
    try {
        const response = await fetch(`${ORIGIN}/v1/usage/ping`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ installId })
        });
        return { ok: response.ok, status: response.status };
    } catch {
        return { ok: false, status: 0 };
    }
}
