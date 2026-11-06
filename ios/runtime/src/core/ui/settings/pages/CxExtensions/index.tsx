import { onEditMessage, onSendMessage } from "@core/plugins/shared/sendMessage";
import { createCxSession, MAX_CX_SOURCE, reviewCx } from "@lib/api/cx";
import { cxCatalog } from "@lib/api/cxCatalog";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType, ApplicationCommandType } from "@lib/api/commands/types";
import { getCurrentTheme } from "@lib/addons/themes";
import { updateBunnyColor } from "@lib/addons/themes/colors/updater";
import { NativeFileModule } from "@lib/api/native/modules";
import { isThemeSupported } from "@lib/api/native/loader";
import { settings } from "@lib/api/settings";
import { showToast } from "@lib/ui/toasts";
import { findByProps } from "@metro";
import { commands, messageUtil, React } from "@metro/common";
import { Stack, TableRow, TableRowGroup } from "@metro/common/components";
import { ScrollView, Text, TextInput } from "react-native";

const session = createCxSession();

export default function CxExtensions() {
    const [source, setSource] = React.useState("");
    const [showCatalog, setShowCatalog] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [pages, setPages] = React.useState({ Plugins: 0, Themes: 0 });
    const [status, setStatus] = React.useState("");
    const [candidate, setCandidate] = React.useState<{ source: string; review: ReturnType<typeof reviewCx>; }>();
    const searchText = search.trim().toLowerCase();

    function review(next: string) {
        setCandidate(undefined);
        try {
            setCandidate({ source: next, review: reviewCx(next) });
            setStatus("");
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    async function openFile() {
        let picker: ReturnType<typeof findByProps> | undefined;
        setCandidate(undefined);
        try {
            picker = findByProps("pickSingle", "isCancel");
            if (!picker?.pickSingle || typeof NativeFileModule?.readFile !== "function")
                throw new Error("The file picker is unavailable. Paste the .cx contents below.");
            const file = await picker.pickSingle({
                type: picker.types?.allFiles ?? "*/*",
                mode: "import",
                copyTo: "cachesDirectory",
            });
            if (!/\.cx$/i.test(file?.name ?? "") || !(file.size > 0 && file.size <= MAX_CX_SOURCE))
                throw new Error("Choose a .cx file under 512 KB.");
            if (!file.fileCopyUri?.startsWith("file:///")) throw new Error("Could not copy the selected .cx file.");
            const next = await NativeFileModule.readFile(decodeURIComponent(file.fileCopyUri.slice(7)), "utf8");
            setSource(next);
            review(next);
        } catch (error) {
            if (!picker?.isCancel?.(error)) setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    function enable() {
        if (!candidate) return;
        try {
            if (settings.safeMode?.enabled) throw new Error("CX is unavailable in Safe Mode");
            session.enable(candidate.source, {
                registerMessageTransform(transform) {
                    return onSendMessage(message => {
                        if (!settings.safeMode?.enabled && typeof message.content === "string") message.content = transform(message.content);
                    });
                },
                registerMessageEditTransform(transform) {
                    return onEditMessage(message => {
                        if (!settings.safeMode?.enabled && typeof message.content === "string") message.content = transform(message.content);
                    });
                },
                registerCommand(name, execute, acceptsText, _sendsMessage, optionalSend, inputs) {
                    let builtIns;
                    try {
                        builtIns = commands.getBuiltInCommands(ApplicationCommandType.CHAT, true, false);
                    } catch {
                        builtIns = commands.getBuiltInCommands(Object.values(ApplicationCommandType), true, false);
                    }
                    if (builtIns.some((command: { name: string; }) => command.name === name))
                        throw new Error(`Command /${name} already exists`);
                    return registerCommand({
                        name, description: "Local CX command",
                        shouldHide: () => !settings.safeMode?.enabled,
                        options: [
                            ...(acceptsText ? [{ name: "text", description: "Text to use", type: ApplicationCommandOptionType.STRING, required: true }] : []),
                            ...inputs.map(input => ({
                                name: input.name, description: input.name.replace(/[_-]/g, " "), required: input.required,
                                type: input.type === "integer" ? ApplicationCommandOptionType.INTEGER
                                    : input.type === "boolean" ? ApplicationCommandOptionType.BOOLEAN : ApplicationCommandOptionType.STRING,
                                choices: input.choices?.map(value => ({ name: value, displayName: value, label: value, value })),
                            })),
                            ...(optionalSend ? [{ name: "send", description: "Send the result to this chat", type: ApplicationCommandOptionType.BOOLEAN }] : []),
                        ],
                        execute(args, context) {
                            if (settings.safeMode?.enabled) return;
                            const text = acceptsText ? args.find(arg => arg?.name === "text")?.value : undefined;
                            const outgoing = execute({
                                text: typeof text === "string" ? text : undefined,
                                inputs: Object.fromEntries(inputs.map(input => [input.name, args.find(arg => arg?.name === input.name)?.value])),
                                sendRequested: optionalSend && (args.find(arg => arg?.name === "send")?.value as unknown) === true,
                                reply: message => { if (context.channel?.id) messageUtil.sendBotMessage(context.channel.id, message); },
                            });
                            if (outgoing !== undefined) return { content: outgoing };
                        },
                    });
                },
                toast: message => { showToast(message); },
                applyTheme(theme) {
                    if (!isThemeSupported()) throw new Error("This loader does not support themes");
                    const palette = (value: string) => [value, value];
                    const surface = theme.surface ?? theme.background;
                    const sidebar = theme.sidebar ?? surface;
                    updateBunnyColor({
                        name: theme.name,
                        spec: 2,
                        semanticColors: {
                            BACKGROUND_PRIMARY: palette(theme.background),
                            BACKGROUND_SECONDARY: palette(surface),
                            BACKGROUND_TERTIARY: palette(sidebar),
                            BACKGROUND_BASE_LOW: palette(theme.background),
                            BACKGROUND_BASE_LOWER: palette(surface),
                            BACKGROUND_BASE_LOWEST: palette(sidebar),
                            ...(theme.text ? { TEXT_NORMAL: palette(theme.text), TEXT_PRIMARY: palette(theme.text), TEXT_DEFAULT: palette(theme.text), TEXT_STRONG: palette(theme.text) } : {}),
                            ...(theme.muted ? { TEXT_MUTED: palette(theme.muted), TEXT_SECONDARY: palette(theme.muted), TEXT_SUBTLE: palette(theme.muted) } : {}),
                            ...(theme.accent ? { TEXT_LINK: palette(theme.accent) } : {}),
                            ...Object.fromEntries(Object.entries(theme.semanticColors ?? {}).map(([token, color]) => [token, palette(color)])),
                        },
                        ...(theme.rawColors ? { rawColors: { ...theme.rawColors } } : {}),
                        ...(theme.wallpaper ? { background: { url: theme.wallpaper, alpha: theme.wallpaperOpacity ?? 0.85 } } : {}),
                    }, { mode: theme.mode });
                    return () => updateBunnyColor(getCurrentTheme()?.data ?? null);
                },
            }, candidate.review.permissions);
            setStatus(`${candidate.review.name} is active for this session.`);
            setCandidate(undefined);
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        <Stack spacing={16}>
            <TableRowGroup title="CX catalog">
                <TableRow label={showCatalog ? "Hide catalog" : "Browse catalog"} subLabel={`${cxCatalog.plugins.length} plugins · ${cxCatalog.themes.length} themes`}
                    onPress={() => setShowCatalog(!showCatalog)} />
            </TableRowGroup>
            {showCatalog && <>
                <TextInput accessibilityLabel="Search CX catalog" placeholder="Search CX catalog" placeholderTextColor="#b5bac1"
                    value={search} onChangeText={value => { setSearch(value); setPages({ Plugins: 0, Themes: 0 }); }}
                    autoCorrect={false} style={{ color: "#fff", backgroundColor: "#27282d", padding: 12 }} />
                {([["Plugins", cxCatalog.plugins], ["Themes", cxCatalog.themes]] as const).map(([kind, entries]) => {
                    const matches = entries.filter(entry => entry.name.toLowerCase().includes(searchText));
                    const page = pages[kind];
                    const start = page * 12;
                    return <TableRowGroup key={kind} title={kind}>
                        {matches.slice(start, start + 12).map(entry => <TableRow key={entry.name} label={entry.name} onPress={() => {
                            setShowCatalog(false);
                            setSource(entry.source);
                            review(entry.source);
                        }} />)}
                        {page > 0 && <TableRow label={`Previous ${kind.toLowerCase()} page`} onPress={() => setPages({ ...pages, [kind]: page - 1 })} />}
                        {start + 12 < matches.length && <TableRow label={`Next ${kind.toLowerCase()} page`} onPress={() => setPages({ ...pages, [kind]: page + 1 })} />}
                        {!matches.length && <TableRow label="No matches" />}
                    </TableRowGroup>;
                })}
            </>}
            <Text style={{ color: "#b5bac1" }}>Paste the contents of a .cx file to review it.</Text>
            <TextInput
                accessibilityLabel="CX source"
                placeholder={'theme "Midnight":'}
                placeholderTextColor="#b5bac1"
                value={source}
                maxLength={MAX_CX_SOURCE}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                style={{ color: "#fff", backgroundColor: "#27282d", minHeight: 140, padding: 12 }}
                onChangeText={value => { setCandidate(undefined); setSource(value); }}
            />
            <TableRowGroup title="CX Extensions">
                <TableRow label="Open a .cx file" onPress={openFile} />
                <TableRow label="Review CX" onPress={() => review(source)} />
                {candidate && <TableRow
                    label={candidate.review.name}
                    subLabel={[...candidate.review.effects, ...(candidate.review.commands ?? [])].join("\n")}
                />}
                {candidate && <TableRow label="Allow for this session" onPress={enable} />}
                {session.list().map(({ id, name }) => <TableRow key={id} label={`Disable ${name}`} onPress={() => {
                    session.disable(id);
                    setStatus(`${name} disabled.`);
                }} />)}
            </TableRowGroup>
            <Text accessibilityLiveRegion="polite" style={{ color: "#b5bac1" }}>{status}</Text>
        </Stack>
    </ScrollView>;
}

