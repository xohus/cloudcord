/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Heading, HeadingTertiary } from "@components/Heading";
import { DeleteIcon, OpenExternalIcon, RobotIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { DataStore } from "@api/index";
import { Margins } from "@utils/margins";
import { Alerts, createRoot, React, TextInput, Toasts, useEffect, useRef, useState } from "@webpack/common";
import type { Root } from "react-dom/client";

const DS_BOT_TOKENS = "CloudCord_BotTokens";
const DS_ACTIVE_BOT = "CloudCord_ActiveBot";
const normalizeBotToken = (value: string) => value.replace(/^Bot\s+/i, "").trim();

function controlDiscordWindow(action: "minimize" | "maximize" | "close") {
    const discordAction = DiscordNative?.window?.[action];
    if (typeof discordAction === "function") {
        discordAction.call(DiscordNative.window);
        return;
    }

    void VencordNative.window[action]();
}

async function requestBotApi<T>(token: string, path: string, options?: Parameters<typeof VencordNative.botCord.request>[2]): Promise<T> {
    const result = await VencordNative.botCord.request<T>(normalizeBotToken(token), path, options);
    if (!result.ok) throw new Error(result.error || `Discord request failed (${result.status})`);
    return result.data as T;
}

interface BotAccount {
    name: string;
    token: string;
    botId?: string;
    avatar?: string;
}

interface BotIdentity {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
}

interface BotGuild {
    id: string;
    name: string;
    icon?: string;
}

interface BotChannel {
    id: string;
    name: string;
    type: number;
    position: number;
}

interface BotMessage {
    id: string;
    content: string;
    timestamp: string;
    author: BotIdentity;
    attachments?: Array<{ id: string; filename: string; url: string; content_type?: string; width?: number; height?: number; }>;
    embeds?: Array<{ title?: string; description?: string; url?: string; image?: { url: string; }; thumbnail?: { url: string; }; }>;
}

interface BotMember {
    nick?: string;
    user: BotIdentity;
}

interface PendingImage {
    name: string;
    type: string;
    data: string;
}

const avatarUrl = (user: BotIdentity, size = 64) => user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;

let botCordOverlayRoot: Root | null = null;
let botCordOverlayContainer: HTMLDivElement | null = null;

function closeBotCordOverlay() {
    botCordOverlayRoot?.unmount();
    botCordOverlayContainer?.remove();
    botCordOverlayRoot = null;
    botCordOverlayContainer = null;
}

function BotCordOverlay({ bot, token }: { bot: BotIdentity; token: string; }) {
    const [guilds, setGuilds] = useState<BotGuild[]>([]);
    const [selectedGuild, setSelectedGuild] = useState<BotGuild | null>(null);
    const [channels, setChannels] = useState<BotChannel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<BotChannel | null>(null);
    const [messages, setMessages] = useState<BotMessage[]>([]);
    const [members, setMembers] = useState<BotMember[]>([]);
    const [messageText, setMessageText] = useState("");
    const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [bubblePosition, setBubblePosition] = useState({ x: 24, y: 80 });
    const dragOffset = useRef({ x: 0, y: 0 });
    const didDrag = useRef(false);

    useEffect(() => {
        void requestBotApi<BotGuild[]>(token, "/users/@me/guilds")
            .then(setGuilds)
            .catch(e => setError(e.message));
    }, [token]);

    const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
        didDrag.current = false;
        dragOffset.current = {
            x: event.clientX - bubblePosition.x,
            y: event.clientY - bubblePosition.y
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const drag = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        didDrag.current = true;
        setBubblePosition({
            x: Math.max(8, Math.min(window.innerWidth - 64, event.clientX - dragOffset.current.x)),
            y: Math.max(40, Math.min(window.innerHeight - 64, event.clientY - dragOffset.current.y))
        });
    };

    const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const displayName = bot.global_name || bot.username;

    const botFetch = async <T,>(path: string): Promise<T> => {
        return requestBotApi<T>(token, path);
    };

    const openGuild = async (guild: BotGuild) => {
        setSelectedGuild(guild);
        setSelectedChannel(null);
        setMessages([]);
        setMembers([]);
        setError("");
        setLoading(true);
        try {
            const [result, guildMembers] = await Promise.all([
                botFetch<BotChannel[]>(`/guilds/${guild.id}/channels`),
                botFetch<BotMember[]>(`/guilds/${guild.id}/members?limit=1000`).catch(() => [])
            ]);
            setChannels(result.filter(channel => channel.type === 0 || channel.type === 5).sort((a, b) => a.position - b.position));
            setMembers(guildMembers);
        } catch (e: any) {
            setChannels([]);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!selectedChannel || (!messageText.trim() && !pendingImage)) return;
        setError("");
        try {
            const sent = await requestBotApi<BotMessage>(token, `/channels/${selectedChannel.id}/messages`, {
                method: "POST",
                body: { content: messageText.trim(), allowed_mentions: { parse: ["users", "roles", "everyone"] } },
                files: pendingImage ? [pendingImage] : undefined
            });
            setMessages(previous => [...previous, sent]);
            setMessageText("");
            setPendingImage(null);
        } catch (e: any) { setError(e.message); }
    };

    const chooseImage = async () => {
        try {
            const [file] = await DiscordNative.fileManager.openFiles({
                filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
                properties: ["openFile"]
            });
            if (!file) return;
            if (file.data.byteLength > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller");
            let binary = "";
            const bytes = new Uint8Array(file.data);
            for (let i = 0; i < bytes.length; i += 0x8000)
                binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            const name = file.name ?? "image.png";
            const extension = name.split(".").pop()?.toLowerCase();
            const type = extension === "gif" ? "image/gif" : extension === "webp" ? "image/webp" : extension === "png" ? "image/png" : "image/jpeg";
            setPendingImage({ name, type, data: btoa(binary) });
        } catch (e: any) { setError(e.message); }
    };

    const openDm = async (member: BotMember) => {
        try {
            const channel = await requestBotApi<BotChannel>(token, "/users/@me/channels", { method: "POST", body: { recipient_id: member.user.id } });
            setSelectedChannel({ ...channel, name: member.nick || member.user.global_name || member.user.username, position: 0 });
            setMessages([]);
            await openChannel({ ...channel, name: member.nick || member.user.global_name || member.user.username, position: 0 });
        } catch (e: any) { setError(e.message); }
    };

    const openChannel = async (channel: BotChannel) => {
        setSelectedChannel(channel);
        setError("");
        setLoading(true);
        try {
            const result = await botFetch<BotMessage[]>(`/channels/${channel.id}/messages?limit=25`);
            setMessages(result.reverse());
        } catch (e: any) {
            setMessages([]);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000000, background: "var(--background-base-lowest, #111214)", color: "var(--text-default, white)", padding: "48px 36px 36px", overflow: "auto" }}>
            <div style={{ position: "fixed", top: 0, right: 0, zIndex: 1000002, display: "flex", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
                <button aria-label="Minimize Discord" title="Minimize" onClick={() => controlDiscordWindow("minimize")} style={{ width: 46, height: 34, border: 0, background: "transparent", color: "inherit", fontSize: 20, cursor: "pointer" }}>−</button>
                <button aria-label="Maximize Discord" title="Maximize or restore" onClick={() => controlDiscordWindow("maximize")} style={{ width: 46, height: 34, border: 0, background: "transparent", color: "inherit", fontSize: 16, cursor: "pointer" }}>□</button>
                <button aria-label="Close Discord" title="Close" onClick={() => controlDiscordWindow("close")} style={{ width: 46, height: 34, border: 0, background: "transparent", color: "inherit", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <RobotIcon style={{ width: 34, height: 34 }} />
                <div>
                    <Heading tag="h1">BotCord</Heading>
                    <Paragraph>Connected as {displayName}. Your normal Discord account is still running underneath.</Paragraph>
                </div>
            </header>

            {error && <Card style={{ padding: 16, marginBottom: 18, color: "var(--text-danger)" }}>{error}</Card>}

            <Heading tag="h2" className={Margins.bottom16}>{selectedGuild ? selectedGuild.name : `Bot Servers (${guilds.length})`}</Heading>
            {!selectedGuild ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {guilds.map(guild => (
                    <button key={guild.id} onClick={() => void openGuild(guild)} style={{ border: 0, padding: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}>
                    <Card style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                        {guild.icon
                            ? <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`} alt="" style={{ width: 38, height: 38, borderRadius: "50%" }} />
                            : <RobotIcon style={{ width: 38, height: 38 }} />}
                        <div style={{ fontWeight: 600 }}>{guild.name}</div>
                    </Card>
                    </button>
                ))}
            </div> : <div style={{ display: "grid", gridTemplateColumns: "220px minmax(320px, 1fr) 220px", gap: 16 }}>
                <Card style={{ padding: 12 }}>
                    <Button size="small" variant="secondary" onClick={() => { setSelectedGuild(null); setSelectedChannel(null); }}>← All servers</Button>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                        {channels.map(channel => <button key={channel.id} onClick={() => void openChannel(channel)} style={{ border: 0, borderRadius: 4, padding: "8px 10px", background: selectedChannel?.id === channel.id ? "var(--background-modifier-selected)" : "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}># {channel.name}</button>)}
                    </div>
                </Card>
                <Card style={{ padding: 16, minHeight: 420, display: "flex", flexDirection: "column" }}>
                    <Heading tag="h2">{selectedChannel ? `# ${selectedChannel.name}` : "Select a channel"}</Heading>
                    {loading && <Paragraph>Loading…</Paragraph>}
                    <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 230px)" }}>
                        {!loading && selectedChannel && messages.map(message => <div key={message.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--background-modifier-accent)", display: "flex", gap: 10 }}>
                            <img src={avatarUrl(message.author)} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <strong>{message.author.global_name || message.author.username}</strong>
                                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.content}</div>
                                {message.attachments?.map(attachment => attachment.content_type?.startsWith("image/")
                                    ? <img key={attachment.id} src={attachment.url} alt={attachment.filename} style={{ display: "block", maxWidth: "min(480px, 100%)", maxHeight: 360, objectFit: "contain", borderRadius: 8, marginTop: 8 }} />
                                    : <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">{attachment.filename}</a>)}
                                {message.embeds?.map((embed, index) => <div key={index} style={{ marginTop: 8, padding: 10, borderLeft: "4px solid var(--brand-500)", background: "var(--background-secondary)" }}>
                                    {embed.title && <strong>{embed.title}</strong>}
                                    {embed.description && <div>{embed.description}</div>}
                                    {(embed.image?.url || embed.thumbnail?.url) && <img src={embed.image?.url || embed.thumbnail?.url} alt="" style={{ display: "block", maxWidth: "min(480px, 100%)", maxHeight: 360, objectFit: "contain", borderRadius: 8, marginTop: 8 }} />}
                                </div>)}
                            </div>
                        </div>)}
                    </div>
                    {selectedChannel && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        {pendingImage && <div>Attached: {pendingImage.name} <button onClick={() => setPendingImage(null)}>Remove</button></div>}
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button size="small" variant="secondary" onClick={() => void chooseImage()}>Add Image</Button>
                            <div style={{ flex: 1 }}><TextInput placeholder="Message, @mention, or paste an ID…" value={messageText} onChange={setMessageText} /></div>
                            <Button size="small" disabled={!messageText.trim() && !pendingImage} onClick={() => void sendMessage()}>Send</Button>
                        </div>
                    </div>}
                </Card>
                <Card style={{ padding: 12, overflowY: "auto", maxHeight: "calc(100vh - 130px)" }}>
                    <Heading tag="h2">Members ({members.length})</Heading>
                    {members.length === 0 && <Paragraph>Member list unavailable. Enable the Server Members Intent for this bot.</Paragraph>}
                    {members.map(member => <div key={member.user.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0" }}>
                        <img src={avatarUrl(member.user)} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                        <button onClick={() => setMessageText(text => `${text}<@${member.user.id}> `)} style={{ minWidth: 0, flex: 1, border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis" }} title="Add mention">{member.nick || member.user.global_name || member.user.username}</button>
                        <button onClick={() => void openDm(member)} style={{ border: 0, background: "transparent", color: "var(--text-link)", cursor: "pointer" }}>DM</button>
                    </div>)}
                </Card>
            </div>}

            <button
                aria-label="Return to normal Discord"
                title="Return to normal Discord (drag to move)"
                onPointerDown={startDrag}
                onPointerMove={drag}
                onPointerUp={finishDrag}
                onClick={() => { if (!didDrag.current) closeBotCordOverlay(); }}
                style={{
                    position: "fixed",
                    left: bubblePosition.x,
                    top: bubblePosition.y,
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: "2px solid var(--brand-500, #5865f2)",
                    background: "var(--background-surface-high, #2b2d31)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    cursor: "grab",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, .45)",
                    zIndex: 1000001,
                    touchAction: "none"
                }}
            >
                <RobotIcon style={{ width: 28, height: 28 }} />
            </button>
        </div>
    );
}

function openBotCordOverlay(bot: BotIdentity, token: string) {
    closeBotCordOverlay();
    botCordOverlayContainer = document.createElement("div");
    botCordOverlayContainer.id = "cloudcord-botcord-overlay";
    document.body.append(botCordOverlayContainer);
    botCordOverlayRoot = createRoot(botCordOverlayContainer);
    botCordOverlayRoot.render(<BotCordOverlay bot={bot} token={token} />);
}

function BotCordComponent() {
    const [token, setToken] = useState("");
    const [botName, setBotName] = useState("");
    const [savedBots, setSavedBots] = useState<BotAccount[]>([]);
    const [activeBot, setActiveBot] = useState("");
    const [showToken, setShowToken] = useState(false);

    useEffect(() => {
        void Promise.all([
            DataStore.get<BotAccount[]>(DS_BOT_TOKENS),
            DataStore.get<string>(DS_ACTIVE_BOT)
        ]).then(([bots, active]) => {
            setSavedBots(Array.isArray(bots) ? bots : []);
            setActiveBot(active ?? "");
        }).catch(() => {
            setSavedBots([]);
            setActiveBot("");
        });
    }, []);

    const saveBotsList = (list: BotAccount[]) => {
        setSavedBots(list);
        void DataStore.set(DS_BOT_TOKENS, list);
    };

    const handleAddBot = () => {
        const trimmed = normalizeBotToken(token);
        if (!trimmed) {
            Toasts.show({ id: "bot-token-empty", message: "Please enter a valid bot token", type: Toasts.Type.FAILURE });
            return;
        }
        const name = botName.trim() || `Bot ${savedBots.length + 1}`;
        const newBots = [...savedBots.filter(b => b.token !== trimmed), { name, token: trimmed }];
        saveBotsList(newBots);
        setToken("");
        setBotName("");
        Toasts.show({ id: "bot-token-added", message: `Saved ${name} successfully!`, type: Toasts.Type.SUCCESS });
    };

    const handleActivateBot = (botToken: string, name: string) => {
        const isActive = activeBot === normalizeBotToken(botToken);
        Alerts.show({
            title: `${isActive ? "Open" : "Activate"} ${name}?`,
            body: "CloudCord will validate this bot with Discord and use it inside BotCord. Your Discord user account will stay signed in.",
            confirmText: isActive ? "Open BotCord" : "Activate Bot",
            cancelText: "Cancel",
            async onConfirm() {
                try {
                    const cleanToken = normalizeBotToken(botToken);
                    const bot = await requestBotApi<BotIdentity>(cleanToken, "/users/@me");

                    await DataStore.set(DS_ACTIVE_BOT, cleanToken);
                    setActiveBot(cleanToken);
                    openBotCordOverlay(bot, cleanToken);
                    Toasts.show({ id: "bot-activated", message: `${name} is now active in BotCord`, type: Toasts.Type.SUCCESS });
                } catch (e: any) {
                    Toasts.show({ id: "bot-activate-fail", message: "Failed to activate bot: " + e.message, type: Toasts.Type.FAILURE });
                }
            }
        });
    };

    const handleDeleteBot = (botToken: string) => {
        const updated = savedBots.filter(b => b.token !== botToken);
        saveBotsList(updated);
        if (activeBot === normalizeBotToken(botToken)) {
            closeBotCordOverlay();
            void DataStore.del(DS_ACTIVE_BOT);
            setActiveBot("");
        }
        Toasts.show({ id: "bot-deleted", message: "Bot removed from list", type: Toasts.Type.SUCCESS });
    };

    return (
        <SettingsTab>
            <Paragraph className={Margins.bottom16}>
                BotCord manages and tests Discord bots in a separate session without replacing your Discord user account.
            </Paragraph>

            <Card style={{ padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <HeadingTertiary>Add Bot Account</HeadingTertiary>
                <TextInput
                    placeholder="Bot Nickname (e.g. Test Bot)"
                    value={botName}
                    onChange={setBotName}
                />
                <TextInput
                    placeholder="Bot Token (e.g. MTAx...)"
                    value={token}
                    type={showToken ? "text" : "password"}
                    onChange={setToken}
                />
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <Button onClick={handleAddBot}>Save Bot</Button>
                    <Button
                        variant="link"
                        onClick={() => setShowToken(!showToken)}
                    >
                        {showToken ? "Hide Token" : "Show Token"}
                    </Button>
                    <Button
                        variant="link"
                        onClick={() => window.open("https://discord.com/developers/applications", "_blank")}
                    >
                        Developer Portal <OpenExternalIcon style={{ marginLeft: "4px", width: "16px", height: "16px" }} />
                    </Button>
                </div>
            </Card>

            <Divider className={Margins.bottom16} />

            <Heading tag="h2" className={Margins.bottom16}>Saved Bots ({savedBots.length})</Heading>

            {savedBots.length === 0 ? (
                <Paragraph style={{ opacity: 0.7 }}>No bot tokens saved yet. Add one above to get started.</Paragraph>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {savedBots.map((bot, idx) => (
                        <Card key={idx} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <RobotIcon style={{ width: "24px", height: "24px", opacity: 0.8 }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>{bot.name}</div>
                                    <div style={{ fontSize: "12px", opacity: 0.6 }}>Token: ••••••••••••••••••••</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <Button
                                    size="small"
                                    onClick={() => handleActivateBot(bot.token, bot.name)}
                                >
                                    {activeBot === normalizeBotToken(bot.token) ? "Open" : "Activate"}
                                </Button>
                                <Button
                                    size="small"
                                    variant="dangerSecondary"
                                    onClick={() => handleDeleteBot(bot.token)}
                                >
                                    <DeleteIcon style={{ width: "16px", height: "16px" }} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </SettingsTab>
    );
}

export default wrapTab(BotCordComponent, "BotCord");
