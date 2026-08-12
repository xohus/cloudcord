import { NativeFileModule } from "@lib/api/native/modules";
import React from "react";

export interface BotCordAccount {
    id: string;
    username: string;
    avatar?: string | null;
    token: string;
}

export interface BotCordState {
    accounts: BotCordAccount[];
    activeAccountId: string | null;
    loaded: boolean;
}

const FILE_PATH = "botcord/accounts.json";
const MAX_FILE_BYTES = 256 * 1024;
const MAX_ACCOUNTS = 50;
const DEFAULT_STATE: BotCordState = { accounts: [], activeAccountId: null, loaded: false };

let state: BotCordState = { ...DEFAULT_STATE };
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function snapshot(): BotCordState {
    return { accounts: state.accounts.slice(), activeAccountId: state.activeAccountId, loaded: state.loaded };
}

function notify() {
    for (const listener of listeners) {
        try { listener(); } catch {}
    }
}

function cleanAccount(value: any): BotCordAccount | null {
    if (!value || typeof value !== "object") return null;
    const id = typeof value.id === "string" ? value.id : "";
    const username = typeof value.username === "string" ? value.username : "";
    const token = typeof value.token === "string" ? normalizeBotToken(value.token) : "";
    if (!id || !username || !token) return null;
    return {
        id: id.slice(0, 64),
        username: username.slice(0, 128),
        avatar: typeof value.avatar === "string" ? value.avatar.slice(0, 256) : null,
        token: token.slice(0, 512)
    };
}

function sanitizeState(value: any): BotCordState {
    const accounts = Array.isArray(value?.accounts)
        ? value.accounts.slice(0, MAX_ACCOUNTS).map(cleanAccount).filter(Boolean) as BotCordAccount[]
        : [];
    const active = typeof value?.activeAccountId === "string" && accounts.some(a => a.id === value.activeAccountId)
        ? value.activeAccountId
        : accounts[0]?.id ?? null;
    return { accounts, activeAccountId: active, loaded: true };
}

async function persist() {
    const payload = JSON.stringify({ accounts: state.accounts, activeAccountId: state.activeAccountId });
    await NativeFileModule.writeFile("documents", FILE_PATH, payload, "utf8");
}

async function resetCorruptStore() {
    state = { ...DEFAULT_STATE, loaded: true };
    try { await NativeFileModule.writeFile("documents", FILE_PATH, JSON.stringify({ accounts: [], activeAccountId: null }), "utf8"); } catch {}
}

export async function ensureBotCordLoaded() {
    if (state.loaded) return;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
        try {
            const fullPath = `${NativeFileModule.getConstants().DocumentsDirPath}/${FILE_PATH}`;
            if (!(await NativeFileModule.fileExists(fullPath))) {
                await resetCorruptStore();
                return;
            }
            const size = await NativeFileModule.getSize(fullPath) as any;
            if (typeof size === "number" && size > MAX_FILE_BYTES) {
                await resetCorruptStore();
                return;
            }
            const raw = await NativeFileModule.readFile(fullPath, "utf8");
            if (!raw || raw.length > MAX_FILE_BYTES) {
                await resetCorruptStore();
                return;
            }
            state = sanitizeState(JSON.parse(raw));
        } catch {
            await resetCorruptStore();
        } finally {
            state.loaded = true;
            loadPromise = null;
            notify();
        }
    })();
    return loadPromise;
}

export function useBotCordState() {
    const [value, setValue] = React.useState<BotCordState>(() => snapshot());
    React.useEffect(() => {
        let active = true;
        const update = () => active && setValue(snapshot());
        listeners.add(update);
        ensureBotCordLoaded().then(update).catch(update);
        return () => { active = false; listeners.delete(update); };
    }, []);
    return value;
}

export function normalizeBotToken(token: string) {
    return token.trim().replace(/^Bot\s+/i, "");
}

export async function getBotUser(token: string) {
    const cleanToken = normalizeBotToken(token);
    const response = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bot ${cleanToken}` } });
    if (!response.ok) throw new Error("Invalid bot token or Discord rejected the request.");
    const user = await response.json();
    return {
        id: user.id as string,
        username: (user.global_name || user.username || `Bot ${user.id}`) as string,
        avatar: user.avatar as string | null,
        token: cleanToken
    } satisfies BotCordAccount;
}

export async function addBotAccount(token: string) {
    const account = await getBotUser(token);
    await ensureBotCordLoaded();
    const existing = state.accounts.findIndex(a => a.id === account.id);
    if (existing === -1) state.accounts = [...state.accounts, account].slice(-MAX_ACCOUNTS);
    else state.accounts = state.accounts.map((a, i) => i === existing ? account : a);
    state.activeAccountId = account.id;
    await persist(); notify();
    return account;
}

export async function removeBotAccount(id: string) {
    await ensureBotCordLoaded();
    state.accounts = state.accounts.filter(a => a.id !== id);
    if (state.activeAccountId === id) state.activeAccountId = state.accounts[0]?.id ?? null;
    await persist(); notify();
}

export async function setActiveBotAccount(id: string | null) {
    await ensureBotCordLoaded();
    state.activeAccountId = id && state.accounts.some(a => a.id === id) ? id : state.accounts[0]?.id ?? null;
    await persist(); notify();
}

export async function resetBotCordStorage() {
    await resetCorruptStore();
    notify();
}

async function readDiscordError(response: Response) {
    try {
        const body = await response.json();
        return typeof body?.message === "string" ? body.message : null;
    } catch { return null; }
}

async function botFetch<T>(token: string, path: string): Promise<T> {
    const response = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bot ${normalizeBotToken(token)}` } });
    if (!response.ok) {
        const message = await readDiscordError(response);
        throw new Error(message ? `${message} (${response.status})` : `Discord API request failed (${response.status}).`);
    }
    return response.json();
}

export function getBotGuilds(token: string) { return botFetch<any[]>(token, "/users/@me/guilds"); }
export function getBotGuildChannels(token: string, guildId: string) { return botFetch<any[]>(token, `/guilds/${guildId}/channels`); }
export function getBotChannelMessages(token: string, channelId: string) { return botFetch<any[]>(token, `/channels/${channelId}/messages?limit=50`); }
export function getBotGuildMembers(token: string, guildId: string) { return botFetch<any[]>(token, `/guilds/${guildId}/members?limit=100`); }

export async function sendBotMessage(token: string, channelId: string, content: string) {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${normalizeBotToken(token)}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content })
    });
    if (!response.ok) {
        const message = await readDiscordError(response);
        throw new Error(message ? `${message} (${response.status})` : `Failed to send message (${response.status}).`);
    }
    return response.json();
}
