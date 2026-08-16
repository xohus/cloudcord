/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./botcord.css";

import {
    addBotAccount,
    addBotReaction,
    createBotDM,
    deleteBotMessage,
    editBotMessage,
    getBotChannelMessages,
    getBotDMChannels,
    getBotGuildChannels,
    getBotGuildMembers,
    getBotGuilds,
    removeBotAccount,
    replyBotMessage,
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

const displayName = (user: any) => user?.global_name || user?.globalName || user?.username || "Unknown";
const avatarUrl = (user: any, size = 64) => user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=${size}` : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user?.id || "0") >> 22n) % 6}.png`;
const guildIcon = (guild: any) => guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=96` : null;
const channelLabel = (channel: any) => channel?.recipients?.length ? channel.recipients.map(displayName).join(", ") : channel?.name || "Direct Message";
const timeLabel = (value: string) => new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function MessageBody({ message }: { message: any; }) {
    return <>
        {message.message_reference && <div className="cc-bot-reply-line">Replying to a message</div>}
        {message.content && <div className="cc-bot-message-content">{message.content}</div>}
        {message.attachments?.map((file: any) => file.content_type?.startsWith("image/")
            ? <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><img className="cc-bot-image" src={file.url} alt={file.filename} /></a>
            : <a className="cc-bot-file" key={file.id} href={file.url} target="_blank" rel="noreferrer">{file.filename}</a>)}
        {message.embeds?.map((embed: any, index: number) => <div className="cc-bot-embed" key={index} style={{ borderColor: embed.color ? `#${embed.color.toString(16).padStart(6, "0")}` : undefined }}>
            {embed.author?.name && <div className="cc-bot-embed-author">{embed.author.name}</div>}
            {embed.title && <strong>{embed.title}</strong>}
            {embed.description && <div>{embed.description}</div>}
            {embed.fields?.map((field: any, fieldIndex: number) => <div className="cc-bot-embed-field" key={fieldIndex}><strong>{field.name}</strong><div>{field.value}</div></div>)}
            {embed.image?.url && <img className="cc-bot-image" src={embed.image.url} alt="" />}
            {embed.thumbnail?.url && <img className="cc-bot-embed-thumb" src={embed.thumbnail.url} alt="" />}
            {embed.footer?.text && <small>{embed.footer.text}</small>}
        </div>)}
        {message.poll && <div className="cc-bot-poll"><strong>{message.poll.question?.text}</strong>{message.poll.answers?.map((answer: any) => <div key={answer.answer_id}>( ) {answer.poll_media?.text || "Answer"}</div>)}</div>}
    </>;
}

function BotCord() {
    const state = useBotCordState();
    const active = state.accounts.find(account => account.id === state.activeAccountId) ?? state.accounts[0];
    const [token, setToken] = useState("");
    const [guilds, setGuilds] = useState<any[]>([]);
    const [dms, setDms] = useState<any[]>([]);
    const [guildId, setGuildId] = useState("");
    const [home, setHome] = useState(true);
    const [channels, setChannels] = useState<any[]>([]);
    const [channelId, setChannelId] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [showNewDM, setShowNewDM] = useState(false);
    const [dmGuildId, setDmGuildId] = useState("");
    const [dmMembers, setDmMembers] = useState<any[]>([]);
    const [dmSearch, setDmSearch] = useState("");
    const [composer, setComposer] = useState("");
    const [attachment, setAttachment] = useState<File | undefined>();
    const [replyTo, setReplyTo] = useState<any>();
    const [editing, setEditing] = useState<any>();
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);

    const run = async (label: string, action: () => Promise<void>) => {
        setBusy(true);
        if (label) setStatus(label);
        try { await action(); }
        catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
    };

    const refreshMessages = async (quiet = false) => {
        if (!active || !channelId) return;
        try {
            const next = (await getBotChannelMessages(active.token, channelId)).reverse();
            setMessages(next);
            if (!quiet) setStatus("Messages refreshed.");
        } catch (error) { if (!quiet) setStatus(error instanceof Error ? error.message : String(error)); }
    };

    const loadAccount = async () => {
        if (!active) return;
        const [nextGuilds, nextDms] = await Promise.all([getBotGuilds(active.token), getBotDMChannels(active.token)]);
        setGuilds(nextGuilds); setDms(nextDms); setStatus("Connected.");
    };

    useEffect(() => {
        setGuilds([]); setDms([]); setGuildId(""); setChannels([]); setChannelId(""); setMessages([]); setMembers([]); setHome(true); setShowNewDM(false); setDmGuildId(""); setDmMembers([]); setDmSearch("");
        if (active) run("Connecting...", loadAccount);
    }, [active?.id]);

    useEffect(() => {
        if (!active || !guildId) return;
        run("Opening server...", async () => {
            const [nextChannels, nextMembers] = await Promise.all([getBotGuildChannels(active.token, guildId), getBotGuildMembers(active.token, guildId)]);
            setChannels(nextChannels.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))); setMembers(nextMembers); setStatus("Server ready.");
        });
    }, [active?.id, guildId]);

    useEffect(() => {
        if (!channelId) return;
        const timer = window.setInterval(() => refreshMessages(true), 5000);
        return () => window.clearInterval(timer);
    }, [active?.id, channelId]);

    const categories = useMemo(() => {
        const groups = channels.filter(channel => channel.type === 4).map(category => ({ ...category, children: channels.filter(channel => channel.parent_id === category.id && [0, 5, 10, 11, 12, 15].includes(channel.type)) }));
        const loose = channels.filter(channel => !channel.parent_id && [0, 5, 10, 11, 12, 15].includes(channel.type));
        return [{ id: "uncategorized", name: "Channels", children: loose }, ...groups];
    }, [channels]);
    const filteredMembers = useMemo(() => members.filter(member => displayName(member.user).toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 100), [members, memberSearch]);
    const filteredDmMembers = useMemo(() => dmMembers
        .filter(member => member.user?.id !== active?.id)
        .filter(member => `${member.nick || ""} ${displayName(member.user)}`.toLowerCase().includes(dmSearch.toLowerCase()))
        .slice(0, 100), [dmMembers, dmSearch, active?.id]);
    const selectedChannel = [...channels, ...dms].find(channel => channel.id === channelId);

    async function openChannel(channel: any) {
        setChannelId(channel.id); setMessages([]); setReplyTo(undefined); setEditing(undefined);
        await run("Loading messages...", async () => { setMessages((await getBotChannelMessages(active!.token, channel.id)).reverse()); setStatus("Messages loaded."); });
    }
    async function openDM(userId: string) {
        if (!active) return;
        await run("Opening DM...", async () => {
            const dm = await createBotDM(active.token, userId);
            if (!dms.some(channel => channel.id === dm.id)) setDms(current => [dm, ...current]);
            setHome(true); setGuildId(""); await openChannel(dm);
        });
    }
    async function selectDmGuild(nextGuildId: string) {
        setDmGuildId(nextGuildId); setDmMembers([]); setDmSearch("");
        if (!active || !nextGuildId) return;
        await run("Loading server members...", async () => {
            setDmMembers(await getBotGuildMembers(active.token, nextGuildId));
            setStatus("Choose a member to message.");
        });
    }
    async function loadOlder() {
        if (!active || !channelId || !messages[0]) return;
        await run("Loading older messages...", async () => {
            const older = (await getBotChannelMessages(active.token, channelId, messages[0].id)).reverse();
            setMessages(current => [...older, ...current]); setStatus(older.length ? "Older messages loaded." : "No older messages.");
        });
    }
    async function send() {
        if (!active || !channelId || (!composer.trim() && !attachment)) return;
        await run(editing ? "Saving edit..." : "Sending...", async () => {
            if (editing) await editBotMessage(active.token, channelId, editing.id, composer.trim());
            else if (replyTo) await replyBotMessage(active.token, channelId, replyTo.id, composer.trim(), attachment);
            else await sendBotMessage(active.token, channelId, composer.trim(), attachment);
            setComposer(""); setAttachment(undefined); setReplyTo(undefined); setEditing(undefined); await refreshMessages(true); setStatus("Sent.");
        });
    }

    if (!active) return <SettingsTab>
        <div className="cc-bot-login">
            <div className="cc-bot-login-mark">CC</div>
            <Heading>BotCord Client</Heading>
            <Paragraph>Sign in with a token from a bot you own. Tokens stay in CloudCord's local storage.</Paragraph>
            <Notice.Warning>Third-party Discord clients can violate Discord's rules. Use a test bot and only enable intents the bot needs.</Notice.Warning>
            <TextInput type="password" value={token} onChange={setToken} placeholder="Paste bot token" />
            <Button disabled={busy || !token.trim()} onClick={() => run("Checking bot...", async () => { await addBotAccount(token); setToken(""); })}>Open BotCord</Button>
            {status && <Paragraph>{status}</Paragraph>}
        </div>
    </SettingsTab>;

    return <SettingsTab>
        <div className="cc-bot-page">
            <div className="cc-bot-topbar">
                <div><strong>BotCord</strong><span>{active.username}</span></div>
                <select value={active.id} onChange={event => setActiveBotAccount(event.currentTarget.value)}>{state.accounts.map(account => <option key={account.id} value={account.id}>{account.username}</option>)}</select>
                <button onClick={() => run("Refreshing...", loadAccount)} disabled={busy}>Refresh</button>
                <button onClick={() => removeBotAccount(active.id)}>Sign out</button>
            </div>
            <div className="cc-bot-shell">
                <aside className="cc-bot-guilds">
                    <button className={home ? "active home" : "home"} title="Direct Messages" onClick={() => { setHome(true); setGuildId(""); setChannels([]); setMembers([]); }}>DM</button>
                    <div className="cc-bot-guild-divider" />
                    {guilds.map(guild => <button className={!home && guildId === guild.id ? "active" : ""} key={guild.id} title={guild.name} onClick={() => { setHome(false); setGuildId(guild.id); setChannelId(""); setMessages([]); }}>
                        {guildIcon(guild) ? <img src={guildIcon(guild)!} alt="" /> : guild.name.slice(0, 2).toUpperCase()}
                    </button>)}
                </aside>
                <aside className="cc-bot-channels">
                    <div className="cc-bot-sidebar-title"><span>{home ? "Direct Messages" : guilds.find(guild => guild.id === guildId)?.name || "Server"}</span>{home && <button className="cc-bot-new-dm" title="Message a server member" onClick={() => setShowNewDM(true)}>+</button>}</div>
                    {home ? showNewDM ? <>
                        <button className="cc-bot-dm-back" onClick={() => setShowNewDM(false)}>Back to conversations</button>
                        <div className="cc-bot-section-title">Choose a server</div>
                        <select className="cc-bot-dm-guild" value={dmGuildId} onChange={event => selectDmGuild(event.currentTarget.value)}>
                            <option value="">Select a server...</option>
                            {guilds.map(guild => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
                        </select>
                        {dmGuildId && <>
                            <TextInput value={dmSearch} onChange={setDmSearch} placeholder="Search server members" />
                            <div className="cc-bot-section-title">Members</div>
                            {filteredDmMembers.map(member => <button className="cc-bot-dm" key={member.user.id} onClick={async () => { await openDM(member.user.id); setShowNewDM(false); }}>
                                <img src={avatarUrl(member.user)} alt="" /><span>{member.nick || displayName(member.user)}</span>{member.user.bot && <small>BOT</small>}
                            </button>)}
                            {!busy && !filteredDmMembers.length && <div className="cc-bot-empty">No matching members.</div>}
                        </>}
                    </> : <>
                        <div className="cc-bot-section-title">Conversations</div>
                        {dms.map(dm => <button className={channelId === dm.id ? "active cc-bot-dm" : "cc-bot-dm"} key={dm.id} onClick={() => openChannel(dm)}>
                            <img src={avatarUrl(dm.recipients?.[0])} alt="" /><span>{channelLabel(dm)}</span>
                        </button>)}
                        {!dms.length && <div className="cc-bot-empty">No bot DMs yet.</div>}
                    </> : categories.map(category => <div key={category.id}>
                        <div className="cc-bot-section-title">{category.name}</div>
                        {category.children.map((channel: any) => <button className={channelId === channel.id ? "active" : ""} key={channel.id} onClick={() => openChannel(channel)}><span>#</span>{channel.name}</button>)}
                    </div>)}
                </aside>
                <main className="cc-bot-chat">
                    <header><div><strong>{selectedChannel ? `${selectedChannel.recipients ? "@" : "#"} ${channelLabel(selectedChannel)}` : "BotCord"}</strong><span>{selectedChannel?.topic || "Choose a conversation"}</span></div>{channelId && <button onClick={() => refreshMessages()}>Refresh</button>}</header>
                    <div className="cc-bot-messages">
                        {channelId && messages.length >= 50 && <button className="cc-bot-older" onClick={loadOlder}>Load older messages</button>}
                        {!channelId && <div className="cc-bot-welcome"><Heading>Select a conversation</Heading><Paragraph>Choose a channel or direct message from the left.</Paragraph></div>}
                        {messages.map(message => <article className="cc-bot-message" key={message.id}>
                            <img className="cc-bot-avatar" src={avatarUrl(message.author)} alt="" />
                            <div className="cc-bot-message-main"><div className="cc-bot-message-head"><strong>{displayName(message.author)}</strong>{message.author?.bot && <span className="cc-bot-tag">BOT</span>}<time>{timeLabel(message.timestamp)}</time></div><MessageBody message={message} />
                                {!!message.reactions?.length && <div className="cc-bot-reactions">{message.reactions.map((reaction: any) => <button key={`${reaction.emoji?.id || ""}${reaction.emoji?.name}`}>{reaction.emoji?.name} {reaction.count}</button>)}</div>}
                            </div>
                            <div className="cc-bot-message-actions">
                                <button title="Reply" onClick={() => { setReplyTo(message); setEditing(undefined); setComposer(""); }}>Reply</button>
                                <button title="React" onClick={() => active && run("", async () => { await addBotReaction(active.token, channelId, message.id, "👍"); await refreshMessages(true); })}>Like</button>
                                {message.author?.id === active.id && <><button title="Edit" onClick={() => { setEditing(message); setReplyTo(undefined); setComposer(message.content || ""); }}>Edit</button><button title="Delete" onClick={() => run("Deleting...", async () => { await deleteBotMessage(active.token, channelId, message.id); await refreshMessages(true); })}>Delete</button></>}
                            </div>
                        </article>)}
                    </div>
                    {channelId && <div className="cc-bot-composer-wrap">
                        {(replyTo || editing) && <div className="cc-bot-composer-context"><span>{editing ? `Editing your message` : `Replying to ${displayName(replyTo.author)}`}</span><button onClick={() => { setReplyTo(undefined); setEditing(undefined); setComposer(""); }}>Cancel</button></div>}
                        {attachment && <div className="cc-bot-attachment">{attachment.name}<button onClick={() => setAttachment(undefined)}>Remove</button></div>}
                        <div className="cc-bot-composer"><button title="Attach image" onClick={async () => setAttachment((await chooseFile("image/*")) ?? undefined)}>+</button><textarea value={composer} onChange={event => setComposer(event.currentTarget.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={`Message ${channelLabel(selectedChannel)}`} /><button onClick={send} disabled={busy || (!composer.trim() && !attachment)}>Send</button></div>
                    </div>}
                </main>
                {!home && <aside className="cc-bot-members"><div className="cc-bot-sidebar-title">Members</div><TextInput value={memberSearch} onChange={setMemberSearch} placeholder="Search members" />
                    {filteredMembers.map(member => <button key={member.user.id} onClick={() => openDM(member.user.id)}><img src={avatarUrl(member.user)} alt="" /><span>{member.nick || displayName(member.user)}</span>{member.user.bot && <small>BOT</small>}</button>)}
                </aside>}
            </div>
            {status && <div className={status.toLowerCase().includes("error") || status.toLowerCase().includes("failed") ? "cc-bot-status error" : "cc-bot-status"}>{busy ? "Working: " : ""}{status}</div>}
        </div>
    </SettingsTab>;
}

function FakeProfile() {
    const plugin = Plugins.FakeProfile;
    const [enabled, setEnabled] = useState(Settings.plugins[plugin.name]?.enabled ?? false);
    const SettingsComponent = plugin.settingsAboutComponent;
    return <SettingsTab>
        <Heading className={Margins.top16}>Fake Profile</Heading>
        <Paragraph className={Margins.bottom16}>Edit and share your complete CloudCord profile: name, avatar, banner, bio, colors, pronouns, badges, Nitro details, dates and decorations.</Paragraph>
        <FormSwitch title="Enable Fake Profile" description="CloudCord saves and publishes editor changes automatically." value={enabled} onChange={value => { Settings.plugins[plugin.name].enabled = value; setEnabled(value); }} hideBorder />
        {enabled && SettingsComponent && <SettingsComponent />}
        <Divider className={Margins.top20} />
        <Notice.Info>Changes save and publish automatically for CloudCord desktop and mobile. Your real Discord About Me is never modified.</Notice.Info>
    </SettingsTab>;
}

export const BotCordTab = wrapTab(BotCord, "BotCord");
export const FakeProfileTab = wrapTab(FakeProfile, "Fake Profile");
