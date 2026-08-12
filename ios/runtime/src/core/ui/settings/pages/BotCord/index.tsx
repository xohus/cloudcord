import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import {
    addBotAccount,
    botCordState,
    getBotChannelMessages,
    getBotGuildChannels,
    getBotGuildMembers,
    getBotGuilds,
    removeBotAccount,
    sendBotMessage,
    setActiveBotAccount
} from "@lib/api/botcord";
import { NavigationNative } from "@metro/common";
import { Button, Stack, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, Modal, Pressable, ScrollView, TextInput as RNTextInput, View } from "react-native";

const BG = "#313338";
const SIDEBAR = "#2b2d31";
const RAIL = "#1e1f22";
const PANEL = "#232428";
const INPUT = "#383a40";
const MUTED = "#b5bac1";
const BRAND = "#5865f2";

const avatarUrl = (user: any, size = 128) => user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`
    : null;

const guildIconUrl = (guild: any, size = 128) => guild?.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}`
    : null;

function Avatar({ user, size = 38 }: { user: any; size?: number; }) {
    const uri = avatarUrl(user, 128);
    return uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PANEL }} />
        : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "white", fontWeight: "800", fontSize: Math.max(12, size * .34) }}>{(user?.username || "B").slice(0, 2).toUpperCase()}</Text>
        </View>;
}

function GuildIcon({ guild, selected, onPress }: { guild: any; selected: boolean; onPress: () => void; }) {
    const uri = guildIconUrl(guild);
    return <Pressable onPress={onPress} style={{ width: 54, alignItems: "center", justifyContent: "center" }}>
        <View style={{
            width: selected ? 48 : 44,
            height: selected ? 48 : 44,
            borderRadius: selected ? 16 : 22,
            overflow: "hidden",
            backgroundColor: selected ? BRAND : "#313338",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: selected ? 2 : 0,
            borderColor: "white"
        }}>
            {uri ? <Image source={{ uri }} style={{ width: "100%", height: "100%" }} /> : <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>{guild.name?.slice(0, 2).toUpperCase()}</Text>}
        </View>
    </Pressable>;
}

function MessageRow({ message }: { message: any; }) {
    const author = message.author || {};
    const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const attachmentText = message.attachments?.length ? `\n📎 ${message.attachments.map((a: any) => a.filename).join(", ")}` : "";
    const embedText = message.embeds?.length ? `\n▣ ${message.embeds.length} embed${message.embeds.length > 1 ? "s" : ""}` : "";
    return <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Avatar user={author} size={38} />
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>{author.global_name || author.username || "Unknown"}</Text>
                {author.bot && <View style={{ backgroundColor: BRAND, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}><Text style={{ color: "white", fontSize: 9, fontWeight: "800" }}>BOT</Text></View>}
                <Text style={{ color: "#949ba4", fontSize: 10 }}>{time}</Text>
            </View>
            {!!(message.content || attachmentText || embedText) && <Text selectable style={{ color: "#dbdee1", fontSize: 15, lineHeight: 20, marginTop: 2 }}>{message.content || ""}{attachmentText}{embedText}</Text>}
            {!!message.reactions?.length && <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {message.reactions.slice(0, 8).map((r: any, i: number) => <View key={i} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: "#2b2d31", borderWidth: 1, borderColor: "#3f4147" }}><Text style={{ color: "#dbdee1", fontSize: 12 }}>{r.emoji?.name || "?"} {r.count}</Text></View>)}
            </View>}
        </View>
    </View>;
}

function AccountMenu({ visible, onClose, accounts, active, onSwitch, onLogout, onMain }: any) {
    return <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.48)", justifyContent: "flex-end" }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: PANEL, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 28, gap: 10 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#5c5f66", alignSelf: "center", marginBottom: 4 }} />
                <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>Bot account</Text>
                {accounts.map((account: any) => <Pressable key={account.id} onPress={() => { onSwitch(account.id); onClose(); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: account.id === active?.id ? "rgba(88,101,242,.22)" : "#2b2d31" }}>
                    <Avatar user={account} size={36} />
                    <View style={{ flex: 1 }}><Text style={{ color: "white", fontWeight: "700" }}>{account.username}</Text><Text style={{ color: MUTED, fontSize: 11 }}>{account.id === active?.id ? "Currently active" : "Switch to this bot"}</Text></View>
                    {account.id === active?.id && <Text style={{ color: "#57f287", fontSize: 18 }}>●</Text>}
                </Pressable>)}
                <Pressable onPress={onMain} style={{ padding: 13, borderRadius: 12, backgroundColor: BRAND, alignItems: "center" }}><Text style={{ color: "white", fontWeight: "800" }}>Back to Discord · Main Account</Text></Pressable>
                <Pressable onPress={onLogout} style={{ padding: 13, borderRadius: 12, backgroundColor: "rgba(242,63,66,.16)", alignItems: "center" }}><Text style={{ color: "#ff7b7d", fontWeight: "800" }}>Log out this bot</Text></Pressable>
            </Pressable>
        </Pressable>
    </Modal>;
}

function MembersSheet({ visible, onClose, members }: { visible: boolean; onClose: () => void; members: any[]; }) {
    return <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "flex-end" }}>
            <Pressable onPress={() => {}} style={{ maxHeight: "72%", backgroundColor: PANEL, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, paddingBottom: 24 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#5c5f66", alignSelf: "center", marginBottom: 12 }} />
                <Text style={{ color: "white", fontWeight: "800", fontSize: 18, paddingHorizontal: 16, marginBottom: 8 }}>Members · {members.length}</Text>
                <FlatList data={members} keyExtractor={(m: any, i) => m.user?.id || String(i)} renderItem={({ item }: any) => <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 }}><Avatar user={item.user} size={34} /><View style={{ flex: 1 }}><Text style={{ color: "#dbdee1", fontWeight: "600" }}>{item.nick || item.user?.global_name || item.user?.username || "Unknown"}</Text>{item.user?.bot && <Text style={{ color: MUTED, fontSize: 10 }}>BOT</Text>}</View></View>} />
            </Pressable>
        </Pressable>
    </Modal>;
}

function BotClient({ accounts, activeId, onExit }: { accounts: any[]; activeId: string | null | undefined; onExit: () => void; }) {
    const navigation = NavigationNative.useNavigation();
    const active = accounts.find(a => a.id === activeId) ?? accounts[0] ?? null;
    const [guilds, setGuilds] = useState<any[]>([]);
    const [channels, setChannels] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [guild, setGuild] = useState<any | null>(null);
    const [channel, setChannel] = useState<any | null>(null);
    const [composer, setComposer] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accountMenu, setAccountMenu] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const listRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!active) return;
        setLoading(true); setError(null); setGuild(null); setChannel(null); setMessages([]); setChannels([]); setMembers([]);
        getBotGuilds(active.token).then(g => { setGuilds(g); if (g[0]) openGuild(g[0], active.token); }).catch(e => setError(String(e))).finally(() => setLoading(false));
    }, [active?.id]);

    const openGuild = async (g: any, tokenOverride?: string) => {
        if (!active && !tokenOverride) return;
        const token = tokenOverride || active.token;
        setLoading(true); setError(null); setGuild(g); setChannel(null); setMessages([]); setMembers([]);
        try {
            const [channelResult, memberResult] = await Promise.all([
                getBotGuildChannels(token, g.id),
                getBotGuildMembers(token, g.id).catch(() => [])
            ]);
            setChannels(channelResult.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
            setMembers(memberResult);
        } catch (e) { setError(String(e)); }
        finally { setLoading(false); }
    };

    const openChannel = async (c: any) => {
        if (!active) return;
        setLoading(true); setError(null);
        try {
            const result = await getBotChannelMessages(active.token, c.id);
            setChannel(c); setMessages(result.reverse());
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 40);
        } catch (e) { setError(String(e)); }
        finally { setLoading(false); }
    };

    const send = async () => {
        if (!active || !channel) return;
        const content = composer.trim(); if (!content) return;
        setComposer("");
        try {
            const sent = await sendBotMessage(active.token, channel.id, content);
            setMessages(old => [...old, sent]);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
        } catch (e) { setComposer(content); setError(String(e)); }
    };

    if (!active) return null;
    const categories = channels.filter(c => c.type === 4);
    const uncategorized = channels.filter(c => [0, 5, 10, 11, 12].includes(c.type) && !c.parent_id);
    const channelsFor = (catId: string) => channels.filter(c => [0, 5, 10, 11, 12].includes(c.type) && c.parent_id === catId);

    return <View style={{ flex: 1, backgroundColor: BG }}>
        <AccountMenu
            visible={accountMenu}
            onClose={() => setAccountMenu(false)}
            accounts={accounts}
            active={active}
            onSwitch={async (id: string) => setActiveBotAccount(id)}
            onMain={() => { setAccountMenu(false); onExit(); navigation.goBack?.(); }}
            onLogout={async () => { await removeBotAccount(active.id); setAccountMenu(false); onExit(); }}
        />
        <MembersSheet visible={membersOpen} onClose={() => setMembersOpen(false)} members={members} />

        <View style={{ height: 58, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: PANEL, borderBottomWidth: 1, borderBottomColor: "#1e1f22" }}>
            {channel && <Pressable onPress={() => setChannel(null)} style={{ padding: 6 }}><Text style={{ color: "white", fontSize: 22 }}>‹</Text></Pressable>}
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: "white", fontWeight: "800", fontSize: 16 }}>{channel ? `# ${channel.name}` : guild?.name || "BotCord"}</Text>
                <Text numberOfLines={1} style={{ color: MUTED, fontSize: 10 }}>{active.username} · bot session</Text>
            </View>
            {!!guild && <Pressable onPress={() => setMembersOpen(true)} style={{ padding: 8 }}><Text style={{ color: MUTED, fontSize: 18 }}>♟</Text></Pressable>}
            <Pressable onPress={() => setAccountMenu(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 4, paddingLeft: 8, borderRadius: 18, backgroundColor: "#2b2d31" }}>
                <Text style={{ color: MUTED, fontSize: 10, fontWeight: "700" }}>BOT</Text><Avatar user={active} size={30} />
            </Pressable>
        </View>

        <View style={{ height: 64, backgroundColor: RAIL, borderBottomWidth: 1, borderBottomColor: "#111214" }}>
            <FlatList horizontal data={guilds} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, alignItems: "center", gap: 2 }} keyExtractor={(g: any) => g.id} renderItem={({ item }: any) => <GuildIcon guild={item} selected={guild?.id === item.id} onPress={() => openGuild(item)} />} />
        </View>

        {error && <View style={{ padding: 9, backgroundColor: "rgba(242,63,66,.15)" }}><Text style={{ color: "#ff8e90", fontSize: 12 }}>{error}</Text></View>}
        {loading && <View style={{ paddingVertical: 6, backgroundColor: PANEL }}><Text style={{ color: MUTED, textAlign: "center", fontSize: 11 }}>Loading…</Text></View>}

        {!channel ? <ScrollView style={{ flex: 1, backgroundColor: SIDEBAR }} contentContainerStyle={{ paddingBottom: 30 }}>
            {!guild && <View style={{ padding: 24, alignItems: "center", gap: 8 }}><Text style={{ color: "white", fontSize: 20, fontWeight: "800" }}>Choose a server</Text><Text style={{ color: MUTED, textAlign: "center" }}>Your bot's servers appear in the rail above.</Text></View>}
            {!!guild && <>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#1e1f22" }}><Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>{guild.name}</Text><Text style={{ color: MUTED, fontSize: 11 }}>Select a channel</Text></View>
                {uncategorized.map(c => <Pressable key={c.id} onPress={() => openChannel(c)} style={{ paddingHorizontal: 15, paddingVertical: 11, flexDirection: "row", gap: 9, alignItems: "center" }}><Text style={{ color: "#949ba4", fontSize: 19 }}>#</Text><Text style={{ color: "#dbdee1", fontWeight: "600" }}>{c.name}</Text></Pressable>)}
                {categories.map(cat => <View key={cat.id}>
                    <Text style={{ color: "#949ba4", fontSize: 11, fontWeight: "800", paddingHorizontal: 15, paddingTop: 16, paddingBottom: 5 }}>{String(cat.name || "CATEGORY").toUpperCase()}</Text>
                    {channelsFor(cat.id).map(c => <Pressable key={c.id} onPress={() => openChannel(c)} style={{ paddingHorizontal: 15, paddingVertical: 10, flexDirection: "row", gap: 9, alignItems: "center" }}><Text style={{ color: "#949ba4", fontSize: 19 }}>#</Text><Text style={{ color: "#dbdee1", fontWeight: "600" }}>{c.name}</Text></Pressable>)}
                </View>)}
                {channels.filter(c => [0,5,10,11,12].includes(c.type)).length === 0 && <Text style={{ color: MUTED, padding: 18 }}>No readable message channels.</Text>}
            </>}
        </ScrollView> : <View style={{ flex: 1, backgroundColor: BG }}>
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m: any, i) => m.id || String(i)}
                renderItem={({ item }: any) => <MessageRow message={item} />}
                contentContainerStyle={{ paddingVertical: 8, flexGrow: 1, justifyContent: messages.length ? "flex-start" : "center" }}
                ListEmptyComponent={<View style={{ padding: 24, alignItems: "center" }}><Text style={{ color: "white", fontWeight: "800", fontSize: 20 }}># {channel.name}</Text><Text style={{ color: MUTED, marginTop: 5 }}>No messages yet, or this bot cannot read history.</Text></View>}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            />
            <View style={{ paddingHorizontal: 10, paddingTop: 7, paddingBottom: 12, backgroundColor: BG }}>
                <View style={{ minHeight: 46, borderRadius: 23, backgroundColor: INPUT, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 6 }}>
                    <RNTextInput
                        value={composer}
                        onChangeText={setComposer}
                        placeholder={`Message #${channel.name}`}
                        placeholderTextColor="#949ba4"
                        style={{ flex: 1, color: "white", fontSize: 15, paddingVertical: 10 }}
                        multiline
                        maxLength={2000}
                    />
                    <Pressable disabled={!composer.trim()} onPress={send} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: composer.trim() ? BRAND : "#4e5058", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>↑</Text></Pressable>
                </View>
            </View>
        </View>}
    </View>;
}

export default function BotCord() {
    const state = useProxy(botCordState);
    const [token, setToken] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [opened, setOpened] = useState(false);
    const accounts = state.accounts ?? [];
    const active = useMemo(() => accounts.find(a => a.id === state.activeAccountId) ?? accounts[0] ?? null, [accounts, state.activeAccountId]);

    if (opened && active) return <BotClient accounts={accounts} activeId={active.id} onExit={() => setOpened(false)} />;

    return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={16}>
            <View><Text variant="heading-xl/bold">BotCord</Text><Text variant="text-sm/normal" color="text-muted">Mobile bot client. Open a bot to browse servers, channels, members and messages in a Discord-style interface.</Text></View>
            <TableRowGroup title="Bot Accounts">
                {accounts.map(account => <TableRow key={account.id} label={account.username} subLabel={state.activeAccountId === account.id ? "Active bot" : `Bot ID: ${account.id}`} icon={<TableRow.Icon source={findAssetId("RobotIcon") || findAssetId("AppsIcon")} />} onPress={async () => { await setActiveBotAccount(account.id); setOpened(true); }} trailing={<Button size="sm" variant="secondary" text="Remove" onPress={() => removeBotAccount(account.id)} />} />)}
                {accounts.length === 0 && <TableRow label="No bot accounts added yet" />}
            </TableRowGroup>
            <TableRowGroup title="Add Bot Account"><TableRow label={<View style={{ width: "100%", gap: 10 }}>
                <TextInput size="lg" value={token} placeholder="Bot token" onChange={setToken} secureTextEntry state={error ? "error" : undefined} errorMessage={error || undefined} />
                <Button size="md" variant="primary" text="Add Bot Account" loading={adding} disabled={adding || !token.trim()} onPress={async () => { setAdding(true); setError(null); try { await addBotAccount(token); setToken(""); } catch (e) { setError(String(e)); } finally { setAdding(false); } }} />
            </View>} /></TableRowGroup>
            {active && <Button size="lg" variant="primary" text={`Open mobile client as ${active.username}`} onPress={() => setOpened(true)} />}
            <Text variant="text-xs/normal" color="text-muted">BotCord uses Discord's official bot API. What it can see or do depends on that bot's server permissions and enabled intents.</Text>
        </Stack>
    </ScrollView>;
}
