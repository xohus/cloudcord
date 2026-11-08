import { onEditMessage, onSendMessage } from "@core/plugins/shared/sendMessage";
import { instead } from "@lib/api/patcher";
import { animateCxAssets, bindCxSocialEvents, createCxPlusReactionHandler, createCxPreviousSendHandler, createCxSession, createCxSplitSender, cxAppearanceTargets, cxProfileMenuActions, CX_INLINE_EDITOR_LIMIT, filterCxEmojiAutocomplete, fixCxFileExtensions, floorCxRelativeTime, formatCxRandomMember, formatCxRoleMembers, formatCxSpotify, getCxProfileMenuCopy, isCxProfileUserId, markCxServersRead, MAX_CX_SOURCE, overrideCxMethods, raiseCxAvatarResolution, reviewCx, runCxFriendInvites, runCxIncomingRules, type CxProfileMenuAction, type CxUploadAnonymiser } from "@lib/api/cx";
import { createCxVoicePing, createCxVoiceCount, isCxVoiceCountChannel, isCxVoiceCountFull, type CxVoiceCountChannel, type CxVoiceCountOptions } from "@lib/api/cx";
import { bindCxCameraTone, bindCxMutedVoice, createCxVoiceQueue, getCxImageSearchOptions, getCxSteamLink, getCxVoiceQueueRoom, type CxSearchMediaSource, type CxVoiceQueueOptions } from "@lib/api/cx";
import { cxCatalog } from "@lib/api/cxCatalog";
import { bindCxChannelOpenRead, filterCxEmojiCategories, isCxNotificationMuted, type CxMessageAlert } from "@lib/api/cx";
import { buildCxRepeatMessage, getCxEmbedToggle, getCxPinAction, getCxSpotifySongName, sortCxReactions, type CxRepeatMessage, type CxSpotifyActivity } from "@lib/api/cx";
import { createCxTimestampRegistry, type CxTimestampFormats, type CxTimestampSurface } from "@lib/api/cx";
import { createCxCallClock, createCxJumpActions, createCxVoiceMemberClock, createCxNavigationControls, getCxFirstMessageTarget, markCxServersReadAndWait, type CxNavigationChannel, type CxVoiceMemberOptions } from "@lib/api/cx";
import { selectCxAppearanceOption } from "@lib/api/cx";
import { formatCxChannelName, formatCxEmojiMarkdown, formatCxStickerLink, getCxAttachmentImageUrl, getCxGifDescription, getCxImageTitle, validateCxMediaLink, validateCxStickerLink, type CxChannelLabel } from "@lib/api/cx";
import { registerCommand } from "@lib/api/commands";
import { describeCcpReport } from "@lib/api/ccpInspect";
import { copyCcpReport } from "@lib/api/ccpReport";
import { ApplicationCommandOptionType, ApplicationCommandType } from "@lib/api/commands/types";
import { intercept } from "@lib/api/flux";
import { mapChatBackgroundRenderer } from "@lib/addons/themes/colors/patches/background";
import { applyTemporaryTheme, registerColorOverlay } from "@lib/addons/themes/colors/updater";
import { NativeFileModule } from "@lib/api/native/modules";
import { isThemeSupported } from "@lib/api/native/loader";
import { deleteJsxCreate, onJsxCreate } from "@lib/api/react/jsx";
import { settings } from "@lib/api/settings";
import { createStorageAsync } from "@lib/api/storage";
import { dismissAlert, openAlert } from "@lib/ui/alerts";
import { resolveSemanticColor, semanticColors } from "@lib/ui/color";
import { showToast } from "@lib/ui/toasts";
import { findByFilePath, findByProps, findByStoreName, findByStoreNameLazy } from "@metro";
import { getCxMessageGesture } from "@lib/api/cx";
import { getCxChannelNameCopy, getCxProfileMedia } from "@lib/api/cx";
import { createCxUserNotes, CX_USER_NOTE_LIMIT } from "@lib/api/cx";
import { clipboard, commands, FluxDispatcher, messageUtil, React } from "@metro/common";
import { Stack, TableRow, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import type { ComponentType, Context, ReactElement, ReactNode } from "react";
import { Alert, Animated, FlatList, Image, Linking, PixelRatio, Pressable, processColor, ScrollView, SectionList, Text, TextInput, View } from "react-native";

const session = createCxSession();
const callClock = createCxCallClock();
const voiceMemberClock = createCxVoiceMemberClock();
const voiceCounts = createCxVoiceCount();
const voicePing = createCxVoicePing();
const navigationControls = createCxNavigationControls();
const timestamps = createCxTimestampRegistry();
const timestampFields = [
    ["timestamp", "cozy"], ["timestampTooltip", "tooltip"], ["timestampAccessibilityLabel", "accessibility"],
] as const satisfies readonly [string, CxTimestampSurface][];
let timestampUsers = 0;
let stopTimestamps: (() => void) | undefined;

function registerTimestampFormats(formats: CxTimestampFormats) {
    if (!stopTimestamps) {
        const enabled = () => !settings.safeMode?.enabled;
        const renderer = findByFilePath("modules/messages/native/renderer/createMessageContent.tsx");
        const stopRows = overrideCxMethods(renderer, {
            default(args, invoke) {
                const presentation = invoke(args);
                const input = args[0] as { message?: { timestamp?: unknown; }; isInlineReplyPreview?: boolean; } | undefined;
                if (!presentation || typeof presentation !== "object" || input?.isInlineReplyPreview || input?.message?.timestamp == null) return presentation;
                const changed: Record<string, string> = {};
                for (const [key, surface] of timestampFields) {
                    const original = (presentation as Record<string, unknown>)[key];
                    if (typeof original !== "string" || !original) continue;
                    const formatted = timestamps.format(input.message.timestamp, surface);
                    if (formatted && formatted !== original) changed[key] = formatted;
                }
                return Object.keys(changed).length ? { ...presentation, ...changed } : presentation;
            },
        }, enabled);
        try {
            const stopMarkup = overrideCxMethods(findByFilePath("modules/markup/TimestampUtils.tsx"), {
                parseTimestamp(args, invoke) {
                    const node = invoke(args);
                    if (!node || typeof node !== "object" || !("full" in node) || typeof node.full !== "string") return node;
                    const parsed = (node as { parsed?: unknown; }).parsed;
                    const full = timestamps.format(parsed, "markdown");
                    return full && full !== node.full ? { ...node, full } : node;
                },
            }, enabled);
            stopTimestamps = () => { stopMarkup(); stopRows(); };
        } catch (error) { stopRows(); throw error; }
    }
    const stopFormats = timestamps.register(formats);
    timestampUsers++;
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        stopFormats();
        if (!--timestampUsers) {
            stopTimestamps?.();
            stopTimestamps = undefined;
        }
    };
}

const channelNames = { clean: 0, titles: 0 };
let stopChannelNames: (() => void) | undefined;

function registerChannelNames(mode: keyof typeof channelNames, enabled: () => boolean) {
    if (!stopChannelNames) {
        const nameModule = findByFilePath("modules/channel/useChannelName.tsx");
        const channelRows = findByFilePath("modules/main_tabs_v2/native/shared_components/guild_channels/ChannelContent.tsx");
        const format = (label: unknown, channel?: CxChannelLabel) =>
            typeof label === "string" && channel ? formatCxChannelName(label, channel, channelNames) : label;
        const stopNames = overrideCxMethods(nameModule, {
            default: (args, invoke) => format(invoke(args), args[0] as CxChannelLabel | undefined),
            computeChannelName: (args, invoke) => format(invoke(args), args[0] as CxChannelLabel | undefined),
        }, enabled);
        try {
            const stopRows = overrideCxMethods(channelRows, {
                renderChannelContent(args, invoke) {
                    const props = args[0] as { name?: string; channel?: CxChannelLabel; } | undefined;
                    const name = format(props?.name, props?.channel);
                    return name === props?.name ? invoke(args) : invoke([{ ...props, name }, ...args.slice(1)]);
                },
            }, enabled);
            stopChannelNames = () => { stopRows(); stopNames(); };
        } catch (error) { stopNames(); throw error; }
    }
    channelNames[mode]++;
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        channelNames[mode]--;
        if (!channelNames.clean && !channelNames.titles) {
            stopChannelNames?.();
            stopChannelNames = undefined;
        }
    };
}

const UserStore = findByStoreNameLazy("UserStore");
const ChannelStore = findByStoreNameLazy("ChannelStore");
const MessageStore = findByStoreNameLazy("MessageStore");
const EmojiStore = findByStoreNameLazy("EmojiStore");
const RelationshipStore = findByStoreNameLazy("RelationshipStore");
const UserProfileStore = findByStoreNameLazy("UserProfileStore");
const GuildMemberStore = findByStoreNameLazy("GuildMemberStore");
const GuildStore = findByStoreNameLazy("GuildStore");
const GuildChannelStore = findByStoreNameLazy("GuildChannelStore");
const ActiveJoinedThreadsStore = findByStoreNameLazy("ActiveJoinedThreadsStore");
const ReadStateStore = findByStoreNameLazy("ReadStateStore");
const SpotifyStore = findByStoreNameLazy("SpotifyStore");
const SelectedChannelStore = findByStoreNameLazy("SelectedChannelStore");
const PresenceStore = findByStoreNameLazy("PresenceStore");
const UserGuildSettingsStore = findByStoreNameLazy("UserGuildSettingsStore");
let splitSender: ReturnType<typeof createCxSplitSender> | undefined;

const getReadStores = () => ({ guilds: GuildStore, channels: GuildChannelStore, threads: ActiveJoinedThreadsStore, read: ReadStateStore });
const acknowledgeServers: Parameters<typeof markCxServersReadAndWait>[1] = channels => FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels });

function NavigationButton({ label, text, onPress }: { label: string; text: string; onPress: () => void; }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
        style={{ minWidth: 38, minHeight: 36, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: resolveSemanticColor(semanticColors.INTERACTIVE_TEXT_DEFAULT), fontSize: text === "↑" ? 20 : 10, fontWeight: "600" }}>{text}</Text>
    </Pressable>;
}

function VoicePing({ channelId }: { channelId: string; }) {
    const latency = React.useSyncExternalStore(voicePing.subscribe, () => voicePing.read(channelId));
    if (!latency || settings.safeMode?.enabled) return null;
    return <Text accessibilityLabel="Voice latency" style={{ textAlign: "center", fontSize: 12, fontVariant: ["tabular-nums"],
        color: resolveSemanticColor(semanticColors.TEXT_MUTED) }}>{latency}</Text>;
}

function CallTime({ channelId }: { channelId: string; }) {
    const elapsed = React.useSyncExternalStore(callClock.subscribe, () => callClock.read(channelId));
    if (!elapsed || settings.safeMode?.enabled) return null;
    return <Text style={{ textAlign: "center", fontSize: 12, fontVariant: ["tabular-nums"],
        color: resolveSemanticColor(semanticColors.TEXT_MUTED) }}>Time elapsed: {elapsed}</Text>;
}

function VoiceMemberTime({ userId, channelId, color }: { userId: string; channelId: string; color?: string; }) {
    const subscribe = React.useCallback((listener: () => void) => voiceMemberClock.subscribe(userId, listener), [userId]);
    const elapsed = React.useSyncExternalStore(subscribe, () => voiceMemberClock.read(userId, channelId));
    return elapsed ? <Text accessibilityLabel={"Call time " + elapsed} style={{
        marginStart: 6, fontSize: 11, fontVariant: ["tabular-nums"],
        color: color ?? resolveSemanticColor(semanticColors.TEXT_MUTED),
    }}>{elapsed}</Text> : null;
}

function VoiceChannelCountRow({ channel, content }: { channel: CxVoiceCountChannel; content: ReactElement; }) {
    const count = React.useSyncExternalStore(voiceCounts.subscribe, () => voiceCounts.read(channel));
    if (!count) return content;
    return <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>{content}</View>
        <Text accessibilityLabel={"Voice occupancy " + count} style={{
            marginStart: 4, paddingHorizontal: 5, fontSize: 11, fontVariant: ["tabular-nums"],
            color: resolveSemanticColor(isCxVoiceCountFull(count) ? semanticColors.TEXT_FEEDBACK_CRITICAL : semanticColors.TEXT_MUTED),
        }}>{count}</Text>
    </View>;
}

function registerVoiceChannelCount(options: CxVoiceCountOptions, enabled: () => boolean) {
    const rows = findByFilePath("modules/main_tabs_v2/native/shared_components/guild_channels/ChannelContent.tsx");
    const voice = findByStoreName("VoiceStateStore");
    const stopCount = voiceCounts.bind(voice, options, enabled);
    try {
        const stopRows = overrideCxMethods(rows, {
            renderChannelContent(args, invoke) {
                const content = invoke(args);
                const props = args[0] as { channel?: CxVoiceCountChannel; locked?: boolean; } | undefined;
                if (props?.locked || !isCxVoiceCountChannel(props?.channel) || !React.isValidElement(content)) return content;
                return <VoiceChannelCountRow channel={props.channel} content={content} />;
            },
        }, enabled);
        return () => { stopRows(); stopCount(); };
    } catch (error) { stopCount(); throw error; }
}

function registerVoiceMemberClock(options: CxVoiceMemberOptions) {
    const row = findByFilePath("modules/guild_sidebar/native/VoiceUserItem.tsx")?.default;
    const voice = findByStoreName("VoiceStateStore");
    if (!row || typeof voice?.getVoiceStateForUser !== "function") throw new Error("Discord's voice members are unavailable");
    const stopClock = voiceMemberClock.bind({
        account: () => UserStore.getCurrentUser()?.id,
        state: id => voice.getVoiceStateForUser(id),
        channelGuild: id => ChannelStore.getChannel(id)?.guild_id,
        enabled: () => !settings.safeMode?.enabled,
        dispatcher: FluxDispatcher,
    }, options);
    try {
        const stopRows = registerRenderedTree(row, (tree, props: {
            user?: { id?: string; }; channelId?: string; guildId?: string; collapsed?: boolean; member?: { colorString?: string; };
        }) => {
            const { channelId, guildId, user, collapsed } = props;
            if (collapsed || !isCxProfileUserId(user?.id) || !isCxProfileUserId(channelId) || !isCxProfileUserId(guildId)
                || !React.isValidElement<{ children?: ReactNode; }>(tree) || !("children" in tree.props)) return tree;
            const roleColor = props.member?.colorString;
            const color = typeof roleColor === "string" && /^#[0-9a-f]{6}$/i.test(roleColor) ? roleColor : undefined;
            return React.cloneElement(tree, { children: <>{tree.props.children}<VoiceMemberTime userId={user.id} channelId={channelId} color={color} /></> });
        });
        return () => { stopRows(); stopClock(); };
    } catch (error) { stopClock(); throw error; }
}

function registerVoicePing(enabled: () => boolean) {
    const header = findByFilePath("modules/voice_panel/native/header/VoicePanelHeader.tsx")?.default;
    if (!header) throw new Error("Discord’s call header is unavailable");
    const stopPing = voicePing.bind(findByStoreName("RTCConnectionStore"), FluxDispatcher, enabled);
    try {
        const stopHeader = registerRenderedTree(header, (tree, props: { channelId?: string; }) => {
            if (!isCxProfileUserId(props.channelId) || !React.isValidElement<{ children?: ReactNode; }>(tree)
                || !("children" in tree.props)) return tree;
            return React.cloneElement(tree, { children: <>{tree.props.children}<VoicePing channelId={props.channelId} /></> });
        });
        return () => { stopHeader(); stopPing(); };
    } catch (error) { stopPing(); throw error; }
}

function registerCallTimeCounter() {
    const header = findByFilePath("modules/voice_panel/native/header/VoicePanelHeader.tsx")?.default;
    if (!header) throw new Error("Discord's call header is unavailable");
    const stopClock = callClock.bind(SelectedChannelStore, FluxDispatcher);
    try {
        const stopHeader = registerRenderedTree(header, (tree, props: { channelId?: string; }) => {
            if (!isCxProfileUserId(props.channelId) || !React.isValidElement<{ children?: ReactNode; }>(tree)
                || !("children" in tree.props)) return tree;
            return React.cloneElement(tree, { children: <>{tree.props.children}<CallTime channelId={props.channelId} /></> });
        });
        return () => { stopHeader(); stopClock(); };
    } catch (error) { stopClock(); throw error; }
}

function registerJumpToFirst(enabled: () => boolean) {
    const actions = findByProps("jumpToMessage", "fetchMessages");
    if (typeof actions?.jumpToMessage !== "function") throw new Error("Discord message navigation is unavailable");
    return registerRenderedTree("ChannelActionButtons", (tree, props) => {
        const target = getCxFirstMessageTarget((props as { channel?: CxNavigationChannel; }).channel);
        if (!target || !React.isValidElement<{ children?: ReactNode; }>(tree) || !("children" in tree.props)) return tree;
        return React.cloneElement(tree, { children: <>{tree.props.children}<NavigationButton label="Jump to First Message" text="↑" onPress={async () => {
            if (!enabled() || !navigationControls.has("jump-to-first-message") || SelectedChannelStore.getChannelId() !== target.channelId) return;
            try { await actions.jumpToMessage(target); }
            catch { showToast("Couldn't jump to the first message."); }
        }} /></> });
    });
}

function registerReadAllButton(enabled: () => boolean) {
    const footer = findByFilePath("modules/guilds_bar/native/GuildsBarFooterWrapper.tsx")?.default;
    if (!footer) throw new Error("Discord's server list is unavailable");
    return registerJsxAppearance([footer], element => React.cloneElement(element, { children: <>
        {element.props.children}<NavigationButton label="Mark Servers as Read" text="Read All" onPress={async () => {
            if (!enabled() || !navigationControls.has("read-all-servers-button")) return;
            try { showToast(await markCxServersReadAndWait(getReadStores(), acknowledgeServers)); }
            catch { showToast("Couldn't mark servers as read."); }
        }} />
    </> }));
}

function hideDisabledEmojiInPicker(enabled: () => boolean) {
    const picker = findByFilePath("modules/emoji_picker/native/components/useComputeEmojiPickerFunctions.tsx");
    type CategoryOptions = { categories?: Parameters<typeof filterCxEmojiCategories>[0]; };
    type SearchOptions = { emojis?: { locked?: readonly unknown[]; unlocked?: readonly unknown[]; }; };
    type PickerFunctions = {
        computeCategories: (options: CategoryOptions, ...rest: unknown[]) => unknown;
        computeSearchResults: (options: SearchOptions, ...rest: unknown[]) => unknown;
    };
    let active = true;
    const wrappers = new WeakMap<PickerFunctions, PickerFunctions>();
    const stop = overrideCxMethods(picker, {
        default(args, invoke) {
            const native = invoke(args) as PickerFunctions | undefined;
            if (typeof native?.computeCategories !== "function" || typeof native.computeSearchResults !== "function") return native;
            let wrapped = wrappers.get(native);
            if (!wrapped) {
                wrapped = {
                    ...native,
                    computeCategories(options, ...rest) {
                        const original = options?.categories;
                        const visible = active && enabled() && Array.isArray(original) ? filterCxEmojiCategories(original) : original;
                        return native.computeCategories(visible === original ? options : { ...options, categories: visible }, ...rest);
                    },
                    computeSearchResults(options, ...rest) {
                        const emojis = options?.emojis;
                        if (!active || !enabled() || !Array.isArray(emojis?.locked) || !emojis.locked.length)
                            return native.computeSearchResults(options, ...rest);
                        return native.computeSearchResults({ ...options, emojis: { ...emojis, locked: [] } }, ...rest);
                    },
                };
                wrappers.set(native, wrapped);
            }
            return wrapped;
        },
    }, enabled);
    return () => { active = false; stop(); };
}

function registerSplitSender() {
    if (splitSender) throw new Error("A CX message splitter is already active");
    const sender = createCxSplitSender({
        currentUser: () => UserStore?.getCurrentUser?.(),
        channel: id => ChannelStore?.getChannel?.(id),
        enabled: (): boolean => splitSender === sender && !settings.safeMode?.enabled,
        failed: () => { showToast("The remaining message parts were not sent."); },
    });
    const limits = findByFilePath("modules/messages/useMessageMaxLength.tsx");
    const composer = findByFilePath("modules/chat_input/native/accessories/ChatInputSendUtils.tsx");
    let checkingDraft = false;
    const cleanups: (() => void)[] = [];
    const stop = () => {
        if (splitSender === sender) splitSender = undefined;
        for (const cleanup of cleanups.reverse()) cleanup();
    };
    try {
        cleanups.push(overrideCxMethods(limits, {
            getMaxMessageLength: (args, invoke) => checkingDraft ? 32_000 : invoke(args),
        }));
        cleanups.push(overrideCxMethods(composer, {
            chatInputValidateContentLength(args, invoke) {
                const draft = args[0] as { text?: string; params?: { channel?: { id?: string; }; hasAttachmentsToUpload?: boolean; }; } | undefined;
                const channel = draft?.params?.channel?.id;
                if (draft?.params?.hasAttachmentsToUpload || !sender.canSplit(channel, draft?.text)) return invoke(args);
                let parsed: unknown;
                const previous = checkingDraft;
                checkingDraft = true;
                try { parsed = invoke(args); }
                finally { checkingDraft = previous; }
                if (parsed && typeof parsed === "object" && "content" in parsed && sender.canSplit(channel, parsed.content)) return parsed;
                return invoke(args);
            },
        }));
        cleanups.push(overrideCxMethods(messageUtil, { sendMessage: sender.send }));
    } catch (error) {
        stop();
        throw error;
    }
    splitSender = sender;
    return stop;
}

function registerSendConfirmation(check: (text: string) => string | undefined) {
    const composer = findByFilePath("modules/chat_input/native/accessories/ChatInputSendUtils.tsx");
    let active = true;
    let pending: object | undefined;
    const stop = overrideCxMethods(composer, {
        chatInputHandleSendText(args, invoke) {
            const draft = args[0] as { text?: string; params?: { channel?: { id?: string; }; }; } | undefined;
            const text = draft?.text;
            const channel = draft?.params?.channel?.id;
            const body = typeof text === "string" && channel ? check(text) : undefined;
            if (!body) return invoke(args);
            if (pending) return;
            const account = UserStore?.getCurrentUser?.()?.id;
            const selected = SelectedChannelStore?.getChannelId?.();
            const request = {};
            pending = request;
            const dismiss = () => { if (pending === request) pending = undefined; };
            try {
                Alert.alert("Confirm message", body, [
                    { text: "Cancel", style: "cancel", onPress: dismiss },
                    { text: "Send anyway", onPress: () => {
                        if (pending !== request) return;
                        dismiss();
                        if (active && !settings.safeMode?.enabled && account && account === UserStore?.getCurrentUser?.()?.id
                            && selected === SelectedChannelStore?.getChannelId?.() && draft?.text === text && draft?.params?.channel?.id === channel)
                            invoke(args);
                    } },
                ], { cancelable: true, onDismiss: dismiss });
            } catch {
                dismiss();
                showToast("Couldn’t open the send confirmation.");
            }
        },
    }, () => !settings.safeMode?.enabled);
    return () => { active = false; stop(); };
}

type AppearanceChange = (element: JSX.Element) => JSX.Element | null;
const appearanceBindings = new Map<string | object, ReturnType<typeof bindAppearance>>();

function bindAppearance(name: string | object) {
    let revision = 0;
    let changes = new Set<AppearanceChange>();
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    };
    const getRevision = () => revision;
    function Appearance({ element }: { element: JSX.Element; }) {
        React.useSyncExternalStore(subscribe, getRevision);
        if (settings.safeMode?.enabled) return element;
        let current: JSX.Element | null = element;
        for (const change of changes) {
            current = change(current);
            if (!current) break;
        }
        return current;
    }
    const wrap = (_: unknown, element: JSX.Element) => <Appearance key={element.key} element={element} />;
    function refresh() {
        revision++;
        for (const listener of [...listeners]) listener();
    }
    onJsxCreate(name, wrap, true);
    return (change: AppearanceChange, beforeWrapping: boolean) => {
        if (beforeWrapping) changes = new Set([change, ...changes]);
        else changes.add(change);
        refresh();
        return () => {
            if (!changes.delete(change)) return;
            if (!changes.size) {
                deleteJsxCreate(name, wrap, true);
                appearanceBindings.delete(name);
            }
            refresh();
        };
    };
}

function registerJsxAppearance(names: readonly (string | object)[], change: AppearanceChange, beforeWrapping = false) {
    const cleanups = names.map(name => {
        let bind = appearanceBindings.get(name);
        if (!bind) {
            bind = bindAppearance(name);
            appearanceBindings.set(name, bind);
        }
        return bind(change, beforeWrapping);
    });
    return () => { for (const cleanup of cleanups) cleanup(); };
}

function bindExpressionSheets() {
    const bottomSheet = findByProps("BottomSheet")?.BottomSheet;
    const actionSheet = findByProps("ActionSheet")?.ActionSheet;
    if (!bottomSheet) throw new Error("Discord's expression sheet is unavailable");
    const Selection = React.createContext<{ value: string; emoji: boolean; enabled: () => boolean; } | null>(null);
    function Actions({ element }: { element: JSX.Element; }) {
        const selection = React.useContext(Selection);
        if (!selection?.enabled()) return element;
        const { value, emoji, enabled } = selection;
        const copy = () => {
            if (!enabled()) return;
            clipboard?.setString?.(value);
            showToast(emoji ? "Emoji copied." : "Sticker link copied.");
        };
        return React.cloneElement(element, { children: <>
            {element.props.children}
            <TableRowGroup>
                <TableRow label={emoji ? "Copy Emoji Markdown" : "Copy Sticker Link"} onPress={copy} />
                {!emoji && <TableRow label="Open Sticker Link" onPress={() => {
                    if (enabled()) void Linking.openURL(value).catch(() => showToast("Couldn't open the sticker link."));
                }} />}
            </TableRowGroup>
        </> });
    }
    const stop = registerJsxAppearance([...new Set(actionSheet ? [bottomSheet, actionSheet] : [bottomSheet])],
        element => <Actions element={element} />);
    return { Selection, stop, users: 0 };
}

let expressionSheetBinding: ReturnType<typeof bindExpressionSheets> | undefined;

function registerExpressionLinks(effect: "copy-emoji-markdown" | "sticker-links") {
    const emoji = effect === "copy-emoji-markdown";
    const paths = emoji ? ["modules/messages/native/emoji/MessageEmojiActionSheet.tsx"]
        : ["modules/stickers/native/StickerDetailActionSheet.tsx", "modules/stickers/native/StickerOptionsActionSheet.tsx"];
    const sheets = paths.map(path => findByFilePath(path)?.default).filter(Boolean);
    if (!sheets.length) throw new Error("Discord's expression sheet is unavailable");
    const binding = expressionSheetBinding ??= bindExpressionSheets();
    let active = true;
    const enabled = () => active && !settings.safeMode?.enabled;
    const stopSelection = registerJsxAppearance(sheets, element => {
        const { emojiNode, renderableSticker, stickerUrl } = element.props;
        const id = renderableSticker?.id;
        const value = emoji ? formatCxEmojiMarkdown(emojiNode)
            : validateCxStickerLink(stickerUrl) ?? formatCxStickerLink(renderableSticker)
                ?? (isCxProfileUserId(id) ? formatCxStickerLink(findByStoreName("StickersStore")?.getStickerById?.(id)) : undefined);
        return value ? <binding.Selection.Provider value={{ value, emoji, enabled }}>{element}</binding.Selection.Provider> : element;
    });
    binding.users++;
    return () => {
        active = false;
        stopSelection();
        if (--binding.users === 0) {
            binding.stop();
            expressionSheetBinding = undefined;
        }
    };
}

function patchMediaViewerAction(label: string, enabled: () => boolean, select: (link: string, source: CxSearchMediaSource) => (() => void) | undefined) {
    const mediaActions = findByFilePath("modules/media_viewer/native/components/MediaShareActions.tsx");
    const IconComponent = findByProps("LinkIcon")?.LinkIcon;
    return overrideCxMethods(mediaActions, {
        useMediaShareActions(args, invoke) {
            const actions = invoke(args);
            const media = args[0] as {
                source?: CxSearchMediaSource;
                shareable?: boolean; disableDownload?: boolean;
            } | undefined;
            if (!Array.isArray(actions) || !actions.length || media?.disableDownload || media?.shareable === false || media?.source?.obscure) return actions;
            const source = media?.source;
            const link = validateCxMediaLink(source?.shareURI) ?? validateCxMediaLink(source?.sourceURI) ?? validateCxMediaLink(source?.uri);
            if (!source || !link || actions.some(action => action?.label === label)) return actions;
            const action = select(link, source);
            return action ? [...actions, { label, IconComponent, action }] : actions;
        },
    }, enabled);
}

function registerReverseImageSearch() {
    const sheets = findByProps("showSimpleActionSheet");
    if (typeof sheets?.showSimpleActionSheet !== "function") throw new Error("Discord's search menu is unavailable");
    let active = true;
    const enabled = () => active && !settings.safeMode?.enabled;
    const stop = patchMediaViewerAction("Search Image (CX)", enabled, (link, source) => {
        const image = validateCxMediaLink(source.sourceURI) ?? validateCxMediaLink(source.uri) ?? link;
        const options = getCxImageSearchOptions(image, source);
        if (!options.length) return;
        return () => {
            if (!enabled()) return;
            sheets.showSimpleActionSheet({
                key: "CxReverseImageSearch",
                header: { title: "Search Image", subtitle: "The selected search engine will receive the image URL." },
                options: options.map(({ label, url }) => ({ label, onPress: () => {
                    if (enabled()) void Linking.openURL(url).catch(() => showToast("Couldn't open image search."));
                } })),
            });
        };
    });
    return () => { active = false; stop(); };
}

function registerImageFilename(full: boolean) {
    let active = true;
    const enabled = () => active && !settings.safeMode?.enabled;
    const label = full ? "Image URL (CX)" : "Image Filename (CX)";
    const stop = patchMediaViewerAction(label, enabled, link => {
        const name = getCxImageTitle(link, full);
        return name ? () => { if (enabled()) Alert.alert(label, name); } : undefined;
    });
    return () => { active = false; stop(); };
}

function registerMediaLinkCopy() {
    let active = true;
    const enabled = () => active && !settings.safeMode?.enabled;
    const copy = (link: string) => () => {
        if (!enabled()) return;
        clipboard.setString(link);
        showToast.showCopyToClipboard?.();
    };
    const stopMedia = patchMediaViewerAction("Copy Media Link (CX)", enabled, copy);
    try {
        const stopLinks = overrideCxMethods(findByProps("showSimpleActionSheet"), {
            showSimpleActionSheet(args, invoke) {
                const [options, ...rest] = args;
                const sheet = options as { key?: string; header?: { subtitle?: unknown; }; options?: unknown[]; } | undefined;
                const link = sheet?.key === "LongPressUrl" && validateCxMediaLink(sheet.header?.subtitle);
                if (!link || !Array.isArray(sheet?.options)) return invoke(args);
                const actions = [...sheet.options, { label: "Copy Link (CX)", onPress: copy(link) }];
                return invoke([{ ...sheet, options: actions }, ...rest]);
            },
        }, enabled);
        return () => { active = false; stopLinks(); stopMedia(); };
    } catch (error) {
        active = false;
        stopMedia();
        throw error;
    }
}

function mapMediaEntries<T>(items: readonly T[], transform: (item: T) => T) {
    let next: T[] | undefined;
    items.forEach((item, index) => {
        const changed = transform(item);
        if (changed !== item) (next ??= items.slice())[index] = changed;
    });
    return next ?? items;
}

let blurredMedia: { all: number; nsfw: number; stop: () => void; } | undefined;

function registerBlurredMedia(mode: "all" | "nsfw") {
    if (!blurredMedia) {
        const renderer = findByFilePath("modules/messages/native/renderer/createMessageContent.tsx");
        const types = findByProps("AttachmentType")?.AttachmentType;
        if (types?.IMAGE == null || types?.VIDEO == null) throw new Error("Discord's attachment types are unavailable");
        const translations = findByProps("intl", "t");
        const text = translations?.t?.["F+x38C"];
        const label = text ? translations.intl?.string?.(text) : undefined;
        const spoiler = typeof label === "string" && label ? label.toUpperCase() : "SPOILER";
        const binding = { all: 0, nsfw: 0 };
        type Media = {
            attachmentType?: unknown; url?: unknown; image?: unknown; video?: unknown; thumbnail?: unknown; images?: unknown;
            isSpoiler?: boolean; spoiler?: string; obscure?: unknown; verifyAge?: unknown; obscureAwaitingScan?: unknown;
            obscureHideControls?: unknown; obscureIsOpaque?: unknown; isSuspiciousDownload?: unknown;
        };
        const untouched = (media: Media | null | undefined) => !media || typeof media !== "object" || media.isSpoiler
            || media.spoiler || media.obscure || media.verifyAge || media.obscureAwaitingScan || media.obscureHideControls
            || media.obscureIsOpaque || media.isSuspiciousDownload;
        const stop = overrideCxMethods(renderer, {
            default(args, invoke) {
                const row = invoke(args) as { channelId?: string; attachments?: Media[]; embeds?: Media[]; } | undefined;
                if (!row || !row.attachments?.length && !row.embeds?.length) return row;
                const concealAll = binding.all > 0;
                if (!concealAll && (!binding.nsfw || !row.channelId || ChannelStore?.getChannel?.(row.channelId)?.nsfw !== true)) return row;
                const attachments = Array.isArray(row.attachments) ? mapMediaEntries(row.attachments, item => {
                    if (untouched(item) || typeof item.url !== "string"
                        || item.attachmentType !== types.IMAGE && item.attachmentType !== types.VIDEO) return item;
                    return { ...item, isSpoiler: true, spoiler };
                }) : row.attachments;
                const embeds = concealAll && Array.isArray(row.embeds) ? mapMediaEntries(row.embeds, item => {
                    if (untouched(item) || !(item.image || item.video || item.thumbnail || Array.isArray(item.images) && item.images.length)) return item;
                    return { ...item, spoiler };
                }) : row.embeds;
                return attachments === row.attachments && embeds === row.embeds ? row : { ...row, attachments, embeds };
            },
        }, () => !settings.safeMode?.enabled);
        blurredMedia = Object.assign(binding, { stop });
    }
    const binding = blurredMedia;
    binding[mode]++;
    return () => {
        binding[mode]--;
        if (binding.all || binding.nsfw) return;
        blurredMedia = undefined;
        binding.stop();
    };
}

function registerGifAltText() {
    const enabled = () => !settings.safeMode?.enabled;
    const cleanups: (() => void)[] = [];
    const stop = () => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); };
    try {
        const attachments = findByFilePath("modules/messages/native/renderer/transformMessageAttachments.tsx");
        cleanups.push(overrideCxMethods(attachments, {
            default(args, invoke) {
                const rows = invoke(args);
                if (!Array.isArray(rows)) return rows;
                return mapMediaEntries(rows, item => {
                    if (!item || item.obscure || item.isSuspiciousDownload || item.description) return item;
                    const alt = getCxGifDescription(item.url, item.alt);
                    return alt ? { ...item, alt } : item;
                });
            },
        }, enabled));
        const viewer = findByFilePath("modules/media_viewer/native/useMediaViewerSources.tsx");
        cleanups.push(overrideCxMethods(viewer, {
            setMediaViewerSources(args, invoke) {
                const [options, ...rest] = args;
                const state = options as { sources?: unknown[]; } | undefined;
                if (!Array.isArray(state?.sources)) return invoke(args);
                const sources = mapMediaEntries(state.sources, item => {
                    const source = item as { uri?: unknown; sourceURI?: unknown; description?: unknown; obscure?: unknown;
                        spoiler?: unknown; contentType?: unknown; } | undefined;
                    if (!source || source.obscure || source.spoiler) return item;
                    const description = getCxGifDescription(source.sourceURI ?? source.uri, source.description, source.contentType === "image/gif");
                    return description ? { ...source, description } : item;
                });
                return invoke(sources === state.sources ? args : [{ ...state, sources }, ...rest]);
            },
        }, enabled));
        const picker = findByFilePath("modules/gif_picker/native/GIFPickerItemView.tsx");
        cleanups.push(overrideCxMethods(picker, {
            default(args, invoke) {
                const element = invoke(args);
                const item = (args[0] as { item?: { src?: unknown; }; } | undefined)?.item;
                if (!React.isValidElement<{ accessibilityLabel?: string; accessibilityRole?: string; }>(element)
                    || element.props.accessibilityRole !== "button") return element;
                const description = getCxGifDescription(item?.src, undefined, true);
                if (!description) return element;
                const label = element.props.accessibilityLabel;
                return React.cloneElement(element, { accessibilityLabel: label ? label + ". " + description : description });
            },
        }, enabled));
        return stop;
    } catch (error) {
        stop();
        throw error;
    }
}

let attachmentQualityBinding: { stop: () => void; users: number; originals: number; } | undefined;

function patchAttachmentImageQuality() {
    const enabled = () => !settings.safeMode?.enabled;
    const chat = findByFilePath("modules/messages/native/renderer/transformMessageAttachments.tsx");
    const viewer = findByFilePath("modules/media_viewer/native/useMediaViewerSources.tsx");
    const binding = { users: 0, originals: 0 };
    const stopChat = overrideCxMethods(chat, {
        default(args, invoke) {
            const attachments = invoke(args);
            if (!Array.isArray(attachments) || !(args[0] as { shouldInlineAttachmentMedia?: boolean; } | undefined)?.shouldInlineAttachmentMedia)
                return attachments;
            return mapMediaEntries(attachments, item => {
                if (!item || item.obscure || item.isSuspiciousDownload || item.videoUrl || item.inlinePlaybackDisabled) return item;
                const url = getCxAttachmentImageUrl(item.url, { width: item.width, height: item.height, original: binding.originals > 0,
                    frozen: item.srcIsAnimated === true && item.isAnimated === false ? true : undefined });
                return url && url !== item.url ? { ...item, url } : item;
            });
        },
    }, enabled);
    try {
        const stopViewer = overrideCxMethods(viewer, {
            setMediaViewerSources(args, invoke) {
                const [options, ...rest] = args;
                const state = options as { sources?: unknown[]; } | undefined;
                if (!Array.isArray(state?.sources)) return invoke(args);
                const sources = mapMediaEntries(state.sources, item => {
                    const source = item as { uri?: unknown; videoURI?: unknown; obscure?: unknown; spoiler?: unknown; } | undefined;
                    if (!source || source.videoURI || source.obscure || source.spoiler) return item;
                    const uri = getCxAttachmentImageUrl(source.uri, { original: true });
                    return uri && uri !== source.uri ? { ...source, uri } : item;
                });
                return invoke(sources === state.sources ? args : [{ ...state, sources }, ...rest]);
            },
        }, enabled);
        return Object.assign(binding, { stop: () => { stopViewer(); stopChat(); } });
    } catch (error) {
        stopChat();
        throw error;
    }
}

function registerAttachmentImageQuality(original: boolean) {
    const binding = attachmentQualityBinding ??= patchAttachmentImageQuality();
    binding.users++;
    if (original) binding.originals++;
    return () => {
        if (original) binding.originals--;
        if (--binding.users === 0) {
            binding.stop();
            attachmentQualityBinding = undefined;
        }
    };
}

let memberRowScope: { context: Context<boolean>; stop: () => void; users: number; } | undefined;

function registerMemberRowAppearance(target: string | object, change: AppearanceChange) {
    if (!memberRowScope) {
        const context = React.createContext(false);
        const stop = registerJsxAppearance(["UserRowSubLabel"], element => element.props.guildId
            ? <context.Provider value={true}>{element}</context.Provider> : element);
        memberRowScope = { context, stop, users: 0 };
    }
    const scope = memberRowScope;
    scope.users++;
    function MemberAppearance({ element }: { element: JSX.Element; }) {
        const inMemberRow = React.useContext(scope.context);
        return inMemberRow && !settings.safeMode?.enabled ? change(element) : element;
    }
    const stopAppearance = registerJsxAppearance([target], element => <MemberAppearance element={element} />);
    return () => {
        stopAppearance();
        if (--scope.users === 0) {
            scope.stop();
            memberRowScope = undefined;
        }
    };
}

let staticTypingDots: { stop: () => void; users: number; } | undefined;
let hasUploadAnonymiser = false;

function registerUploadAnonymiser(anonymiser: CxUploadAnonymiser) {
    if (hasUploadAnonymiser) throw new Error("An upload naming rule is already enabled");
    const preview = findByFilePath("modules/media_uploads/native/UploadPreviewActionSheet.tsx")?.default;
    if (typeof preview !== "function") throw new Error("Discord's attachment preview is unavailable");
    const uploader = findByFilePath("lib/uploader/native/CloudUploader.tsx")?.default?.prototype;
    let active = true;
    const enabled = () => active && !settings.safeMode?.enabled;
    type Upload = Parameters<CxUploadAnonymiser["isAnonymous"]>[0];
    function AnonymousUploadRow({ upload }: { upload: Upload; }) {
        const [selected, setSelected] = React.useState(() => anonymiser.isAnonymous(upload));
        return <TableRow label="Use anonymous filename" subLabel={selected ? "On" : "Off"} onPress={() => {
            if (!enabled()) return;
            const next = !selected;
            anonymiser.setAnonymous(upload, next);
            setSelected(next);
        }} />;
    }
    function PreviewWithAnonymousRow({ previewProps }: { previewProps: { upload?: Upload; }; }) {
        const output = preview(previewProps) as ReactNode;
        const { upload } = previewProps;
        if (!enabled() || !upload || typeof upload !== "object") return output;
        let inserted = false;
        function insert(tree: ReactNode, depth = 0): ReactNode {
            if (inserted || depth >= 12) return tree;
            if (Array.isArray(tree)) {
                const next = tree.map(child => insert(child, depth + 1));
                return inserted ? next : tree;
            }
            if (!React.isValidElement<{ children?: ReactNode; onLayout?: unknown; spacing?: number; }>(tree)) return tree;
            const { children, onLayout, spacing } = tree.props;
            if (tree.type === Stack && spacing === 16 && typeof onLayout === "function") {
                inserted = true;
                return React.cloneElement(tree, { children: [...React.Children.toArray(children),
                    <TableRowGroup key="cx-anonymous-upload" title="CloudCord"><AnonymousUploadRow upload={upload} /></TableRowGroup>] });
            }
            const next = insert(children, depth + 1);
            return next === children ? tree : React.cloneElement(tree, { children: next });
        }
        return insert(output);
    }
    const stopUploads = overrideCxMethods(uploader, {
        uploadFiles: (args, original) => {
            anonymiser.apply(args[0]);
            return original(args);
        },
    }, enabled);
    const stopPreview = registerJsxAppearance([preview], element =>
        <PreviewWithAnonymousRow previewProps={element.props} />);
    hasUploadAnonymiser = true;
    return () => {
        active = false;
        stopPreview();
        stopUploads();
        hasUploadAnonymiser = false;
    };
}

function registerStaticTypingDots() {
    if (!staticTypingDots) {
        const ellipsis = findByFilePath("design/components/Button/native/ButtonEllipsis.native.tsx")?.Ellipsis;
        if (!ellipsis) throw new Error("Discord's typing dots are unavailable");
        const InTypingIndicator = React.createContext(false);
        function TypingDots({ element }: { element: JSX.Element; }) {
            const inside = React.useContext(InTypingIndicator);
            if (!inside || settings.safeMode?.enabled) return element;
            const backgroundColor = resolveSemanticColor(semanticColors.INTERACTIVE_TEXT_DEFAULT ?? semanticColors.INTERACTIVE_ICON_DEFAULT)
                ?? "#949ba4";
            const dot = { width: 5, height: 5, borderRadius: 3, backgroundColor };
            return <View style={{ flexDirection: "row", gap: 4 }} accessible={false}>
                <View style={dot} /><View style={dot} /><View style={dot} />
            </View>;
        }
        const stopScope = registerJsxAppearance(["TypingIndicatorInner"], element =>
            <InTypingIndicator.Provider value={true}>{element}</InTypingIndicator.Provider>);
        const stopDots = registerJsxAppearance([ellipsis], element => <TypingDots element={element} />);
        staticTypingDots = { stop: () => { stopDots(); stopScope(); }, users: 0 };
    }
    const binding = staticTypingDots;
    binding.users++;
    return () => {
        if (--binding.users === 0) {
            binding.stop();
            staticTypingDots = undefined;
        }
    };
}

type AppearanceProps = {
    children?: ReactNode; accessibilityRole?: string; accessibilityLabel?: string; onPress?: unknown;
    IconComponent?: unknown; triggerOnLongPress?: boolean;
};

function containsAppearanceType(tree: ReactNode, types: ReadonlySet<unknown>, depth = 0): boolean {
    if (depth >= 16) return false;
    if (Array.isArray(tree)) return tree.some(child => containsAppearanceType(child, types, depth + 1));
    return React.isValidElement<AppearanceProps>(tree)
        && (types.has(tree.type) || containsAppearanceType(tree.props.children, types, depth + 1));
}

function mapAppearanceElements(tree: ReactNode, map: (element: ReactElement<AppearanceProps>) => ReactNode, depth = 0): ReactNode {
    if (depth >= 16) return tree;
    if (Array.isArray(tree)) {
        const next = tree.map(child => mapAppearanceElements(child, map, depth + 1));
        return next.every((child, index) => child === tree[index]) ? tree : next;
    }
    if (!React.isValidElement<AppearanceProps>(tree)) return tree;
    const mapped = map(tree);
    if (mapped !== tree) return mapped;
    const { children } = tree.props;
    const next = mapAppearanceElements(children, map, depth + 1);
    return next === children ? tree : React.cloneElement(tree, { children: next });
}

function hideAppearanceElements(tree: ReactNode, shouldHide: (element: ReactElement<AppearanceProps>) => boolean) {
    return mapAppearanceElements(tree, element => shouldHide(element) ? null : element);
}

function registerNoRoleHeaders() {
    const list = findByFilePath("modules/main_tabs_v2/native/shared_components/user_list/UsersFastList.tsx")?.UsersFastList;
    if (!list) throw new Error("Discord's member list is unavailable");
    let active = true;
    const stop = registerJsxAppearance([list], element => {
        if (element.key !== "guild-channel-user-list") return element;
        const props = element.props as AppearanceProps & { getSectionProps?: (...args: unknown[]) => unknown; };
        const original = props.getSectionProps;
        if (typeof original !== "function") return element;
        const getSectionProps = function (this: unknown, ...args: unknown[]) {
            const section = Reflect.apply(original, this, args) as { type?: string; props?: { title?: string; action?: unknown; onTitlePress?: unknown; }; } | undefined;
            return active && !settings.safeMode?.enabled && section?.type === "section" && typeof section.props?.title === "string"
                && !section.props.action && !section.props.onTitlePress ? undefined : section;
        };
        return React.cloneElement(element as ReactElement<typeof props>, { getSectionProps });
    });
    return () => { active = false; stop(); };
}

function registerCompactMemberList() {
    const list = findByFilePath("modules/main_tabs_v2/native/shared_components/user_list/UsersFastList.tsx")?.UsersFastList;
    if (!list) throw new Error("Discord's member list is unavailable");
    const fontScale = findByFilePath("modules/user_settings/appearance/native/FontScaleStore.tsx")?.useFontScaleStore;
    return registerJsxAppearance([list], element => {
        if (element.key !== "guild-channel-user-list" || element.props.getItemSize != null) return element;
        if (PixelRatio.getFontScale() > 1 || fontScale?.getState?.()?.fontScale > 1) return element;
        // Discord's member rows fill the height assigned by the virtual list.
        return React.cloneElement(element, { getItemSize: 44 });
    });
}

function registerTreeAppearance(rule: {
    hideComponents?: readonly string[]; hideIcons?: readonly string[];
    keepWhilePresent?: readonly string[]; hideLabels?: readonly string[]; hideText?: readonly string[];
    hideControlIcons?: readonly string[]; hideLongPressMenu?: boolean;
} & ({ renderTree: string; } | { renderComponent: string; })) {
    const target = "renderTree" in rule ? findByFilePath(rule.renderTree)?.default : rule.renderComponent;
    if (!target) throw new Error("Discord's appearance component is unavailable");
    const getTypes = (names: readonly string[]) => new Set(names.map(name => findByProps(name)?.[name]).filter(Boolean));
    const components = getTypes(rule.hideComponents ?? []);
    const icons = getTypes(rule.hideIcons ?? []);
    const controlIcons = getTypes(rule.hideControlIcons ?? []);
    const longPressMenu = rule.hideLongPressMenu && findByProps("ContextMenu")?.ContextMenu;
    if (rule.hideControlIcons && controlIcons.size !== rule.hideControlIcons.length || rule.hideLongPressMenu && !longPressMenu) {
        throw new Error("Discord's appearance controls are unavailable");
    }
    const translations = (rule.hideLabels || rule.hideText) && findByProps("intl", "t");
    const translate = (keys: readonly string[] = []) => keys.flatMap(key => {
        const message = translations?.t?.[key];
        const label = message && translations?.intl?.string?.(message);
        return typeof label === "string" && label ? [label] : [];
    });
    const labels = new Set(translate(rule.hideLabels));
    const text = new Set(translate(rule.hideText).map(label => label.toUpperCase()));
    if (!components.size && !icons.size && !labels.size && !text.size && !controlIcons.size && !longPressMenu) {
        throw new Error("Discord's appearance targets are unavailable");
    }
    const keep = getTypes(rule.keepWhilePresent ?? []);
    if (rule.keepWhilePresent && keep.size !== rule.keepWhilePresent.length) {
        throw new Error("Discord's active call controls are unavailable");
    }
    const shouldHide = ({ type, props }: ReactElement<AppearanceProps>) => {
        const { children, accessibilityRole, accessibilityLabel, onPress, IconComponent, triggerOnLongPress } = props;
        return components.has(type)
            || Boolean(longPressMenu && type === longPressMenu && triggerOnLongPress === true)
            || accessibilityRole === "text" && typeof children === "string" && text.has(children)
            || typeof onPress === "function" && (
                controlIcons.has(IconComponent)
                || Boolean(accessibilityLabel && labels.has(accessibilityLabel))
                || accessibilityRole === "button" && icons.size > 0 && containsAppearanceType(children, icons)
            );
    };
    return registerRenderedTree(target, tree =>
        keep.size && containsAppearanceType(tree, keep) ? tree : hideAppearanceElements(tree, shouldHide));
}

const renderedTreeOriginals = new WeakMap<object, object>();

function registerRenderedTree(target: string | object, change: (tree: ReactNode, props: object) => ReactNode) {
    const wrappers = new WeakMap<object, { type: ComponentType<object>; forwardsRef: boolean; }>();
    let active = true;
    function wrapRenderer(element: JSX.Element) {
        const component = element.type as {
            $$typeof?: symbol;
            type?: unknown;
            compare?: (previous: object, next: object) => boolean;
        };
        const original = renderedTreeOriginals.get(component) ?? component;
        if (typeof target !== "string" && original !== target) return element;
        let wrapper = wrappers.get(component);
        if (!wrapper) {
            const memoized = component?.$$typeof === Symbol.for("react.memo");
            const inner = (memoized ? component.type : component) as { $$typeof?: symbol; render?: unknown; };
            const forwardsRef = inner?.$$typeof === Symbol.for("react.forward_ref");
            const nativeRender = forwardsRef ? inner.render : inner;
            if (typeof nativeRender !== "function" || nativeRender.prototype?.isReactComponent) return element;
            const render = nativeRender;
            function FilteredTree(props: object, ref?: unknown) {
                const tree = render(props, ref) as ReactNode;
                return !active || settings.safeMode?.enabled ? tree : change(tree, props);
            }
            const filtered = forwardsRef ? React.forwardRef(FilteredTree) : FilteredTree;
            wrapper = { type: memoized ? React.memo(filtered, component.compare) : filtered, forwardsRef };
            wrappers.set(component, wrapper);
            renderedTreeOriginals.set(wrapper.type, original);
        }
        const props = { ...element.props, key: element.key };
        if (wrapper.forwardsRef) props.ref ??= Object.getOwnPropertyDescriptor(element, "ref")?.value;
        return React.createElement(wrapper.type, props);
    }
    const stop = registerJsxAppearance([target], element => mapChatBackgroundRenderer(element, wrapRenderer));
    return () => { active = false; stop(); };
}

type CxMobileMessageMenu = {
    channel?: { id: string; guild_id?: string; isThread?: () => boolean; };
    message?: CxRepeatMessage & Parameters<typeof getCxEmbedToggle>[0] & { pinned?: boolean; };
    chatInputRef?: { current?: { insertText?: (text: string, start: null, appendSpace: boolean, nodes: undefined, end: null) => void; }; };
};

function registerMessageMenuActions(
    enabled: () => boolean,
    createActions: (props: CxMobileMessageMenu, close: () => void, stillActive: () => boolean) => readonly { label: string; run: () => void; }[],
    requiresSendPermission = true,
) {
    const menu = findByFilePath("modules/messages/native/long_press/LongPressMessageActionSheet.tsx")?.default;
    const sheet = findByProps("ActionSheet")?.ActionSheet;
    const { ActionSheetRow } = findByProps("ActionSheetRow") ?? {};
    const ActionSheetRowGroup = ActionSheetRow?.Group;
    const sheetActions = findByProps("openLazy", "hideActionSheet");
    const permissions = findByProps("Fonts", "Permissions")?.Permissions;
    const permissionStore = findByStoreName("PermissionStore");
    if (!menu || !sheet || !ActionSheetRow || !ActionSheetRowGroup || typeof sheetActions?.hideActionSheet !== "function") {
        throw new Error("Discord's message actions are unavailable");
    }
    let active = true;
    const stop = registerRenderedTree(menu, (tree, props: CxMobileMessageMenu) => {
        const { channel, message } = props;
        if (!channel || message?.channel_id !== channel.id) return tree;
        const { id: channelId, guild_id: guildId } = channel;
        function canUseAction() {
            const permission = channel?.isThread?.() ? permissions?.SEND_MESSAGES_IN_THREADS : permissions?.SEND_MESSAGES;
            return active && enabled() && SelectedChannelStore?.getChannelId?.() === channelId
                && (!requiresSendPermission || !guildId || permission != null && permissionStore?.can?.(permission, channel) === true);
        }
        if (!canUseAction()) return tree;
        const actions = createActions(props, () => sheetActions.hideActionSheet(), canUseAction);
        if (!actions.length) return tree;
        return mapAppearanceElements(tree, element => {
            if (element.type !== sheet) return element;
            return React.cloneElement(element, { children: [
                ...React.Children.toArray(element.props.children),
                <ActionSheetRowGroup key={actions[0].label}>
                    {actions.map(({ label, run }, index) => <ActionSheetRow key={label + index} label={label}
                        onPress={() => { if (canUseAction()) return run(); }} />)}
                </ActionSheetRowGroup>,
            ] });
        });
    });
    return () => { active = false; stop(); };
}

function registerQuickMention(enabled: () => boolean) {
    return registerMessageMenuActions(enabled, ({ message, chatInputRef }, close) => {
        const author = message?.author?.id;
        if (!isCxProfileUserId(author) || typeof chatInputRef?.current?.insertText !== "function") return [];
        return [{ label: "Quick Mention", run() {
            const composer = chatInputRef.current;
            if (typeof composer?.insertText !== "function") return;
            composer.insertText("<@" + author + "> ", null, false, undefined, null);
            close();
        } }];
    });
}

function registerJumpToMessageMenu(enabled: () => boolean) {
    const rest = findByProps("HTTP")?.HTTP ?? findByProps("get", "post", "patch", "del");
    const navigation = findByProps("transitionToChannel", "transitionToMessage");
    const sheet = findByProps("ActionSheet")?.ActionSheet;
    const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow;
    if (typeof rest?.get !== "function" || typeof navigation?.transitionToMessage !== "function" || !sheet || !ActionSheetRow?.Group) {
        throw new Error("Discord's message navigation is unavailable");
    }
    let active = true;
    const jumpActions = createCxJumpActions(request => rest.get(request),
        (id, message) => navigation.transitionToMessage(id, message), showToast);
    const stopMessage = registerMessageMenuActions(enabled, ({ channel, message }, close, stillActive) => {
        if (!channel) return [];
        const author = message?.author?.id;
        if (channel.guild_id && !isCxProfileUserId(author)) return [];
        const current = ChannelStore.getChannel(channel.id);
        return jumpActions(current, stillActive, channel.guild_id ? author : undefined).map(({ label, run }) => ({
            label, run: () => { close(); return run(); },
        }));
    }, false);
    type JumpChannel = Parameters<typeof jumpActions>[0];
    function addChannelActions(tree: ReactNode, props: { channel?: JumpChannel; thread?: JumpChannel; onClose?: () => void; }) {
        const actions = jumpActions(props.thread ?? props.channel, () => active && enabled());
        if (!actions.length) return tree;
        return mapAppearanceElements(tree, element => element.type === sheet
            ? React.cloneElement(element, { children: [
                ...React.Children.toArray(element.props.children),
                <ActionSheetRow.Group key="cx-jump-to-message">
                    {actions.map(({ label, run }) => <ActionSheetRow key={label} label={label} onPress={() => {
                        if (!active || !enabled()) return;
                        props.onClose?.();
                        return run();
                    }} />)}
                </ActionSheetRow.Group>,
            ] }) : element);
    }
    const cleanups = [stopMessage];
    function stop() {
        active = false;
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
    try {
        for (const target of ["ChannelLongPressActionSheetConnected", "ThreadLongPressActionSheetConnected", "ForumPostLongPressActionSheet"]) {
            cleanups.push(registerRenderedTree(target, addChannelActions));
        }
        return stop;
    } catch (error) { stop(); throw error; }
}

function playCxVoiceTone(name: "user_join" | "user_leave") {
    const sound = findByFilePath("modules/sound_playback/native/SoundUtils.tsx");
    void Promise.resolve(sound?.playSound?.(name)).catch(() => {});
}

function registerWaitForSlot(options: CxVoiceQueueOptions, enabled: () => boolean) {
    const actions = findByProps("selectVoiceChannel");
    const voice = findByStoreName("VoiceStateStore");
    const permission = findByStoreName("PermissionStore");
    const bits = findByProps("Fonts", "Permissions")?.Permissions;
    const sheet = findByProps("ActionSheet")?.ActionSheet;
    const Row = findByProps("ActionSheetRow")?.ActionSheetRow;
    if (typeof actions?.selectVoiceChannel !== "function" || typeof voice?.getVoiceStatesForChannel !== "function"
        || typeof permission?.can !== "function" || bits?.CONNECT == null || bits?.VIEW_CHANNEL == null
        || bits?.MOVE_MEMBERS == null || !sheet || !Row?.Group) throw new Error("Discord's voice queue controls are unavailable");
    const queue = createCxVoiceQueue({
        account: () => UserStore.getCurrentUser()?.id,
        currentVoice: () => SelectedChannelStore.getVoiceChannelId(),
        room(id) {
            const channel = ChannelStore.getChannel(id);
            if (channel?.type !== 2 || !permission.can(bits.VIEW_CHANNEL, channel) || !permission.can(bits.CONNECT, channel)
                || permission.can(bits.MOVE_MEMBERS, channel)) return;
            return getCxVoiceQueueRoom(channel, voice.getVoiceStatesForChannel(id));
        },
        join: id => actions.selectVoiceChannel(id),
        prompt: (title, body, label, confirm, cancel) => Alert.alert(title, body, [
            { text: "Cancel", style: "cancel", onPress: cancel }, { text: label, onPress: confirm },
        ], { cancelable: true, onDismiss: cancel }),
        sound: () => playCxVoiceTone("user_join"),
        enabled,
    }, options);
    const cleanups = [queue.stop];
    function stop() { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); }
    try {
        cleanups.push(overrideCxMethods(actions, {
            selectVoiceChannel: (args, invoke) => queue.promptFull(args[0]) ? undefined : invoke(args),
        }, enabled));
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", queue.update);
        cleanups.push(() => FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", queue.update));
        FluxDispatcher.subscribe("LOGOUT", queue.reset);
        cleanups.push(() => FluxDispatcher.unsubscribe("LOGOUT", queue.reset));
        cleanups.push(registerRenderedTree("ChannelLongPressActionSheetConnected", (tree, props: {
            channel?: { id?: string; }; onClose?: () => void;
        }) => {
            const action = queue.menu(props.channel?.id);
            if (!action) return tree;
            return mapAppearanceElements(tree, element => element.type === sheet
                ? React.cloneElement(element, { children: [
                    ...React.Children.toArray(element.props.children),
                    <Row.Group key="cx-wait-for-slot">
                        <Row label={action.label} onPress={() => {
                            if (!enabled()) return;
                            props.onClose?.();
                            action.run();
                        }} />
                    </Row.Group>,
                ] }) : element);
        }));
        return stop;
    } catch (error) { stop(); throw error; }
}

function registerCopyChannelName(enabled: () => boolean) {
    const sheet = findByProps("ActionSheet")?.ActionSheet;
    const row = findByProps("ActionSheetRow")?.ActionSheetRow;
    if (!sheet || !row?.Group) throw new Error("Discord's channel actions are unavailable");
    let active = true;
    const stop = registerRenderedTree("ChannelLongPressActionSheetConnected", (tree, props: {
        channel?: Parameters<typeof getCxChannelNameCopy>[0]; onClose?: () => void;
    }) => {
        if (!props.channel) return tree;
        const copy = getCxChannelNameCopy(props.channel, id => UserStore?.getUser?.(id)?.username);
        if (!copy) return tree;
        const ActionSheetRow = row;
        return mapAppearanceElements(tree, element => element.type === sheet
            ? React.cloneElement(element, { children: [
                ...React.Children.toArray(element.props.children),
                <ActionSheetRow.Group key="cx-copy-channel-name">
                    <ActionSheetRow label={copy.label} onPress={() => {
                        if (!active || !enabled()) return;
                        props.onClose?.();
                        clipboard.setString(copy.name);
                        showToast.showCopyToClipboard?.();
                    }} />
                </ActionSheetRow.Group>,
            ] })
            : element);
    });
    return () => { active = false; stop(); };
}

function registerLongDrafts(enabled: () => boolean) {
    type DraftState = Record<string, Record<string, Record<number, { draft?: unknown; }>>>;
    type DraftPayload = { type?: string; channelId?: string; draft?: string; draftType?: number; };
    type Handler = { name: string; actionHandler: (payload: DraftPayload) => unknown; };

    const store = findByStoreName("DraftStore") as { getState?: () => DraftState; } | undefined;
    const premiumLimit = findByProps("MAX_MESSAGE_LENGTH_PREMIUM")?.MAX_MESSAGE_LENGTH_PREMIUM;
    const limit = typeof premiumLimit === "number" ? premiumLimit + 500 : 4500;
    if (typeof store?.getState !== "function") throw new Error("Discord’s draft store is unavailable");

    return overrideCxMethods(FluxDispatcher?._actionHandlers as object | undefined, {
        getOrderedActionHandlers(args, invoke) {
            const handlers = invoke(args);
            const payload = args[0] as DraftPayload | undefined;
            if ((payload?.type !== "DRAFT_CHANGE" && payload?.type !== "DRAFT_SAVE") || !Array.isArray(handlers)) return handlers;
            const { channelId, draft, draftType } = payload;
            if (typeof draft !== "string" || draft.length <= limit || !isCxProfileUserId(channelId)
                || typeof draftType !== "number" || !Number.isSafeInteger(draftType) || draftType < 0) return handlers;

            return (handlers as Handler[]).map(handler => handler.name === "DraftStore" && typeof handler.actionHandler === "function"
                ? {
                    ...handler,
                    actionHandler(this: unknown, action: DraftPayload) {
                        const userId = UserStore?.getCurrentUser?.()?.id;
                        const result = handler.actionHandler.call(this, action);
                        if (action !== payload || !enabled() || !isCxProfileUserId(userId)
                            || UserStore?.getCurrentUser?.()?.id !== userId) return result;
                        // Restore text before Discord’s dispatcher runs the normal save callback.
                        const entry = store.getState?.()?.[userId]?.[channelId]?.[draftType];
                        if (entry?.draft === draft.slice(0, limit)) entry.draft = draft;
                        return result;
                    },
                }
                : handler);
        },
    }, enabled);
}

function registerBypassPinPrompt(enabled: () => boolean) {
    const alerts = findByFilePath("actions/native/AlertActionCreators.tsx")?.default;
    const translations = findByProps("intl", "t");
    if (typeof translations?.intl?.string !== "function") throw new Error("Discord’s pin prompt translations are unavailable");
    // Message menu pin, message menu unpin, and pinned messages screen unpin.
    const promptKeys = [["CvQ18w", "p89ACt"], ["Bse+F/", "p89ACt"], ["xFjByk", "ETE/oC"]];
    function translated(key: string) {
        const message = translations.t[key];
        return message && translations.intl.string(message);
    }
    return overrideCxMethods(alerts, {
        show(args, invoke) {
            const alert = args[0] as { title?: unknown; confirmText?: unknown; onConfirm?: () => unknown; } | undefined;
            if (typeof alert?.title !== "string" || !alert.title || typeof alert.confirmText !== "string"
                || !alert.confirmText || typeof alert.onConfirm !== "function"
                || !promptKeys.some(([title, confirm]) => alert.title === translated(title) && alert.confirmText === translated(confirm))) {
                return invoke(args);
            }
            const failed = () => showToast("Couldn’t change the message pin.");
            try { void Promise.resolve(alert.onConfirm()).catch(failed); }
            catch { failed(); }
        },
    }, enabled);
}

function registerPinShortcut(enabled: () => boolean) {
    const pins = findByProps("pinMessage", "unpinMessage");
    const permissions = findByProps("Fonts", "Permissions")?.Permissions;
    const permission = permissions?.PIN_MESSAGES ?? permissions?.MANAGE_MESSAGES;
    const permissionStore = findByStoreName("PermissionStore");
    if (typeof pins?.pinMessage !== "function" || typeof pins?.unpinMessage !== "function") {
        throw new Error("Discord's pin actions are unavailable");
    }
    return registerMessageMenuActions(enabled, ({ message, channel }, close) => {
        if (!message || !channel) return [];
        const canPin = () => !channel.guild_id || permission != null && permissionStore?.can?.(permission, channel) === true;
        const action = getCxPinAction(message, channel.id, canPin());
        if (!action) return [];
        return [{ label: action.label, async run() {
            try {
                const latest = MessageStore?.getMessage?.(channel.id, action.id);
                const current = latest && getCxPinAction(latest, channel.id, canPin());
                if (current?.method !== action.method) return;
                close();
                await pins[current.method](channel, current.id);
            } catch {
                showToast("Couldn’t change the message pin.");
            }
        } }];
    }, false);
}

function registerEmbedToggle(enabled: () => boolean) {
    const rest = findByProps("HTTP")?.HTTP ?? findByProps("get", "post", "patch", "del");
    const { Permissions } = findByProps("Fonts", "Permissions") ?? {};
    const permissionStore = findByStoreName("PermissionStore");
    if (typeof rest?.patch !== "function") {
        throw new Error("Discord's embed actions are unavailable");
    }
    return registerMessageMenuActions(enabled, ({ message, channel }, close) => {
        if (!message || !channel) return [];
        const getToggle = (candidate: Parameters<typeof getCxEmbedToggle>[0]) => getCxEmbedToggle(candidate, channel.id,
            UserStore?.getCurrentUser?.()?.id, {
                canEmbed: !channel.guild_id || Permissions?.EMBED_LINKS != null && permissionStore?.can?.(Permissions.EMBED_LINKS, channel) === true,
                canManage: !!channel.guild_id && Permissions?.MANAGE_MESSAGES != null && permissionStore?.can?.(Permissions.MANAGE_MESSAGES, channel) === true,
            });
        const toggle = getToggle(message);
        if (!toggle) return [];
        return [{ label: toggle.label, async run() {
            try {
                const latest = MessageStore?.getMessage?.(channel.id, toggle.id);
                const current = latest && getToggle(latest);
                if (!current || current.label !== toggle.label) return;
                close();
                await rest.patch({ url: "/channels/" + channel.id + "/messages/" + current.id, body: { flags: current.flags } });
            } catch {
                showToast("Couldn’t change embed visibility.");
            }
        } }];
    }, false);
}

function registerRepeatMessages(enabled: () => boolean) {
    if (typeof messageUtil?.sendMessage !== "function") throw new Error("Discord message sending is unavailable");
    return registerMessageMenuActions(enabled, ({ message, channel }, close) => {
        if (!channel || !message || !isCxProfileUserId(message.id) || !isCxProfileUserId(channel.id)) return [];
        return [false, true].map(reply => ({
            label: reply ? "Repeat and Reply" : "Repeat",
            async run() {
                try {
                    const draft = buildCxRepeatMessage(message, channel.id, reply);
                    if (!draft) return;
                    close();
                    await messageUtil.sendMessage(channel.id,
                        { content: draft.content, invalidEmojis: [], validNonShortcutEmojis: [], tts: false }, true, draft.options);
                } catch {
                    showToast("Couldn’t repeat the message.");
                }
            },
        }));
    });
}

const textAttachmentUrl = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/\d{17,20}\/\d{17,20}\/[a-z0-9._~%+-]+(?:\?[a-z0-9._~%&=+-]+)?$/i;
const maxTextAttachmentBytes = 256 * 1024;

function registerTextAttachmentCopy(enabled: () => boolean) {
    const helpers = findByFilePath("modules/messages/PlaintextFilePreviewHelpers.tsx");
    if (typeof helpers?.isPlaintextPreviewableFile !== "function" || typeof clipboard?.setString !== "function") {
        throw new Error("Discord text attachment previews are unavailable");
    }
    const downloads = new Map<string, AbortController>();
    const stop = registerMessageMenuActions(enabled, ({ message }, close, stillActive) => {
        if (!Array.isArray(message?.attachments)) return [];
        return message.attachments.flatMap(attachment => {
            const { filename, url, size } = attachment ?? {};
            if (typeof filename !== "string" || !helpers.isPlaintextPreviewableFile(filename.toLowerCase())
                || typeof url !== "string" || !textAttachmentUrl.test(url)
                || typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) return [];
            const label = "Copy File Contents (" + filename + ")";
            return [{ label, async run() {
                if (size > maxTextAttachmentBytes) {
                    showToast("File too large to copy.");
                    return;
                }
                if (downloads.has(url)) return;
                const controller = new AbortController();
                downloads.set(url, controller);
                const timer = setTimeout(() => controller.abort(), 10000);
                try {
                    close();
                    const response = await fetch(url, {
                        signal: controller.signal, credentials: "omit", redirect: "error",
                        headers: { "Accept-Encoding": "identity" },
                    });
                    const length = response.headers.get("content-length");
                    const encoding = response.headers.get("content-encoding");
                    if (response.status !== 200 || response.url !== url
                        || length !== String(size) || encoding && encoding !== "identity") {
                        throw new Error("Incomplete text attachment");
                    }
                    const body = await response.arrayBuffer();
                    if (body.byteLength !== size) throw new Error("Incomplete text attachment");
                    const text = decodeURIComponent(Array.from(new Uint8Array(body), byte => "%" + byte.toString(16).padStart(2, "0")).join(""));
                    if (text.includes("\0")) throw new Error("Attachment is not text");
                    if (!stillActive() || controller.signal.aborted) return;
                    clipboard.setString(text);
                    showToast("File contents copied.");
                } catch {
                    if (stillActive()) showToast("Couldn’t copy the complete text file.");
                } finally {
                    clearTimeout(timer);
                    downloads.delete(url);
                }
            } }];
        });
    }, false);
    return () => {
        stop();
        for (const download of downloads.values()) download.abort();
    };
}

let messageGestures: { edit: number; reply: number; stop: () => void; } | undefined;

function registerMessageGesture(mode: "edit" | "reply") {
    if (!messageGestures) {
        const renderer = findByFilePath("modules/messages/native/MessagesRenderer.tsx")?.default;
        const { getNativeSyntheticEventData } = findByProps("getNativeSyntheticEventData") ?? {};
        if (!renderer || typeof getNativeSyntheticEventData !== "function") throw new Error("Discord's message gestures are unavailable");
        const gestures = { edit: 0, reply: 0 };
        type GestureProps = {
            channelId?: string; children?: ReactNode;
            onDoubleTapMessage?: (event: unknown) => unknown;
            onInitiateEdit?: (event: unknown) => unknown;
            onInitiateReply?: (event: unknown) => unknown;
        };
        function bind(tree: ReactNode, depth = 0): ReactNode {
            if (depth >= 16) return tree;
            if (Array.isArray(tree)) return mapMediaEntries(tree, child => bind(child, depth + 1));
            if (!React.isValidElement<GestureProps>(tree)) return tree;
            const { children, channelId, onDoubleTapMessage, onInitiateEdit, onInitiateReply } = tree.props;
            if (typeof channelId === "string" && typeof onDoubleTapMessage === "function"
                && typeof onInitiateEdit === "function" && typeof onInitiateReply === "function") {
                return React.cloneElement(tree, {
                    onDoubleTapMessage(event: unknown) {
                        if (!settings.safeMode?.enabled && (gestures.edit || gestures.reply)
                            && channelId === SelectedChannelStore?.getChannelId?.()) {
                            const id = getNativeSyntheticEventData(event)?.messageId;
                            const message = isCxProfileUserId(id) ? MessageStore?.getMessage?.(channelId, id) : undefined;
                            const action = getCxMessageGesture(message, UserStore?.getCurrentUser?.()?.id, gestures);
                            if (action === "edit") return onInitiateEdit(event);
                            if (action === "reply") return onInitiateReply(event);
                        }
                        return onDoubleTapMessage(event);
                    },
                });
            }
            const next = bind(children, depth + 1);
            return next === children ? tree : React.cloneElement(tree, { children: next });
        }
        messageGestures = Object.assign(gestures, { stop: registerRenderedTree(renderer, bind) });
    }
    const binding = messageGestures;
    binding[mode]++;
    return () => {
        binding[mode]--;
        if (binding.edit || binding.reply) return;
        messageGestures = undefined;
        binding.stop();
    };
}

type PickerTab = "gif" | "sticker";
type PickerTabRule = { tab: PickerTab; };

function bindExpressionPickerTabs() {
    const picker = findByFilePath("modules/expression_picker/native/ExpressionPicker.tsx")?.default;
    const nativeRender = picker?.$$typeof === Symbol.for("react.memo") && picker.type;
    const order: readonly string[] | undefined = findByFilePath("modules/expression_picker/ExpressionPickerConstants.tsx")?.ExpressionPickerOrder;
    if (typeof nativeRender !== "function" || !Array.isArray(order) || order.length !== 3
        || !["emoji", "gif", "sticker"].every(tab => order.includes(tab))) {
        throw new Error("Discord's expression picker is unavailable");
    }
    const render = nativeRender;
    const tabs = order;
    const rules = new Set<PickerTabRule>();
    let filterCurrentRender = false;
    const overrides: Parameters<typeof overrideCxMethods>[1] = {
        useSegmentedControlState(args, invoke) {
            if (!filterCurrentRender) return invoke(args);
            const options = args[0] as {
                items?: readonly unknown[];
                defaultIndex?: number;
                onSetActiveIndex?: (index: number) => unknown;
            } | undefined;
            const selected = options?.defaultIndex;
            if (!Array.isArray(options?.items) || options.items.length !== tabs.length
                || selected == null || !Number.isInteger(selected) || selected < 0 || selected >= tabs.length
                || typeof options.onSetActiveIndex !== "function") return invoke(args);
            const visible = tabs.flatMap((tab, index) => index === selected || ![...rules].some(rule => rule.tab === tab) ? [index] : []);
            if (visible.length === tabs.length) return invoke(args);
            const { items, onSetActiveIndex } = options;
            return invoke([{
                ...options,
                items: visible.map(index => items[index]),
                defaultIndex: visible.indexOf(selected),
                onSetActiveIndex(index: number) {
                    const nativeIndex = visible[index];
                    if (nativeIndex != null) return onSetActiveIndex(nativeIndex);
                },
            }, ...args.slice(1)]);
        },
    };
    // Discord can import the hook directly or through the design barrel.
    const modules = new Set([
        findByFilePath("design/components/SegmentedControl/native/SegmentedControlState.native.tsx"),
        findByFilePath("design/native.tsx"),
    ].filter(module => typeof module?.useSegmentedControlState === "function"));
    if (!modules.size) throw new Error("Discord's segmented control is unavailable");
    const cleanups: (() => void)[] = [];
    const stop = () => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); };
    try {
        for (const module of modules) cleanups.push(overrideCxMethods(module, overrides));
    } catch (error) {
        stop();
        throw error;
    }
    function FilteredPicker({ originalProps }: { originalProps: { visibleTabs?: readonly string[]; }; }) {
        const previous = filterCurrentRender;
        const { visibleTabs } = originalProps;
        // A single-purpose picker may be opened by another Discord feature.
        filterCurrentRender = !settings.safeMode?.enabled && rules.size > 0
            && (visibleTabs === undefined || Array.isArray(visibleTabs)
                && visibleTabs.length === tabs.length && visibleTabs.every((tab, index) => tab === tabs[index]));
        try {
            return render(originalProps) as ReactNode;
        } finally {
            filterCurrentRender = previous;
        }
    }
    const wrap: AppearanceChange = element => element.type === picker
        ? <FilteredPicker key={element.key} originalProps={element.props} />
        : element;
    return { picker, rules, wrap, stop };
}

let expressionPickerBinding: ReturnType<typeof bindExpressionPickerTabs> | undefined;

function registerExpressionPickerTab(tab: PickerTab) {
    const binding = expressionPickerBinding ??= bindExpressionPickerTabs();
    const rule = { tab };
    binding.rules.add(rule);
    // A new callback also refreshes already mounted pickers when the set changes.
    const stop = registerJsxAppearance([binding.picker], element => binding.wrap(element));
    return () => {
        binding.rules.delete(rule);
        stop();
        if (!binding.rules.size) {
            binding.stop();
            expressionPickerBinding = undefined;
        }
    };
}

const settingsEntryVisibility = new WeakMap<object, { users: number; restore: () => void; }>();

function hideSettingsEntry(path: string) {
    const route = findByFilePath(path)?.default;
    if (route?.type !== "route" && route?.type !== "pressable") throw new Error("Discord's settings entry is unavailable");
    let binding = settingsEntryVisibility.get(route);
    if (!binding) {
        const original = route.usePredicate;
        const descriptor = Object.getOwnPropertyDescriptor(route, "usePredicate");
        const state = {
            users: 0,
            restore() {
                if (Object.getOwnPropertyDescriptor(route, "usePredicate")?.value !== predicate) return;
                if (descriptor) Object.defineProperty(route, "usePredicate", descriptor);
                else Reflect.deleteProperty(route, "usePredicate");
            },
        };
        function predicate(this: unknown, ...args: unknown[]) {
            // The native predicate can call React hooks even while the route is hidden.
            const visible = typeof original === "function" ? Reflect.apply(original, this, args) : true;
            return state.users && !settings.safeMode?.enabled ? false : visible;
        }
        Object.defineProperty(route, "usePredicate", descriptor && "value" in descriptor
            ? { ...descriptor, value: predicate }
            : { configurable: true, enumerable: descriptor?.enumerable ?? true, writable: true, value: predicate });
        binding = state;
        settingsEntryVisibility.set(route, state);
    }
    const active = binding;
    active.users++;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        if (--active.users === 0) {
            settingsEntryVisibility.delete(route);
            active.restore();
        }
    };
}

function bindChannelDrawerWidths() {
    const drawer = findByFilePath("modules/screen/native/drawer/useDrawerWidth.tsx");
    const layout = findByProps("getChatLayout");
    const container = findByProps("getBaseAppContainerDimensions");
    if (typeof drawer?.getDrawerWidth !== "function" || typeof drawer.useDrawerWidth !== "function"
        || typeof layout?.getChatLayout !== "function" || typeof container?.getBaseAppContainerDimensions !== "function") {
        throw new Error("Discord's channel drawer sizing is unavailable");
    }
    const widths = new Set<{ delta: number; }>();
    const resize: Parameters<typeof overrideCxMethods>[1][string] = (args, invoke) => {
        const width = invoke(args);
        const preference = [...widths].at(-1);
        if (!preference || typeof width !== "number" || !Number.isFinite(width)) return width;
        const { isChatBesideChannelList, isChatLockedOpen } = layout.getChatLayout() ?? {};
        if (!isChatBesideChannelList) return width;
        const viewport = container.getBaseAppContainerDimensions()?.width;
        if (!Number.isFinite(viewport) || width <= 0 || width >= viewport) return width;
        const minimum = Math.min(width, 200);
        const chatSpace = isChatLockedOpen ? 320 : 32;
        const maximum = Math.max(width, viewport - chatSpace);
        return Math.max(minimum, Math.min(maximum, width + preference.delta));
    };
    // Use the same width for the gesture boundary and the rendered drawer.
    const stop = overrideCxMethods(drawer, { getDrawerWidth: resize, useDrawerWidth: resize }, () => !settings.safeMode?.enabled);
    return { widths, stop };
}

let channelDrawerWidths: ReturnType<typeof bindChannelDrawerWidths> | undefined;

function registerChannelDrawerWidth(delta: number) {
    const binding = channelDrawerWidths ??= bindChannelDrawerWidths();
    const preference = { delta };
    binding.widths.add(preference);
    return () => {
        binding.widths.delete(preference);
        if (!binding.widths.size) {
            binding.stop();
            channelDrawerWidths = undefined;
        }
    };
}

function registerRenderedChannelStyle(rule: {
    renderedComponents: readonly string[]; condition: "muted" | "inactive"; values: { opacity: number; };
}) {
    const wrappers = new WeakMap<object, ComponentType<{ originalProps: object; }>>();
    let active = true;
    const stop = registerJsxAppearance(rule.renderedComponents, element => {
        const { muted, unread } = element.props;
        if (typeof muted !== "boolean" || typeof unread !== "boolean"
            || !(muted || rule.condition === "inactive" && !unread)) return element;

        const component = element.type as { $$typeof?: symbol; type?: unknown; };
        const render = component?.$$typeof === Symbol.for("react.memo") ? component.type : component;
        if (typeof render !== "function" || render.prototype?.isReactComponent) return element;
        let wrapper = wrappers.get(component);
        if (!wrapper) {
            wrapper = function StyledChannel({ originalProps }) {
                const output = render(originalProps) as ReactNode;
                if (!active || settings.safeMode?.enabled || !React.isValidElement<{ style?: unknown; }>(output)) return output;
                if (!("style" in output.props)) return output;
                return React.cloneElement(output, { style: [output.props.style, rule.values] });
            };
            wrappers.set(component, wrapper);
        }
        return React.createElement(wrapper, { originalProps: element.props, key: element.key });
    });
    return () => { active = false; stop(); };
}

let reducedMotionAppearance: { users: number; restore: () => void; } | undefined;

function registerReducedMotion() {
    if (!reducedMotionAppearance) {
        const store = findByStoreName("AccessibilityStore");
        const key = "useReducedMotion";
        const previous = store && Object.getOwnPropertyDescriptor(store, key);
        let descriptor = previous;
        for (let prototype = store && Object.getPrototypeOf(store); prototype && !descriptor; prototype = Object.getPrototypeOf(prototype))
            descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        const original = descriptor?.get;
        if (!original || typeof store?.emitChange !== "function") throw new Error("Discord's reduced motion setting is unavailable");
        const read = function (this: unknown) {
            return settings.safeMode?.enabled ? original.call(this) : true;
        };
        Object.defineProperty(store, key, { configurable: true, enumerable: descriptor?.enumerable, get: read, set: descriptor?.set });
        const restore = () => {
            if (Object.getOwnPropertyDescriptor(store, key)?.get !== read) return;
            if (previous) Object.defineProperty(store, key, previous);
            else Reflect.deleteProperty(store, key);
        };
        try {
            store.emitChange();
        } catch (error) {
            restore();
            throw error;
        }
        reducedMotionAppearance = { users: 0, restore() {
            restore();
            store.emitChange();
        } };
    }
    const binding = reducedMotionAppearance;
    binding.users++;
    return () => {
        if (--binding.users > 0) return;
        reducedMotionAppearance = undefined;
        binding.restore();
    };
}

type ProfileMenuItem = { label: string; action: () => void; };
type ProfileMenuEntry = {
    key: CxProfileMenuAction | "profile-media" | "user-notes" | "user-tags";
    getItems: (id: string, guildId?: string) => ProfileMenuItem[];
};
const profileMenuActions = new Set<ProfileMenuEntry>();
let stopProfileMenuHooks: (() => void) | undefined;

function patchProfileMenus() {
    const ProfileUser = React.createContext<{ id: string; guildId?: string; } | undefined>(undefined);
    function ProfileMenu({ element }: { element: React.ReactElement<{ items: unknown[][]; }>; }) {
        const user = React.useContext(ProfileUser);
        if (!user || settings.safeMode?.enabled) return element;
        const { id, guildId } = user;
        const entries = new Map([...profileMenuActions].map(entry => [entry.key, entry]));
        const actions = [...entries.values()].flatMap(entry => entry.getItems(id, guildId).map(item => ({
            label: item.label,
            action: () => {
                if (profileMenuActions.has(entry) && !settings.safeMode?.enabled) item.action();
            },
        })));
        return actions.length ? React.cloneElement(element, { items: [...element.props.items, actions] }) : element;
    }
    const provideUser = (_: unknown, element: JSX.Element) => {
        const id = element.props.user?.id;
        if (!isCxProfileUserId(id)) return element;
        const guildId = element.props.displayProfile?.guildId ?? element.props.channel?.getGuildId?.();
        const user = { id, guildId: isCxProfileUserId(guildId) ? guildId : undefined };
        return <ProfileUser.Provider value={user} key={element.key}>{element}</ProfileUser.Provider>;
    };
    const addMenuItems = (_: unknown, element: JSX.Element) => {
        const { items, onOpen, children } = element.props;
        return typeof onOpen === "function" && typeof children === "function" && Array.isArray(items) && items.every(Array.isArray)
            ? <ProfileMenu key={element.key} element={element} />
            : element;
    };
    onJsxCreate("UserProfileOverflowMenu", provideUser, true);
    onJsxCreate("ContextMenu", addMenuItems, true);
    return () => {
        deleteJsxCreate("ContextMenu", addMenuItems, true);
        deleteJsxCreate("UserProfileOverflowMenu", provideUser, true);
    };
}

function registerProfileMenuEntry(entry: ProfileMenuEntry) {
    stopProfileMenuHooks ??= patchProfileMenus();
    profileMenuActions.add(entry);
    return () => {
        profileMenuActions.delete(entry);
        if (!profileMenuActions.size) {
            stopProfileMenuHooks?.();
            stopProfileMenuHooks = undefined;
        }
    };
}

function registerProfileMenuAction(action: CxProfileMenuAction) {
    const { label, scope } = cxProfileMenuActions[action];
    return registerProfileMenuEntry({
        key: action,
        getItems(id, guildId) {
            if (scope === "server" && !getCxProfileMenuCopy(action, id, UserProfileStore, guildId)) return [];
            return [{ label, action: () => {
                const text = getCxProfileMenuCopy(action, id, UserProfileStore, guildId);
                if (text) {
                    clipboard.setString(text);
                    showToast.showCopyToClipboard?.();
                } else showToast("No profile colors found.");
            } }];
        },
    });
}

let clearLocalUserNotes: (() => void) | undefined;
let findLocalUserTags: ((query: string) => Promise<string | undefined>) | undefined;
let localUserNotesStorage: Promise<Record<string, Record<string, string>>> | undefined;

function registerLocalUserText(kind: "notes" | "tags") {
    const tags = kind === "tags";
    const label = tags ? "Local User Tags" : "Local User Note";
    if (tags ? findLocalUserTags : clearLocalUserNotes) throw new Error(label + " is already enabled");
    const { AlertModal, AlertActions, AlertActionButton } = findByProps("AlertModal", "AlertActions") ?? {};
    if (!AlertModal || !AlertActions || !AlertActionButton) throw new Error("Discord's note editor is unavailable");
    const getStorage = () => localUserNotesStorage ??= createStorageAsync<Record<string, Record<string, string>>>("plugins/storage/cloudcord.cx-user-notes.json");
    const key = (account: string) => tags ? "tags:" + account : account;
    const notes = createCxUserNotes(() => UserStore.getCurrentUser()?.id, async account => (await getStorage())[key(account)],
        async (account, mutate) => {
            const storage = await getStorage();
            storage[key(account)] = mutate(storage[key(account)]);
        }, () => !settings.safeMode?.enabled, kind);
    const failed = (error: unknown) => showToast(error instanceof Error ? error.message : "Couldn’t update " + label.toLowerCase() + ".");
    const alertKey = tags ? "cloudcord-cx-user-tags" : "cloudcord-cx-user-note";
    const stopMenu = registerProfileMenuEntry({
        key: tags ? "user-tags" : "user-notes",
        getItems: id => [{ label, action: () => {
            void notes.open(id, (initial, save) => {
                let draft = initial;
                openAlert(alertKey, <AlertModal title={label}
                    extraContent={<TextInput accessibilityLabel={tags ? "Private tags" : "Private note"} defaultValue={initial} multiline maxLength={CX_USER_NOTE_LIMIT}
                        placeholder={tags ? "One tag per line" : undefined}
                        style={{ minHeight: 100, padding: 10, color: resolveSemanticColor(semanticColors.TEXT_DEFAULT) }}
                        onChangeText={value => { draft = value; }} />}
                    actions={<AlertActions>
                        <AlertActionButton text="Cancel" variant="secondary" onPress={() => dismissAlert(alertKey)} />
                        <AlertActionButton text="Save" variant="primary" onPress={() => {
                            void save(draft).then(() => dismissAlert(alertKey), failed);
                        }} />
                    </AlertActions>} />);
            }).catch(failed);
        } }],
    });
    if (tags) findLocalUserTags = notes.search;
    else clearLocalUserNotes = () => {
        void notes.clear(() => new Promise<boolean>(resolve => Alert.alert(
            "Clear local user notes?", "This removes every local note for this account on this device.",
            [{ text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Clear notes", style: "destructive", onPress: () => resolve(true) }],
            { cancelable: true, onDismiss: () => resolve(false) },
        ))).catch(failed);
    };
    return () => {
        notes.stop();
        if (tags) findLocalUserTags = undefined;
        else clearLocalUserNotes = undefined;
        stopMenu();
    };
}

function registerProfileMedia() {
    const viewer = findByFilePath("modules/media_viewer/native/components/openMediaModal.tsx");
    const download = findByFilePath("modules/media_viewer/native/MediaSourceUtil.tsx");
    const mediaType = findByFilePath("modules/media/MediaTypes.tsx")?.MediaType;
    if (!viewer?.openMediaModal || !download?.downloadMediaAssetWithContentType
        || mediaType?.IMAGE == null || mediaType.GIF == null)
        throw new Error("Discord's profile media viewer or downloader is unavailable");

    let active = true;
    const stop = registerProfileMenuEntry({
        key: "profile-media",
        getItems(id) {
            const user = UserStore?.getUser?.(id);
            if (!user) return [];
            return getCxProfileMedia(id, user, UserProfileStore?.getUserProfile?.(id)?.banner).flatMap(asset => [
                { label: "View " + asset.kind, action: () => {
                    const open = (width: number, height: number) => {
                        if (!active || settings.safeMode?.enabled) return;
                        try {
                            viewer.openMediaModal({
                                initialSources: [{ uri: asset.url, mediaIndex: 0, width, height, accessoryType: "embed" }],
                                analyticsSource: "user_profile_avatar", openAs: "action-sheet", shareable: false,
                                disableDownload: true, disableMediaOverlayButton: true, disableMediaOverlayFooter: true,
                            });
                        } catch { showToast("Couldn’t open the profile image."); }
                    };
                    if (asset.kind === "Avatar") open(512, 512);
                    else Image.getSize(asset.url, open, () => open(1024, 384));
                } },
                { label: "Download " + asset.kind, action: async () => {
                    try {
                        await download.downloadMediaAssetWithContentType(asset.url,
                            asset.animated ? mediaType.GIF : mediaType.IMAGE, asset.animated ? "image/gif" : "image/png");
                    } catch {
                        if (active) showToast("Couldn’t download the profile image.");
                    }
                } },
            ]);
        },
    });
    return () => { active = false; stop(); };
}

function supportsMobileHide({ target }: { target: keyof typeof cxAppearanceTargets; }) {
    return !("desktopOnly" in cxAppearanceTargets[target]);
}

export default function CxExtensions() {
    const [source, setSource] = React.useState("");
    const [showCatalog, setShowCatalog] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [pages, setPages] = React.useState({ Plugins: 0, Themes: 0 });
    const [status, setStatus] = React.useState("");
    const [candidate, setCandidate] = React.useState<{ source: string; review: ReturnType<typeof reviewCx>; selected: string[]; }>();
    const [, refreshOptions] = React.useState(0);
    const searchText = search.trim().toLowerCase();

    function review(next: string) {
        setCandidate(undefined);
        try {
            const preview = reviewCx(next);
            setCandidate({ source: next, review: preview, selected: preview.appearanceOptions
                .filter(option => option.defaultOn && supportsMobileHide(option)).map(option => option.target) });
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
            setSource(next.length <= CX_INLINE_EDITOR_LIMIT ? next : "");
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
                registerIncomingRules(rules) {
                    let active = true;
                    const context = {
                        currentUser: () => UserStore?.getCurrentUser?.()?.id,
                        channel: (id: string) => ChannelStore?.getChannel?.(id),
                        replyAuthor: (channel: string, id: string) => MessageStore?.getMessage?.(channel, id)?.author,
                        blocked: (id: string) => RelationshipStore?.isBlocked?.(id) === true,
                        ignored: (id: string) => RelationshipStore?.isIgnored?.(id) === true,
                        selectedChannel: () => SelectedChannelStore?.getChannelId?.(),
                        pingAlerts: {
                            status: (id: string) => PresenceStore?.getStatus?.(id),
                            isFriend: (id: string) => RelationshipStore?.isFriend?.(id) === true,
                            muted: (id: string, channel: Parameters<typeof isCxNotificationMuted>[1]) =>
                                isCxNotificationMuted(id, channel, UserGuildSettingsStore),
                            notify: ({ title, body }: CxMessageAlert) => {
                                const account = UserStore?.getCurrentUser?.()?.id;
                                setTimeout(() => {
                                    if (active && !settings.safeMode?.enabled && account === UserStore?.getCurrentUser?.()?.id)
                                        showToast(body ? title + ": " + body : title);
                                }, 0);
                            },
                        },
                        openLink: (link: string, channel: string, user: string) => setTimeout(() => {
                            if (active && !settings.safeMode?.enabled && context.currentUser() === user && context.selectedChannel() === channel)
                                void Linking.openURL(link).catch(() => {});
                        }, 0),
                        notify: (body: string) => setTimeout(() => {
                            if (active && !settings.safeMode?.enabled) showToast(body);
                        }, 0),
                    };
                    const social = bindCxSocialEvents(rules, {
                        currentUser: context.currentUser, notify: context.notify,
                        isFriend: id => RelationshipStore?.isFriend?.(id) === true,
                        userName: id => { const user = UserStore?.getUser?.(id); return user?.globalName || user?.username; },
                        channelName: id => ChannelStore?.getChannel?.(id)?.name,
                        voiceChannel: () => SelectedChannelStore?.getVoiceChannelId?.(),
                        joinVoice: id => findByProps("selectVoiceChannel")?.selectVoiceChannel?.(id),
                        removalActions: () => findByProps("removeRelationship"),
                        enabled: () => active && !settings.safeMode?.enabled,
                    });
                    const onIncoming: Parameters<typeof intercept>[0] = payload => {
                        try {
                            if (active && !settings.safeMode?.enabled) {
                                const patch = runCxIncomingRules(rules, payload, context);
                                if (patch !== false) social?.observe(payload);
                                return patch;
                            }
                        } catch { /* Discord must still receive its original event. */ }
                    };
                    let stop: () => void;
                    try { stop = intercept(onIncoming); }
                    catch (error) { social?.stop(); throw error; }
                    return () => { active = false; stop(); social?.stop(); };
                },
                registerProfileMenuAction,
                registerSendConfirmation,
                registerTimestampFormats,
                hideAppearanceTarget(target) {
                    if (!supportsMobileHide({ target })) return () => {};
                    const mobile = cxAppearanceTargets[target].mobile;
                    if ("renderTree" in mobile || "renderComponent" in mobile) return registerTreeAppearance(mobile);
                    if ("tableRow" in mobile) {
                        const tableRow = findByFilePath("design/components/TableRow/native/TableRow.native.tsx")?.TableRow;
                        if (!tableRow) throw new Error("Discord's table row is unavailable");
                        const rule = mobile.tableRow;
                        if ("key" in rule) return registerJsxAppearance([tableRow], element => element.key === rule.key ? null : element);
                        const translations = findByProps("intl", "t");
                        const message = translations?.t?.[rule.subLabelFor];
                        const label = message && translations?.intl?.string?.(message);
                        if (typeof label !== "string" || !label) throw new Error("Discord's table row label is unavailable");
                        return registerJsxAppearance([tableRow], element => element.props.label === label && typeof element.props.subLabel === "string"
                            ? React.cloneElement(element, { subLabel: undefined }) : element);
                    }
                    if ("expressionPickerTab" in mobile) return registerExpressionPickerTab(mobile.expressionPickerTab);
                    if ("settingsEntry" in mobile) return hideSettingsEntry(mobile.settingsEntry);
                    if ("hideComponentPaths" in mobile) {
                        const components = mobile.hideComponentPaths.map(path => findByFilePath(path)?.default);
                        if (components.some(component => !component)) throw new Error("Discord's appearance components are unavailable");
                        return registerJsxAppearance(components, () => null);
                    }
                    if ("scrollIndicators" in mobile) {
                        const scrollViews = new Set([ScrollView, FlatList, SectionList, Animated?.ScrollView, Animated?.FlatList, Animated?.SectionList]);
                        const components = [...scrollViews].filter((component): component is NonNullable<typeof component> => component != null);
                        return registerJsxAppearance(components, element => React.cloneElement(element, {
                            showsHorizontalScrollIndicator: false,
                            showsVerticalScrollIndicator: false,
                        }));
                    }
                    if ("customStatusEmojis" in mobile) {
                        const hideBubbleEmoji = registerJsxAppearance(mobile.customStatusEmojis, element => {
                            const { customStatusActivity } = element.props;
                            if (!customStatusActivity?.emoji) return element;
                            return React.cloneElement(element, { customStatusActivity: { ...customStatusActivity, emoji: undefined } });
                        });
                        const hideActivityEmoji = registerJsxAppearance(["ActivityStatus"], element => React.cloneElement(element, { hideEmoji: true }), true);
                        return () => { hideActivityEmoji(); hideBubbleEmoji(); };
                    }
                    if ("memberActivityText" in mobile) {
                        const status = findByFilePath("modules/activity_status/native/PresenceActivityStatus.tsx")?.default;
                        if (!status) throw new Error("Discord's member activity renderer is unavailable");
                        return registerMemberRowAppearance(status, element => {
                            const type = element.props.activity?.type;
                            // Discord activity types 0 and 2 are Playing and Listening.
                            return type === 0 || type === 2 ? React.cloneElement(element, { hideText: true }) : element;
                        });
                    }
                    if ("memberCustomStatus" in mobile) {
                        const status = findByFilePath("modules/activity_status/native/ActivityStatus.tsx")?.default;
                        if (typeof status !== "function" || status.prototype?.isReactComponent) {
                            throw new Error("Discord's custom status renderer is unavailable");
                        }
                        function WithoutCustomStatus({ originalProps }: { originalProps: object; }) {
                            const output: ReactNode = status(originalProps);
                            if (settings.safeMode?.enabled || !React.isValidElement<{ children?: ReactNode; }>(output)) return output;
                            const { children } = output.props;
                            if (!Array.isArray(children) || children.length !== 3) return output;
                            const [activity, separator, custom] = children;
                            if (!React.isValidElement(custom) || custom.type !== React.Fragment
                                || separator != null && (!React.isValidElement<{ accessibilityElementsHidden?: boolean; }>(separator)
                                    || separator.props.accessibilityElementsHidden !== true)) return output;
                            // Discord renders the activity, its separator, and the custom status as three siblings.
                            return React.cloneElement(output, { children: [activity, null, null] });
                        }
                        return registerMemberRowAppearance("ActivityStatus", element => element.type === status
                            ? <WithoutCustomStatus originalProps={element.props} /> : element);
                    }
                    if ("emptyServerFolders" in mobile) {
                        return registerJsxAppearance(["GuildsBarGuildFolder"], element => {
                            const { expanded, childNodes, isDragPreview, hideExpandedChildren } = element.props;
                            return expanded === true && !isDragPreview && !hideExpandedChildren
                                && Array.isArray(childNodes) && childNodes.length === 0 ? null : element;
                        });
                    }
                    if ("mentionBadges" in mobile) {
                        const stopLegacy = registerJsxAppearance(["MentionsBadge"], () => null);
                        const stopCount = registerJsxAppearance(["Badge"], element =>
                            typeof element.props.value === "number" && element.props.value > 0
                                && "isMentionLowImportance" in element.props ? null : element);
                        return () => { stopCount(); stopLegacy(); };
                    }
                    if (!("messagePresentation" in mobile)) return registerJsxAppearance(mobile, () => null);
                    const renderer = findByFilePath("modules/messages/native/renderer/createMessageContent.tsx");
                    return overrideCxMethods(renderer, {
                        default(args, invoke) {
                            const presentation = invoke(args);
                            if (!presentation || typeof presentation !== "object") return presentation;
                            if (mobile.messagePresentation === "edited") {
                                if ("edited" in presentation && presentation.edited === true) return { ...presentation, edited: false };
                            } else if (mobile.messagePresentation === "timestamps") {
                                if ("timestamp" in presentation && typeof presentation.timestamp === "string") {
                                    return { ...presentation, timestamp: undefined, timestampTooltip: undefined, timestampAccessibilityLabel: undefined };
                                }
                            } else if ("stickers" in presentation && Array.isArray(presentation.stickers) && presentation.stickers.length) {
                                return { ...presentation, stickers: [] };
                            }
                            return presentation;
                        },
                    }, () => !settings.safeMode?.enabled);
                },
                styleAppearanceTarget(target) {
                    const style = cxAppearanceTargets[target].style;
                    if ("blurredMedia" in style) return registerBlurredMedia(style.blurredMedia);
                    if ("reducedMotion" in style) return registerReducedMotion();
                    if ("mentionHighlight" in style) {
                        const renderer = findByFilePath("modules/messages/native/renderer/createMessageContent.tsx");
                        const highlightColor = processColor(style.mentionHighlight);
                        if (typeof highlightColor !== "number") throw new Error("Discord's message highlight color is unavailable");
                        return overrideCxMethods(renderer, {
                            default(args, invoke) {
                                const message = invoke(args);
                                if (!message || typeof message !== "object" || !("mentioned" in message) || message.mentioned !== true
                                    || !("highlightColor" in message) || typeof message.highlightColor !== "number" || message.highlightColor === 0) return message;
                                return { ...message, highlightColor };
                            },
                        }, () => !settings.safeMode?.enabled);
                    }
                    if ("centeredMessageList" in style) {
                        const messages = findByFilePath(style.centeredMessageList)?.default;
                        if (!messages) throw new Error("Discord's message list is unavailable");
                        const centered = { alignSelf: "center", width: "100%", maxWidth: style.width };
                        // The wallpaper hook may already have wrapped the original message list.
                        return registerJsxAppearance([messages], tree => mapAppearanceElements(tree, element => element.type === messages
                            ? React.cloneElement(element, { style: [element.props.style, centered] })
                            : element));
                    }
                    if ("messageWidthRenderer" in style) {
                        const renderer = findByFilePath(style.messageWidthRenderer);
                        return overrideCxMethods(renderer, {
                            default(args, invoke) {
                                const presentation = invoke(args);
                                const input = args[0] as { isInlineReplyPreview?: boolean; message?: { content?: string; }; } | undefined;
                                if (!presentation || typeof presentation !== "object" || !input?.message?.content || input.isInlineReplyPreview
                                    || !("constrainedWidth" in presentation) || typeof presentation.constrainedWidth !== "number") return presentation;
                                // Use the native logical width for message text and keep the system font scale.
                                const width = style.width * PixelRatio.getFontScale();
                                return Number.isFinite(width) && width > 0 && presentation.constrainedWidth > width
                                    ? { ...presentation, constrainedWidth: width } : presentation;
                            },
                        }, () => !settings.safeMode?.enabled);
                    }
                    if ("drawerWidthDelta" in style) return registerChannelDrawerWidth(style.drawerWidthDelta);
                    if ("compactMemberList" in style) return registerCompactMemberList();
                    if ("renderedComponents" in style) return registerRenderedChannelStyle(style);
                    if ("serverIconScale" in style) {
                        const iconStyle = { transform: [{ scale: style.serverIconScale }] };
                        return registerJsxAppearance(["GuildsBarAnimatedItemWrapper"], element => {
                            const { children, preventClipping, isDragPreview } = element.props;
                            if (preventClipping || isDragPreview || !React.isValidElement<{
                                source?: unknown; style?: unknown; value?: string; size?: unknown; animate?: boolean;
                            }>(children)) return element;

                            const icon = children.props;
                            // Discord renders either a server image or a label with the server initials here.
                            if ("source" in icon && "style" in icon) {
                                return React.cloneElement(element, { children: React.cloneElement(children, { style: [icon.style, iconStyle] }) });
                            }
                            if (typeof icon.value === "string" && "size" in icon && typeof icon.animate === "boolean") {
                                return React.cloneElement(element, { children: <View style={iconStyle}>{children}</View> });
                            }
                            return element;
                        });
                    }
                    if ("spoilerOutline" in style) {
                        const spoiler = findByFilePath("modules/markup/native/Spoiler.tsx")?.default?.prototype;
                        if (typeof spoiler?.render !== "function") throw new Error("Discord's text spoiler is unavailable");
                        const outline = style.spoilerOutline;
                        const stopText = instead("render", spoiler, function (this: { state?: { revealed?: boolean; }; }, args, original) {
                            const rendered = original.apply(this, args);
                            if (settings.safeMode?.enabled || this.state?.revealed !== false || !React.isValidElement<{ style?: unknown; }>(rendered)) return rendered;
                            return React.cloneElement(rendered, { style: [rendered.props.style, outline] });
                        });
                        try {
                            const stopMedia = registerJsxAppearance(["MediaModalSpoilerOverlay"], element => element.props.source?.obscure
                                ? element : React.cloneElement(element, { style: [element.props.style, outline] }));
                            return () => { stopMedia(); stopText(); };
                        } catch (error) {
                            stopText();
                            throw error;
                        }
                    }
                    if ("component" in style) {
                        return registerJsxAppearance([style.component], element => {
                            if ("props" in style) {
                                return element.props[style.skipWhenTrue] === true ? element : React.cloneElement(element, style.props);
                            }
                            if (!("key" in style)) return React.cloneElement(element, { style: [element.props.style, style.values] });
                            const styles = element.props.styles;
                            return React.cloneElement(element, { styles: { ...styles, [style.key]: [styles?.[style.key], style.values] } });
                        });
                    }
                    if (!isThemeSupported()) throw new Error("This loader does not support color overrides");
                    return registerColorOverlay(style);
                },
                registerUploadAnonymiser,
                registerNativeEffect(effect, avatarResolution = 256, effectOptions) {
                    const enabled = () => !settings.safeMode?.enabled;
                    switch (effect) {
                        case "hide-role-headers":
                            return registerNoRoleHeaders();
                        case "show-voice-ping":
                            return registerVoicePing(enabled);
                        case "notify-when-muted": {
                            const sound = findByFilePath("modules/sound_playback/native/SoundUtils.tsx");
                            if (typeof sound?.playSound !== "function" || !effectOptions || !("serverMute" in effectOptions))
                                throw new Error("Discord's mute alert controls are unavailable");
                            return bindCxMutedVoice(findByStoreName("MediaEngineStore"), () => Boolean(SelectedChannelStore.getVoiceChannelId()),
                                () => { void Promise.resolve(sound.playSound("user_leave")).catch(() => {}); }, effectOptions, enabled);
                        }
                        case "voice-channel-count":
                            if (!effectOptions || !("showEmpty" in effectOptions)) throw new Error("Missing voice count options");
                            return registerVoiceChannelCount(effectOptions, enabled);
                        case "webcam-start-notifier": {
                            if (!effectOptions || !("scope" in effectOptions)) throw new Error("Missing camera tone options");
                            const voice = findByStoreName("VoiceStateStore");
                            return bindCxCameraTone({
                                account: () => UserStore.getCurrentUser()?.id,
                                selected() {
                                    const id = SelectedChannelStore.getVoiceChannelId();
                                    const channel = id && ChannelStore.getChannel(id);
                                    if (id && channel) return { id, private: channel.type === 1 || channel.type === 3 };
                                },
                                states: id => voice?.getVoiceStatesForChannel?.(id),
                                play: on => playCxVoiceTone(on ? "user_join" : "user_leave"),
                                enabled,
                                dispatcher: FluxDispatcher,
                            }, effectOptions);
                        }
                        case "wait-for-slot":
                            if (!effectOptions || !("autoJoin" in effectOptions)) throw new Error("Missing voice queue options");
                            return registerWaitForSlot(effectOptions, enabled);
                        case "all-call-time-counter":
                            if (!effectOptions || !("human" in effectOptions)) throw new Error("Missing voice member timer options");
                            return registerVoiceMemberClock(effectOptions);
                        case "call-time-counter":
                            return registerCallTimeCounter();
                        case "jump-to-message-menu":
                            return registerJumpToMessageMenu(enabled);
                        case "jump-without-unblocking":
                            return navigationControls.register(effect, () => overrideCxMethods(
                                findByFilePath("modules/messages/validateJumpWithAlert.tsx"),
                                { default: () => true },
                                enabled
                            ));
                        case "jump-to-first-message":
                            return navigationControls.register(effect, () => registerJumpToFirst(enabled));
                        case "read-all-servers-button":
                            return navigationControls.register(effect, () => registerReadAllButton(enabled));
                        case "clean-channel-names":
                        case "title-channel-names":
                            return registerChannelNames(effect === "clean-channel-names" ? "clean" : "titles", enabled);
                        case "static-typing-dots":
                            return registerStaticTypingDots();
                        case "hide-disabled-emojis":
                            return hideDisabledEmojiInPicker(enabled);
                        case "copy-emoji-markdown":
                        case "sticker-links":
                            return registerExpressionLinks(effect);
                        case "reverse-image-search":
                            return registerReverseImageSearch();
                        case "copy-media-link":
                            return registerMediaLinkCopy();
                        case "profile-media":
                            return registerProfileMedia();
                        case "user-notes":
                            return registerLocalUserText("notes");
                        case "user-tags":
                            return registerLocalUserText("tags");
                        case "copy-channel-name":
                            return registerCopyChannelName(enabled);
                        case "hide-suggested-channels": {
                            const suggested = findByFilePath("modules/favorites/native/FavoritesGuildSuggestedChannels.tsx")?.default;
                            if (!suggested) throw new Error("Discord's suggested channels section is unavailable");
                            return registerJsxAppearance([suggested], () => null);
                        }
                        case "copy-text-attachment":
                            return registerTextAttachmentCopy(enabled);
                        case "image-filename":
                        case "image-full-url":
                            return registerImageFilename(effect === "image-full-url");
                        case "descriptive-gif-alt":
                            return registerGifAltText();
                        case "preserve-image-links": {
                            const parser = findByFilePath("modules/messages/native/renderer/MarkupParsers.tsx");
                            const visibleMessages = new WeakMap<object, object>();
                            return overrideCxMethods(parser, {
                                parseMessageMarkup(args, invoke) {
                                    const [message, contentMessage, hideSimpleEmbedContent, ...rest] = args;
                                    if (hideSimpleEmbedContent !== true || !message || typeof message !== "object") return invoke(args);
                                    const { content } = (contentMessage ?? message) as { content?: unknown; };
                                    if (typeof content !== "string" || !/https?:\/\//i.test(content)) return invoke(args);
                                    // Discord caches markup by message identity, without the hide flag.
                                    let visible = visibleMessages.get(message);
                                    if (!visible) {
                                        visible = Object.create(Object.getPrototypeOf(message), Object.getOwnPropertyDescriptors(message)) as object;
                                        visibleMessages.set(message, visible);
                                    }
                                    return invoke([visible, contentMessage, false, ...rest]);
                                },
                            }, enabled);
                        }
                        case "double-click-edit":
                        case "double-click-reply":
                            return registerMessageGesture(effect === "double-click-edit" ? "edit" : "reply");
                        case "open-steam-links": {
                            const links = findByFilePath("utils/MaskedLinkUtils.tsx");
                            const blockedDomains = findByFilePath("modules/blocked_domains/BlockedDomainStore.tsx")?.default;
                            if (typeof blockedDomains?.isBlockedDomain !== "function") throw new Error("Discord's blocked domain check is unavailable");
                            return overrideCxMethods(links, {
                                handleClick(args, invoke) {
                                    const options = args[0] as { href?: unknown; trusted?: unknown; messageId?: unknown; channelId?: unknown;
                                        onClick?: unknown; onConfirm?: unknown; onCancel?: unknown; shouldConfirm?: unknown; } | undefined;
                                    if (options?.trusted !== true || !isCxProfileUserId(options.messageId) || !isCxProfileUserId(options.channelId)
                                        || options.onClick != null || options.onConfirm != null || options.onCancel != null
                                        || options.shouldConfirm != null || args.length !== 1) return invoke(args);
                                    const link = getCxSteamLink(options.href);
                                    if (!link?.mobile || blockedDomains.isBlockedDomain(link.https) !== null) return invoke(args);
                                    void Linking.openURL(link.https).catch(() => {
                                        if (enabled()) showToast("Couldn't open the Steam link.");
                                    });
                                },
                            }, enabled);
                        }
                        case "code-block-gap": {
                            const parser = findByFilePath("modules/messages/native/renderer/MarkupParsers.tsx");
                            const cache = new WeakMap<object, unknown>();
                            type MarkupNode = { type?: string; content?: unknown; } | null;
                            function compactCodeBlocks(nodes: MarkupNode[], depth = 0): MarkupNode[] {
                                let changed = false;
                                const content = nodes.flatMap((node, index) => {
                                    if (depth < 8 && (node?.type === "blockQuote" || node?.type === "paragraph") && Array.isArray(node.content)) {
                                        const nested = compactCodeBlocks(node.content, depth + 1);
                                        if (nested !== node.content) {
                                            changed = true;
                                            return [{ ...node, content: nested }];
                                        }
                                    }
                                    if (nodes[index - 1]?.type !== "codeBlock") return [node];
                                    if (node?.type === "newline" && (node.content == null || node.content === "\n")) {
                                        changed = true;
                                        return [];
                                    }
                                    if (node?.type !== "text" && node?.type !== "newline" || typeof node.content !== "string"
                                        || !node.content.startsWith("\n")) return [node];
                                    changed = true;
                                    return node.content.length > 1 ? [{ ...node, content: node.content.slice(1) }] : [];
                                });
                                return changed ? content : nodes;
                            }
                            return overrideCxMethods(parser, {
                                parseMessageMarkup(args, invoke) {
                                    const row = invoke(args) as { content?: MarkupNode[]; isInlineReplyPreview?: boolean; hasBailedAst?: boolean; } | undefined;
                                    if (!Array.isArray(row?.content) || row.isInlineReplyPreview || row.hasBailedAst) return row;
                                    if (cache.has(row)) return cache.get(row);
                                    const content = compactCodeBlocks(row.content);
                                    const result = content === row.content ? row : { ...row, content };
                                    cache.set(row, result);
                                    return result;
                                },
                            }, enabled);
                        }
                        case "quick-mention":
                            return registerQuickMention(enabled);
                        case "force-owner-crown": {
                            const row = findByFilePath("modules/main_tabs_v2/native/shared_components/user_list/UserRow.tsx")?.default;
                            if (!row) throw new Error("Discord’s member row is unavailable");
                            return registerJsxAppearance([row], element => {
                                const { guildId, user, isOwner } = element.props;
                                if (isOwner || !isCxProfileUserId(guildId) || !isCxProfileUserId(user?.id)
                                    || GuildStore?.getGuild?.(guildId)?.ownerId !== user.id) return element;
                                return React.cloneElement(element, { isOwner: true });
                            });
                        }
                        case "spotify-song-name":
                            return overrideCxMethods(findByFilePath("modules/activity_status/getActivityStatusText.tsx"), {
                                default(args, invoke) {
                                    const result = invoke(args);
                                    const activity = args[0] as CxSpotifyActivity | undefined;
                                    const title = args[1] === true && getCxSpotifySongName(activity);
                                    const artist = typeof activity?.state === "string" && activity.state.split("; ").join(", ");
                                    return title && artist && result && typeof result === "object" && "text" in result && result.text === artist
                                        ? { ...result, text: title } : result;
                                },
                            }, enabled);
                        case "sort-reactions-by-count":
                            return overrideCxMethods(findByFilePath("modules/messages/native/renderer/transformReactions.tsx"), {
                                default(args, invoke) {
                                    const options = args[0] as { reactions?: readonly { count: number; }[]; } | undefined;
                                    if (!Array.isArray(options?.reactions) || options.reactions.length < 2) return invoke(args);
                                    return invoke([{ ...options, reactions: sortCxReactions(options.reactions) }, ...args.slice(1)]);
                                },
                            }, enabled);
                        case "keep-long-drafts":
                            return registerLongDrafts(enabled);
                        case "bypass-pin-prompt":
                            return registerBypassPinPrompt(enabled);
                        case "pin-message-shortcut":
                            return registerPinShortcut(enabled);
                        case "toggle-message-embeds":
                            return registerEmbedToggle(enabled);
                        case "repeat-message":
                            return registerRepeatMessages(enabled);
                        case "attachment-image-quality":
                        case "original-attachment-images":
                            return registerAttachmentImageQuality(effect === "original-attachment-images");
                        case "scroll-to-latest": {
                            const actions = findByProps("jumpToMessage", "fetchMessages");
                            if (typeof actions?.jumpToMessage !== "function") throw new Error("Discord message navigation is unavailable");
                            return bindCxChannelOpenRead({ dispatcher: FluxDispatcher, read: ReadStateStore, enabled,
                                selected: () => SelectedChannelStore?.getChannelId?.(), user: () => UserStore?.getCurrentUser?.()?.id,
                                jump: target => actions.jumpToMessage(target) });
                        }
                        case "unicode-emoji-autocomplete":
                        case "local-emoji-autocomplete":
                            return filterCxEmojiAutocomplete(EmojiStore, effect === "local-emoji-autocomplete" ? "local" : "unicode",
                                findByProps("EmojiIntention")?.EmojiIntention, enabled);
                        case "split-long-messages":
                            return registerSplitSender();
                        case "flat-attachments": {
                            const renderer = findByFilePath("modules/messages/native/renderer/createMessageContent.tsx");
                            return overrideCxMethods(renderer, {
                                default(args, invoke) {
                                    const presentation = invoke(args);
                                    if (!presentation || typeof presentation !== "object"
                                        || !("useAttachmentGridLayout" in presentation) || presentation.useAttachmentGridLayout !== true) return presentation;
                                    return { ...presentation, useAttachmentGridLayout: false };
                                },
                            }, enabled);
                        }
                        case "fix-file-extensions": {
                            const uploader = findByFilePath("lib/uploader/native/CloudUploader.tsx")?.default?.prototype;
                            return overrideCxMethods(uploader, {
                                uploadFiles: (args, original) => {
                                    fixCxFileExtensions(args[0]);
                                    return original(args);
                                },
                            }, enabled);
                        }
                        case "plus-reactions": {
                            const reactions = findByProps("addReaction", "removeReaction") ?? findByProps("addReaction");
                            if (typeof reactions?.addReaction !== "function") throw new Error("Discord reactions are unavailable");
                            const handle = createCxPlusReactionHandler({
                                messages: channel => MessageStore?.getMessages?.(channel),
                                guild: channel => ChannelStore?.getChannel?.(channel)?.guild_id,
                                emojis: () => EmojiStore,
                                unicode: name => findByProps("convertNameToSurrogate")?.convertNameToSurrogate(name),
                                react: (channel, message, emoji) => reactions.addReaction(channel, message, emoji),
                                error: () => { showToast("Couldn’t react to the previous message."); },
                            });
                            return instead("sendMessage", messageUtil, function (this: unknown, args, original) {
                                if (enabled()) {
                                    const result = handle(args[0], args[1], args[3]);
                                    if (result) return result;
                                }
                                return original.apply(this, args);
                            });
                        }
                        case "silent-typing":
                            return overrideCxMethods(findByProps("startTyping", "stopTyping"), {
                                startTyping: () => undefined,
                            }, enabled);
                        case "pending-friend-count":
                            return overrideCxMethods(RelationshipStore, { getPendingCount: () => 0, getPendingIncomingCount: () => 0 }, enabled);
                        case "animated-assets":
                            return animateCxAssets(findByProps("getUserAvatarURL", "getGuildIconURL"), false, enabled);
                        case "floor-relative-time":
                            return floorCxRelativeTime(findByProps("relativeTimeRounding", "locale"), enabled);
                        case "avatar-resolution":
                            return raiseCxAvatarResolution(findByProps("getUserAvatarURL", "getGuildIconURL"), avatarResolution, enabled);
                        case "stop-auto-unread":
                            return overrideCxMethods(findByStoreName("UnreadSettingNoticeStore2"), { maybeAutoUpgradeChannel: () => false }, enabled);
                    }
                },
                registerReplyPingSuppression() {
                    return onSendMessage((_message, options) => {
                        if (settings.safeMode?.enabled || !options?.messageReference) return;
                        options.allowedMentions = { parse: ["users", "roles", "everyone"], ...options.allowedMentions, replied_user: false };
                    });
                },
                registerPreviousMessageRule(rule) {
                    let active = true;
                    const editor = findByProps("editMessage", "startEditMessage");
                    if (typeof editor?.editMessage !== "function") throw new Error("Discord message edits are unavailable");
                    const currentUser = () => UserStore?.getCurrentUser?.()?.id;
                    const handle = createCxPreviousSendHandler(rule, {
                        currentUser,
                        previous(channel, own) {
                            const existing = own ? MessageStore?.getLastEditableMessage?.(channel) : MessageStore?.getLastMessage?.(channel);
                            if (existing) return existing;
                            const cache = MessageStore?.getMessages?.(channel);
                            const list = cache?.toArray?.() ?? cache?._array;
                            if (!Array.isArray(list)) return;
                            if (!own) return list[list.length - 1];
                            const me = currentUser();
                            for (let i = list.length - 1; i >= 0; i--) if (list[i]?.author?.id === me) return list[i];
                        },
                        edit: (channel, id, content) => editor.editMessage(channel, id, { content }),
                        error: () => { showToast("Couldn’t edit the previous message."); },
                    });
                    const unpatch = instead("sendMessage", messageUtil, function (this: unknown, args, original) {
                        const [channel, message, , options] = args;
                        if (active && !settings.safeMode?.enabled && typeof channel === "string") {
                            const edit = handle(channel, message?.content, Boolean(message?.tts || message?.attachments?.length
                                || message?.stickers?.length || message?.stickerIds?.length || options?.uploads?.length
                                || options?.stickers?.length || options?.messageReference || options?.replyOptions?.messageReference));
                            if (edit) return edit;
                        }
                        return original.apply(this, args);
                    });
                    return () => {
                        active = false;
                        unpatch();
                    };
                },
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
                registerProfileBioTransform(transform) {
                    const target = findByFilePath("modules/user_profile/native/UserProfileAboutMeCard.tsx")?.default;
                    if (!target) throw new Error("Discord's profile bio is unavailable");
                    return registerJsxAppearance([target], element => {
                        if (element.type !== target) return element;
                        const { displayProfile, pendingBio } = element.props;
                        const bio = displayProfile?.getPreviewBio?.(pendingBio);
                        if (typeof bio !== "string") return element;
                        const rewritten = transform(bio);
                        return rewritten === bio ? element : React.cloneElement(element, { pendingBio: rewritten });
                    });
                },
                getUserAvatarUrl(id) {
                    const user = id ? UserStore?.getUser?.(id) : UserStore?.getCurrentUser?.();
                    if (user) return findByProps("getUserAvatarURL", "getGuildIconURL")?.getUserAvatarURL(user, true, 1024);
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
                                    : input.type === "boolean" ? ApplicationCommandOptionType.BOOLEAN
                                        : input.type === "user" ? ApplicationCommandOptionType.USER
                                            : input.type === "role" ? ApplicationCommandOptionType.ROLE : ApplicationCommandOptionType.STRING,
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
                                reply: message => {
                                    if (!settings.safeMode?.enabled && context.channel?.id) messageUtil.sendBotMessage(context.channel.id, message);
                                },
                                prepareChannel() {
                                    const channelId = context.channel?.id;
                                    const accountId = UserStore?.getCurrentUser?.()?.id;
                                    if (!channelId || !accountId) return;
                                    const isCurrent = () => !settings.safeMode?.enabled && UserStore?.getCurrentUser?.()?.id === accountId;
                                    return {
                                        reply(content) { if (isCurrent()) messageUtil.sendBotMessage(channelId, content); },
                                        async send(content) {
                                            if (!isCurrent()) return;
                                            if (!ChannelStore?.getChannel(channelId)) throw new Error("The original channel is unavailable");
                                            await messageUtil.sendMessage(channelId, { content });
                                        },
                                    };
                                },
                                lookup(name, input) {
                                    if (name === "roleMembers" || name === "randomMember") {
                                        const guild = context.guild?.id ?? ChannelStore?.getChannel?.(context.channel?.id)?.guild_id;
                                        if (name === "randomMember") {
                                            const ids: string[] = guild ? GuildMemberStore?.getMemberIds?.(guild) ?? [] : [];
                                            return formatCxRandomMember(input, ids.map(userId => ({ userId })), UserStore?.getCurrentUser?.()?.id);
                                        }
                                        return formatCxRoleMembers(input, guild, guild ? GuildMemberStore?.getMembers?.(guild) ?? [] : [],
                                            id => UserStore?.getUser?.(id));
                                    }
                                    const track = SpotifyStore?.getTrack?.();
                                    if (track) return formatCxSpotify(name, input, track);
                                    const activity = SpotifyStore?.getActivity?.();
                                    return formatCxSpotify(name, input, {
                                        id: activity?.sync_id,
                                        album: { id: activity?.metadata?.album_id },
                                        artists: [{ id: activity?.metadata?.artist_ids?.[0] }],
                                    });
                                },
                                markServersRead: () => markCxServersRead(getReadStores(), acknowledgeServers),
                                friendInvites: operation => runCxFriendInvites(operation, findByProps("createFriendInvite")),
                                findUserTags: findLocalUserTags,
                                copyDiagnostics: async () => describeCcpReport(await copyCcpReport()),
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
                    return applyTemporaryTheme({
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
                        ...(theme.wallpaper ? { background: { url: theme.wallpaper, alpha: theme.wallpaperOpacity ?? 1, blur: theme.wallpaperBlur } } : {}),
                    }, theme.mode);
                },
            }, candidate.review.permissions, candidate.selected);
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
                            setSource(entry.source.length <= CX_INLINE_EDITOR_LIMIT ? entry.source : "");
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
                {candidate?.review.appearanceOptions.filter(supportsMobileHide).map(({ target, label }) => <TableSwitchRow key={target}
                    label={label} value={candidate.selected.includes(target)} onValueChange={(checked: boolean) => {
                        setCandidate({ ...candidate, selected: selectCxAppearanceOption(candidate.selected, target, checked) });
                    }} />)}
                {candidate && <TableRow label="Allow for this session" onPress={enable} />}
                {candidate && !source && <TableRow label="Edit CX source" onPress={() => setSource(candidate.source)} />}
                {session.list().flatMap(({ id, name }) => [
                    ...session.appearanceOptions(id).filter(supportsMobileHide).map(({ target, label, enabled }) => <TableSwitchRow key={`${id}:${target}`}
                        label={`${name} · ${label}`} value={enabled} onValueChange={(checked: boolean) => {
                            try {
                                session.setAppearanceOption(id, target, checked);
                                setStatus("");
                                refreshOptions(value => value + 1);
                            } catch (error) { setStatus(String(error instanceof Error ? error.message : error)); }
                        }} />),
                    <TableRow key={id} label={`Disable ${name}`} onPress={() => {
                        session.disable(id);
                        setStatus(`${name} disabled.`);
                    }} />,
                ])}
                {clearLocalUserNotes && <TableRow label="Clear local user notes" onPress={clearLocalUserNotes} />}
            </TableRowGroup>
            <Text accessibilityLiveRegion="polite" style={{ color: "#b5bac1" }}>{status}</Text>
        </Stack>
    </ScrollView>;
}

