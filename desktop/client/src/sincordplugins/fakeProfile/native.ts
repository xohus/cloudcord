/*
 * CloudCord Fake Profile device ID
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { promisify } from "util";

const exec = promisify(execFile);

// The OS machine ID, read from the same place on every launch. Never sent as is.
async function machineId(): Promise<string | null> {
    if (process.platform === "win32") {
        const { stdout } = await exec("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { windowsHide: true });
        return stdout.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]{36})/i)?.[1] ?? null;
    }
    if (process.platform === "darwin") {
        const { stdout } = await exec("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"]);
        return stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)?.[1] ?? null;
    }
    for (const file of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        const id = await readFile(file, "utf8").then(text => text.trim(), () => "");
        if (id) return id;
    }
    return null;
}

let cached: Promise<string | null> | null = null;

/** A one-way hash of the machine ID, so CloudCord can tell devices apart without learning the ID itself. */
export function getDeviceId(_event: unknown): Promise<string | null> {
    return cached ??= machineId()
        .then(id => id ? createHash("sha256").update("cloudcord-device:" + id.trim().toLowerCase()).digest("hex") : null)
        .catch(() => null);
}
