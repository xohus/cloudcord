import { createFileBackend, createStorage, wrapSync } from "@core/vendetta/storage";

export interface BotCordAccount {
    id: string;
    username: string;
    avatar?: string | null;
    token: string;
}

export interface BotCordState {
    accounts: BotCordAccount[];
    activeAccountId?: string | null;
}

export const botCordState = wrapSync(createStorage<BotCordState>(
    createFileBackend("botcord/accounts.json", {
        accounts: [],
        activeAccountId: null
    })
));

export function normalizeBotToken(token: string) {
    return token.trim().replace(/^Bot\s+/i, "");
}

export async function getBotUser(token: string) {
    const cleanToken = normalizeBotToken(token);
    const response = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${cleanToken}` }
    });

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
    const existing = botCordState.accounts.findIndex(a => a.id === account.id);

    if (existing === -1) botCordState.accounts.push(account);
    else botCordState.accounts[existing] = account;

    botCordState.activeAccountId = account.id;
    return account;
}

export function removeBotAccount(id: string) {
    const index = botCordState.accounts.findIndex(a => a.id === id);
    if (index !== -1) botCordState.accounts.splice(index, 1);

    if (botCordState.activeAccountId === id) {
        botCordState.activeAccountId = botCordState.accounts[0]?.id ?? null;
    }
}

export function setActiveBotAccount(id: string | null) {
    botCordState.activeAccountId = id;
}

async function botFetch<T>(token: string, path: string): Promise<T> {
    const response = await fetch(`https://discord.com/api/v10${path}`, {
        headers: { Authorization: `Bot ${normalizeBotToken(token)}` }
    });

    if (!response.ok) throw new Error(`Discord API request failed (${response.status}).`);
    return response.json();
}

export function getBotGuilds(token: string) {
    return botFetch<any[]>(token, "/users/@me/guilds");
}

export function getBotGuildChannels(token: string, guildId: string) {
    return botFetch<any[]>(token, `/guilds/${guildId}/channels`);
}

export function getBotChannelMessages(token: string, channelId: string) {
    return botFetch<any[]>(token, `/channels/${channelId}/messages?limit=50`);
}

export async function sendBotMessage(token: string, channelId: string, content: string) {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${normalizeBotToken(token)}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ content })
    });

    if (!response.ok) throw new Error(`Failed to send message (${response.status}).`);
    return response.json();
}
