/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

interface AttachmentPayload {
    name: string;
    type: string;
    data: Uint8Array;
}

export async function request(
    _: IpcMainInvokeEvent,
    token: string,
    method: string,
    path: string,
    jsonBody?: unknown,
    attachment?: AttachmentPayload
) {
    const cleanToken = token.trim().replace(/^Bot\s+/i, "");
    const headers: Record<string, string> = { Authorization: `Bot ${cleanToken}` };
    let body: BodyInit | undefined;

    if (attachment) {
        const form = new FormData();
        form.append("payload_json", JSON.stringify(jsonBody ?? {}));
        const bytes = new Uint8Array(attachment.data.byteLength);
        bytes.set(attachment.data);
        form.append("files[0]", new Blob([bytes.buffer], { type: attachment.type || "application/octet-stream" }), attachment.name);
        body = form;
    } else if (jsonBody !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(jsonBody);
    }

    try {
        const response = await fetch(`https://discord.com/api/v10${path}`, { method, headers, body });
        return {
            ok: response.ok,
            status: response.status,
            retryAfter: response.headers.get("retry-after"),
            text: await response.text()
        };
    } catch (error) {
        return { ok: false, status: 0, text: error instanceof Error ? error.message : String(error) };
    }
}


