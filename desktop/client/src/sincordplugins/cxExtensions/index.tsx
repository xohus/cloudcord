import { ApplicationCommandInputType, ApplicationCommandOptionType, commands, findOption, registerCommand, sendBotMessage, unregisterCommand, type VencordCommand } from "@api/Commands";
import { addContextMenuPatch, removeContextMenuPatch, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePreEditListener, addMessagePreSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { showNotification } from "@api/Notifications";
import { animateCxAssets, bindCxSocialEvents, createCxPreviousSendHandler, createCxSession, cxAppearanceTargets, cxProfileMenuActions, CX_INLINE_EDITOR_LIMIT, floorCxRelativeTime, formatCxRandomMember, formatCxRoleMembers, formatCxSpotify, getCxProfileMenuCopy, isCxProfileUserId, markCxServersRead, MAX_CX_SOURCE, overrideCxMethods, raiseCxAvatarResolution, reviewCx, runCxFriendInvites, runCxIncomingRules } from "@utils/cx";
import { copyToClipboard } from "@utils/clipboard";
import { cxCatalog } from "@utils/cxCatalog";
import definePlugin from "@utils/types";
import { findByProps, findStore } from "@webpack";
import { ActiveJoinedThreadsStore, ChannelActions, ChannelStore, FluxDispatcher, GuildChannelStore, GuildMemberStore, GuildStore, IconUtils, Menu, MessageActions, MessageStore, ReadStateStore, RelationshipStore, SelectedChannelStore, SelectedGuildStore, showToast, SpotifyStore, UserProfileStore, UserStore, useRef, useState } from "@webpack/common";

const session = createCxSession();

function applyAppearanceCss(target: keyof typeof cxAppearanceTargets) {
    const style = document.createElement("style");
    style.textContent = cxAppearanceTargets[target].css;
    document.head.append(style);
    return () => style.remove();
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
                    const context = {
                        currentUser: () => UserStore.getCurrentUser()?.id,
                        channel: (id: string) => ChannelStore.getChannel(id),
                        replyAuthor: (channel: string, id: string) => MessageStore.getMessage(channel, id)?.author,
                        blocked: (id: string) => RelationshipStore?.isBlocked(id) === true,
                        ignored: (id: string) => RelationshipStore?.isIgnored?.(id) === true,
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
                registerNativeEffect(effect, avatarResolution = 256) {
                    switch (effect) {
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
    stop() {
        session.clear();
    },
});
