/*
 * CloudCord, a modification for Discord's desktop app
 * Copyright (c) 2026 xohus and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// BotCord bot tokens live only in the main process, encrypted with the OS keychain
// (Electron safeStorage). The renderer, and any plugin running there, only ever sees
// opaque bot ids and can never read a token back.

import { randomUUID } from "crypto";
import { safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { DATA_DIR } from "./utils/constants";

const TOKENS_FILE = join(DATA_DIR, "botcord", "tokens.bin");

interface StoredBot { id: string; name: string; token: string; }
let cache: StoredBot[] | null = null;

export const normalizeBotToken = (value: string) => String(value || "").replace(/^Bot\s+/i, "").trim();
export const isPlausibleBotToken = (token: string) => token.length >= 20 && token.length <= 200 && !/\s/.test(token);

function load(): StoredBot[] {
    if (cache) return cache;
    cache = [];
    if (!existsSync(TOKENS_FILE) || !safeStorage.isEncryptionAvailable()) return cache;
    try {
        const parsed = JSON.parse(safeStorage.decryptString(readFileSync(TOKENS_FILE)));
        if (Array.isArray(parsed)) cache = parsed.filter(bot => bot?.id && bot?.token);
    } catch (error) {
        console.error("[BotCord] Couldn't read saved bots:", error);
    }
    return cache;
}

function persist(bots: StoredBot[]) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure storage isn't available on this system, so bot tokens can't be saved");
    mkdirSync(dirname(TOKENS_FILE), { recursive: true });
    const temp = TOKENS_FILE + ".tmp";
    writeFileSync(temp, safeStorage.encryptString(JSON.stringify(bots)), { mode: 0o600 });
    renameSync(temp, TOKENS_FILE);
    cache = bots;
}

export const listBots = () => load().map(({ id, name }) => ({ id, name }));

export function saveBot(name: string, rawToken: string) {
    const token = normalizeBotToken(rawToken);
    if (!isPlausibleBotToken(token)) throw new Error("Invalid bot token");
    const bots = load();
    const existing = bots.find(bot => bot.token === token);
    const id = existing?.id ?? randomUUID();
    persist([...bots.filter(bot => bot.token !== token), { id, name: String(name || "Bot").slice(0, 64), token }]);
    return id;
}

export function removeBot(id: string) {
    persist(load().filter(bot => bot.id !== id));
}

export const tokenFor = (id: string) => load().find(bot => bot.id === id)?.token ?? null;
