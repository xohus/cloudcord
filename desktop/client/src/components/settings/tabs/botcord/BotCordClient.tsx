/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// BotCord's full-screen client: the same layout as Discord itself (server rail,
// channel list, chat, member list), driven by a bot account through the main
// process. The token never reaches this file; requests name the bot by its id.

import "./botcord.css";

import { RobotIcon } from "@components/Icons";
import { closeModal, openModal, Parser, React, useEffect, useMemo, useRef, useState } from "@webpack/common";

export async function requestBotApi<T>(botId: string, path: string, options?: Parameters<typeof VencordNative.botCord.request>[2]): Promise<T> {
    const result = await VencordNative.botCord.request<T>(botId, path, options);
    if (!result.ok) throw new Error(result.error || `Discord request failed (${result.status})`);
    return result.data as T;
}

export interface BotIdentity {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
    bot?: boolean;
}

interface BotGuild { id: string; name: string; icon?: string; }

interface BotChannel {
    id: string;
    name: string;
    type: number;
    position: number;
    parent_id?: string | null;
    topic?: string | null;
}

interface BotRole { id: string; name: string; color: number; position: number; hoist: boolean; }

interface BotMember { nick?: string; roles?: string[]; user: BotIdentity; }

interface BotMessage {
    id: string;
    content: string;
    timestamp: string;
    edited_timestamp?: string | null;
    author: BotIdentity;
    attachments?: Array<{ id: string; filename: string; url: string; content_type?: string; size?: number; }>;
    embeds?: Array<{
        title?: string;
        description?: string;
        url?: string;
        color?: number;
        author?: { name: string; icon_url?: string; };
        fields?: Array<{ name: string; value: string; inline?: boolean; }>;
        footer?: { text: string; icon_url?: string; };
        image?: { url: string; };
        thumbnail?: { url: string; };
    }>;
    referenced_message?: BotMessage | null;
}

interface PendingFile { name: string; type: string; data: string; }

// Discord channel types BotCord shows.
const CHANNEL = { TEXT: 0, DM: 1, VOICE: 2, CATEGORY: 4, ANNOUNCEMENT: 5, STAGE: 13, FORUM: 15 } as const;
const TEXT_LIKE = new Set<number>([CHANNEL.TEXT, CHANNEL.ANNOUNCEMENT]);
const POLL_MS = 4000;
const GROUP_WINDOW_MS = 7 * 60 * 1000;
const MAX_UPLOAD = 10 * 1024 * 1024;

const cdn = "https://cdn.discordapp.com";
const defaultAvatar = (id: string) => `${cdn}/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`;
const avatarUrl = (user: BotIdentity, size = 80) => user.avatar ? `${cdn}/avatars/${user.id}/${user.avatar}.webp?size=${size}` : defaultAvatar(user.id);
const guildIcon = (guild: BotGuild) => guild.icon ? `${cdn}/icons/${guild.id}/${guild.icon}.webp?size=96` : null;
const displayName = (user: BotIdentity) => user.global_name || user.username;
const hexColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
const initials = (name: string) => name.split(/\s+/).map(word => word[0]).join("").slice(0, 3);

function formatTime(iso: string, withDate: boolean) {
    const date = new Date(iso);
    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (!withDate) return time;
    const today = new Date();
    const yesterday = new Date(today.getTime() - 864e5);
    if (date.toDateString() === today.toDateString()) return `Today at ${time}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
}

function controlDiscordWindow(action: "minimize" | "maximize" | "close") {
    const nativeWindow = typeof DiscordNative === "undefined" ? undefined : DiscordNative.window;
    const discordAction = nativeWindow?.[action];
    if (typeof discordAction === "function") discordAction.call(nativeWindow);
    else void VencordNative.window[action]();
}

async function pickFile(): Promise<PendingFile | null> {
    if (IS_WEB || typeof DiscordNative === "undefined") {
        const input = Object.assign(document.createElement("input"), { type: "file" });
        const file = await new Promise<File | null>(resolve => {
            input.onchange = () => resolve(input.files?.[0] ?? null);
            input.oncancel = () => resolve(null);
            input.click();
        });
        if (!file) return null;
        if (file.size > MAX_UPLOAD) throw new Error("Files must be 10 MB or smaller");
        const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
        return { name: file.name, type: file.type || "application/octet-stream", data };
    }
    const [file] = await DiscordNative.fileManager.openFiles({ properties: ["openFile"] });
    if (!file) return null;
    if (file.data.byteLength > MAX_UPLOAD) throw new Error("Files must be 10 MB or smaller");
    const bytes = new Uint8Array(file.data);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const name = file.name ?? "file";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const type = ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" } as Record<string, string>)[ext] ?? "application/octet-stream";
    return { name, type, data: btoa(binary) };
}

/* ── Small pieces ─────────────────────────────────────────── */

function ChannelGlyph({ type }: { type: number; }) {
    if (type === CHANNEL.VOICE || type === CHANNEL.STAGE) return <span className="bc-glyph" aria-hidden="true">🔊</span>;
    if (type === CHANNEL.ANNOUNCEMENT) return <span className="bc-glyph" aria-hidden="true">📢</span>;
    if (type === CHANNEL.FORUM) return <span className="bc-glyph" aria-hidden="true">💬</span>;
    return <span className="bc-glyph bc-hash" aria-hidden="true">#</span>;
}

function BotTag() {
    return <span className="bc-bot-tag">APP</span>;
}

function Embed({ embed, channelId }: { embed: NonNullable<BotMessage["embeds"]>[number]; channelId: string; }) {
    const parse = (text: string) => Parser.parse(text, true, { channelId, viewingChannelId: channelId });
    return (
        <div className="bc-embed" style={{ borderLeftColor: embed.color == null ? "var(--background-modifier-accent)" : hexColor(embed.color) }}>
            <div className="bc-embed-body">
                {embed.author && <div className="bc-embed-author">{embed.author.icon_url && <img src={embed.author.icon_url} alt="" />}{embed.author.name}</div>}
                {embed.title && <div className="bc-embed-title">{embed.url ? <a href={embed.url} target="_blank" rel="noreferrer">{embed.title}</a> : embed.title}</div>}
                {embed.description && <div className="bc-embed-text">{parse(embed.description)}</div>}
                {!!embed.fields?.length && <div className="bc-embed-fields">
                    {embed.fields.map((field, i) => <div key={i} className={field.inline ? "bc-embed-field bc-inline" : "bc-embed-field"}>
                        <div className="bc-embed-field-name">{parse(field.name)}</div>
                        <div className="bc-embed-text">{parse(field.value)}</div>
                    </div>)}
                </div>}
                {embed.image?.url && <img className="bc-embed-image" src={embed.image.url} alt="" />}
                {embed.footer && <div className="bc-embed-footer">{embed.footer.icon_url && <img src={embed.footer.icon_url} alt="" />}{embed.footer.text}</div>}
            </div>
            {embed.thumbnail?.url && <img className="bc-embed-thumb" src={embed.thumbnail.url} alt="" />}
        </div>
    );
}

function Message({ message, grouped, channelId, nameColor, nickname }: { message: BotMessage; grouped: boolean; channelId: string; nameColor?: string; nickname?: string; }) {
    const content = message.content ? Parser.parse(message.content, true, { channelId, viewingChannelId: channelId }) : null;
    const reply = message.referenced_message;
    return (
        <li className={grouped ? "bc-message bc-grouped" : "bc-message"}>
            {reply && <div className="bc-reply">
                <img src={avatarUrl(reply.author, 32)} alt="" />
                <span className="bc-reply-name">{displayName(reply.author)}</span>
                <span className="bc-reply-text">{reply.content || "Click to see attachment"}</span>
            </div>}
            {grouped
                ? <span className="bc-hover-time">{formatTime(message.timestamp, false)}</span>
                : <img className="bc-avatar" src={avatarUrl(message.author)} alt="" />}
            <div className="bc-message-body">
                {!grouped && <h3 className="bc-message-header">
                    <span className="bc-username" style={nameColor ? { color: nameColor } : undefined}>{nickname || displayName(message.author)}</span>
                    {message.author.bot && <BotTag />}
                    <time className="bc-timestamp">{formatTime(message.timestamp, true)}</time>
                </h3>}
                {content && <div className="bc-markup">{content}{message.edited_timestamp && <span className="bc-edited"> (edited)</span>}</div>}
                {message.attachments?.map(file => file.content_type?.startsWith("image/")
                    ? <img key={file.id} className="bc-attachment-image" src={file.url} alt={file.filename} />
                    : <a key={file.id} className="bc-attachment-file" href={file.url} target="_blank" rel="noreferrer">📄 {file.filename}</a>)}
                {message.embeds?.map((embed, i) => <Embed key={i} embed={embed} channelId={channelId} />)}
            </div>
        </li>
    );
}

/* ── The client ───────────────────────────────────────────── */

function BotCordClient({ bot, botId, onClose }: { bot: BotIdentity; botId: string; onClose(): void; }) {
    const api = <T,>(path: string, options?: Parameters<typeof requestBotApi>[2]) => requestBotApi<T>(botId, path, options);

    const [guilds, setGuilds] = useState<BotGuild[]>([]);
    const [guild, setGuild] = useState<BotGuild | null>(null);
    const [channels, setChannels] = useState<BotChannel[]>([]);
    const [roles, setRoles] = useState<BotRole[]>([]);
    const [members, setMembers] = useState<BotMember[]>([]);
    const [dms, setDms] = useState<BotChannel[]>([]);
    const [channel, setChannel] = useState<BotChannel | null>(null);
    const [messages, setMessages] = useState<BotMessage[]>([]);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [draft, setDraft] = useState("");
    const [file, setFile] = useState<PendingFile | null>(null);
    const [sending, setSending] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [noOlder, setNoOlder] = useState(false);
    const [showMembers, setShowMembers] = useState(true);
    const [error, setError] = useState("");
    const scroller = useRef<HTMLDivElement>(null);
    const composer = useRef<HTMLTextAreaElement>(null);
    const stickToBottom = useRef(true);

    const fail = (e: any) => setError(e?.message || String(e));

    useEffect(() => { api<BotGuild[]>("/users/@me/guilds").then(setGuilds, fail); }, [botId]);

    // Live updates: poll the open channel for messages newer than the last one we have.
    useEffect(() => {
        if (!channel) return;
        let stopped = false;
        const timer = setInterval(async () => {
            const last = messagesRef.current.at(-1)?.id;
            if (!last || stopped) return;
            try {
                const fresh = await api<BotMessage[]>(`/channels/${channel.id}/messages?limit=50&after=${last}`);
                if (!stopped && fresh.length) setMessages(prev => mergeMessages(prev, fresh.reverse()));
            } catch { /* transient: try again next tick */ }
        }, POLL_MS);
        return () => { stopped = true; clearInterval(timer); };
    }, [channel?.id]);

    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    useEffect(() => {
        const el = scroller.current;
        if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const openGuild = async (next: BotGuild | null) => {
        setGuild(next);
        setChannel(null);
        setMessages([]);
        setError("");
        if (!next) return;
        setChannels([]);
        setMembers([]);
        setRoles([]);
        try {
            const [chs, rls, mems] = await Promise.all([
                api<BotChannel[]>(`/guilds/${next.id}/channels`),
                api<BotRole[]>(`/guilds/${next.id}/roles`).catch(() => [] as BotRole[]),
                api<BotMember[]>(`/guilds/${next.id}/members?limit=1000`).catch(() => [] as BotMember[]),
            ]);
            setChannels(chs);
            setRoles(rls);
            setMembers(mems);
            const first = chs.filter(c => TEXT_LIKE.has(c.type)).sort((a, b) => a.position - b.position)[0];
            if (first) void openChannel(first);
        } catch (e) { fail(e); }
    };

    const openChannel = async (next: BotChannel) => {
        setChannel(next);
        setMessages([]);
        setNoOlder(false);
        setError("");
        stickToBottom.current = true;
        try {
            const list = await api<BotMessage[]>(`/channels/${next.id}/messages?limit=50`);
            setMessages(list.reverse());
            setNoOlder(list.length < 50);
        } catch (e) { fail(e); }
        composer.current?.focus();
    };

    const loadOlder = async () => {
        const first = messages[0]?.id;
        if (!channel || !first || loadingOlder || noOlder) return;
        setLoadingOlder(true);
        const el = scroller.current;
        const fromBottom = el ? el.scrollHeight - el.scrollTop : 0;
        try {
            const older = await api<BotMessage[]>(`/channels/${channel.id}/messages?limit=50&before=${first}`);
            setNoOlder(older.length < 50);
            stickToBottom.current = false;
            setMessages(prev => mergeMessages(older.reverse(), prev));
            requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - fromBottom; });
        } catch (e) { fail(e); }
        finally { setLoadingOlder(false); }
    };

    const onScroll = () => {
        const el = scroller.current;
        if (!el) return;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        if (el.scrollTop < 120) void loadOlder();
    };

    const send = async () => {
        const text = draft.trim();
        if (!channel || sending || (!text && !file)) return;
        setSending(true);
        setError("");
        try {
            const sent = await api<BotMessage>(`/channels/${channel.id}/messages`, {
                method: "POST",
                body: { content: text, allowed_mentions: { parse: ["users", "roles", "everyone"] } },
                files: file ? [file] : undefined,
            });
            stickToBottom.current = true;
            setMessages(prev => mergeMessages(prev, [sent]));
            setDraft("");
            setFile(null);
        } catch (e) { fail(e); }
        finally { setSending(false); composer.current?.focus(); }
    };

    const openDm = async (user: BotIdentity) => {
        try {
            const dm = await api<BotChannel>("/users/@me/channels", { method: "POST", body: { recipient_id: user.id } });
            const named = { ...dm, name: displayName(user), position: 0 };
            setDms(prev => [named, ...prev.filter(c => c.id !== named.id)]);
            setGuild(null);
            await openChannel(named);
        } catch (e) { fail(e); }
    };

    const mention = (user: BotIdentity) => {
        setDraft(prev => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}<@${user.id}> `);
        composer.current?.focus();
    };

    // Sidebar: uncategorised channels first, then each category with its channels.
    const sidebar = useMemo(() => {
        const byPosition = (a: BotChannel, b: BotChannel) => a.position - b.position || a.id.localeCompare(b.id);
        const visible = channels.filter(c => c.type !== CHANNEL.CATEGORY).sort(byPosition);
        const loose = visible.filter(c => !c.parent_id);
        const categories = channels.filter(c => c.type === CHANNEL.CATEGORY).sort(byPosition)
            .map(category => ({ category, items: visible.filter(c => c.parent_id === category.id) }));
        return { loose, categories };
    }, [channels]);

    const roleById = useMemo(() => new Map(roles.map(role => [role.id, role])), [roles]);
    const memberById = useMemo(() => new Map(members.map(member => [member.user.id, member])), [members]);

    const topRole = (member?: BotMember, filter: (role: BotRole) => boolean = () => true) =>
        (member?.roles ?? []).map(id => roleById.get(id)).filter((r): r is BotRole => !!r && filter(r))
            .sort((a, b) => b.position - a.position)[0];
    const nameColor = (userId: string) => {
        const role = topRole(memberById.get(userId), r => r.color !== 0);
        return role ? hexColor(role.color) : undefined;
    };

    // Member list grouped by hoisted role, like Discord's.
    const memberGroups = useMemo(() => {
        const groups = new Map<string, { title: string; position: number; list: BotMember[]; }>();
        for (const member of members) {
            const hoisted = topRole(member, r => r.hoist);
            const key = hoisted?.id ?? "members";
            if (!groups.has(key)) groups.set(key, { title: hoisted?.name ?? "Members", position: hoisted?.position ?? -1, list: [] });
            groups.get(key)!.list.push(member);
        }
        const name = (m: BotMember) => (m.nick || displayName(m.user)).toLowerCase();
        return [...groups.values()].sort((a, b) => b.position - a.position).map(g => ({ ...g, list: g.list.sort((a, b) => name(a).localeCompare(name(b))) }));
    }, [members, roleById]);

    const isDm = channel?.type === CHANNEL.DM;
    const placeholder = channel ? isDm ? `Message @${channel.name}` : `Message #${channel.name}` : "";

    const toggleCategory = (id: string) => setCollapsed(prev => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
    });

    const channelButton = (c: BotChannel) => {
        const readable = TEXT_LIKE.has(c.type);
        return (
            <li key={c.id}>
                <button
                    className={`bc-channel${channel?.id === c.id ? " bc-selected" : ""}${readable ? "" : " bc-disabled"}`}
                    onClick={() => readable && void openChannel(c)}
                    title={readable ? undefined : "Bots can't join voice channels in BotCord"}
                >
                    <ChannelGlyph type={c.type} />
                    <span className="bc-channel-name">{c.name}</span>
                </button>
            </li>
        );
    };

    return (
        <div className="bc-root" onKeyDown={e => e.stopPropagation()}>
            <div className="bc-titlebar">
                <span className="bc-titlebar-label"><RobotIcon width={14} height={14} /> BotCord · {displayName(bot)}</span>
                <div className="bc-window-buttons">
                    <button aria-label="Minimize" onClick={() => controlDiscordWindow("minimize")}>─</button>
                    <button aria-label="Maximize" onClick={() => controlDiscordWindow("maximize")}>☐</button>
                    <button aria-label="Close" className="bc-close" onClick={() => controlDiscordWindow("close")}>✕</button>
                </div>
            </div>

            <div className="bc-app">
                {/* Server rail */}
                <nav className="bc-guilds" aria-label="Servers">
                    <GuildButton label="Direct Messages" selected={!guild} onClick={() => void openGuild(null)}>
                        <img src={avatarUrl(bot, 96)} alt="" />
                    </GuildButton>
                    <div className="bc-guild-separator" />
                    {guilds.map(g => (
                        <GuildButton key={g.id} label={g.name} selected={guild?.id === g.id} onClick={() => void openGuild(g)}>
                            {guildIcon(g) ? <img src={guildIcon(g)!} alt="" /> : <span className="bc-guild-initials">{initials(g.name)}</span>}
                        </GuildButton>
                    ))}
                    <div className="bc-guild-separator" />
                    <GuildButton label="Back to Discord" onClick={onClose} exit>
                        <span className="bc-guild-initials">↩</span>
                    </GuildButton>
                </nav>

                {/* Channel sidebar */}
                <aside className="bc-sidebar">
                    <header className="bc-sidebar-header">{guild ? guild.name : "Direct Messages"}</header>
                    <div className="bc-sidebar-scroll">
                        {guild ? <>
                            <ul>{sidebar.loose.map(channelButton)}</ul>
                            {sidebar.categories.map(({ category, items }) => (
                                <section key={category.id}>
                                    <button className="bc-category" onClick={() => toggleCategory(category.id)}>
                                        <span className={collapsed.has(category.id) ? "bc-caret bc-caret-closed" : "bc-caret"}>⌄</span>
                                        {category.name}
                                    </button>
                                    <ul>{items.filter(c => !collapsed.has(category.id) || c.id === channel?.id).map(channelButton)}</ul>
                                </section>
                            ))}
                        </> : <>
                            <div className="bc-category bc-static">Direct Messages</div>
                            {dms.length === 0 && <p className="bc-empty-hint">Open a DM from a server's member list. Bots can only DM people who share a server with them.</p>}
                            <ul>{dms.map(dm => (
                                <li key={dm.id}>
                                    <button className={`bc-channel bc-dm${channel?.id === dm.id ? " bc-selected" : ""}`} onClick={() => void openChannel(dm)}>
                                        <span className="bc-channel-name">@{dm.name}</span>
                                    </button>
                                </li>
                            ))}</ul>
                        </>}
                    </div>
                    <footer className="bc-user-panel">
                        <img src={avatarUrl(bot)} alt="" />
                        <div className="bc-user-names">
                            <div className="bc-user-name">{displayName(bot)} <BotTag /></div>
                            <div className="bc-user-tag">{bot.username}</div>
                        </div>
                        <button className="bc-icon-button" title="Back to Discord" onClick={onClose}>↩</button>
                    </footer>
                </aside>

                {/* Chat */}
                <main className="bc-chat">
                    <header className="bc-chat-header">
                        {channel ? <>
                            {isDm ? <span className="bc-glyph">@</span> : <ChannelGlyph type={channel.type} />}
                            <span className="bc-chat-title">{channel.name}</span>
                            {channel.topic && <><span className="bc-divider" /><span className="bc-topic">{channel.topic}</span></>}
                        </> : <span className="bc-chat-title">{guild ? "Pick a channel" : "Direct Messages"}</span>}
                        {guild && <button className={`bc-icon-button bc-members-toggle${showMembers ? " bc-active" : ""}`} title="Member list" onClick={() => setShowMembers(v => !v)}>👥</button>}
                    </header>

                    {error && <div className="bc-error" role="alert">{error}<button onClick={() => setError("")}>✕</button></div>}

                    <div className="bc-messages" ref={scroller} onScroll={onScroll}>
                        {channel ? <ol>
                            {noOlder && <li className="bc-channel-start">
                                <div className="bc-start-icon">{isDm ? "@" : "#"}</div>
                                <h2>{isDm ? channel.name : `Welcome to #${channel.name}!`}</h2>
                                <p>{isDm ? `This is the beginning of your bot's DMs with ${channel.name}.` : `This is the start of the #${channel.name} channel.`}</p>
                            </li>}
                            {loadingOlder && <li className="bc-loading">Loading older messages…</li>}
                            {messages.map((m, i) => {
                                const prev = messages[i - 1];
                                const grouped = !!prev && prev.author.id === m.author.id && !m.referenced_message
                                    && new Date(m.timestamp).getTime() - new Date(prev.timestamp).getTime() < GROUP_WINDOW_MS;
                                return <Message key={m.id} message={m} grouped={grouped} channelId={channel.id}
                                    nameColor={nameColor(m.author.id)} nickname={memberById.get(m.author.id)?.nick} />;
                            })}
                        </ol> : <div className="bc-placeholder"><RobotIcon width={64} height={64} /><p>{guild ? "Pick a text channel on the left." : "Pick a server on the left, or open a DM from a member list."}</p></div>}
                    </div>

                    {channel && <form className="bc-composer" onSubmit={e => { e.preventDefault(); void send(); }}>
                        {file && <div className="bc-upload">📎 {file.name}<button type="button" onClick={() => setFile(null)}>✕</button></div>}
                        <div className="bc-composer-box">
                            <button type="button" className="bc-attach" title="Upload a file" onClick={() => pickFile().then(f => f && setFile(f), fail)}>+</button>
                            <textarea
                                ref={composer}
                                rows={1}
                                value={draft}
                                placeholder={placeholder}
                                aria-label={placeholder}
                                onChange={e => setDraft(e.currentTarget.value)}
                                onKeyDown={e => {
                                    e.stopPropagation();
                                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                                }}
                                onPaste={e => e.stopPropagation()}
                                disabled={sending}
                            />
                        </div>
                    </form>}
                </main>

                {/* Member list */}
                {guild && showMembers && <aside className="bc-members" aria-label="Members">
                    {members.length === 0 && <p className="bc-empty-hint">No members loaded. Turn on the <b>Server Members Intent</b> for this bot in the Developer Portal.</p>}
                    {memberGroups.map(group => <section key={group.title}>
                        <h3 className="bc-member-group">{group.title} — {group.list.length}</h3>
                        {group.list.map(member => (
                            <div key={member.user.id} className="bc-member" title="Click to mention · DM button to message">
                                <button className="bc-member-main" onClick={() => mention(member.user)}>
                                    <img src={avatarUrl(member.user, 64)} alt="" />
                                    <span className="bc-member-name" style={{ color: nameColor(member.user.id) }}>{member.nick || displayName(member.user)}</span>
                                    {member.user.bot && <BotTag />}
                                </button>
                                {!member.user.bot && member.user.id !== bot.id && <button className="bc-member-dm" title={`DM ${displayName(member.user)}`} onClick={() => void openDm(member.user)}>✉</button>}
                            </div>
                        ))}
                    </section>)}
                </aside>}
            </div>
        </div>
    );
}

function GuildButton({ label, selected, exit, onClick, children }: { label: string; selected?: boolean; exit?: boolean; onClick(): void; children: React.ReactNode; }) {
    return (
        <div className={`bc-guild${selected ? " bc-selected" : ""}${exit ? " bc-exit" : ""}`}>
            <span className="bc-guild-pill" />
            <button className="bc-guild-icon" aria-label={label} title={label} onClick={onClick}>{children}</button>
        </div>
    );
}

/** Adds messages, dropping duplicates, kept in id (time) order. */
function mergeMessages(base: BotMessage[], added: BotMessage[]) {
    const byId = new Map(base.map(m => [m.id, m]));
    for (const m of added) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
}

let modalKey: string | undefined;

export function closeBotCordClient() {
    if (modalKey) closeModal(modalKey);
    modalKey = undefined;
}

export function openBotCordClient(bot: BotIdentity, botId: string) {
    closeBotCordClient();
    // Discord's modal host keeps keyboard focus inside BotCord (a body-level root
    // can't receive typing while Settings owns focus).
    modalKey = openModal(props => <BotCordClient bot={bot} botId={botId} onClose={() => { modalKey = undefined; props.onClose(); }} />);
}
