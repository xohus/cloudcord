/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addBotAccount,
    createBotDM,
    getBotChannelMessages,
    getBotGuildChannels,
    getBotGuildMembers,
    getBotGuilds,
    removeBotAccount,
    sendBotMessage,
    setActiveBotAccount,
    useBotCordState
} from "@api/BotCord";
import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { chooseFile } from "@utils/web";
import { TextInput, useEffect, useMemo, useState } from "@webpack/common";

import Plugins from "~plugins";

const panelStyle = { padding: 14, borderRadius: 12, background: "var(--background-secondary)", minWidth: 0 };
const selectStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, color: "var(--text-normal)", background: "var(--input-background)", border: "1px solid var(--input-border)" };
const displayName = (user: any) => user?.global_name || user?.username || "Unknown";
const guildIcon = (guild: any) => guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96` : null;

function BotCord() {
    const state = useBotCordState();
    const active = state.accounts.find(a => a.id === state.activeAccountId) ?? state.accounts[0];
    const [token, setToken] = useState("");
    const [guilds, setGuilds] = useState<any[]>([]);
    const [guildId, setGuildId] = useState("");
    const [channels, setChannels] = useState<any[]>([]);
    const [channelId, setChannelId] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [composer, setComposer] = useState("");
    const [attachment, setAttachment] = useState<File | undefined>();
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);

    const run = async (label: string, action: () => Promise<void>) => {
        setBusy(true);
        setStatus(label);
        try { await action(); } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
    };

    useEffect(() => {
        setGuilds([]); setGuildId(""); setChannels([]); setChannelId(""); setMessages([]); setMembers([]);
        if (!active) return;
        run("Loading bot servers...", async () => {
            setGuilds(await getBotGuilds(active.token));
            setStatus("BotCord is ready.");
        });
    }, [active?.id]);

    useEffect(() => {
        if (!active || !guildId) return;
        run("Loading channels and members...", async () => {
            const [nextChannels, nextMembers] = await Promise.all([
                getBotGuildChannels(active.token, guildId),
                getBotGuildMembers(active.token, guildId)
            ]);
            setChannels(nextChannels.filter(channel => [0, 5, 10, 11, 12].includes(channel.type)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
            setMembers(nextMembers);
            setStatus("Server loaded.");
        });
    }, [active?.id, guildId]);

    const filteredMembers = useMemo(() => members.filter(member => displayName(member.user).toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 40), [members, memberSearch]);

    async function openChannel(id: string) {
        setChannelId(id);
        if (!active || !id) return;
        await run("Loading messages...", async () => {
            setMessages((await getBotChannelMessages(active.token, id)).reverse());
            setStatus("Messages loaded.");
        });
    }

    async function openDM(userId: string) {
        if (!active) return;
        await run("Opening DM...", async () => {
            const dm = await createBotDM(active.token, userId);
            setGuildId(""); setChannels([{ id: dm.id, name: "Direct message" }]);
            await openChannel(dm.id);
        });
    }

    async function send() {
        if (!active || !channelId || (!composer.trim() && !attachment)) return;
        await run("Sending...", async () => {
            await sendBotMessage(active.token, channelId, composer.trim(), attachment);
            setComposer(""); setAttachment(undefined);
            setMessages((await getBotChannelMessages(active.token, channelId)).reverse());
            setStatus("Sent.");
        });
    }

    return <SettingsTab>
        <Heading className={Margins.top16}>BotCord</Heading>
        <Paragraph className={Margins.bottom16}>Use your bot accounts inside CloudCord: browse servers and channels, read messages, open member DMs, and send text or images.</Paragraph>
        <Notice.Warning className={Margins.bottom16}>Bot tokens are passwords. Only add tokens for bots you own.</Notice.Warning>

        <Flex gap="8px" alignItems="center">
            <div style={{ flex: 1 }}><TextInput type="password" value={token} onChange={setToken} placeholder="Bot token" /></div>
            <Button disabled={busy || !token.trim()} onClick={() => run("Checking token...", async () => { await addBotAccount(token); setToken(""); setStatus("Bot added."); })}>Add Bot</Button>
        </Flex>

        {state.accounts.length > 0 && <Flex gap="8px" alignItems="center" className={Margins.top16}>
            <select style={{ ...selectStyle, flex: 1 }} value={active?.id ?? ""} onChange={event => setActiveBotAccount(event.currentTarget.value)}>
                {state.accounts.map(account => <option key={account.id} value={account.id}>{account.username}</option>)}
            </select>
            <Button variant="dangerSecondary" onClick={() => active && removeBotAccount(active.id)}>Remove</Button>
        </Flex>}

        {active && <>
            <Divider className={Margins.top20} />
            <div style={{ display: "grid", gridTemplateColumns: "72px 190px minmax(320px, 1fr) 180px", gap: 2, marginTop: 16, minHeight: 430, borderRadius: 14, overflow: "hidden", background: "var(--background-tertiary)" }}>
                <div style={{ ...panelStyle, borderRadius: 0, padding: "10px 8px", background: "var(--background-tertiary)", maxHeight: 430, overflowY: "auto" }}>
                    {guilds.map(guild => <button key={guild.id} title={guild.name} onClick={() => { setGuildId(guild.id); setChannelId(""); setMessages([]); }} style={{ width: 48, height: 48, borderRadius: guildId === guild.id ? 14 : 24, border: 0, margin: "0 4px 8px", overflow: "hidden", color: "white", background: guildId === guild.id ? "var(--brand-500)" : "var(--background-primary)", cursor: "pointer" }}>
                        {guildIcon(guild) ? <img src={guildIcon(guild)!} alt="" style={{ width: "100%", height: "100%" }} /> : guild.name.slice(0, 2).toUpperCase()}
                    </button>)}
                </div>
                <div style={{ ...panelStyle, borderRadius: 0, padding: 12, maxHeight: 430, overflowY: "auto" }}>
                    <Heading>{guilds.find(guild => guild.id === guildId)?.name ?? "BotCord"}</Heading>
                    {!guildId && <Paragraph color="text-muted">Choose a server.</Paragraph>}
                    {channels.map(channel => <Button key={channel.id} variant={channelId === channel.id ? "primary" : "secondary"} size="small" style={{ width: "100%", marginBottom: 5, textAlign: "left" }} onClick={() => openChannel(channel.id)}># {channel.name}</Button>)}
                </div>
                <div style={{ ...panelStyle, borderRadius: 0 }}>
                    <Heading>{channels.find(channel => channel.id === channelId)?.name ? `# ${channels.find(channel => channel.id === channelId)?.name}` : "Messages"}</Heading>
                    <div style={{ height: 280, overflowY: "auto", padding: "8px 0" }}>
                        {!channelId && <Paragraph color="text-muted">Choose a channel or member.</Paragraph>}
                        {messages.map(message => <div key={message.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--background-modifier-accent)" }}>
                            <strong>{displayName(message.author)}</strong>
                            <Paragraph>{message.content || (message.attachments?.length ? "Attachment" : "")}</Paragraph>
                            {message.attachments?.map((file: any) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer">{file.filename}</a>)}
                        </div>)}
                    </div>
                    <Flex gap="8px" alignItems="center">
                        <div style={{ flex: 1 }}><TextInput value={composer} onChange={setComposer} placeholder="Message as bot" /></div>
                        <Button variant="secondary" disabled={!channelId || busy} onClick={async () => setAttachment((await chooseFile("image/*")) ?? undefined)}>{attachment ? "Image ready" : "Image"}</Button>
                        <Button disabled={!channelId || busy || (!composer.trim() && !attachment)} onClick={send}>Send</Button>
                    </Flex>
                </div>
                <div style={{ ...panelStyle, borderRadius: 0, padding: 12, maxHeight: 430, overflowY: "auto" }}>
                    <Heading>Members</Heading>
                    <TextInput value={memberSearch} onChange={setMemberSearch} placeholder="Search" />
                    <div style={{ marginTop: 8 }}>
                        {filteredMembers.map(member => <Button key={member.user.id} variant="secondary" size="small" style={{ width: "100%", marginBottom: 4, textAlign: "left" }} onClick={() => openDM(member.user.id)}>{displayName(member.user)}</Button>)}
                    </div>
                </div>
            </div>
        </>}
        {status && <Paragraph className={Margins.top16}>{busy ? "Working: " : ""}{status}</Paragraph>}
    </SettingsTab>;
}

function FakeProfile() {
    const plugin = Plugins.FakeProfile;
    const sharedPlugin = Plugins.FakeProfileThemes;
    const [enabled, setEnabled] = useState(Settings.plugins[plugin.name]?.enabled ?? false);
    const [sharedEnabled, setSharedEnabled] = useState(Settings.plugins[sharedPlugin.name]?.enabled ?? false);
    const SettingsComponent = plugin.settingsAboutComponent;
    const SharedSettingsComponent = sharedPlugin.settingsAboutComponent;

    return <SettingsTab>
        <Heading className={Margins.top16}>Fake Profile</Heading>
        <Paragraph className={Margins.bottom16}>Customize your name, avatar, banner, bio, colors, pronouns, badges, Nitro, boost details and avatar decorations.</Paragraph>
        <FormSwitch
            title="Enable Fake Profile"
            description="Restart Discord after changing this switch so every profile patch loads correctly."
            value={enabled}
            onChange={value => { Settings.plugins[plugin.name].enabled = value; setEnabled(value); }}
            hideBorder
        />
        {enabled && SettingsComponent && <SettingsComponent />}
        <Divider className={Margins.top20} />
        <FormSwitch
            title="Shared Fake Profile Colors"
            description="Encodes your selected colors invisibly in your bio so other CloudCord and compatible-client users can see them."
            value={sharedEnabled}
            onChange={value => { Settings.plugins[sharedPlugin.name].enabled = value; setSharedEnabled(value); }}
            hideBorder
        />
        {sharedEnabled && SharedSettingsComponent && <SharedSettingsComponent />}
    </SettingsTab>;
}

export const BotCordTab = wrapTab(BotCord, "BotCord");
export const FakeProfileTab = wrapTab(FakeProfile, "Fake Profile");

