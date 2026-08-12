import { findAssetId } from "@lib/api/assets";
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
} from "@lib/api/botcord";
import { hideSheet, showSheet } from "@lib/ui/sheets";
import { isSemanticColor, resolveSemanticColor } from "@lib/ui/color";
import { createStyles } from "@lib/ui/styles";
import { findByProps } from "@metro";
import { NavigationNative, tokens } from "@metro/common";
import { ActionSheet, ActionSheetRow, Button, IconButton, PressableScale, Stack, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text as NativeText, TextInput as NativeTextInput, View } from "react-native";

const useStyles = createStyles({
    root: { flex: 1, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    header: { minHeight: 56, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    navigator: { flex: 1, flexDirection: "row", backgroundColor: tokens.colors.BACKGROUND_SECONDARY },
    guildRail: { width: 72, backgroundColor: tokens.colors.BACKGROUND_TERTIARY, paddingVertical: 8 },
    sidebar: { flex: 1, backgroundColor: tokens.colors.BACKGROUND_SECONDARY },
    sidebarHeader: { minHeight: 54, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
    row: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingVertical: 7 },
    messageBody: { flex: 1 },
    nameLine: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    composer: { height: 60, width: "100%", paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0, backgroundColor: tokens.colors.BACKGROUND_PRIMARY },
    category: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4 },
    channelRow: { paddingHorizontal: 12, paddingVertical: 10 },
    guildButton: { width: 72, height: 56, alignItems: "center", justifyContent: "center" },
    guildImage: { width: 48, height: 48, borderRadius: 24 },
    dmRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
    search: { paddingHorizontal: 10, paddingBottom: 8 },
    listEmpty: { padding: 20 }
});

const avatarUrl = (user: any, size = 128) => user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}` : null;
const guildIconUrl = (guild: any, size = 128) => guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${size}` : null;
const displayName = (user: any) => user?.global_name || user?.username || "Unknown";
const inputText = (value: any) => typeof value === "string" ? value : value?.nativeEvent?.text ?? "";
function nativeColor(value: any, fallback: string) {
    try {
        if (typeof value === "string") return value;
        if (isSemanticColor(value)) {
            const resolved = resolveSemanticColor(value);
            if (typeof resolved === "string" && resolved) return resolved;
        }
    } catch {}
    return fallback;
}

const getNativeColors = () => ({
    text: nativeColor(tokens.colors.TEXT_NORMAL, "#f2f3f5"),
    muted: nativeColor(tokens.colors.TEXT_MUTED, "#b5bac1"),
    input: nativeColor(tokens.colors.BACKGROUND_MODIFIER_ACCENT, "#2b2d31"),
    selected: nativeColor(tokens.colors.BACKGROUND_MODIFIER_SELECTED, "#35373c"),
    brand: nativeColor(tokens.colors.BRAND_500, "#5865f2"),
    inverse: nativeColor(tokens.colors.WHITE_500, "#ffffff")
});

function ApiAvatar({ user, size = 40 }: { user: any; size?: number }) {
    const uri = avatarUrl(user, 128);
    const colors = getNativeColors();
    if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    const label = displayName(user).trim().slice(0, 2).toUpperCase() || "?";
    return <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.input
    }}><Text variant="text-sm/semibold">{label}</Text></View>;
}

function MessageRow({ message }: { message: any }) {
    const styles = useStyles();
    const author = message.author || {};
    const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const reactionCount = message.reactions?.reduce((sum: number, reaction: any) => sum + (reaction.count || 0), 0) || 0;
    return <View style={styles.row}>
        <ApiAvatar user={author} size={40} />
        <View style={styles.messageBody}>
            <View style={styles.nameLine}>
                <Text variant="text-md/semibold">{displayName(author)}</Text>
                {author.bot ? <Text variant="text-xs/semibold" color="text-brand">APP</Text> : null}
                <Text variant="text-xs/normal" color="text-muted">{time}</Text>
            </View>
            {!!message.content && <Text selectable variant="text-md/normal">{message.content}</Text>}
            {!!message.attachments?.length && <View style={{ marginTop: 6, gap: 6 }}>
                {message.attachments.map((attachment: any, index: number) => {
                    const uri = attachment.url || attachment.proxy_url;
                    const type = String(attachment.content_type || "");
                    const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp)(?:$|\?)/i.test(String(uri || attachment.filename || ""));
                    return isImage && uri
                        ? <Image key={attachment.id || `${attachment.filename}-${index}`} source={{ uri }} resizeMode="cover" style={{ width: 260, height: 180, maxWidth: "100%", borderRadius: 8, backgroundColor: tokens.colors.BACKGROUND_SECONDARY }} />
                        : <Text key={attachment.id || `${attachment.filename}-${index}`} variant="text-sm/normal" color="text-link">{attachment.filename || "Attachment"}</Text>;
                })}
            </View>}
            {!!message.embeds?.length && <Text variant="text-sm/normal" color="text-muted">{message.embeds.length} embed{message.embeds.length === 1 ? "" : "s"}</Text>}
            {reactionCount > 0 && <Text variant="text-sm/normal" color="text-muted">Reactions: {reactionCount}</Text>}
        </View>
    </View>;
}

function AccountSheet({ accounts, active, onMain }: any) {
    return <ActionSheet>
        <View style={{ paddingHorizontal: 12, paddingBottom: 20 }}>
            <Text variant="heading-lg/extrabold">Switch account</Text>
            <Stack spacing={4} style={{ marginTop: 10 }}>
                {accounts.map((account: any) => <ActionSheetRow key={account.id} label={account.username} icon={<ApiAvatar user={account} size={32} />} onPress={async () => { await setActiveBotAccount(account.id); hideSheet("BOTCORD_ACCOUNT"); }} />)}
                <ActionSheetRow label="Back to Discord" onPress={() => { hideSheet("BOTCORD_ACCOUNT"); onMain(); }} />
                <ActionSheetRow label="Log out bot" variant="destructive" onPress={async () => { await removeBotAccount(active.id); hideSheet("BOTCORD_ACCOUNT"); onMain(); }} />
            </Stack>
        </View>
    </ActionSheet>;
}

function BotClient({ accounts, activeId, onExit }: { accounts: any[]; activeId: string | null; onExit: () => void }) {
    const styles = useStyles();
    const nativeColors = getNativeColors();
    const navigation = NavigationNative.useNavigation();
    const state = useBotCordState();
    const active = accounts.find(a => a.id === activeId) ?? accounts[0] ?? null;
    const [guilds, setGuilds] = useState<any[]>([]);
    const [channels, setChannels] = useState<any[]>([]);
    const [guild, setGuild] = useState<any | null>(null);
    const [channel, setChannel] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [composer, setComposer] = useState("");
    const [selectedImage, setSelectedImage] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [screen, setScreen] = useState<"messages" | "guild" | "members">("messages");
    const [members, setMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [memberStatus, setMemberStatus] = useState("");
    const listRef = useRef<any>(null);

    useEffect(() => {
        if (!active) return;
        setLoading(true);
        setError(null);
        setGuild(null);
        setChannel(null);
        setChannels([]);
        setMessages([]);
        setSelectedImage(null);
        setMembers([]);
        setMemberStatus("");
        setScreen("messages");
        getBotGuilds(active.token).then(setGuilds).catch(e => setError(String(e))).finally(() => setLoading(false));
    }, [active?.id]);

    useEffect(() => {
        if (!active || !channel?.id) return;
        let disposed = false;
        const refresh = async () => {
            try {
                const remote = await getBotChannelMessages(active.token, channel.id);
                if (disposed) return;
                const chronological = remote.slice().reverse();
                setMessages(current => {
                    const optimistic = current.filter(message => String(message?.id || "").startsWith("local-"));
                    return [...chronological, ...optimistic];
                });
            } catch {}
        };
        const timer = setInterval(refresh, 1500);
        return () => { disposed = true; clearInterval(timer); };
    }, [active?.id, channel?.id]);

    const openGuild = async (nextGuild: any) => {
        if (!active) return;
        setGuild(nextGuild);
        setChannel(null);
        setMessages([]);
        setScreen("guild");
        setLoading(true);
        setError(null);
        try {
            const nextChannels = await getBotGuildChannels(active.token, nextGuild.id);
            setChannels(nextChannels.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
        } catch (e) { setError(String(e)); } finally { setLoading(false); }
    };

    const openMessages = () => {
        setGuild(null);
        setChannel(null);
        setMessages([]);
        setScreen("messages");
        setError(null);
    };

    const openChannel = async (nextChannel: any) => {
        if (!active) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getBotChannelMessages(active.token, nextChannel.id);
            setChannel(nextChannel);
            setMessages(result.reverse());
        } catch (e) { setError(String(e)); } finally { setLoading(false); }
    };

    const openRecentDM = async (dm: any) => {
        await openChannel({ id: dm.channelId, name: displayName(dm.recipient), recipients: [dm.recipient], type: 1, botcordDM: true });
    };

    const loadAllMembers = async () => {
        if (!active) return;
        setScreen("members");
        setMemberSearch("");
        setError(null);
        if (members.length > 0) {
            setMemberStatus(`${members.length} available members`);
            return;
        }
        setMemberStatus("Loading members");
        const dedup = new Map<string, any>();
        let completed = 0;
        for (let i = 0; i < guilds.length; i += 4) {
            const batch = guilds.slice(i, i + 4);
            const results = await Promise.all(batch.map(g => getBotGuildMembers(active.token, g.id).catch(() => [])));
            for (const rows of results) {
                for (const member of rows) {
                    const user = member?.user;
                    if (user?.id && user.id !== active.id && !dedup.has(user.id)) dedup.set(user.id, member);
                }
            }
            completed += batch.length;
            setMemberStatus(`Loading ${completed} of ${guilds.length}`);
        }
        const all = Array.from(dedup.values());
        setMembers(all);
        setMemberStatus(`${all.length} available members`);
    };

    const openMemberDM = async (member: any) => {
        if (!active || !member?.user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const dm = await createBotDM(active.token, member.user);
            setChannel({ ...dm, name: displayName(member.user), recipients: [member.user], botcordDM: true });
            const result = await getBotChannelMessages(active.token, dm.id);
            setMessages(result.reverse());
        } catch (e) { setError(String(e)); } finally { setLoading(false); }
    };

    const pickImage = async () => {
        setError(null);
        try {
            const imagePicker = findByProps("launchImageLibrary") as any;
            let asset: any = null;
            if (imagePicker?.launchImageLibrary) {
                const result: any = await new Promise((resolve, reject) => {
                    try {
                        const returned = imagePicker.launchImageLibrary({ mediaType: "photo", selectionLimit: 1, includeBase64: false, assetRepresentationMode: "current" }, resolve);
                        if (returned?.then) returned.then(resolve, reject);
                    } catch (error) { reject(error); }
                });
                if (result?.didCancel) return;
                if (result?.errorCode) throw new Error(result.errorMessage || "Could not open photos.");
                asset = result?.assets?.[0];
            } else {
                const filePicker = findByProps("pickSingle", "isCancel") as any;
                if (!filePicker?.pickSingle) throw new Error("Photo picker unavailable.");
                try {
                    asset = await filePicker.pickSingle({ type: filePicker.types?.images || "image/*", mode: "import", copyTo: "documentDirectory" });
                } catch (error) {
                    if (filePicker.isCancel?.(error)) return;
                    throw error;
                }
            }
            const uri = asset?.fileCopyUri || asset?.uri;
            if (!uri) return;
            setSelectedImage({
                uri,
                name: asset?.fileName || asset?.name || `image-${Date.now()}.jpg`,
                type: asset?.type || "image/jpeg",
                width: asset?.width,
                height: asset?.height
            });
        } catch (e) { setError(String(e)); }
    };

    const send = async () => {
        if (!active || !channel || (!composer.trim() && !selectedImage)) return;
        const content = composer.trim();
        const image = selectedImage;
        const optimisticId = `local-${Date.now()}`;
        const optimistic = {
            id: optimisticId,
            content,
            author: active,
            timestamp: new Date().toISOString(),
            attachments: image ? [{ id: "0", filename: image.name, url: image.uri, proxy_url: image.uri, content_type: image.type }] : [],
            botcordPending: true
        };
        setComposer("");
        setSelectedImage(null);
        setError(null);
        setMessages(old => [...old, optimistic]);
        requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
        try {
            const sent = await sendBotMessage(active.token, channel.id, content, image || undefined);
            setMessages(old => old.map(message => message.id === optimisticId ? sent : message));
        } catch (e) {
            setMessages(old => old.filter(message => message.id !== optimisticId));
            setComposer(content);
            setSelectedImage(image);
            setError(String(e));
        }
    };

    if (!active) return null;

    const categories = channels.filter(c => c.type === 4);
    const textChannels = (parentId: string | null) => channels.filter(c => [0, 5, 10, 11, 12].includes(c.type) && (c.parent_id || null) === parentId);
    const recentDMs = state.recentDMs?.[active.id] ?? [];
    const filteredMembers = members.filter(member => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return true;
        return `${member.nick || ""} ${member.user?.global_name || ""} ${member.user?.username || ""}`.toLowerCase().includes(q);
    });
    const openAccounts = () => showSheet("BOTCORD_ACCOUNT", AccountSheet, { accounts, active, onMain: () => { onExit(); navigation.goBack?.(); } });
    const returnFromChat = () => {
        const wasDm = Boolean(channel?.botcordDM);
        setChannel(null);
        setMessages([]);
        setComposer("");
        setSelectedImage(null);
        setError(null);
        if (wasDm) {
            setGuild(null);
            setChannels([]);
            setScreen("messages");
        } else {
            setScreen("guild");
        }
    };

    if (channel) {
        const dmUser = channel.recipients?.[0];
        return <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
        >
            <View style={styles.header}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    onPress={returnFromChat}
                    hitSlop={10}
                    style={({ pressed }) => ({
                        width: 64,
                        height: 36,
                        flexShrink: 0,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: nativeColors.selected,
                        opacity: pressed ? 0.7 : 1,
                        zIndex: 20
                    })}
                >
                    <NativeText style={{ color: nativeColors.text, fontSize: 15, fontWeight: "600" }}>Back</NativeText>
                </Pressable>
                {dmUser ? <ApiAvatar user={dmUser} size={32} /> : null}
                <View style={{ flex: 1 }}>
                    <Text variant="heading-md/semibold" numberOfLines={1}>{channel.botcordDM ? displayName(dmUser) : channel.name}</Text>
                    {!channel.botcordDM && guild ? <Text variant="text-xs/normal" color="text-muted" numberOfLines={1}>{guild.name}</Text> : null}
                </View>
                <PressableScale onPress={openAccounts}><ApiAvatar user={active} size={32} /></PressableScale>
            </View>
            {error ? <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Text variant="text-sm/medium" color="text-feedback-critical">{error}</Text></View> : null}
            {loading ? <Text variant="text-sm/normal" color="text-muted" style={{ padding: 10, textAlign: "center" }}>Loading</Text> : null}
            <FlatList
                ref={listRef}
                style={{ flex: 1 }}
                data={messages}
                keyExtractor={(m: any, i) => m.id || String(i)}
                renderItem={({ item }: any) => <MessageRow message={item} />}
                contentContainerStyle={{ paddingVertical: 6 }}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
            />
            {selectedImage ? <View style={{ height: 72, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: tokens.colors.BACKGROUND_PRIMARY }}>
                <Image source={{ uri: selectedImage.uri }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: tokens.colors.BACKGROUND_SECONDARY }} />
                <NativeText numberOfLines={1} style={{ flex: 1, color: nativeColors.text, fontSize: 14 }}>{selectedImage.name}</NativeText>
                <Pressable onPress={() => setSelectedImage(null)} hitSlop={8} style={({ pressed }) => ({ height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: nativeColors.selected, opacity: pressed ? 0.7 : 1 })}>
                    <NativeText style={{ color: nativeColors.text, fontSize: 13, fontWeight: "600" }}>Remove</NativeText>
                </Pressable>
            </View> : null}
            <View style={styles.composer}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add photo"
                    onPress={pickImage}
                    hitSlop={6}
                    style={({ pressed }) => ({ width: 52, height: 44, flexShrink: 0, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: nativeColors.selected, opacity: pressed ? 0.7 : 1 })}
                >
                    <NativeText style={{ color: nativeColors.text, fontSize: 13, fontWeight: "600" }}>Photo</NativeText>
                </Pressable>
                <NativeTextInput
                    value={composer}
                    placeholder={channel.botcordDM ? `Message ${displayName(dmUser)}` : `Message #${channel.name}`}
                    placeholderTextColor={nativeColors.muted}
                    onChangeText={setComposer}
                    maxLength={2000}
                    returnKeyType="send"
                    onSubmitEditing={() => { if (composer.trim() || selectedImage) send(); }}
                    style={{
                        width: 0,
                        minWidth: 0,
                        flexGrow: 1,
                        flexShrink: 1,
                        height: 44,
                        paddingHorizontal: 14,
                        paddingVertical: 0,
                        borderRadius: 22,
                        backgroundColor: nativeColors.input,
                        color: nativeColors.text,
                        fontSize: 16
                    }}
                />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    disabled={!composer.trim() && !selectedImage}
                    onPress={send}
                    hitSlop={6}
                    style={({ pressed }) => ({
                        width: 52,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: (!composer.trim() && !selectedImage) ? 0.45 : pressed ? 0.72 : 1,
                        backgroundColor: nativeColors.brand
                    })}
                >
                    <NativeText style={{ color: nativeColors.inverse, fontSize: 13, fontWeight: "600" }}>Send</NativeText>
                </Pressable>
            </View>
        </KeyboardAvoidingView>;
    }

    return <View style={styles.root}>
        <View style={styles.header}>
            <View style={{ flex: 1 }}>
                <Text variant="heading-md/semibold" numberOfLines={1}>{screen === "members" ? "New Message" : screen === "messages" ? "Messages" : guild?.name || "BotCord"}</Text>
                <Text variant="text-xs/normal" color="text-muted" numberOfLines={1}>{active.username}</Text>
            </View>
            {screen === "members" ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={openMessages} hitSlop={8} style={({ pressed }) => ({ paddingHorizontal: 8, height: 36, justifyContent: "center", opacity: pressed ? 0.65 : 1 })}><NativeText style={{ color: nativeColors.text, fontSize: 16, fontWeight: "600" }}>Back</NativeText></Pressable> : <Button size="sm" variant="secondary" text="New Message" onPress={loadAllMembers} />}
            <PressableScale onPress={openAccounts}><ApiAvatar user={active} size={32} /></PressableScale>
        </View>

        {error ? <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Text variant="text-sm/medium" color="text-feedback-critical">{error}</Text></View> : null}
        {loading ? <Text variant="text-sm/normal" color="text-muted" style={{ padding: 8, textAlign: "center" }}>Loading</Text> : null}

        <View style={styles.navigator}>
            <View style={styles.guildRail}>
                <PressableScale onPress={openMessages} style={styles.guildButton}>
                    <IconButton size="lg" variant={screen === "messages" ? "primary" : "secondary"} icon={findAssetId("HomeIcon") || findAssetId("MessagesIcon") || findAssetId("ChatIcon")} onPress={openMessages} />
                </PressableScale>
                <FlatList data={guilds} keyExtractor={(g: any) => g.id} showsVerticalScrollIndicator={false} renderItem={({ item }: any) => {
                    const uri = guildIconUrl(item);
                    return <PressableScale onPress={() => openGuild(item)} style={styles.guildButton}>
                        {uri ? <Image source={{ uri }} style={styles.guildImage} /> : <View style={styles.guildImage}><Text variant="text-sm/semibold">{item.name?.slice(0, 2).toUpperCase()}</Text></View>}
                    </PressableScale>;
                }} />
            </View>

            <View style={styles.sidebar}>
                {screen === "messages" ? <>
                    <View style={styles.sidebarHeader}><Text variant="heading-md/semibold" style={{ flex: 1 }}>Direct Messages</Text><Button size="sm" variant="secondary" text="New Message" onPress={loadAllMembers} /></View>
                    <FlatList data={recentDMs} keyExtractor={(dm: any) => dm.channelId} renderItem={({ item }: any) => <PressableScale onPress={() => openRecentDM(item)} style={styles.dmRow}><ApiAvatar user={item.recipient} size={36} /><View style={{ flex: 1 }}><Text variant="text-md/medium" numberOfLines={1}>{displayName(item.recipient)}</Text>{item.recipient.bot ? <Text variant="text-xs/normal" color="text-muted">APP</Text> : null}</View></PressableScale>} ListEmptyComponent={<View style={styles.listEmpty}><Text variant="text-md/normal" color="text-muted">No recent direct messages. Use New Message to choose a member.</Text></View>} />
                </> : screen === "members" ? <>
                    <View style={styles.sidebarHeader}><Button size="sm" variant="secondary" text="Back" onPress={openMessages} /><View style={{ flex: 1 }}><Text variant="heading-md/semibold">New Message</Text><Text variant="text-xs/normal" color="text-muted">{memberStatus}</Text></View></View>
                    <View style={styles.search}><TextInput size="md" value={memberSearch} placeholder="Search members" onChange={(value: any) => setMemberSearch(typeof value === "string" ? value : value?.nativeEvent?.text ?? "")} /></View>
                    <FlatList data={filteredMembers} keyExtractor={(member: any, i) => member.user?.id || String(i)} keyboardShouldPersistTaps="handled" initialNumToRender={18} maxToRenderPerBatch={18} windowSize={7} removeClippedSubviews={true} renderItem={({ item }: any) => <PressableScale onPress={() => openMemberDM(item)} style={styles.dmRow}><ApiAvatar user={item.user} size={36} /><View style={{ flex: 1 }}><Text variant="text-md/medium" numberOfLines={1}>{item.nick || displayName(item.user)}</Text>{item.nick && item.nick !== displayName(item.user) ? <Text variant="text-xs/normal" color="text-muted" numberOfLines={1}>{displayName(item.user)}</Text> : item.user?.bot ? <Text variant="text-xs/normal" color="text-muted">APP</Text> : null}</View></PressableScale>} ListEmptyComponent={<View style={styles.listEmpty}><Text variant="text-md/normal" color="text-muted">No members are available from the bot's servers.</Text></View>} />
                </> : <>
                    <View style={styles.sidebarHeader}><Text variant="heading-md/semibold" numberOfLines={1}>{guild?.name}</Text></View>
                    <FlatList data={[...textChannels(null), ...categories.flatMap(cat => [{ ...cat, botcordCategory: true }, ...textChannels(cat.id)])]} keyExtractor={(item: any) => `${item.botcordCategory ? "cat" : "chan"}-${item.id}`} renderItem={({ item }: any) => item.botcordCategory ? <Text variant="text-xs/bold" color="text-muted" style={styles.category}>{String(item.name || "CATEGORY").toUpperCase()}</Text> : <PressableScale onPress={() => openChannel(item)} style={styles.channelRow}><Text variant="text-md/medium" color="text-muted">{item.name}</Text></PressableScale>} ListEmptyComponent={<View style={styles.listEmpty}><Text variant="text-md/normal" color="text-muted">No message channels available.</Text></View>} />
                </>}
            </View>
        </View>
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
            <View><Text variant="heading-xl/bold">BotCord</Text><Text variant="text-sm/normal" color="text-muted">Bot accounts use Discord's mobile components and stay only on this device.</Text></View>
            <TableRowGroup title="Bot Accounts">
                {accounts.map(account => <TableRow key={account.id} label={account.username} subLabel={state.activeAccountId === account.id ? "Active bot" : `Bot ID: ${account.id}`} icon={<TableRow.Icon source={findAssetId("RobotIcon") || findAssetId("AppsIcon")} />} onPress={async () => { await setActiveBotAccount(account.id); setOpened(true); }} trailing={<Button size="sm" variant="secondary" text="Remove" onPress={() => removeBotAccount(account.id)} />} />)}
                {!state.loaded ? <TableRow label="Loading bot accounts" /> : null}
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
