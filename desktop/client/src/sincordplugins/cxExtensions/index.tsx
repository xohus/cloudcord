import { ApplicationCommandInputType, ApplicationCommandOptionType, commands, findOption, registerCommand, sendBotMessage, unregisterCommand, type VencordCommand } from "@api/Commands";
import { addContextMenuPatch, findGroupChildrenByChildId, removeContextMenuPatch, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePreEditListener, addMessagePreSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { showNotification } from "@api/Notifications";
import { animateCxAssets, bindCxSocialEvents, createCxPlusReactionHandler, createCxPreviousSendHandler, createCxSession, createCxSplitSender, cxAppearanceTargets, cxProfileMenuActions, CX_INLINE_EDITOR_LIMIT, filterCxEmojiAutocomplete, fixCxFileExtensions, floorCxRelativeTime, formatCxRandomMember, formatCxRoleMembers, formatCxSpotify, getCxProfileMenuCopy, isCxProfileUserId, markCxServersRead, MAX_CX_SOURCE, overrideCxMethods, raiseCxAvatarResolution, reviewCx, runCxFriendInvites, runCxIncomingRules, type CxUploadAnonymiser } from "@utils/cx";
import { copyToClipboard } from "@utils/clipboard";
import { bindCxChannelOpenRead, filterCxEmojiGrid, isCxNotificationMuted, type CxMessageAlert } from "@utils/cx";
import { formatCxEmojiMarkdown, formatCxStickerLink, getCxAttachmentImageUrl, validateCxMediaLink } from "@utils/cx";
import { describeCcpReport, inspectCcpRuntime } from "@utils/ccpInspect";
import { cxCatalog } from "@utils/cxCatalog";
import definePlugin from "@utils/types";
import { findByProps, findStore, waitFor, waitForSubscriptions, wreq } from "@webpack";
import { ActiveJoinedThreadsStore, ChannelActions, ChannelStore, Constants, EmojiStore, FluxDispatcher, GuildChannelStore, GuildMemberStore, GuildStore, IconUtils, Menu, MessageActions, MessageStore, NavigationRouter, PresenceStore, React, ReadStateStore, RelationshipStore, RestAPI, SelectedChannelStore, SelectedGuildStore, showToast, SpotifyStore, UserProfileStore, UserStore, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";

const session = createCxSession();
const typingDotListeners = new Set<() => void>();
let staticTypingDotUsers = 0;
let fixFileExtensionUsers = 0;
let flatAttachmentUsers = 0;
let attachmentQualityUsers = 0;
let originalAttachmentUsers = 0;
let splitSender: ReturnType<typeof createCxSplitSender> | undefined;
let uploadAnonymiser: CxUploadAnonymiser | undefined;
const staticTypingDots = () => staticTypingDotUsers > 0;

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
    const [candidate, setCandidate] = useState<{ source: string; review: ReturnType<typeof reviewCx>; }>();
    const [status, setStatus] = useState("");
    const selection = useRef(0);
    const searchText = search.trim().toLowerCase();

    function review(next: string) {
        selection.current++;
        setCandidate(undefined);
        try {
            setCandidate({ source: next, review: reviewCx(next) });
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
                registerUploadAnonymiser(anonymiser) {
                    if (uploadAnonymiser) throw new Error("An upload naming rule is already enabled");
                    uploadAnonymiser = anonymiser;
                    return () => { uploadAnonymiser = undefined; };
                },
                registerNativeEffect(effect, avatarResolution = 256) {
                    switch (effect) {
                        case "static-typing-dots":
                            return registerStaticTypingDots();
                        case "hide-disabled-emojis":
                            return hideDisabledEmojiInPicker();
                        case "copy-emoji-markdown":
                        case "sticker-links":
                            return registerExpressionLinks(effect);
                        case "copy-media-link":
                            return registerMediaLinkCopy();
                        case "attachment-image-quality":
                            attachmentQualityUsers++;
                            return () => { attachmentQualityUsers--; };
                        case "original-attachment-images":
                            originalAttachmentUsers++;
                            return () => { originalAttachmentUsers--; };
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
                registerMessageEditTransform(transform) {
                    const listener = addMessagePreEditListener((_, _id, message) => {
                        if (typeof message.content === "string") message.content = transform(message.content);
                    });
                    return () => { removeMessagePreEditListener(listener); };
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
                                markServersRead: () => markCxServersRead({
                                    guilds: GuildStore, channels: GuildChannelStore, threads: ActiveJoinedThreadsStore, read: ReadStateStore,
                                }, channels => { FluxDispatcher.dispatch({ type: "BULK_ACK", context: "APP", channels }); }),
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
            }, candidate.review.permissions);
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
            <button onClick={enable}>Allow for this session</button>
            {!source && <button onClick={() => setSource(candidate.source)}>Edit CX source</button>}
        </div>}
        {session.list().map(({ id, name }) => <button key={id} onClick={() => {
            session.disable(id);
            setStatus(`${name} disabled.`);
        }}>Disable {name}</button>)}
        <p role="status">{status}</p>
    </section>;
}

export default definePlugin({
    name: "CxExtensions",
    description: "Review and run permission-scoped CX plugins and themes.",
    authors: [{ name: "CloudCord", id: 0n }],
    required: true,
    dependencies: ["CommandsAPI", "MessageEventsAPI", "ContextMenuAPI"],
    patches: [{
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
        find: ".handleImageLoad)",
        replacement: {
            match: /getSrc\(\i\)\{/,
            replace: "$&var cxSrc=$self.getAttachmentImageSrc(this?.props,arguments[1]);if(cxSrc)return cxSrc;",
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
