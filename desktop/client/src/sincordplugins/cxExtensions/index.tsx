import { playAudio } from "@api/AudioPlayer";
import { ApplicationCommandInputType, ApplicationCommandOptionType, commands, findOption, registerCommand, sendBotMessage, unregisterCommand, type VencordCommand } from "@api/Commands";
import { addContextMenuPatch, findGroupChildrenByChildId, removeContextMenuPatch, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePreEditListener, addMessagePreSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { TextButton } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { CopyIcon, UpArrowIcon } from "@components/Icons";
import { buildCxRepeatMessage, getCxEmbedToggle, getCxPinAction, getCxSpotifySongName, sortCxReactions, type CxSpotifyActivity } from "@utils/cx";
import { animateCxAssets, bindCxSocialEvents, createCxPlusReactionHandler, createCxPreviousSendHandler, createCxSession, createCxSplitSender, cxAppearanceTargets, cxProfileMenuActions, CX_INLINE_EDITOR_LIMIT, filterCxEmojiAutocomplete, fixCxFileExtensions, floorCxRelativeTime, formatCxRandomMember, formatCxRoleMembers, formatCxSpotify, getCxProfileMenuCopy, isCxProfileUserId, markCxServersRead, MAX_CX_SOURCE, overrideCxMethods, raiseCxAvatarResolution, reviewCx, runCxFriendInvites, runCxIncomingRules, type CxUploadAnonymiser } from "@utils/cx";
import { createCxVoiceCount, isCxVoiceCountChannel, isCxVoiceCountFull, type CxVoiceCountChannel } from "@utils/cx";
import { bindCxCameraTone, createCxVoiceQueue, getCxImageSearchOptions, getCxSteamLink, getCxVoiceQueueRoom, type CxVoiceQueueOptions } from "@utils/cx";
import { escapeRegExp } from "@utils/text";
import { copyToClipboard } from "@utils/clipboard";
import { getCxChannelNameCopy, getCxProfileMedia } from "@utils/cx";
import { openImageModal } from "@utils/discord";
import { saveFile } from "@utils/web";
import { bindCxChannelOpenRead, filterCxEmojiGrid, isCxNotificationMuted, type CxMessageAlert } from "@utils/cx";
import { createCxTimestampRegistry, type CxTimestampSurface } from "@utils/cx";
import { createCxCallClock, createCxJumpActions, createCxVoiceMemberClock, createCxNavigationControls, getCxFirstMessageTarget, markCxServersReadAndWait, type CxNavigationChannel } from "@utils/cx";
import { selectCxAppearanceOption } from "@utils/cx";
import { formatCxChannelName, formatCxEmojiMarkdown, formatCxStickerLink, getCxAttachmentImageUrl, getCxGifDescription, getCxImageTitle, getCxMessageGesture, validateCxMediaLink, type CxChannelLabel } from "@utils/cx";
import { describeCcpReport, inspectCcpRuntime } from "@utils/ccpInspect";
import { cxCatalog } from "@utils/cxCatalog";
import type { Channel, Message } from "@vencord/discord-types";
import definePlugin from "@utils/types";
import { findByProps, findComponentByCodeLazy, findStore, waitFor, waitForSubscriptions, wreq } from "@webpack";
import { ActiveJoinedThreadsStore, ChannelActions, ChannelStore, ComponentDispatch, Constants, EmojiStore, FluxDispatcher, GuildChannelStore, GuildMemberStore, GuildStore, IconUtils, Menu, MessageActions, MessageStore, NavigationRouter, PermissionsBits, PermissionStore, PinActions, PresenceStore, React, ReadStateStore, RelationshipStore, RestAPI, SelectedChannelStore, SelectedGuildStore, showToast, SpotifyStore, UserProfileStore, UserStore, VoiceStateStore, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";
import { Alerts } from "@webpack/common";

const session = createCxSession();
const callClock = createCxCallClock();
const voiceMemberClock = createCxVoiceMemberClock();
const voiceCounts = createCxVoiceCount();

function VoiceChannelCount({ channel }: { channel: CxVoiceCountChannel; }) {
    const count = React.useSyncExternalStore(voiceCounts.subscribe, () => voiceCounts.read(channel));
    return count ? <span aria-label={"Voice occupancy " + count} style={{
        order: 2, flex: "0 0 auto", marginInlineStart: "auto", padding: "0 6px", borderRadius: 8,
        backgroundColor: "var(--background-modifier-selected)", fontSize: 12, fontVariantNumeric: "tabular-nums",
        color: isCxVoiceCountFull(count) ? "var(--text-danger)" : "var(--channels-default)",
    }}>{count}</span> : null;
}

function VoiceMemberTime({ userId, channelId }: { userId: string; channelId?: string; }) {
    const subscribe = React.useCallback((listener: () => void) => voiceMemberClock.subscribe(userId, listener), [userId]);
    const elapsed = React.useSyncExternalStore(subscribe, () => voiceMemberClock.read(userId, channelId));
    return elapsed ? <span aria-label={"Call time " + elapsed} style={{ marginInlineStart: 6, fontVariantNumeric: "tabular-nums" }}>{elapsed}</span> : null;
}

function CallTime({ channelId }: { channelId?: string; }) {
    const elapsed = React.useSyncExternalStore(callClock.subscribe, () => callClock.read(channelId));
    return elapsed ? <span style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>Time elapsed: {elapsed}</span> : null;
}

function registerJumpToMessageMenu() {
    let active = true;
    const jumpActions = createCxJumpActions(request => RestAPI.get(request),
        (id, message, guild) => NavigationRouter.transitionTo(`/channels/${guild ?? "@me"}/${id}/${message}`), showToast);
    const channelMenus = ["channel-context", "thread-context", "user-context", "gdm-context"];
    function append(children: ReactNode[], actions: ReturnType<typeof jumpActions>) {
        for (const { label, run } of actions) {
            children.push(<Menu.MenuItem id={"cx-" + label.toLowerCase().replaceAll(" ", "-")} label={label} action={run} />);
        }
    }
    const channelPatch: NavContextMenuPatchCallback = (children, { channel, thread, user }) => {
        if (!active || user && channel?.guild_id) return;
        const selected = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
        const forumThread = channel?.isForumLikeChannel?.() && selected?.isThread?.() && selected.parent_id === channel.id;
        append(children, jumpActions(thread ?? (forumThread ? selected : channel), () => active));
    };
    const messagePatch: NavContextMenuPatchCallback = (children, { message }) => {
        const id = SelectedChannelStore.getChannelId();
        const channel = ChannelStore.getChannel(id);
        if (!active || !channel?.guild_id || message?.channel_id !== id || !isCxProfileUserId(message?.author?.id)) return;
        append(children, jumpActions(channel, () => active && SelectedChannelStore.getChannelId() === id, message.author.id));
    };
    addContextMenuPatch(channelMenus, channelPatch);
    addContextMenuPatch("message", messagePatch);
    return () => {
        active = false;
        removeContextMenuPatch(channelMenus, channelPatch);
        removeContextMenuPatch("message", messagePatch);
    };
}

function registerWaitForSlot(options: CxVoiceQueueOptions) {
    const queue = createCxVoiceQueue({
        account: () => UserStore.getCurrentUser()?.id,
        currentVoice: () => SelectedChannelStore.getVoiceChannelId(),
        room(id) {
            const channel = ChannelStore.getChannel(id);
            if (channel?.type !== 2 || !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)
                || !PermissionStore.can(PermissionsBits.CONNECT, channel) || PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel)) return;
            return getCxVoiceQueueRoom(channel, VoiceStateStore?.getVoiceStatesForChannel?.(id));
        },
        join: id => ChannelActions.selectVoiceChannel(id),
        prompt: (title, body, confirmText, onConfirm, onCancel) => Alerts.show({
            title, body, confirmText, onConfirm, cancelText: "Cancel", onCancel,
            onCloseCallback: () => queueMicrotask(onCancel),
        }),
        sound: () => { playAudio("user_join"); },
    }, options);
    const patch: NavContextMenuPatchCallback = (children, { channel }) => {
        const action = queue.menu(channel?.id);
        if (action && !findGroupChildrenByChildId("vc-wait-for-slot", children)) {
            children.push(<Menu.MenuItem id="cx-wait-for-slot" label={action.label} action={action.run} />);
        }
    };
    const cleanups = [queue.stop];
    function stop() { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); }
    try {
        cleanups.push(overrideCxMethods(ChannelActions, {
            selectVoiceChannel: (args, invoke) => queue.promptFull(args[0]) ? undefined : invoke(args),
        }));
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", queue.update);
        cleanups.push(() => FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", queue.update));
        FluxDispatcher.subscribe("LOGOUT", queue.reset);
        cleanups.push(() => FluxDispatcher.unsubscribe("LOGOUT", queue.reset));
        addContextMenuPatch("channel-context", patch);
        cleanups.push(() => removeContextMenuPatch("channel-context", patch));
        return stop;
    } catch (error) { stop(); throw error; }
}

function registerCopyChannelName() {
    let active = true;
    const patch: NavContextMenuPatchCallback = (children, props) => {
        if (!active || !props?.channel) return;
        const copy = getCxChannelNameCopy(props.channel, id => UserStore.getUser(id)?.username);
        if (!copy) return;
        children.push(<Menu.MenuItem id="cx-copy-channel-name" label={copy.label} action={() => {
            if (active) void copyToClipboard(copy.name).then(
                () => showToast("Copied: " + copy.name), () => showToast("Couldn’t copy the channel name."),
            );
        }} />);
    };
    const menus = ["channel-context", "thread-context", "user-context", "gdm-context"];
    addContextMenuPatch(menus, patch);
    return () => { active = false; removeContextMenuPatch(menus, patch); };
}

function registerProfileMedia() {
    let active = true;
    const patch: NavContextMenuPatchCallback = (children, props) => {
        const id = props?.user?.id ?? props?.userId;
        if (!active || !isCxProfileUserId(id)) return;
        const user = props.user ?? UserStore.getUser(id);
        if (!user) return;
        const media = getCxProfileMedia(id, user, UserProfileStore.getUserProfile(id)?.banner);
        for (const asset of media) {
            const { kind, url, filename } = asset;
            children.push(
                <Menu.MenuItem key={"cx-view-" + kind} id={"cx-view-" + kind} label={"View " + kind} action={() => {
                    if (active) openImageModal({ url, width: kind === "Avatar" ? 512 : 1024 });
                }} />,
                <Menu.MenuItem key={"cx-download-" + kind} id={"cx-download-" + kind} label={"Download " + kind} action={async () => {
                    if (!active) return;
                    try {
                        const response = await fetch(url, { credentials: "omit", redirect: "error" });
                        if (!response.ok) throw new Error("Image unavailable");
                        const blob = await response.blob();
                        if (active) saveFile(new File([blob], filename));
                    } catch {
                        if (active) showToast("Couldn’t download the profile image.");
                    }
                }} />,
            );
        }
    };
    const menus = ["user-context", "user-profile-actions", "user-profile-overflow-menu"];
    addContextMenuPatch(menus, patch);
    return () => { active = false; removeContextMenuPatch(menus, patch); };
}

function MentionIcon({ width = 24, height = 24, className }: { width?: number | string; height?: number | string; className?: string; }) {
    return <svg viewBox="0 0 24 24" width={width} height={height} className={className} aria-hidden="true">
        <text x="12" y="18" textAnchor="middle" fontSize="19" fontWeight="bold" fill="currentColor">@</text>
    </svg>;
}

function registerQuickMention() {
    const id = "CxQuickMention";
    let active = true;
    addMessagePopoverButton(id, message => {
        const channel = ChannelStore.getChannel(message.channel_id);
        const author = message.author?.id;
        if (!channel || !isCxProfileUserId(author)
            || channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return null;
        return {
            label: "Quick Mention", icon: MentionIcon, message, channel,
            onClick: () => {
                if (!active || SelectedChannelStore.getChannelId() !== channel.id
                    || channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) return;
                const mention = "<@" + author + "> ";
                ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", { rawText: mention, plainText: mention });
            },
        };
    }, MentionIcon);
    return () => { active = false; removeMessagePopoverButton(id); };
}

function registerPinShortcut() {
    let active = true;
    const permission = PermissionsBits.PIN_MESSAGES ?? PermissionsBits.MANAGE_MESSAGES;
    const patch: NavContextMenuPatchCallback = (children, { message }) => {
        if (!active || !message) return;
        const channel = ChannelStore.getChannel(message.channel_id);
        if (!channel) return;
        const canPin = () => !channel.guild_id || PermissionStore.can(permission, channel);
        const action = getCxPinAction(message, channel.id, canPin());
        if (!action) return;
        children.push(<Menu.MenuItem id="cx-pin-shortcut" label={action.label} action={async () => {
            if (!active) return;
            try {
                const latest = MessageStore.getMessage(channel.id, action.id);
                const current = latest && getCxPinAction(latest, channel.id, canPin());
                if (current?.method === action.method) await PinActions[current.method](channel, current.id);
            } catch {
                showToast("Couldn’t change the message pin.");
            }
        }} />);
    };
    addContextMenuPatch("message", patch);
    return () => { active = false; removeContextMenuPatch("message", patch); };
}

function registerEmbedToggle() {
    let active = true;
    const getToggle = (message: Message) => {
        const channel = ChannelStore.getChannel(message.channel_id);
        if (!channel) return;
        return getCxEmbedToggle(message, channel.id, UserStore.getCurrentUser()?.id, {
            canEmbed: !channel.guild_id || PermissionStore.can(PermissionsBits.EMBED_LINKS, channel),
            canManage: !!channel.guild_id && PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel),
        });
    };
    const patch: NavContextMenuPatchCallback = (children, { message }) => {
        const toggle = active && message && getToggle(message);
        if (!toggle) return;
        children.push(<Menu.MenuItem id="cx-toggle-embeds" label={toggle.label} action={async () => {
            if (!active) return;
            try {
                const latest = MessageStore.getMessage(message.channel_id, toggle.id);
                const current = latest && getToggle(latest);
                if (!current || current.label !== toggle.label) return;
                await RestAPI.patch({ url: Constants.Endpoints.MESSAGE(message.channel_id, current.id), body: { flags: current.flags } });
            } catch {
                showToast("Couldn’t change embed visibility.");
            }
        }} />);
    };
    addContextMenuPatch("message", patch);
    return () => { active = false; removeContextMenuPatch("message", patch); };
}

function registerRepeatMessages() {
    const id = "CxRepeatMessages";
    let active = true;
    const canRepeat = (message: Message) => {
        const channel = ChannelStore.getChannel(message.channel_id);
        return active && channel && (!channel.guild_id
            || PermissionStore.can(channel.isThread?.() ? PermissionsBits.SEND_MESSAGES_IN_THREADS : PermissionsBits.SEND_MESSAGES, channel))
            ? channel : undefined;
    };
    const repeat = async (message: Message, reply: boolean) => {
        const channel = canRepeat(message);
        if (!channel || SelectedChannelStore.getChannelId() !== channel.id) return;
        try {
            const draft = buildCxRepeatMessage(message, channel.id, reply);
            if (draft) await MessageActions.sendMessage(channel.id,
                { content: draft.content, invalidEmojis: [], validNonShortcutEmojis: [], tts: false }, true, draft.options);
        } catch {
            showToast("Couldn’t repeat the message.");
        }
    };
    const patch: NavContextMenuPatchCallback = (children, props) => {
        const message = props.message ?? props.msg;
        if (!message || !canRepeat(message)) return;
        children.push(<Menu.MenuItem id="cx-repeat" label="Repeat" action={() => repeat(message, false)} />,
            <Menu.MenuItem id="cx-repeat-reply" label="Repeat and Reply" action={() => repeat(message, true)} />);
    };
    addContextMenuPatch("message", patch);
    addMessagePopoverButton(id, message => {
        const channel = canRepeat(message);
        if (!channel) return null;
        return {
            label: "Repeat (Click) / Repeat and Reply (Shift + Click)", icon: CopyIcon, message, channel,
            onClick: event => { void repeat(message, event.shiftKey); },
        };
    }, CopyIcon);
    return () => {
        active = false;
        removeMessagePopoverButton(id);
        removeContextMenuPatch("message", patch);
    };
}
const timestamps = createCxTimestampRegistry();
const navigationControls = createCxNavigationControls();
const ChannelToolbarIcon = findComponentByCodeLazy("tooltipPosition:", '"aria-haspopup":', '"data-jump-section":');

const getReadStores = () => ({ guilds: GuildStore, channels: GuildChannelStore, threads: ActiveJoinedThreadsStore, read: ReadStateStore });
const acknowledgeServers: Parameters<typeof markCxServersReadAndWait>[1] = channels => FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels });

function ReadAllServersButton() {
    return <TextButton variant="secondary" onClick={async () => {
        if (!navigationControls.has("read-all-servers-button")) return;
        try { showToast(await markCxServersReadAndWait(getReadStores(), acknowledgeServers)); }
        catch { showToast("Couldn't mark servers as read."); }
    }}>Read All</TextButton>;
}
const profileBioTransforms = new Set<(bio: string) => string>();
const typingDotListeners = new Set<() => void>();
let staticTypingDotUsers = 0;
let codeBlockGapUsers = 0;
const stockCodeBlock = /^```(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)\n*```/i;
const codeBlockWithoutGap = new RegExp(stockCodeBlock.source + "\\n?", stockCodeBlock.flags);
let fixFileExtensionUsers = 0;
let flatAttachmentUsers = 0;
let attachmentQualityUsers = 0;
let originalAttachmentUsers = 0;
let imageFilenameUsers = 0;
let imageFullUrlUsers = 0;
let descriptiveGifAltUsers = 0;
let imageLinkUsers = 0;
let roleHeaderUsers = 0;
let reactionSortUsers = 0;
let bypassPinPromptUsers = 0;
let longDraftUsers = 0;
let ownerCrownUsers = 0;
let spotifySongNameUsers = 0;
let fileCopyUsers = 0;
let splitSender: ReturnType<typeof createCxSplitSender> | undefined;
let uploadAnonymiser: CxUploadAnonymiser | undefined;
const staticTypingDots = () => staticTypingDotUsers > 0;
const messageGestures = { edit: 0, reply: 0 };
const channelNames = { clean: 0, titles: 0 };
let editingChannelId: string | undefined;
let stopChannelNames: (() => void) | undefined;

function refreshChannelNames() {
    (ChannelStore as { emitChange?: () => void; }).emitChange?.();
}

function registerChannelNames(mode: keyof typeof channelNames) {
    if (!stopChannelNames) {
        const cache = new WeakMap<CxChannelLabel, { name: string; value: CxChannelLabel; }>();
        stopChannelNames = overrideCxMethods(findStore("ChannelStore") ?? ChannelStore, {
            getChannel(args, invoke) {
                const channel = invoke(args) as CxChannelLabel | undefined;
                if (!channel || typeof channel.name !== "string" || editingChannelId && channel.id === editingChannelId) return channel;
                const name = formatCxChannelName(channel.name, channel, channelNames);
                if (name === channel.name) return channel;
                const cached = cache.get(channel);
                if (cached?.name === name) return cached.value;
                const descriptors = Object.getOwnPropertyDescriptors(channel);
                const value = Object.create(Object.getPrototypeOf(channel), {
                    ...descriptors,
                    name: { value: name, enumerable: descriptors.name?.enumerable ?? true, configurable: true, writable: true },
                });
                cache.set(channel, { name, value });
                return value;
            },
        });
    }
    channelNames[mode]++;
    let active = true;
    const release = () => {
        if (!active) return;
        active = false;
        channelNames[mode]--;
        if (!channelNames.clean && !channelNames.titles) {
            stopChannelNames?.();
            stopChannelNames = undefined;
        }
    };
    try { refreshChannelNames(); }
    catch (error) { release(); throw error; }
    return () => { release(); refreshChannelNames(); };
}

// DoubleClickEdit by rootpoi, kraethis and ewlle (GPL-3.0-or-later).
function onMessageDoubleClick(event: MouseEvent) {
    const { target } = event;
    if (!(target instanceof Element) || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || target.closest("a, button, input, textarea, [contenteditable], [role='button'], img, video, [class*='spoiler']")) return;
    const row = target.closest<HTMLElement>("[data-message-id], [data-list-item-id^='chat-messages'], [id^='chat-messages-']");
    const channelId = SelectedChannelStore.getChannelId();
    const listId = /^chat-messages(?:[_-]+chat-messages)?[_-]+(?:(\d{17,20})[_-])?(\d{17,20})$/.exec(row?.dataset.listItemId ?? row?.id ?? "");
    if (!channelId || listId?.[1] && listId[1] !== channelId) return;
    const messageId = row?.dataset.messageId ?? listId?.[2];
    if (!isCxProfileUserId(messageId)) return;
    const message = MessageStore.getMessage(channelId, messageId);
    const action = getCxMessageGesture(message, UserStore.getCurrentUser()?.id, messageGestures);
    if (!message || !action) return;
    if (action === "edit") {
        const editor = findByProps("startEditMessage", "editMessage");
        if (typeof editor?.startEditMessage !== "function") return;
        editor.startEditMessage(channelId, messageId, message.content);
    } else {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel || channel.guild_id && !PermissionStore.can(channel.isThread() ? PermissionsBits.SEND_MESSAGES_IN_THREADS : PermissionsBits.SEND_MESSAGES, channel)) return;
        void FluxDispatcher.dispatch({ type: "CREATE_PENDING_REPLY", channel, message, shouldMention: true, showMentionToggle: Boolean(channel.guild_id) });
        ComponentDispatch?.dispatchToLastSubscribed?.("TEXTAREA_FOCUS");
    }
    event.preventDefault();
}

function registerMessageGesture(mode: "edit" | "reply") {
    if (!messageGestures.edit && !messageGestures.reply) document.addEventListener("dblclick", onMessageDoubleClick);
    messageGestures[mode]++;
    return () => {
        messageGestures[mode]--;
        if (!messageGestures.edit && !messageGestures.reply) document.removeEventListener("dblclick", onMessageDoubleClick);
    };
}

function hideDisabledEmojiInPicker() {
    const match = (value: any) => typeof value?.type?.render === "function" && String(value.type.render).includes("EMOJI_PICKER_POPOUT");
    function filterTree(tree: ReactNode, depth = 0): ReactNode {
        if (depth === 12) return tree;
        if (Array.isArray(tree)) {
            const next = tree.map(child => filterTree(child, depth + 1));
            return next.every((child, index) => child === tree[index]) ? tree : next;
        }
        if (!React.isValidElement<Parameters<typeof filterCxEmojiGrid>[0] & { children?: ReactNode; }>(tree)) return tree;
        const patch = filterCxEmojiGrid(tree.props);
        if (patch) return React.cloneElement(tree, patch);
        const children = filterTree(tree.props.children, depth + 1);
        return children === tree.props.children ? tree : React.cloneElement(tree, { children });
    }
    let stop: (() => void) | undefined;
    waitFor(match, picker => {
        stop = overrideCxMethods(picker.type, {
            render: (args, invoke) => filterTree(invoke(args) as ReactNode),
        });
    });
    return () => { waitForSubscriptions.delete(match); stop?.(); };
}

function registerExpressionLinks(effect: "copy-emoji-markdown" | "sticker-links") {
    const menus = effect === "copy-emoji-markdown" ? ["expression-picker"] : ["expression-picker", "message"];
    let active = true;
    const patch: NavContextMenuPatchCallback = (children, props) => {
        if (!active) return;
        const target = props?.target;
        const data = target?.dataset;
        if (effect === "copy-emoji-markdown") {
            if (data?.type !== "emoji" || children.some(child => child?.props?.id === "cx-copy-emoji")) return;
            const surrogate = !data.id && typeof data.name === "string"
                ? findByProps("convertNameToSurrogate")?.convertNameToSurrogate?.(data.name) : undefined;
            const text = formatCxEmojiMarkdown({ id: data.id, name: data.name, src: target?.firstChild?.src, surrogate });
            if (text) children.push(<Menu.MenuItem id="cx-copy-emoji" label="Copy Emoji Markdown" action={() => {
                if (active) void copyToClipboard(text).catch(() => showToast("Couldn't copy the emoji."));
            }} />);
            return;
        }
        if (children.some(child => child?.props?.id === "cx-copy-sticker")) return;
        const id = props?.favoriteableType === "sticker" ? props.favoriteableId : data?.id;
        if (!isCxProfileUserId(id)) return;
        const sticker = props?.favoriteableType === "sticker" ? props.message?.stickerItems?.find?.((item: { id?: string; }) => item?.id === id)
            : findStore("StickersStore")?.getStickerById?.(id);
        const link = formatCxStickerLink(sticker);
        if (!link) return;
        children.push(<Menu.MenuItem id="cx-copy-sticker" label="Copy Sticker Link" action={() => {
            if (active) void copyToClipboard(link).catch(() => showToast("Couldn't copy the sticker link."));
        }} />, <Menu.MenuItem id="cx-open-sticker" label="Open Sticker Link" action={() => {
            if (!active) return;
            if (IS_WEB) window.open(link, "_blank", "noopener,noreferrer");
            else void VencordNative.native.openExternal(link).catch(() => showToast("Couldn't open the sticker link."));
        }} />);
    };
    addContextMenuPatch(menus, patch);
    return () => { active = false; removeContextMenuPatch(menus, patch); };
}

function registerReverseImageSearch() {
    let active = true;
    function search(url: string) {
        if (!active) return;
        if (IS_WEB) window.open(url, "_blank", "noopener,noreferrer");
        else void VencordNative.native.openExternal(url).catch(() => showToast("Couldn't open image search."));
    }
    const patch: NavContextMenuPatchCallback = (children, props) => {
        if (!active || findGroupChildrenByChildId("search-image", children)) return;
        const image = props?.src ?? (props?.cxImageSearchType === "img" ? props.itemHref ?? props.itemSrc : undefined);
        const options = getCxImageSearchOptions(image);
        if (!options.length) return;
        const group = findGroupChildrenByChildId("copy-native-link", children)
            ?? findGroupChildrenByChildId("copy-link", children) ?? children;
        group.push(<Menu.MenuItem id="cx-reverse-image-search" label="Search Image">
            {options.map(({ label, url }) => <Menu.MenuItem key={label} id={"cx-search-" + label} label={label} action={() => search(url)} />)}
            <Menu.MenuItem id="cx-search-all" label="All" action={() => options.forEach(({ url }) => search(url))} />
        </Menu.MenuItem>);
    };
    const menus = ["image-context", "message"];
    addContextMenuPatch(menus, patch);
    return () => { active = false; removeContextMenuPatch(menus, patch); };
}

function registerMediaLinkCopy() {
    let active = true;
    const id = "cx-copy-media-link";
    const patch: NavContextMenuPatchCallback = (children, props) => {
        if (!active) return;
        const media = validateCxMediaLink(props?.src ?? props?.itemSrc);
        const link = media ?? validateCxMediaLink(props?.href ?? props?.itemHref);
        if (!link || findGroupChildrenByChildId(id, children)) return;
        const group = findGroupChildrenByChildId("copy-native-link", children)
            ?? findGroupChildrenByChildId("open-native-link", children) ?? children;
        group.push(<Menu.MenuItem id={id} label={media ? "Copy Media Link" : "Copy Link"} action={() => {
            if (active) void copyToClipboard(link).then(() => showToast("Link copied."), () => showToast("Couldn't copy the link."));
        }} />);
    };
    addContextMenuPatch("image-context", patch);
    return () => { active = false; removeContextMenuPatch("image-context", patch); };
}

function subscribeTypingDots(listener: () => void) {
    typingDotListeners.add(listener);
    return () => { typingDotListeners.delete(listener); };
}

function registerStaticTypingDots() {
    if (++staticTypingDotUsers === 1) typingDotListeners.forEach(listener => listener());
    return () => {
        if (--staticTypingDotUsers === 0) typingDotListeners.forEach(listener => listener());
    };
}

function applyAppearanceCss(target: keyof typeof cxAppearanceTargets) {
    const style = document.createElement("style");
    style.textContent = cxAppearanceTargets[target].css;
    document.head.append(style);
    return () => style.remove();
}

function registerHideSuggestedChannels() {
    const listSelector = 'ul[aria-label="Channels"]';
    const marker = "data-cloudcord-cx-hide-suggested";
    const style = document.createElement("style");
    style.textContent = "[" + marker + "]{display:none!important}";
    document.head.append(style);

    let hidden = new Set<Element>();
    const scan = () => {
        const next = new Set<Element>();
        for (const list of document.querySelectorAll(listSelector)) {
            for (const heading of list.querySelectorAll("h3")) {
                if (heading.textContent?.trim() !== "Suggested") continue;
                const section = heading.closest("li");
                if (section?.querySelector('[role="button"],button')) next.add(section);
            }
        }
        for (const section of hidden) if (!next.has(section)) section.removeAttribute(marker);
        for (const section of next) if (!hidden.has(section)) section.setAttribute(marker, "");
        hidden = next;
    };
    let frame: number | undefined;
    const observer = new MutationObserver(records => {
        if (frame !== undefined || !records.some(record =>
            !!(record.target instanceof Element ? record.target : record.target.parentElement)?.closest(listSelector)
            || Array.from(record.addedNodes).some(node => node instanceof Element
                && (node.matches(listSelector) || !!node.querySelector(listSelector))))) return;
        frame = requestAnimationFrame(() => { frame = undefined; scan(); });
    });
    scan();
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => {
        observer.disconnect();
        if (frame !== undefined) cancelAnimationFrame(frame);
        style.remove();
        for (const section of hidden) section.removeAttribute(marker);
    };
}

function AnonymousUploadButton({ upload }: { upload: Parameters<CxUploadAnonymiser["isAnonymous"]>[0]; }) {
    const [selected, setSelected] = useState(() => uploadAnonymiser?.isAnonymous(upload) ?? false);
    if (!uploadAnonymiser) return null;
    return <button type="button" aria-pressed={selected} title="Anonymise this attachment's filename" onClick={() => {
        const next = !selected;
        uploadAnonymiser?.setAnonymous(upload, next);
        setSelected(next);
    }}>{selected ? "Anonymous name" : "Original name"}</button>;
}

export function CxSettings() {
    const [source, setSource] = useState("");
    const [search, setSearch] = useState("");
    const [pages, setPages] = useState({ Plugins: 0, Themes: 0 });
    const [candidate, setCandidate] = useState<{ source: string; review: ReturnType<typeof reviewCx>; selected: string[]; }>();
    const [, refreshOptions] = useState(0);
    const [status, setStatus] = useState("");
    const selection = useRef(0);
    const searchText = search.trim().toLowerCase();

    function review(next: string) {
        selection.current++;
        setCandidate(undefined);
        try {
            const preview = reviewCx(next);
            setCandidate({ source: next, review: preview, selected: preview.appearanceOptions.filter(option => option.defaultOn).map(option => option.target) });
            setStatus("");
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    function chooseSource(source: string | (() => Promise<string>)) {
        const id = ++selection.current;
        const show = (next: string) => {
            if (id !== selection.current) return;
            setSource(next.length <= CX_INLINE_EDITOR_LIMIT ? next : "");
            review(next);
        };
        if (typeof source === "string") {
            show(source);
            return;
        }
        setCandidate(undefined);
        setStatus("Loading CX source…");
        void source().then(show, () => {
            if (id === selection.current) setStatus("Could not load the CX catalog entry.");
        });
    }

    function enable() {
        if (!candidate) return;
        try {
            session.enable(candidate.source, {
                registerIncomingRules(rules) {
                    if (typeof FluxDispatcher?.addInterceptor !== "function") throw new Error("Discord events are unavailable");
                    let active = true;
                    const muteStore = rules.some(rule => rule.kind === "ping-alerts") ? findStore("UserGuildSettingsStore") : undefined;
                    const context = {
                        currentUser: () => UserStore.getCurrentUser()?.id,
                        channel: (id: string) => ChannelStore.getChannel(id),
                        replyAuthor: (channel: string, id: string) => MessageStore.getMessage(channel, id)?.author,
                        blocked: (id: string) => RelationshipStore?.isBlocked(id) === true,
                        ignored: (id: string) => RelationshipStore?.isIgnored?.(id) === true,
                        selectedChannel: () => SelectedChannelStore?.getChannelId?.(),
                        pingAlerts: {
                            status: (id: string) => PresenceStore?.getStatus(id),
                            isFriend: (id: string) => RelationshipStore?.isFriend?.(id) === true,
                            muted: (id: string, channel: Parameters<typeof isCxNotificationMuted>[1]) => isCxNotificationMuted(id, channel, muteStore),
                            notify: (alert: CxMessageAlert) => {
                                const account = UserStore.getCurrentUser()?.id;
                                setTimeout(() => {
                                    if (!active || account !== UserStore.getCurrentUser()?.id) return;
                                    const { author, channel, message, guild, title, body } = alert;
                                    void showNotification({ title, body, icon: UserStore.getUser(author)?.getAvatarURL?.(undefined, 128),
                                        noPersist: true, onClick: () => {
                                            if (active && account === UserStore.getCurrentUser()?.id)
                                                NavigationRouter.transitionTo(`/channels/${isCxProfileUserId(guild) ? guild : "@me"}/${channel}/${message}`);
                                        } });
                                }, 0);
                            },
                        },
                        openLink: (link: string, channel: string, user: string) => setTimeout(() => {
                            if (!active || context.currentUser() !== user || context.selectedChannel() !== channel) return;
                            if (IS_WEB) window.open(link, "_blank", "noopener,noreferrer");
                            else void VencordNative.native.openExternal(link).catch(() => {});
                        }, 0),
                        notify: (body: string) => setTimeout(() => {
                            if (active) void showNotification({ title: candidate.review.name, body });
                        }, 0),
                    };
                    const social = bindCxSocialEvents(rules, {
                        currentUser: context.currentUser, notify: context.notify,
                        isFriend: id => RelationshipStore?.isFriend?.(id) === true,
                        userName: id => { const user = UserStore?.getUser(id); return user?.globalName || user?.username; },
                        channelName: id => ChannelStore?.getChannel(id)?.name,
                        voiceChannel: () => SelectedChannelStore?.getVoiceChannelId(),
                        joinVoice: id => ChannelActions.selectVoiceChannel(id),
                        removalActions: () => findByProps("removeRelationship"),
                        enabled: () => active,
                    });
                    const interceptor = (payload: Parameters<typeof runCxIncomingRules>[1]) => {
                        try {
                            if (active) {
                                const patch = runCxIncomingRules(rules, payload, context);
                                if (patch === false) return true;
                                if (patch) Object.assign(payload, patch);
                                social?.observe(payload);
                            }
                        } catch { /* Discord must still receive its original event. */ }
                    };
                    try { FluxDispatcher.addInterceptor(interceptor); }
                    catch (error) { social?.stop(); throw error; }
                    return () => {
                        active = false;
                        const interceptors = FluxDispatcher._interceptors;
                        const index = interceptors?.indexOf(interceptor) ?? -1;
                        if (index !== -1) interceptors.splice(index, 1);
                        social?.stop();
                    };
                },
                registerProfileMenuAction(action) {
                    const { label, scope } = cxProfileMenuActions[action];
                    let active = true;
                    const itemId = "cx-profile-" + action;
                    const patch: NavContextMenuPatchCallback = (children, props) => {
                        const id = props?.user?.id ?? props?.userId;
                        if (!active || !isCxProfileUserId(id) || children.some(child => child?.props?.id === itemId)) return;
                        const selectedGuild = scope === "server" ? props?.guildId ?? SelectedGuildStore?.getGuildId() : undefined;
                        const guildId = isCxProfileUserId(selectedGuild) ? selectedGuild : undefined;
                        if (scope === "server" && !getCxProfileMenuCopy(action, id, UserProfileStore, guildId)) return;
                        children.push(<Menu.MenuItem id={itemId} label={label} action={() => {
                            if (!active) return;
                            const text = getCxProfileMenuCopy(action, id, UserProfileStore, guildId);
                            if (text) void copyToClipboard(text).catch(() => showToast("Couldn't copy to clipboard."));
                            else showToast("No profile colors found.");
                        }} />);
                    };
                    const menus = ["user-context", "user-profile-actions", "user-profile-overflow-menu"];
                    addContextMenuPatch(menus, patch);
                    return () => {
                        active = false;
                        removeContextMenuPatch(menus, patch);
                    };
                },
                hideAppearanceTarget: applyAppearanceCss,
                styleAppearanceTarget: applyAppearanceCss,
                registerTimestampFormats: timestamps.register,
                registerUploadAnonymiser(anonymiser) {
                    if (uploadAnonymiser) throw new Error("An upload naming rule is already enabled");
                    uploadAnonymiser = anonymiser;
                    return () => { uploadAnonymiser = undefined; };
                },
                registerNativeEffect(effect, avatarResolution = 256, effectOptions) {
                    switch (effect) {
                        case "voice-channel-count":
                            if (!effectOptions || !("showEmpty" in effectOptions)) throw new Error("Missing voice count options");
                            return voiceCounts.bind(VoiceStateStore, effectOptions);
                        case "webcam-start-notifier":
                            if (!effectOptions || !("scope" in effectOptions)) throw new Error("Missing camera tone options");
                            return bindCxCameraTone({
                                account: () => UserStore.getCurrentUser()?.id,
                                selected() {
                                    const id = SelectedChannelStore.getVoiceChannelId();
                                    const channel = id && ChannelStore.getChannel(id);
                                    if (id && channel) return { id, private: channel.type === 1 || channel.type === 3 };
                                },
                                states: id => VoiceStateStore?.getVoiceStatesForChannel?.(id),
                                play: on => { playAudio(on ? "user_join" : "user_leave"); },
                                dispatcher: FluxDispatcher,
                            }, effectOptions);
                        case "wait-for-slot":
                            if (!effectOptions || !("autoJoin" in effectOptions)) throw new Error("Missing voice queue options");
                            return registerWaitForSlot(effectOptions);
                        case "all-call-time-counter":
                            if (!effectOptions || !("human" in effectOptions)) throw new Error("Missing voice member timer options");
                            return voiceMemberClock.bind({
                                account: () => UserStore.getCurrentUser()?.id,
                                state: id => VoiceStateStore?.getVoiceStateForUser?.(id),
                                channelGuild: id => ChannelStore.getChannel(id)?.guild_id,
                                dispatcher: FluxDispatcher,
                            }, effectOptions);
                        case "call-time-counter":
                            return callClock.bind(SelectedChannelStore, FluxDispatcher);
                        case "jump-to-message-menu":
                            return registerJumpToMessageMenu();
                        case "jump-without-unblocking":
                        case "jump-to-first-message":
                            return navigationControls.register(effect);
                        case "read-all-servers-button":
                            return navigationControls.register(effect, () => {
                                addServerListElement(ServerListRenderPosition.Above, ReadAllServersButton);
                                return () => removeServerListElement(ServerListRenderPosition.Above, ReadAllServersButton);
                            });
                        case "clean-channel-names":
                        case "title-channel-names":
                            return registerChannelNames(effect === "clean-channel-names" ? "clean" : "titles");
                        case "static-typing-dots":
                            return registerStaticTypingDots();
                        case "code-block-gap":
                            codeBlockGapUsers++;
                            return () => { codeBlockGapUsers--; };
                        case "hide-disabled-emojis":
                            return hideDisabledEmojiInPicker();
                        case "copy-emoji-markdown":
                        case "sticker-links":
                            return registerExpressionLinks(effect);
                        case "reverse-image-search":
                            return registerReverseImageSearch();
                        case "copy-media-link":
                            return registerMediaLinkCopy();
                        case "open-steam-links": {
                            const onClick = (event: MouseEvent) => {
                                if (!event.isTrusted || event.defaultPrevented || event.button !== 0
                                    || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
                                const anchor = event.target.closest("a[href]");
                                if (!anchor?.closest("[data-message-id], [id^='chat-messages-']")) return;
                                const link = getCxSteamLink(anchor.getAttribute("href"));
                                if (!link || getCxSteamLink(anchor.textContent?.trim())?.https !== link.https) return;
                                if (findStore("BlockedDomainStore")?.isBlockedDomain?.(link.https) != null) return;
                                event.preventDefault();
                                event.stopPropagation();
                                if (IS_WEB) window.open(link.steam, "_blank", "noopener,noreferrer");
                                else void VencordNative.native.openExternal(link.steam).catch(() => showToast("Couldn't open the Steam link."));
                            };
                            document.addEventListener("click", onClick, true);
                            return () => document.removeEventListener("click", onClick, true);
                        }
                        case "profile-media":
                            return registerProfileMedia();
                        case "copy-channel-name":
                            return registerCopyChannelName();
                        case "hide-suggested-channels":
                            return registerHideSuggestedChannels();
                        case "copy-text-attachment":
                            fileCopyUsers++;
                            return () => { fileCopyUsers--; };
                        case "attachment-image-quality":
                            attachmentQualityUsers++;
                            return () => { attachmentQualityUsers--; };
                        case "original-attachment-images":
                            originalAttachmentUsers++;
                            return () => { originalAttachmentUsers--; };
                        case "image-filename":
                            imageFilenameUsers++;
                            return () => { imageFilenameUsers--; };
                        case "image-full-url":
                            imageFullUrlUsers++;
                            return () => { imageFullUrlUsers--; };
                        case "descriptive-gif-alt":
                            descriptiveGifAltUsers++;
                            return () => { descriptiveGifAltUsers--; };
                        case "preserve-image-links":
                            imageLinkUsers++;
                            return () => { imageLinkUsers--; };
                        case "double-click-edit":
                        case "double-click-reply":
                            return registerMessageGesture(effect === "double-click-edit" ? "edit" : "reply");
                        case "quick-mention":
                            return registerQuickMention();
                        case "keep-long-drafts":
                            longDraftUsers++;
                            return () => { longDraftUsers--; };
                        case "bypass-pin-prompt":
                            bypassPinPromptUsers++;
                            return () => { bypassPinPromptUsers--; };
                        case "pin-message-shortcut":
                            return registerPinShortcut();
                        case "toggle-message-embeds":
                            return registerEmbedToggle();
                        case "repeat-message":
                            return registerRepeatMessages();
                        case "scroll-to-latest":
                            return bindCxChannelOpenRead({ dispatcher: FluxDispatcher, read: ReadStateStore,
                                selected: () => SelectedChannelStore?.getChannelId(), user: () => UserStore?.getCurrentUser()?.id,
                                jump: target => MessageActions.jumpToMessage(target) });
                        case "unicode-emoji-autocomplete":
                        case "local-emoji-autocomplete":
                            return filterCxEmojiAutocomplete(EmojiStore, effect === "local-emoji-autocomplete" ? "local" : "unicode",
                                findByProps("EmojiIntention")?.EmojiIntention);
                        case "split-long-messages": {
                            if (splitSender) throw new Error("A CX message splitter is already active");
                            const sender = createCxSplitSender({
                                currentUser: () => UserStore?.getCurrentUser(),
                                channel: id => ChannelStore?.getChannel(id),
                                enabled: (): boolean => splitSender === sender,
                                failed: () => { showToast("The remaining message parts were not sent."); },
                            });
                            const stop = overrideCxMethods(findByProps("sendMessage", "editMessage"), { sendMessage: sender.send });
                            splitSender = sender;
                            return () => { splitSender = undefined; stop(); };
                        }
                        case "flat-attachments":
                            flatAttachmentUsers++;
                            return () => { flatAttachmentUsers--; };
                        case "fix-file-extensions":
                            fixFileExtensionUsers++;
                            return () => { fixFileExtensionUsers--; };
                        case "plus-reactions": {
                            const actions = findByProps("sendMessage", "getSendMessageOptions");
                            const handle = createCxPlusReactionHandler({
                                messages: channel => MessageStore?.getMessages(channel),
                                guild: channel => ChannelStore?.getChannel(channel)?.guild_id,
                                emojis: () => EmojiStore,
                                unicode: name => findByProps("convertNameToSurrogate")?.convertNameToSurrogate(name),
                                react: (channel, message, emoji) => RestAPI.put({
                                    url: Constants.Endpoints.REACTION(channel, message, emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name, "@me"),
                                }),
                                error: () => { showToast("Couldn’t react to the previous message."); },
                            });
                            return overrideCxMethods(actions, {
                                sendMessage: (args, original) => handle(args[0], args[1] as Parameters<typeof handle>[1], args[3] as Parameters<typeof handle>[2])
                                    ?? original(args),
                            });
                        }
                        case "silent-typing":
                            return overrideCxMethods(findByProps("startTyping", "stopTyping"), {
                                startTyping: () => Promise.resolve(),
                            });
                        case "pending-friend-count":
                            return overrideCxMethods(RelationshipStore, { getPendingCount: () => 0, getPendingIncomingCount: () => 0 });
                        case "force-owner-crown":
                            ownerCrownUsers++;
                            return () => { ownerCrownUsers--; };
                        case "spotify-song-name":
                            spotifySongNameUsers++;
                            return () => { spotifySongNameUsers--; };
                        case "sort-reactions-by-count":
                            reactionSortUsers++;
                            return () => { reactionSortUsers--; };
                        case "hide-role-headers":
                            roleHeaderUsers++;
                            return () => { roleHeaderUsers--; };
                        case "animated-assets":
                            return animateCxAssets(findByProps("getUserAvatarURL", "getGuildIconURL"), true);
                        case "floor-relative-time":
                            return floorCxRelativeTime(findByProps("relativeTimeRounding", "locale"));
                        case "avatar-resolution":
                            return raiseCxAvatarResolution(findByProps("getUserAvatarURL", "getGuildIconURL"), avatarResolution);
                        case "stop-auto-unread":
                            return overrideCxMethods(findStore("UnreadSettingNoticeStore2"), { maybeAutoUpgradeChannel: () => false });
                    }
                },
                registerReplyPingSuppression() {
                    const listener = addMessagePreSendListener((_, _message, { replyOptions }) => {
                        if (!replyOptions?.messageReference) return;
                        replyOptions.allowedMentions = { parse: ["users", "roles", "everyone"], ...replyOptions.allowedMentions, repliedUser: false };
                    });
                    return () => { removeMessagePreSendListener(listener); };
                },
                registerPreviousMessageRule(rule) {
                    let active = true;
                    const handle = createCxPreviousSendHandler(rule, {
                        currentUser: () => UserStore?.getCurrentUser()?.id,
                        previous: (channel, own) => own ? MessageStore?.getLastEditableMessage(channel) : MessageStore?.getLastMessage(channel),
                        edit: (channel, id, content) => MessageActions.editMessage(channel, id, { content }),
                        error: () => { showToast("Couldn’t edit the previous message."); },
                    });
                    const listener = addMessagePreSendListener(async (channel, message, options) => {
                        if (!active) return;
                        const edit = handle(channel, message.content, Boolean(message.tts || options?.replyOptions?.messageReference
                            || options?.uploads?.length || options?.stickers?.length));
                        if (!edit) return;
                        await edit;
                        return { cancel: true };
                    });
                    return () => {
                        active = false;
                        removeMessagePreSendListener(listener);
                    };
                },
                registerMessageTransform(transform) {
                    const listener = addMessagePreSendListener((_, message) => {
                        if (typeof message.content === "string") message.content = transform(message.content);
                    });
                    return () => { removeMessagePreSendListener(listener); };
                },
                registerSendConfirmation(check) {
                    if (typeof Alerts?.show !== "function") throw new Error("Discord's send confirmation is unavailable");
                    let active = true;
                    let cancelPending: (() => void) | undefined;
                    const listener = addMessagePreSendListener(async (_, message) => {
                        if (!active) return;
                        const body = check(message.content);
                        if (!body) return;
                        if (cancelPending) return { cancel: true };
                        const { content } = message;
                        const account = UserStore.getCurrentUser()?.id;
                        const selected = SelectedChannelStore.getChannelId();
                        try {
                            const confirmed = await new Promise<boolean>(resolve => {
                                cancelPending = () => resolve(false);
                                Alerts.show({ title: "Confirm message", body, cancelText: "Cancel", confirmText: "Send anyway",
                                    onConfirm: () => resolve(true), onCancel: cancelPending,
                                    onCloseCallback: () => queueMicrotask(() => resolve(false)),
                                });
                            });
                            return { cancel: !confirmed || !active || !account || account !== UserStore.getCurrentUser()?.id
                                || selected !== SelectedChannelStore.getChannelId() || message.content !== content };
                        } catch {
                            return { cancel: true };
                        } finally {
                            cancelPending = undefined;
                        }
                    });
                    return () => { active = false; cancelPending?.(); removeMessagePreSendListener(listener); };
                },
                registerMessageEditTransform(transform) {
                    const listener = addMessagePreEditListener((_, _id, message) => {
                        if (typeof message.content === "string") message.content = transform(message.content);
                    });
                    return () => { removeMessagePreEditListener(listener); };
                },
                registerProfileBioTransform(transform) {
                    profileBioTransforms.add(transform);
                    return () => { profileBioTransforms.delete(transform); };
                },
                getUserAvatarUrl(id) {
                    const user = id ? UserStore?.getUser(id) : UserStore?.getCurrentUser?.();
                    if (user) return IconUtils.getUserAvatarURL(user, true, 1024);
                },
                registerCommand(name, execute, acceptsText, sendsMessage, optionalSend, inputs) {
                    if (Object.prototype.hasOwnProperty.call(commands, name) || name in Object.prototype)
                        throw new Error(`Command /${name} already exists`);
                    const command: VencordCommand = {
                        name,
                        description: "Local CX command",
                        inputType: sendsMessage ? ApplicationCommandInputType.BUILT_IN_TEXT : ApplicationCommandInputType.BUILT_IN,
                        options: [
                            ...(acceptsText ? [{ name: "text", description: "Text to use", type: ApplicationCommandOptionType.STRING, required: true }] : []),
                            ...inputs.map(input => ({
                                name: input.name, description: input.name.replace(/[_-]/g, " "), required: input.required,
                                type: input.type === "integer" ? ApplicationCommandOptionType.INTEGER
                                    : input.type === "boolean" ? ApplicationCommandOptionType.BOOLEAN
                                        : input.type === "user" ? ApplicationCommandOptionType.USER
                                            : input.type === "role" ? ApplicationCommandOptionType.ROLE : ApplicationCommandOptionType.STRING,
                                choices: input.choices?.map(value => ({ name: value, label: value, value })),
                            })),
                            ...(optionalSend ? [{ name: "send", description: "Send the result to this chat", type: ApplicationCommandOptionType.BOOLEAN }] : []),
                        ],
                        execute(args, context) {
                            const outgoing = execute({
                                text: acceptsText ? findOption(args, "text", "") : undefined,
                                inputs: Object.fromEntries(inputs.map(input => [input.name, findOption(args, input.name)])),
                                sendRequested: optionalSend && findOption<boolean>(args, "send") === true,
                                reply: message => { if (context.channel?.id) sendBotMessage(context.channel.id, { content: message }); },
                                lookup(name, input) {
                                    if (name !== "roleMembers" && name !== "randomMember") return formatCxSpotify(name, input, SpotifyStore?.getTrack?.());
                                    const guild = context.guild?.id ?? context.channel?.guild_id;
                                    const members = guild ? GuildMemberStore?.getMembers(guild) ?? [] : [];
                                    return name === "randomMember" ? formatCxRandomMember(input, members, UserStore?.getCurrentUser()?.id)
                                        : formatCxRoleMembers(input, guild, members, id => UserStore?.getUser(id));
                                },
                                friendInvites: operation => runCxFriendInvites(operation, findByProps("createFriendInvite")),
                                async copyDiagnostics() {
                                    const report = inspectCcpRuntime("desktop", findStore, wreq?.c);
                                    await copyToClipboard(JSON.stringify(report));
                                    return describeCcpReport(report);
                                },
                                markServersRead: () => markCxServersRead(getReadStores(), acknowledgeServers),
                            });
                            if (outgoing !== undefined) return { content: outgoing };
                        },
                    };
                    registerCommand(command, "CxExtensions");
                    if (commands[name] !== command) throw new Error("Discord commands are not ready yet");
                    return () => { if (commands[name] === command) unregisterCommand(name); };
                },
                toast: body => { void showNotification({ title: candidate.review.name, body }); },
                applyTheme(theme) {
                    const style = document.createElement("style");
                    const surface = theme.surface ?? theme.background;
                    const sidebar = theme.sidebar ?? surface;
                    const shade = Math.round((1 - (theme.wallpaperOpacity ?? 1)) * 255).toString(16).padStart(2, "0");
                    const tint = theme.background + shade;
                    const wallpaper = `linear-gradient(${tint}, ${tint}), ${theme.background} url("${theme.wallpaper}") center / cover no-repeat`;
                    const blur = theme.wallpaperBlur ?? 0;
                    const colorTokens = {
                        ...Object.fromEntries(Object.entries(theme.rawColors ?? {}).filter(([key]) =>
                            /^(?:BRAND|PRIMARY|RED|GREEN|BLUE|YELLOW|PLUM|WHITE|BLACK)_[0-9]+$/.test(key))),
                        ...Object.fromEntries(Object.entries(theme.semanticColors ?? {}).filter(([key]) =>
                            /^(?:BACKGROUND|TEXT|INTERACTIVE|CHANNEL|BUTTON|STATUS|MENTION|SCROLLBAR|HEADER|BORDER|INPUT|BG)_/.test(key))),
                    };
                    const colorVariables = Object.entries(colorTokens)
                        .map(([key, color]) => "--" + key.toLowerCase().replaceAll("_", "-") + ": " + color + ";")
                        .join("\n");
                    style.textContent = `
                        .theme-dark, .theme-light {
                            ${colorVariables}
                            ${theme.mode ? `color-scheme: ${theme.mode};` : ""}
                            --background-primary: ${theme.background};
                            --background-secondary: ${surface};
                            --background-tertiary: ${sidebar};
                            --background-base-lowest: ${sidebar};
                            --background-base-lower: ${surface};
                            --background-base-low: ${theme.background};
                            --bg-base-primary: ${theme.background};
                            --chat-background-default: ${theme.background};
                            ${theme.text ? `--text-normal: ${theme.text}; --text-primary: ${theme.text}; --text-default: ${theme.text}; --text-strong: ${theme.text};` : ""}
                            ${theme.muted ? `--text-muted: ${theme.muted}; --text-secondary: ${theme.muted}; --text-subtle: ${theme.muted};` : ""}
                            ${theme.accent ? `--brand-500: ${theme.accent}; --text-link: ${theme.accent};` : ""}
                        }
                        ${theme.wallpaper ? `
                            [class^="chatContent_"] {
                                ${blur ? `position: relative; isolation: isolate; background: ${theme.background};` : `background: ${wallpaper};`}
                            }
                            ${blur ? `
                                [class^="chatContent_"]::before {
                                    content: "";
                                    position: absolute;
                                    inset: 0;
                                    pointer-events: none;
                                    z-index: -1;
                                    clip-path: inset(0);
                                    background: ${wallpaper};
                                    filter: blur(${blur}px);
                                }
                            ` : ""}
                            [class^="chatContent_"] [class^="messagesWrapper_"] { background: transparent; }
                        ` : ""}
                    `;
                    document.head.append(style);
                    return () => style.remove();
                },
            }, candidate.review.permissions, candidate.selected);
            setStatus(`${candidate.review.name} is active for this session.`);
            setCandidate(undefined);
        } catch (error) {
            setStatus(String(error instanceof Error ? error.message : error));
        }
    }

    return <section style={{ display: "grid", gap: 12 }}>
        <h2>CX Extensions</h2>
        <details>
            <summary>CX catalog · {cxCatalog.plugins.length} plugins · {cxCatalog.themes.length} themes</summary>
            <input aria-label="Search CX catalog" placeholder="Search CX catalog" value={search} onChange={event => {
                setSearch(event.currentTarget.value);
                setPages({ Plugins: 0, Themes: 0 });
            }} />
            {([["Plugins", cxCatalog.plugins], ["Themes", cxCatalog.themes]] as const).map(([kind, entries]) => {
                const matches = entries.filter(entry => entry.name.toLowerCase().includes(searchText));
                const page = pages[kind];
                const start = page * 12;
                return <div key={kind}>
                    <h3>{kind}</h3>
                    {matches.slice(start, start + 12).map(entry => <button key={entry.name} onClick={() => chooseSource(entry.source)}>{entry.name}</button>)}
                    {page > 0 && <button onClick={() => setPages({ ...pages, [kind]: page - 1 })}>{`Previous ${kind.toLowerCase()} page`}</button>}
                    {start + 12 < matches.length && <button onClick={() => setPages({ ...pages, [kind]: page + 1 })}>{`Next ${kind.toLowerCase()} page`}</button>}
                    {!matches.length && <p>No matches</p>}
                </div>;
            })}
        </details>
        <label>
            Open a .cx file
            <input type="file" accept=".cx" onChange={async event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                const id = ++selection.current;
                setCandidate(undefined);
                if (!/\.cx$/i.test(file.name) || file.size > MAX_CX_SOURCE) {
                    setStatus("Choose a .cx file under 512 KB.");
                    return;
                }
                try {
                    const next = await file.text();
                    if (id !== selection.current) return;
                    setSource(next.length <= CX_INLINE_EDITOR_LIMIT ? next : "");
                    review(next);
                } catch {
                    if (id === selection.current) setStatus("Could not read the CX file.");
                }
            }} />
        </label>
        <textarea aria-label="CX source" value={source} maxLength={MAX_CX_SOURCE} rows={8} style={{
            background: "var(--background-secondary, #2b2d31)", color: "var(--text-normal, #f2f3f5)", padding: 12, fontFamily: "monospace",
        }} onChange={event => {
            selection.current++;
            setCandidate(undefined);
            setSource(event.currentTarget.value);
        }} />
        <button onClick={() => review(source)}>Review CX</button>
        {candidate && <div>
            <strong>{candidate.review.name}</strong>
            <ul>{candidate.review.effects.map(effect => <li key={effect}>{effect}</li>)}</ul>
            {candidate.review.commands && <p>{candidate.review.commands.join(", ")}</p>}
            {candidate.review.appearanceOptions.map(({ target, label }) => <div key={target}>
                <label><input type="checkbox" aria-label={label} checked={candidate.selected.includes(target)} onChange={event => {
                    setCandidate({ ...candidate, selected: selectCxAppearanceOption(candidate.selected, target, event.currentTarget.checked) });
                }} /> {label}</label>
            </div>)}
            <button onClick={enable}>Allow for this session</button>
            {!source && <button onClick={() => setSource(candidate.source)}>Edit CX source</button>}
        </div>}
        {session.list().map(({ id, name }) => <div key={id}>
            {session.appearanceOptions(id).map(({ target, label, enabled }) => <div key={target}>
                <label><input type="checkbox" aria-label={`${name} · ${label}`} checked={enabled} onChange={event => {
                    try {
                        session.setAppearanceOption(id, target, event.currentTarget.checked);
                        setStatus("");
                        refreshOptions(value => value + 1);
                    } catch (error) { setStatus(String(error instanceof Error ? error.message : error)); }
                }} /> {label}</label>
            </div>)}
            <button onClick={() => {
                session.disable(id);
                setStatus(`${name} disabled.`);
            }}>Disable {name}</button>
        </div>)}
        <p role="status">{status}</p>
    </section>;
}

export default definePlugin({
    name: "CxExtensions",
    description: "Review and run permission-scoped CX plugins and themes.",
    authors: [{ name: "CloudCord", id: 0n }],
    required: true,
    dependencies: ["CommandsAPI", "MessageEventsAPI", "ContextMenuAPI", "ServerListAPI", "MessagePopoverAPI", "DynamicImageModalAPI"],
    flux: {
        CHANNEL_SETTINGS_INIT({ channelId }: { channelId: string; }) {
            editingChannelId = channelId;
            if (stopChannelNames) refreshChannelNames();
        },
        CHANNEL_SETTINGS_CLOSE() {
            editingChannelId = undefined;
            if (stopChannelNames) refreshChannelNames();
        },
    },
    patches: [{
        find: "#{intl::PREVIEW_BYTES_LEFT}",
        replacement: [
            {
                match: /fileContents:(\i),bytesLeft:(\i)\}\):null,/,
                replace: "$&$self.renderTextAttachmentCopy({fileContents:$1,bytesLeft:$2}),",
            },
            {
                match: /align:"\i"\}\),(?=\(0,\i\.jsx\)\(\i,\{wordWrap:\i,setWordWrap:\i)/,
                replace: "$&$self.renderTextAttachmentCopy(arguments[0]),",
            },
        ],
    }, {
        // FixCodeblockGap by Grzesiek11 (GPL-3.0-or-later).
        find: stockCodeBlock.source,
        replacement: {
            match: new RegExp(escapeRegExp(String(stockCodeBlock))),
            replace: "$self.codeBlockMatcher($&)",
        },
    }, {
        // NoRoleHeaders by Samwich (GPL-3.0-or-later).
        find: "this.updateMaxContentFeedRowSeen()",
        replacement: {
            match: /return (?=\i===\i\.\i\.UNKNOWN)/,
            replace: "return $self.hideRoleHeaders()?null:",
        },
    }, {
        find: "UNREAD_IMPORTANT:",
        predicate: () => !Settings.plugins.VoiceCount?.enabled,
        replacement: {
            match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
            replace: "$&,$self.renderVoiceChannelCount($1)",
        },
    }, {
        find: "VOICE_PANEL}}",
        predicate: () => !(Settings.plugins.CallTimer.enabled && Settings.plugins.CallTimer.allCallTimers),
        replacement: {
            match: /#{intl::GUEST_NAME_SUFFIX}\)\]\}\):""(?=.*?userId:(\i\.\i))/,
            replace: "$&,$self.renderVoiceMemberTime($1,arguments[0]?.channelId??arguments[0]?.channel?.id)",
        },
    }, {
        find: "renderConnectionStatus(){",
        predicate: () => !Settings.plugins.CallTimer.enabled,
        replacement: [
            {
                match: /(renderConnectionStatus\(\).{0,1000}?lineClamp:1,children:)(\i)(?=,|}\))/,
                replace: "$1[$2,$self.renderCallTime(this?.props?.channel?.id)]",
            },
            {
                match: /("RTCConnectionMenu".{0,200}?lineClamp:1,children:)(\i)(?=,|}\))/,
                replace: "$1[$2,$self.renderCallTime(this?.props?.channel?.id)]",
            },
        ],
    }, {
        find: "ApplicationLauncherCommand=3",
        predicate: () => !Settings.plugins.NoDraftLengthLimit?.enabled,
        replacement: {
            match: /(\.length>(4500|\i))(?=&&\(\i=\i\.substr\(0,\2\)\))/,
            replace: "$1&&!$self.keepLongDrafts()",
        },
    }, ...['source:"message-actions"', 'id:"pin",action', '"Channel Pins"'].map(find => ({
        find,
        predicate: () => !Settings.plugins.BypassPinPrompt?.enabled,
        replacement: {
            match: /(\i\.\i\.(?:unpin|pin)Message\(\i,\i\.id\)):(\i\.\i\.confirm(?:Unpin|Pin)\(\i,\i\))/g,
            replace: "$1:$self.shouldSkipPinPrompt()?$1:$2",
        },
    })), {
        find: "#{intl::GUILD_OWNER}),children:",
        predicate: () => !Settings.plugins.ForceOwnerCrown?.enabled,
        replacement: {
            match: /(?<=decorators:.{0,200}?isOwner:)\i/,
            replace: "$self.showOwnerCrown(arguments[0],$&)",
        },
    }, {
        find: '.join(", ");return{text:',
        predicate: () => !Settings.plugins.ShowSongName?.enabled,
        replacement: {
            match: /(?<=.join\(", "\);return\{text:)\i/,
            replace: "$self.spotifySongName(arguments[0],$&)",
        },
    }, {
        find: "visibleReactionsCount:",
        predicate: () => !Settings.plugins.SortReactions?.enabled,
        replacement: {
            match: /\{reactions:(\i),(?=message:\i,readOnly:)/,
            replace: "{reactions:$self.sortMessageReactions($1),",
        },
    }, {
        find: "#{intl::UNIGNORE_TO_JUMP_BODY}",
        predicate: () => !Settings.plugins.NoUnblockToJump?.enabled,
        replacement: {
            match: /if\(\i\.\i\.isBlockedForMessage\(/,
            replace: "if($self.canJumpWithoutUnblocking())return true;$&",
        },
    }, {
        find: "Missing channel in Channel.renderHeaderToolbar",
        replacement: {
            match: /(?<=renderHeaderToolbar"\);let (\i)=\[\];)/,
            replace: "$1.push($self.renderJumpToFirst(this.props.channel));",
        },
    }, {
        find: "#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}",
        replacement: [
            {
                match: /\i\.useMemo\(.{0,10}\i\.\i\)\(.{0,10}\]\)/,
                replace: "$self.formatTimestamp(arguments[0]?.timestamp,'accessibility',$&)",
            },
            {
                match: /\i\.useMemo\(.{0,50}"LT".{0,30}\]\)/,
                replace: "$self.formatTimestamp(arguments[0]?.timestamp,arguments[0]?.compact?'compact':'cozy',$&)",
            },
            {
                match: /(?<=__unsupportedReactNodeAsText:).{0,25}"LLLL"\)/,
                replace: "$self.formatTimestamp(arguments[0]?.timestamp,'tooltip',$&)",
            },
        ],
    }, {
        find: /.full,.{0,15}children:/,
        replacement: {
            match: /(?<=__unsupportedReactNodeAsText:)\i.full/,
            replace: "$self.formatTimestamp(Number(arguments[0]?.node?.timestamp)*1000,'markdown',$&)",
        },
    }, {
        find: "dotCycle:",
        replacement: {
            match: /(\{focused:\i\}=)(\(0,\i\.\i\)\(\))/g,
            replace: "$1$self.useTypingFocus($2)",
        },
    }, {
        find: "async uploadFiles(",
        replacement: {
            match: /async uploadFiles\((\i)\)\{/,
            replace: "$&$self.fixUploadExtensions($1);",
        },
    }, {
        // The message menu uses itemSrc for both image and video.
        find: "#{intl::MESSAGE_ACTIONS_MENU_LABEL}),shouldHideMediaOptions:",
        replacement: {
            match: /favoriteableType:\i,(?<=(\i)\.getAttribute\("data-type"\).+?)/,
            replace: (match, target) => `${match}cxImageSearchType:${target}.getAttribute("data-role"),`,
        },
    }, {
        find: ".handleImageLoad)",
        replacement: {
            match: /getSrc\(\i\)\{/,
            replace: "$&var cxSrc=$self.getAttachmentImageSrc(this?.props,arguments[1]);if(cxSrc)return cxSrc;",
        },
    }, {
        find: ".RESPONSIVE?",
        replacement: {
            match: /(?="data-role":"img","data-safe-src":)(?<=href:(\i).+?)/,
            replace: "...$self.getMediaTitle($1),",
        },
    }, {
        find: ".modalContext})};",
        replacement: {
            match: /(return.{0,10}\.jsx.{0,50}isWindowFocused)/,
            replace: "$self.updateGifAlt(e);$1",
        },
    }, {
        find: "#{intl::GIF}",
        replacement: {
            match: /alt:(\i)=(\i\.\i\.string\(\i\.\i#{intl::GIF}\))(?=,[^}]*\}=(\i))/,
            replace: "alt_$$:$1=$self.getMediaGifAlt($3,()=>$2)",
        },
    }, {
        // ImageLink by Kyuuhachi and Sqaaakoi (GPL-3.0-or-later).
        find: "unknownUserMentionPlaceholder:",
        replacement: {
            match: /\i\.has\(\i\.type\)&&\(0,\i\.\i\)\(\i\)/,
            replace: "(!$self.keepImageLinks()&&($&))",
        },
    }, {
        find: "disableInteractions:",
        replacement: {
            match: /(\{(?=[^{}]{0,350}\bdisableInteractions:\i)(?=[^{}]{0,350}\buserBio:\i)[^{}]{1,350}\}=)(\i)(?=[,;])/,
            replace: "$1$self.rewriteProfileBioProps($2)",
        },
    }, {
        // BlurNSFW by Ven (GPL-3.0-or-later).
        find: "}renderStickersAccessories(",
        replacement: {
            match: /(\.renderReactions\(\i\).+?className:)/,
            replace: '$1(this?.props?.channel?.nsfw?"cc-cx-nsfw-media ":"")+',
        },
    }, {
        find: "#{intl::ATTACHMENT_UTILITIES_SPOILER}",
        replacement: {
            match: /(?<=children:\[)(?=.{10,80}tooltip:.{0,100}#{intl::ATTACHMENT_UTILITIES_SPOILER})/,
            replace: "$self.renderAnonymousUploadButton(arguments[0]),",
        },
    }, {
        find: '"PLAINTEXT_PREVIEW":"OTHER"',
        replacement: {
            match: /"IMAGE"===\i\|\|"VIDEO"===\i\|\|"CLIP"===\i/,
            replace: "(!$self.useFlatAttachmentLayout()&&($&))",
        },
    }, {
        find: "return{visualMediaItems:",
        replacement: {
            match: /return\{visualMediaItems:.+?props:(\i)(?=.{0,20}?\1\.item\.uniqueId)/,
            replace: '$&,...($self.useFlatAttachmentLayout()&&["IMAGE","VIDEO","CLIP"].includes($1.item?.type)?{useFullWidth:false}:null)',
        },
    }, {
        find: "renderAttachments(",
        replacement: {
            match: /url:(\i)\.url\}\);return /,
            replace: "$&(!$self.useFlatAttachmentLayout()||$1.content_type?.startsWith('image/'))&&",
        },
    }, {
        find: 'type:"MESSAGE_LENGTH_UPSELL"',
        replacement: {
            match: /if\((\i)\.length>(\i)/,
            replace: "if(!$self.canSplitDraft($1)&&$1.length>$2",
        },
    }, {
        find: ".onHideAutocomplete?",
        replacement: {
            match: /(?<=getData\(\i\.type\);)if\((\i)\.length>(\i)\)/,
            replace: "if(!$self.canSplitDraft($1)&&$1.length>$2)",
        },
    }],
    codeBlockMatcher(original: RegExp) { return codeBlockGapUsers > 0 ? codeBlockWithoutGap : original; },
    hideRoleHeaders() { return roleHeaderUsers > 0; },
    renderTextAttachmentCopy({ fileContents, bytesLeft }: { fileContents?: string; bytesLeft?: number; } = {}) {
        if (!fileCopyUsers || typeof fileContents !== "string" || typeof bytesLeft !== "number" || !Number.isFinite(bytesLeft)) return null;
        const complete = bytesLeft <= 0;
        return <TextButton disabled={!complete} onClick={() => {
            if (fileCopyUsers && complete) void copyToClipboard(fileContents)
                .then(() => showToast("File contents copied."), () => showToast("Couldn’t copy the file."));
        }}>{complete ? "Copy File Contents" : "File too large to copy"}</TextButton>;
    },
    renderVoiceChannelCount(channel: Channel) {
        return isCxVoiceCountChannel(channel) && PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)
            ? <VoiceChannelCount channel={channel} /> : null;
    },
    renderVoiceMemberTime(userId: string, channelId?: string) {
        if (!isCxProfileUserId(userId)) return null;
        return <VoiceMemberTime userId={userId} channelId={isCxProfileUserId(channelId) ? channelId : undefined} />;
    },
    renderCallTime(channelId?: string) {
        return <CallTime channelId={channelId} />;
    },
    showOwnerCrown(props: { user?: { id?: string; }; guildId?: string; channel?: { guild_id?: string; type?: number; }; } | undefined, original: boolean) {
        if (original || ownerCrownUsers === 0 || props?.channel?.type === 3) return original;
        const guildId = props?.guildId ?? props?.channel?.guild_id;
        const userId = props?.user?.id;
        return isCxProfileUserId(guildId) && isCxProfileUserId(userId) && GuildStore?.getGuild(guildId)?.ownerId === userId;
    },
    spotifySongName(activity: CxSpotifyActivity | undefined, original: string) {
        return spotifySongNameUsers > 0 ? getCxSpotifySongName(activity) ?? original : original;
    },
    keepLongDrafts() { return longDraftUsers > 0; },
    shouldSkipPinPrompt() { return bypassPinPromptUsers > 0; },
    sortMessageReactions<T extends { count: number; }>(reactions: readonly T[]) {
        return reactionSortUsers > 0 ? sortCxReactions(reactions) : reactions;
    },
    canJumpWithoutUnblocking() { return navigationControls.has("jump-without-unblocking"); },
    renderJumpToFirst(channel: CxNavigationChannel | undefined) {
        if (!navigationControls.has("jump-to-first-message")) return null;
        const target = getCxFirstMessageTarget(channel);
        if (!target) return null;
        return <ErrorBoundary key="cx-jump-to-first" noop>
            <ChannelToolbarIcon tooltip="Jump to First Message" icon={UpArrowIcon} onClick={async () => {
                if (!navigationControls.has("jump-to-first-message") || SelectedChannelStore.getChannelId() !== target.channelId) return;
                try { await MessageActions.jumpToMessage(target); }
                catch { showToast("Couldn't jump to the first message."); }
            }} />
        </ErrorBoundary>;
    },
    formatTimestamp(input: unknown, surface: CxTimestampSurface, original: unknown) {
        return typeof original === "string" && original ? timestamps.format(input, surface) ?? original : original;
    },
    canSplitDraft(text: unknown) {
        return splitSender?.canSplit(SelectedChannelStore?.getChannelId(), text) === true;
    },
    useFlatAttachmentLayout() {
        return flatAttachmentUsers > 0;
    },
    getAttachmentImageSrc(props: { src?: string; width?: number; height?: number; contentType?: string; trigger?: unknown; }, frozen?: boolean) {
        if ((!attachmentQualityUsers && !originalAttachmentUsers) || !props
            || (props.contentType && (typeof props.contentType !== "string" || !props.contentType.startsWith("image/")))) return;
        return getCxAttachmentImageUrl(props.src, { width: props.width, height: props.height,
            original: Boolean(props.trigger || originalAttachmentUsers), frozen: frozen === true });
    },
    getMediaTitle(source: unknown) {
        if (!imageFilenameUsers && !imageFullUrlUsers) return;
        const title = getCxImageTitle(source, imageFullUrlUsers > 0);
        if (title) return { title };
    },
    keepImageLinks() {
        return imageLinkUsers > 0;
    },
    rewriteProfileBioProps<T extends { userBio?: unknown; }>(props: T) {
        if (!profileBioTransforms.size || typeof props?.userBio !== "string") return props;
        let bio = props.userBio;
        for (const transform of profileBioTransforms) bio = transform(bio);
        return bio === props.userBio ? props : { ...props, userBio: bio };
    },
    getMediaGifAlt(props: { original?: unknown; src?: unknown; alt?: string; } | undefined, fallback: () => string) {
        const alt = props?.alt === undefined ? fallback() : props.alt;
        if (!descriptiveGifAltUsers) return alt;
        return getCxGifDescription(props?.original ?? props?.src, props?.alt, true) ?? alt;
    },
    updateGifAlt(props: { original?: unknown; src?: unknown; alt?: string; } | undefined) {
        if (!descriptiveGifAltUsers || !props) return;
        const alt = getCxGifDescription(props.original ?? props.src, props.alt, true);
        if (alt) try { props.alt = alt; } catch { /* The source element may be frozen. */ }
    },
    fixUploadExtensions(files: unknown) {
        if (fixFileExtensionUsers) fixCxFileExtensions(files);
        uploadAnonymiser?.apply(files);
    },
    renderAnonymousUploadButton({ upload, canEdit }: { upload?: Parameters<CxUploadAnonymiser["isAnonymous"]>[0]; canEdit?: boolean; }) {
        return uploadAnonymiser && upload && canEdit !== false ? <AnonymousUploadButton upload={upload} /> : null;
    },
    useTypingFocus(focus: { focused: boolean; }) {
        const isStatic = React.useSyncExternalStore(subscribeTypingDots, staticTypingDots);
        return isStatic ? { focused: false } : focus;
    },
    stop() {
        session.clear();
    },
});
