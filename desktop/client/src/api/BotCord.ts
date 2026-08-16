/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import type { PluginNative } from "@utils/types";
import { React } from "@webpack/common";

const Native = VencordNative.pluginHelpers.BotCordCore as PluginNative<typeof import("@plugins/botCordCore/native")>;

export interface BotCordAccount {
    id: string;
    username: string;
    avatar?: string | null;
    token: string;
}

interface BotCordState {
    accounts: BotCordAccount[];
    activeAccountId: string | null;
    loaded: boolean;
}

const STORE_KEY = "CloudCord_BotCord";
let state: BotCordState = { accounts: [], activeAccountId: null, loaded: false };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());
const snapshot = (): BotCordState => ({ ...state, accounts: state.accounts.slice() });
export const normalizeBotToken = (token: string) => token.trim().replace(/^Bot\s+/i, "");

async function persist() {
    await DataStore.set(STORE_KEY, { accounts: state.accounts, activeAccountId: state.activeAccountId });
}

export async function ensureBotCordLoaded() {
    if (state.loaded) return;
    if (loading) return loading;
    loading = (async () => {
        const saved = await DataStore.get<Partial<BotCordState>>(STORE_KEY);
        const legacy = await DataStore.get<BotCordAccount[]>("CloudCord_BotCordAccounts");
        const accounts = Array.isArray(saved?.accounts) ? saved.accounts : Array.isArray(legacy) ? legacy : [];
        state = {
            accounts: accounts.filter(a => a?.id && a?.username && a?.token).slice(0, 50),
            activeAccountId: accounts.some(a => a.id === saved?.activeAccountId) ? saved!.activeAccountId! : accounts[0]?.id ?? null,
            loaded: true
        };
        loading = null;
        notify();
    })();
    return loading;
}

export function useBotCordState() {
    const [value, setValue] = React.useState(snapshot);
    React.useEffect(() => {
        const update = () => setValue(snapshot());
        listeners.add(update);
        ensureBotCordLoaded().then(update);
        return () => { listeners.delete(update); };
    }, []);
    return value;
}

async function botFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
    let jsonBody: unknown;
    if (typeof init?.body === "string") jsonBody = JSON.parse(init.body);
    const result = await Native.request(normalizeBotToken(token), init?.method ?? "GET", path, jsonBody);
    if (!result.ok) {
        let message = result.text;
        try { message = JSON.parse(result.text)?.message ?? message; } catch { }
        throw new Error(message || `Discord request failed (${result.status}).`);
    }
    return result.text ? JSON.parse(result.text) : undefined as T;
}

export async function addBotAccount(token: string) {
    const clean = normalizeBotToken(token);
    const user = await botFetch<any>(clean, "/users/@me");
    if (!user.bot) throw new Error("This is not a bot account token.");
    await ensureBotCordLoaded();
    const account: BotCordAccount = { id: user.id, username: user.global_name || user.username, avatar: user.avatar, token: clean };
    state.accounts = [...state.accounts.filter(a => a.id !== account.id), account];
    state.activeAccountId = account.id;
    await persist();
    notify();
    return account;
}

export async function removeBotAccount(id: string) {
    await ensureBotCordLoaded();
    state.accounts = state.accounts.filter(a => a.id !== id);
    if (state.activeAccountId === id) state.activeAccountId = state.accounts[0]?.id ?? null;
    await persist();
    notify();
}

export async function setActiveBotAccount(id: string) {
    await ensureBotCordLoaded();
    if (state.accounts.some(a => a.id === id)) state.activeAccountId = id;
    await persist();
    notify();
}

export const getBotGuilds = (token: string) => botFetch<any[]>(token, "/users/@me/guilds");
export const getBotGuildChannels = (token: string, guildId: string) => botFetch<any[]>(token, `/guilds/${guildId}/channels`);
export const getBotChannelMessages = (token: string, channelId: string) => botFetch<any[]>(token, `/channels/${channelId}/messages?limit=50`);

export async function getBotGuildMembers(token: string, guildId: string) {
    const members: any[] = [];
    let after = "0";
    do {
        const page = await botFetch<any[]>(token, `/guilds/${guildId}/members?limit=1000&after=${after}`);
        members.push(...page);
        if (page.length < 1000) break;
        after = page.at(-1)?.user?.id ?? after;
    } while (true);
    return members;
}

export function createBotDM(token: string, recipientId: string) {
    return botFetch<any>(token, "/users/@me/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: recipientId })
    });
}

export function sendBotMessage(token: string, channelId: string, content: string, attachment?: File) {
    if (attachment) {
        return attachment.arrayBuffer().then(data => Native.request(normalizeBotToken(token), "POST", `/channels/${channelId}/messages`, { content }, {
            name: attachment.name,
            type: attachment.type,
            data: new Uint8Array(data)
        })).then(result => {
            if (!result.ok) throw new Error(result.text || `Discord request failed (${result.status}).`);
            return JSON.parse(result.text);
        });
    }
    return botFetch<any>(token, `/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
    });
}

export const deleteBotMessage = (token: string, channelId: string, messageId: string) => botFetch<void>(token, `/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });
export const editBotMessage = (token: string, channelId: string, messageId: string, content: string) => botFetch<any>(token, `/channels/${channelId}/messages/${messageId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });

