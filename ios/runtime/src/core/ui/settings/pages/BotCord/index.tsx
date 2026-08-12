import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import {
    addBotAccount,
    botCordState,
    getBotChannelMessages,
    getBotGuildChannels,
    getBotGuilds,
    removeBotAccount,
    sendBotMessage,
    setActiveBotAccount
} from "@lib/api/botcord";
import { Button, Stack, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

function BotClient({ token, username, onExit }: { token: string; username: string; onExit: () => void; }) {
    const [guilds, setGuilds] = useState<any[]>([]);
    const [channels, setChannels] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [guild, setGuild] = useState<any | null>(null);
    const [channel, setChannel] = useState<any | null>(null);
    const [composer, setComposer] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getBotGuilds(token)
            .then(setGuilds)
            .catch(e => setError(String(e)))
            .finally(() => setLoading(false));
    }, [token]);

    const openGuild = async (g: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getBotGuildChannels(token, g.id);
            setGuild(g);
            setChannel(null);
            setMessages([]);
            setChannels(result.filter(c => [0, 5, 10, 11, 12].includes(c.type)));
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    const openChannel = async (c: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getBotChannelMessages(token, c.id);
            setChannel(c);
            setMessages(result.reverse());
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    const send = async () => {
        const content = composer.trim();
        if (!content || !channel) return;
        setComposer("");
        try {
            const sent = await sendBotMessage(token, channel.id, content);
            setMessages(old => [...old, sent]);
        } catch (e) {
            setComposer(content);
            setError(String(e));
        }
    };

    return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={16}>
            <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                    <Text variant="heading-lg/bold">BotCord</Text>
                    <Text variant="text-sm/normal" color="text-muted">Connected as {username}</Text>
                </View>
                <Button size="sm" variant="secondary" text="Accounts" onPress={onExit} />
            </View>

            {error && <Text variant="text-sm/medium" color="text-feedback-critical">{error}</Text>}
            {loading && <Text variant="text-sm/normal" color="text-muted">Loading…</Text>}

            {!guild && <TableRowGroup title="Servers">
                {guilds.map(g => <TableRow
                    key={g.id}
                    label={g.name}
                    subLabel={g.id}
                    icon={<TableRow.Icon source={findAssetId("GuildIcon") || findAssetId("Discord")} />}
                    onPress={() => openGuild(g)}
                />)}
                {!loading && guilds.length === 0 && <TableRow label="No servers available to this bot" />}
            </TableRowGroup>}

            {guild && !channel && <>
                <Button size="sm" variant="secondary" text="← Servers" onPress={() => setGuild(null)} />
                <TableRowGroup title={guild.name}>
                    {channels.map(c => <TableRow
                        key={c.id}
                        label={`# ${c.name}`}
                        icon={<TableRow.Icon source={findAssetId("ChannelTextIcon") || findAssetId("ChannelListMagnifyingGlassIcon")} />}
                        onPress={() => openChannel(c)}
                    />)}
                    {!loading && channels.length === 0 && <TableRow label="No readable message channels" />}
                </TableRowGroup>
            </>}

            {channel && <>
                <Button size="sm" variant="secondary" text={`← ${guild?.name || "Channels"}`} onPress={() => {
                    setChannel(null);
                    setMessages([]);
                }} />
                <TableRowGroup title={`# ${channel.name}`}>
                    {messages.map(m => <TableRow
                        key={m.id}
                        label={m.author?.global_name || m.author?.username || "Unknown"}
                        subLabel={m.content || (m.attachments?.length ? "Attachment" : m.embeds?.length ? "Embed" : "")}
                    />)}
                </TableRowGroup>
                <View style={{ gap: 8 }}>
                    <TextInput
                        size="lg"
                        value={composer}
                        placeholder={`Message #${channel.name}`}
                        onChange={setComposer}
                    />
                    <Button size="md" variant="primary" text="Send as bot" disabled={!composer.trim()} onPress={send} />
                </View>
            </>}
        </Stack>
    </ScrollView>;
}

export default function BotCord() {
    const state = useProxy(botCordState);
    const [token, setToken] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [opened, setOpened] = useState(false);

    const active = useMemo(
        () => state.accounts.find(a => a.id === state.activeAccountId) ?? state.accounts[0] ?? null,
        [state.accounts, state.activeAccountId]
    );

    if (opened && active) {
        return <BotClient token={active.token} username={active.username} onExit={() => setOpened(false)} />;
    }

    return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={16}>
            <View>
                <Text variant="heading-xl/bold">BotCord</Text>
                <Text variant="text-sm/normal" color="text-muted">
                    Add bot accounts, switch between them, and use Discord as the selected bot. Tokens stay in CloudCord's local app storage on this device.
                </Text>
            </View>

            <TableRowGroup title="Bot Accounts">
                {state.accounts.map(account => <TableRow
                    key={account.id}
                    label={account.username}
                    subLabel={state.activeAccountId === account.id ? "Active bot" : `Bot ID: ${account.id}`}
                    icon={<TableRow.Icon source={findAssetId("RobotIcon") || findAssetId("AppsIcon")} />}
                    onPress={() => {
                        setActiveBotAccount(account.id);
                        setOpened(true);
                    }}
                    trailing={<Button
                        size="sm"
                        variant="secondary"
                        text="Remove"
                        onPress={() => removeBotAccount(account.id)}
                    />}
                />)}
                {state.accounts.length === 0 && <TableRow label="No bot accounts added yet" />}
            </TableRowGroup>

            <TableRowGroup title="Add Bot Account">
                <TableRow label={<View style={{ width: "100%", gap: 10 }}>
                    <TextInput
                        size="lg"
                        value={token}
                        placeholder="Bot token"
                        onChange={setToken}
                        secureTextEntry
                        state={error ? "error" : undefined}
                        errorMessage={error || undefined}
                    />
                    <Button
                        size="md"
                        variant="primary"
                        text="Add Bot Account"
                        loading={adding}
                        disabled={adding || !token.trim()}
                        onPress={async () => {
                            setAdding(true);
                            setError(null);
                            try {
                                await addBotAccount(token);
                                setToken("");
                            } catch (e) {
                                setError(String(e));
                            } finally {
                                setAdding(false);
                            }
                        }}
                    />
                </View>} />
            </TableRowGroup>

            {active && <Button
                size="lg"
                variant="primary"
                text={`Open BotCord as ${active.username}`}
                onPress={() => setOpened(true)}
            />}

            <Text variant="text-xs/normal" color="text-muted">
                BotCord uses Discord's bot API. A bot only sees servers and channels where it has access and can only perform actions its permissions allow.
            </Text>
        </Stack>
    </ScrollView>;
}
