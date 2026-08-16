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
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, .8fr) minmax(260px, 1.5fr)", gap: 12, marginTop: 16 }}>
                <div style={panelStyle}>
                    <Heading>Browse</Heading>
                    <Paragraph color="text-muted">Server</Paragraph>
                    <select style={selectStyle} value={guildId} onChange={event => { setGuildId(event.currentTarget.value); setChannelId(""); setMessages([]); }}>
                        <option value="">Choose a server</option>
                        {guilds.map(guild => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
                    </select>
                    <Paragraph color="text-muted" className={Margins.top16}>Channel</Paragraph>
                    <select style={selectStyle} value={channelId} onChange={event => openChannel(event.currentTarget.value)} disabled={!channels.length}>
                        <option value="">Choose a channel</option>
                        {channels.map(channel => <option key={channel.id} value={channel.id}># {channel.name}</option>)}
                    </select>

                    {!!members.length && <>
                        <Paragraph color="text-muted" className={Margins.top16}>Open a member DM</Paragraph>
                        <TextInput value={memberSearch} onChange={setMemberSearch} placeholder="Search members" />
                        <div style={{ maxHeight: 150, overflowY: "auto", marginTop: 6 }}>
                            {filteredMembers.map(member => <Button key={member.user.id} variant="secondary" size="small" style={{ width: "100%", marginBottom: 4 }} onClick={() => openDM(member.user.id)}>{displayName(member.user)}</Button>)}
                        </div>
                    </>}
                </div>

                <div style={panelStyle}>
                    <Heading>Messages</Heading>
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
            </div>
        </>}
        {status && <Paragraph className={Margins.top16}>{busy ? "Working: " : ""}{status}</Paragraph>}
    </SettingsTab>;
}

function FakeProfile() {
    const plugin = Plugins.FakeProfile;
    const [enabled, setEnabled] = useState(Settings.plugins[plugin.name]?.enabled ?? false);
    const SettingsComponent = plugin.settingsAboutComponent;

    return <SettingsTab>
        <Heading className={Margins.top16}>Fake Profile</Heading>
        <Paragraph className={Margins.bottom16}>Customize how your profile appears locally: name, avatar, banner, bio, colors, pronouns, badges, Nitro and boost details.</Paragraph>
        <FormSwitch
            title="Enable Fake Profile"
            description="Restart Discord after changing this switch so every profile patch loads correctly."
            value={enabled}
            onChange={value => { Settings.plugins[plugin.name].enabled = value; setEnabled(value); }}
            hideBorder
        />
        {enabled && SettingsComponent && <SettingsComponent />}
    </SettingsTab>;
}

export const BotCordTab = wrapTab(BotCord, "BotCord");
export const FakeProfileTab = wrapTab(FakeProfile, "Fake Profile");

