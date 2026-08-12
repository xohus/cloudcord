import { findAssetId } from "@lib/api/assets";
import {
    addBotAccount,
    getBotChannelMessages,
    getBotGuildChannels,
    getBotGuildMembers,
    getBotGuilds,
    removeBotAccount,
    sendBotMessage,
    setActiveBotAccount,
    useBotCordState
} from "@lib/api/botcord";
import { hideSheet, showSheet } from "@lib/ui/sheets";
import { createStyles } from "@lib/ui/styles";
import { NavigationNative, tokens } from "@metro/common";
import { ActionSheet, ActionSheetRow, Avatar, Button, IconButton, PressableScale, Stack, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, ScrollView, View } from "react-native";

const useStyles = createStyles({
    root: { flex: 1, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    header: { minHeight: 56, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    guildRail: { backgroundColor: tokens.colors.BACKGROUND_SECONDARY, paddingVertical: 8 },
    channelList: { flex: 1, backgroundColor: tokens.colors.BACKGROUND_SECONDARY },
    messageList: { flex: 1, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    row: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 7 },
    messageBody: { flex: 1 },
    nameLine: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    composer: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    category: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4 },
    channelRow: { paddingHorizontal: 12, paddingVertical: 9 },
    guildButton: { width: 52, alignItems: "center", justifyContent: "center" },
    guildImage: { width: 44, height: 44, borderRadius: 22 },
    sheet: { paddingHorizontal: 12, paddingBottom: 20, gap: 8 }
});

const avatarUrl = (user: any, size = 128) => user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}` : null;
const guildIconUrl = (guild: any, size = 128) => guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null;

function ApiAvatar({ user, size = 40 }: { user: any; size?: number }) {
    const uri = avatarUrl(user, 128);
    if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    return <Avatar size="small" user={user} />;
}

function MessageRow({ message }: { message: any }) {
    const styles = useStyles();
    const author = message.author || {};
    const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    return <View style={styles.row}>
        <ApiAvatar user={author} size={40} />
        <View style={styles.messageBody}>
            <View style={styles.nameLine}>
                <Text variant="text-md/semibold">{author.global_name || author.username || "Unknown"}</Text>
                {author.bot && <Text variant="text-xs/semibold" color="text-brand">APP</Text>}
                <Text variant="text-xs/normal" color="text-muted">{time}</Text>
            </View>
            {!!message.content && <Text selectable variant="text-md/normal">{message.content}</Text>}
            {!!message.attachments?.length && <Text variant="text-sm/normal" color="text-muted">📎 {message.attachments.map((a: any) => a.filename).join(", ")}</Text>}
            {!!message.embeds?.length && <Text variant="text-sm/normal" color="text-muted">{message.embeds.length} embed{message.embeds.length === 1 ? "" : "s"}</Text>}
            {!!message.reactions?.length && <Text variant="text-sm/normal" color="text-muted">{message.reactions.slice(0, 8).map((r: any) => `${r.emoji?.name || "?"} ${r.count}`).join("   ")}</Text>}
        </View>
    </View>;
}

function AccountSheet({ accounts, active, onMain }: any) {
    return <ActionSheet>
        <View style={{ paddingHorizontal: 12, paddingBottom: 20 }}>
            <Text variant="heading-lg/extrabold">Switch account</Text>
            <Stack spacing={4} style={{ marginTop: 10 }}>
                {accounts.map((account: any) => <ActionSheetRow
                    key={account.id}
                    label={account.username}
                    icon={<ApiAvatar user={account} size={32} />}
                    onPress={async () => { await setActiveBotAccount(account.id); hideSheet("BOTCORD_ACCOUNT"); }}
                />)}
                <ActionSheetRow label="Back to Discord" onPress={() => { hideSheet("BOTCORD_ACCOUNT"); onMain(); }} />
                <ActionSheetRow label="Log out bot" variant="destructive" onPress={async () => { await removeBotAccount(active.id); hideSheet("BOTCORD_ACCOUNT"); onMain(); }} />
            </Stack>
        </View>
    </ActionSheet>;
}

function MembersSheet({ members }: { members: any[] }) {
    return <ActionSheet scrollable>
        <View style={{ paddingHorizontal: 12, paddingBottom: 20 }}>
            <Text variant="heading-lg/extrabold">Members</Text>
            <Stack spacing={2} style={{ marginTop: 8 }}>
                {members.map((member: any, i: number) => <ActionSheetRow key={member.user?.id || String(i)} label={member.nick || member.user?.global_name || member.user?.username || "Unknown"} icon={<ApiAvatar user={member.user} size={32} />} />)}
            </Stack>
        </View>
    </ActionSheet>;
}

function BotClient({ accounts, activeId, onExit }: { accounts: any[]; activeId: string | null; onExit: () => void }) {
    const styles = useStyles();
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
    const listRef = useRef<any>(null);

    useEffect(() => {
        if (!active) return;
        setLoading(true); setError(null); setGuild(null); setChannel(null); setMessages([]); setChannels([]); setMembers([]);
        getBotGuilds(active.token).then(result => {
            setGuilds(result);
            if (result[0]) openGuild(result[0], active.token);
        }).catch(e => setError(String(e))).finally(() => setLoading(false));
    }, [active?.id]);

    const openGuild = async (nextGuild: any, tokenOverride?: string) => {
        const token = tokenOverride || active?.token;
        if (!token) return;
        setGuild(nextGuild); setChannel(null); setMessages([]); setMembers([]); setLoading(true); setError(null);
        try {
            const [nextChannels, nextMembers] = await Promise.all([
                getBotGuildChannels(token, nextGuild.id),
                getBotGuildMembers(token, nextGuild.id).catch(() => [])
            ]);
            setChannels(nextChannels.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
            setMembers(nextMembers);
        } catch (e) { setError(String(e)); } finally { setLoading(false); }
    };

    const openChannel = async (nextChannel: any) => {
        if (!active) return;
        setLoading(true); setError(null);
        try {
            const result = await getBotChannelMessages(active.token, nextChannel.id);
            setChannel(nextChannel); setMessages(result.reverse());
        } catch (e) { setError(String(e)); } finally { setLoading(false); }
    };

    const send = async () => {
        if (!active || !channel || !composer.trim()) return;
        const content = composer.trim(); setComposer("");
        try {
            const sent = await sendBotMessage(active.token, channel.id, content);
            setMessages(old => [...old, sent]);
        } catch (e) { setComposer(content); setError(String(e)); }
    };

    if (!active) return null;
    const categories = channels.filter(c => c.type === 4);
    const uncategorized = channels.filter(c => [0,5,10,11,12].includes(c.type) && !c.parent_id);
    const channelsFor = (id: string) => channels.filter(c => [0,5,10,11,12].includes(c.type) && c.parent_id === id);
    const openAccounts = () => showSheet("BOTCORD_ACCOUNT", AccountSheet, { accounts, active, onMain: () => { onExit(); navigation.goBack?.(); } });
    const openMembers = () => showSheet("BOTCORD_MEMBERS", MembersSheet, { members });

    return <View style={styles.root}>
        <View style={styles.header}>
            {channel ? <IconButton size="sm" variant="secondary" icon={findAssetId("ArrowLeftIcon") || findAssetId("ChevronLeftIcon")} onPress={() => setChannel(null)} /> : null}
            <View style={{ flex: 1 }}>
                <Text variant="heading-md/semibold" numberOfLines={1}>{channel ? `# ${channel.name}` : guild?.name || "BotCord"}</Text>
                <Text variant="text-xs/normal" color="text-muted" numberOfLines={1}>{active.username}</Text>
            </View>
            {guild ? <IconButton size="sm" variant="secondary" icon={findAssetId("MembersIcon") || findAssetId("PeopleIcon")} onPress={openMembers} /> : null}
            <PressableScale onPress={openAccounts}><ApiAvatar user={active} size={32} /></PressableScale>
        </View>

        <View style={styles.guildRail}>
            <FlatList horizontal data={guilds} keyExtractor={(g: any) => g.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 4 }} renderItem={({ item }: any) => {
                const uri = guildIconUrl(item);
                return <PressableScale onPress={() => openGuild(item)} style={styles.guildButton}>
                    {uri ? <Image source={{ uri }} style={styles.guildImage} /> : <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Text variant="text-sm/semibold">{item.name?.slice(0, 2).toUpperCase()}</Text></View>}
                </PressableScale>;
            }} />
        </View>

        {error ? <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Text variant="text-sm/medium" color="text-feedback-critical">{error}</Text></View> : null}
        {loading ? <Text variant="text-sm/normal" color="text-muted" style={{ padding: 10, textAlign: "center" }}>Loading…</Text> : null}

        {!channel ? <ScrollView style={styles.channelList} contentContainerStyle={{ paddingBottom: 24 }}>
            {guild ? <>
                {uncategorized.map(c => <PressableScale key={c.id} onPress={() => openChannel(c)} style={styles.channelRow}><Text variant="text-md/medium" color="text-muted">#  {c.name}</Text></PressableScale>)}
                {categories.map(cat => <View key={cat.id}>
                    <Text variant="text-xs/bold" color="text-muted" style={styles.category}>{String(cat.name || "CATEGORY").toUpperCase()}</Text>
                    {channelsFor(cat.id).map(c => <PressableScale key={c.id} onPress={() => openChannel(c)} style={styles.channelRow}><Text variant="text-md/medium" color="text-muted">#  {c.name}</Text></PressableScale>)}
                </View>)}
            </> : <Text variant="text-md/normal" color="text-muted" style={{ padding: 20 }}>Choose a server.</Text>}
        </ScrollView> : <View style={styles.messageList}>
            <FlatList ref={listRef} data={messages} keyExtractor={(m: any, i) => m.id || String(i)} renderItem={({ item }: any) => <MessageRow message={item} />} contentContainerStyle={{ paddingVertical: 6 }} />
            <View style={styles.composer}>
                <TextInput size="lg" value={composer} placeholder={`Message #${channel.name}`} onChange={setComposer} trailingIcon={() => <IconButton size="sm" variant="primary" disabled={!composer.trim()} icon={findAssetId("SendMessageIcon") || findAssetId("ArrowSmallUpIcon")} onPress={send} />} />
            </View>
        </View>}
    </View>;
}

export default function BotCord() {
    const state = useBotCordState();
    const [token, setToken] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [opened, setOpened] = useState(false);
    const accounts = state.accounts;
    const active = useMemo(() => accounts.find(a => a.id === state.activeAccountId) ?? accounts[0] ?? null, [accounts, state.activeAccountId]);

    if (opened && active) return <BotClient accounts={accounts} activeId={active.id} onExit={() => setOpened(false)} />;

    return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={16}>
            <View><Text variant="heading-xl/bold">BotCord</Text><Text variant="text-sm/normal" color="text-muted">Bot accounts use Discord's native mobile UI and stay only on this device.</Text></View>
            <TableRowGroup title="Bot Accounts">
                {accounts.map(account => <TableRow key={account.id} label={account.username} subLabel={state.activeAccountId === account.id ? "Active bot" : `Bot ID: ${account.id}`} icon={<TableRow.Icon source={findAssetId("RobotIcon") || findAssetId("AppsIcon")} />} onPress={async () => { await setActiveBotAccount(account.id); setOpened(true); }} trailing={<Button size="sm" variant="secondary" text="Remove" onPress={() => removeBotAccount(account.id)} />} />)}
                {!state.loaded ? <TableRow label="Loading bot accounts…" /> : null}
                {state.loaded && accounts.length === 0 ? <TableRow label="No bot accounts added yet" /> : null}
            </TableRowGroup>
            <TableRowGroup title="Add Bot Account"><TableRow label={<View style={{ width: "100%", gap: 10 }}>
                <TextInput size="lg" value={token} placeholder="Bot token" onChange={setToken} secureTextEntry state={error ? "error" : undefined} errorMessage={error || undefined} />
                <Button size="md" variant="primary" text="Add Bot Account" loading={adding} disabled={adding || !token.trim()} onPress={async () => { setAdding(true); setError(null); try { await addBotAccount(token); setToken(""); } catch (e) { setError(String(e)); } finally { setAdding(false); } }} />
            </View>} /></TableRowGroup>
            {active ? <Button size="lg" variant="primary" text={`Open as ${active.username}`} onPress={() => setOpened(true)} /> : null}
        </Stack>
    </ScrollView>;
}
