const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { inflateSync } = require("node:zlib");
const { buildSync, transformSync } = require("esbuild");

const root = path.join(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const moduleBox = { exports: {} };
const code = buildSync({
    entryPoints: [path.join(root, "desktop/client/src/utils/cx.ts")],
    nodePaths: [path.resolve(require.resolve("moment/package.json"), "../..")],
    bundle: true, write: false, format: "cjs", minify: true,
}).outputFiles[0].text;
let wikiRequest;
let clockTime;
const clockTimers = new Set();
vm.runInNewContext(code, {
    module: moduleBox, AbortController, setTimeout, clearTimeout,
    Date: class extends Date { static now() { return clockTime ?? Date.now(); } },
    setInterval: callback => { clockTimers.add(callback); return callback; },
    clearInterval: callback => clockTimers.delete(callback),
    fetch: (url, options) => new Promise((resolve, reject) => {
        wikiRequest = { url, options, resolve };
        options.signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
    }),
});
const { activateCx, createCxSession, parseCx, reviewCx } = moduleBox.exports;
const reportModule = { exports: {} };
vm.runInNewContext(transformSync(read("desktop/client/src/utils/ccpInspect.ts"), { loader: "ts", format: "cjs" }).code,
    { module: reportModule });
const generated = require("../../desktop/client/scripts/sync-cx-catalog.cjs").buildCatalog();
assert.equal(read("desktop/client/src/utils/cxCatalog.ts").replaceAll("\r\n", "\n"), generated.source, "Shared CX catalog needs regeneration");
const catalogModule = { exports: {} };
const catalogCode = buildSync({
    entryPoints: [path.join(root, "desktop/client/src/utils/cxCatalog.ts")],
    bundle: true, write: false, format: "cjs", loader: { ".cx": "text" },
}).outputFiles[0].text;
vm.runInNewContext(catalogCode, { module: catalogModule });
const { cxCatalog } = catalogModule.exports;
assert.equal(cxCatalog.plugins.length, generated.plugins);
assert.equal(cxCatalog.themes.length, generated.themes);
const catppuccinIndex = JSON.parse(read("themes/mobile/index.json")).themes.filter(entry =>
    entry.repo === "https://github.com/catppuccin/vendetta");
assert.equal(catppuccinIndex.length, 56);
for (const entry of catppuccinIndex) {
    const theme = parseCx(cxCatalog.themes.find(theme => theme.name === entry.name.replace(/ - Blue$/, "")).source);
    assert.equal(theme.accent, entry.preview.accent);
    assert.equal(theme.mode, entry.id.includes("/latte/") ? "light" : "dark");
    assert.equal(Object.keys(theme.semanticColors).length, 46);
    assert.equal(Object.keys(theme.rawColors).length, 144);
}
const basicBackground = parseCx(cxCatalog.themes.find(entry => entry.name === "BasicBackground (Chat)").source);
assert.equal(basicBackground.wallpaperOpacity, 0.85);
assert.match(basicBackground.wallpaper, /^data:image\/jpeg;base64,/);
const futuristic = cxCatalog.themes.filter(entry => entry.name.startsWith("Futuristic - "));
assert.equal(futuristic.length, 5);
assert.equal(new Set(futuristic.map(entry => parseCx(entry.source).wallpaper)).size, 5);
const plugin = read("examples/cx/hello.cx").trimEnd();
const theme = read("examples/cx/midnight.cx").trimEnd();
const grants = ["commands.register", "ui.toast"];
const callbacks = new Map();
const messages = [];
let background;
const host = {
    registerCommand(name, callback) {
        if (callbacks.has(name)) throw new Error("Duplicate command");
        callbacks.set(name, callback);
        return () => callbacks.delete(name);
    },
    toast: message => messages.push(message),
    applyTheme(value) {
        background = value;
        return () => { background = undefined; };
    },
};
assert.equal(reviewCx(plugin).commands.join(), "/hello");
assert.throws(() => activateCx(plugin, host, ["commands.register"]), /approval/);
assert.equal(callbacks.size, 0);

const session = createCxSession();
session.enable(plugin, host, grants);
const command = callbacks.get("hello");
command({ token: "untrusted callback argument" });
session.enable(theme, host, []);
assert.equal(background.background, "#101018");
assert.throws(() => session.enable(theme, host, []), /active CX theme/);
session.disable("plugin:Hello");
command();
assert.deepEqual(messages, ["Hey!"]);
assert.equal(callbacks.size, 0);
session.clear();
assert.equal(background, undefined);

callbacks.set("other", () => {});
assert.throws(() => activateCx(plugin + '\n  on command "other":\n    toast "Hi"', host, grants), /Duplicate/);
assert.equal(callbacks.has("hello"), false);
for (const unsafe of ['    eval "code"', '    toast token', '    fetch "https://example.com"', '    native.read "token"'])
    assert.throws(() => parseCx(plugin + "\n" + unsafe));
assert.throws(() => parseCx(plugin.replace("ui.toast", "tokens.read")), /permission/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "https://example.com/image.png"'), /embedded/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "data:image/svg+xml;base64,AAAA"'), /embedded/);
assert.throws(() => parseCx(theme + '\n  semantic __proto__: #123456'), /theme field/);
assert.throws(() => parseCx(theme + '\n  raw BRAND_500: url(https://example.com)'), /theme field/);
assert.throws(() => parseCx(theme + '\n  semantic TEXT_PRIMARY: #123456\n  semantic TEXT_PRIMARY: #654321'), /Duplicate/);
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZ0AAAAASUVORK5CYII=";
assert.equal(parseCx(theme + '\n  wallpaper: "' + png + '"').wallpaper, png);
const wallpaperSource = (type, bytes) => theme + "\n  wallpaper: " + JSON.stringify("data:image/" + type + ";base64," + bytes.toString("base64"));
const pngHeader = Buffer.from(png.split(",")[1], "base64");
assert.throws(() => parseCx(wallpaperSource("png", pngHeader.subarray(0, 24))), /valid image dimensions/);
pngHeader.writeUInt32BE(32768, 16);
assert.throws(() => parseCx(wallpaperSource("png", pngHeader)), /4096 pixels per side/);
const jpeg = Buffer.from("ffd8ffe00002ffc0000b080320050001011100ffd9", "hex");
assert.equal(parseCx(wallpaperSource("jpeg", jpeg)).wallpaper, "data:image/jpeg;base64," + jpeg.toString("base64"));
jpeg.writeUInt16BE(4096, 11);
jpeg.writeUInt16BE(4096, 13);
assert.throws(() => parseCx(wallpaperSource("jpeg", jpeg)), /8 million pixels/);
assert.throws(() => parseCx(wallpaperSource("jpeg", jpeg.subarray(0, 12))), /valid image dimensions/);
assert.throws(() => parseCx(theme + '\n  wallpaper-opacity: 75'), /embedded wallpaper/);
assert.throws(() => parseCx(theme + '\n  wallpaper-blur: 0.6'), /embedded wallpaper/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "' + png + '"\n  wallpaper-blur: 32.01'), /0 to 32/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "' + png + '"\n  wallpaper-opacity: 101'), /0 to 100/);
const mobileEvents = { exports: {} };
const edited = [];
const editor = {
    startEditMessage() {},
    editMessage(...args) { edited.push(args); },
};
vm.runInNewContext(transformSync(read("ios/runtime/src/core/plugins/shared/sendMessage.ts"), { loader: "ts", format: "cjs" }).code, {
    module: mobileEvents,
    require(name) {
        if (name === "@metro") return { findByProps: () => editor };
        if (name === "@metro/common") return { messageUtil: {} };
        if (name === "@lib/api/patcher") return {
            before(key, target, callback) {
                const original = target[key];
                target[key] = (...args) => original(...callback(args));
                return () => { target[key] = original; };
            },
        };
        throw new Error("Unexpected mobile event dependency: " + name);
    },
});
const unpatchEdit = mobileEvents.exports.onEditMessage(message => { message.content = "edited"; });
editor.editMessage("channel", "id", { content: "original", attachments: ["image"] }, "option");
assert.deepEqual(edited[0], ["channel", "id", { content: "edited", attachments: ["image"] }, "option"]);
unpatchEdit();
editor.editMessage("channel", "id", { content: "original" });
assert.equal(edited[1][2].content, "original");
console.log("PASS CX permission review, denial, revocation, rollback, plugin and theme coexistence, and safe wallpaper");

(async () => {
    const counter = read("examples/cx/pilot/character-counter.cx");
    const localReplies = [];
    const pilotCommands = new Map();
    const commandHost = {
        ...host,
        registerCommand(name, callback, acceptsText) {
            assert.ok(["ccp-count", "ccp-inspect"].includes(name));
            assert.equal(acceptsText, name === "ccp-count");
            pilotCommands.set(name, callback);
            return () => {};
        },
    };
    assert.throws(() => activateCx(counter, commandHost, ["commands.register"]), /approval/);
    assert.throws(() => activateCx(counter, commandHost, ["commands.register", "reply.local"]), /approval/);
    assert.throws(() => parseCx(counter.replace("copy client diagnostics", "copy client token")), /Unknown CX instruction/);
    const stop = activateCx(counter, commandHost, ["commands.register", "reply.local", "diagnostics.copy"]);
    const run = pilotCommands.get("ccp-count");
    run({ text: "a🐈", reply: value => localReplies.push(value) });
    stop();
    run({ text: "test", reply: value => localReplies.push(value) });
    assert.deepEqual(localReplies, ["3 characters"]);
    assert.throws(() => parseCx(counter.replace("length(text)", "token")), /named text functions/);
    assert.throws(() => parseCx(counter.replace("length(text)", "constructor(text)")), /named text functions/);
    assert.throws(() => parseCx(counter.replace('  needs reply.local', '  needs ui.toast')), /permissions/);
    assert.throws(() => parseCx(counter.replace('  needs reply.local', '  needs reply.local\n  needs ui.toast')), /unused/);

    for (const platform of ["desktop", "mobile"]) {
        const desktop = platform === "desktop";
        let resolveCatalogEntry;
        const lazyEntry = { name: "Lazy Wallpaper", source: () => new Promise(resolve => { resolveCatalogEntry = resolve; }) };
        const states = [], registered = {}, delivered = [];
        const incomingHooks = [], notifications = [], pendingNotifications = [], desktopAlerts = [], alertRoutes = [];
        const openedLinks = [];
        const openExternal = async link => { openedLinks.push(link); };
        let selectedChannel = "test-channel";
        let canSend = true;
        let dismissedMentionSheets = 0;
        const mentionActions = [];
        let fetchAttachment;
        const repeated = [];
        const embedPatches = [];
        const pinCalls = [];
        const pinActions = {
            pinMessage: (channel, id) => pinCalls.push(["pin", channel.id, id]),
            unpinMessage: (channel, id) => pinCalls.push(["unpin", channel.id, id]),
        };
        const embedPermissions = { SEND_MESSAGES: 2048n, MANAGE_MESSAGES: 8192n, EMBED_LINKS: 16384n,
            VIEW_CHANNEL: 1024n, CONNECT: 1048576n, MOVE_MEMBERS: 16777216n };
        const embedEndpoints = { MESSAGE: (channel, message) => "/channels/" + channel + "/messages/" + message };
        let embedMessage;
        const repeatChannel = "100000000000000011";
        const messagePopover = new Map();
        function NativeActionSheet() {}
        function LongPressMessageActionSheet() {
            return jsx("Analytics", { children: jsx(NativeActionSheet, { children: jsx("OriginalAction", {}) }) });
        }
        function ChannelLongPressActionSheetConnected() {
            return jsx(NativeActionSheet, { children: jsx("OriginalAction", {}) });
        }
        const me = "100000000000000001", sender = "100000000000000002", other = "100000000000000003";
        const guildId = "100000000000000004";
        const roleId = "100000000000000005";
        const jumpChannel = { id: "100000000000000016", type: 0, guild_id: guildId };
        const jumpRequests = [], jumpRoutes = [];
        let resolveJump;
        function getJump(request) {
            jumpRequests.push(JSON.parse(JSON.stringify(request)));
            return new Promise(resolve => { resolveJump = resolve; });
        }
        const voiceTarget = "100000000000000006", secondVoice = "100000000000000007";
        let currentVoice = null;
        const voiceJoins = [];
        const queueChannel = { id: "100000000000000018", guild_id: guildId, name: "Game Room", type: 2, userLimit: 2 };
        const queuePrompts = [], queueSounds = [], voiceCountListeners = new Set();
        let canJoinQueue = true, canBypassQueue = false, queueOccupants = { [sender]: {}, [other]: {} };
        const voiceActions = { selectVoiceChannel: channel => voiceJoins.push(channel) };
        const removals = [];
        const relationshipActions = { removeRelationship: id => removals.push(id) };
        const removeRelationship = relationshipActions.removeRelationship;
        const trackId = "0123456789012345678901";
        const acknowledged = [];
        const inviteCalls = [];
        let resolveInvite;
        const inviteApi = {
            createFriendInvite: () => { inviteCalls.push("create"); return new Promise(resolve => { resolveInvite = resolve; }); },
            getAllFriendInvites: async () => { inviteCalls.push("list"); return [{ code: "abc", uses: 1, max_uses: 5 }]; },
            revokeFriendInvites: async () => { inviteCalls.push("revoke"); },
        };
        let rounding = Math.ceil;
        const relativeTime = {
            relativeTimeRounding(next) {
                if (!next) return rounding;
                rounding = next;
                return true;
            },
        };
        const previousEdits = [];
        const jumps = [];
        const composerActions = [];
        const messageEditor = { editMessage: (channel, id, message) => previousEdits.push([channel, id, message.content]),
            jumpToMessage: target => jumps.push(target),
            startEditMessage: (channel, id, content) => composerActions.push(["edit", id, content]),
            sendMessage: (...args) => repeated.push(args) };
        const gestureChannel = "129876543219876543";
        const gestureMessages = new Map([
            [me, { id: me, author: { id: me }, content: "my message", type: 0, channel_id: gestureChannel, state: "SENT" }],
            [sender, { id: sender, author: { id: sender }, content: "their message", type: 19, channel_id: gestureChannel }],
            [other, { id: other, author: { id: sender }, type: 0, flags: 64, channel_id: gestureChannel }],
        ]);
        const documentListeners = new Map();
        const stockSteamClick = options => options.href;
        const nativeSteamLinks = { handleClick: stockSteamClick };
        function NativeMessages(props) { return props.output; }
        function MessagesRenderer(props) { return props.output; }
        function FavoritesGuildSuggestedChannels(props) { return props.children; }
        const suggestedMarkers = new Set();
        const section = { querySelector: () => ({}), setAttribute: key => suggestedMarkers.add(key),
            removeAttribute: key => suggestedMarkers.delete(key) };
        const suggestedHeading = { textContent: "Suggested", closest: () => section };
        const suggestedList = { querySelectorAll: () => [suggestedHeading] };
        let suggestedObserver;
        let suggestedFrame;
        class GestureElement {
            constructor(id, interactive = false) { this.id = id; this.interactive = interactive; }
            closest(selector) {
                return selector.startsWith("[data-message-id]") ? { dataset: { listItemId: "chat-messages___chat-messages-" + gestureChannel + "-" + this.id } }
                    : this.interactive ? this : null;
            }
        }
        const reactionChannel = "123456789123456789";
        const reactionCache = { _array: [{ id: sender, channel_id: reactionChannel }, { id: other, channel_id: reactionChannel }] };
        const reactionCalls = [];
        let rejectReaction = false;
        const addReaction = (channel, message, emoji) => {
            if (rejectReaction) return Promise.reject(new Error("Reaction denied"));
            reactionCalls.push([channel, message, emoji.id ? emoji.name + ":" + emoji.id : emoji.name]);
        };
        const reactionActions = { addReaction };
        const emojiConverters = { convertNameToSurrogate: name => name === "thumbsup" ? "👍" : undefined };
        const customEmoji = { id: me, name: "custom", animated: true, type: 1, guildId };
        let latestMessage = { id: "previous", author: { id: me }, content: "Fix a.b twice: a.b", timestamp: Date.now(), channel_id: "test-channel" };
        let rejectBulkAck = false;
        const dispatch = event => rejectBulkAck && event.type === "BULK_ACK"
            ? Promise.reject(new Error("Could not acknowledge channels")) : acknowledged.push(event);
        const channelSelections = new Set(), rtcListeners = new Set(), voiceListeners = new Set();
        const voiceEventListeners = new Map(["VOICE_STATE_UPDATES", "VOICE_CHANNEL_SELECT", "PASSIVE_UPDATE_V1", "PASSIVE_UPDATE_V2", "CONNECTION_OPEN", "LOGOUT", "RTC_CONNECTION_PING"]
            .map(name => [name, new Set()]));
        const listenersFor = name => {
            if (name === "RTC_CONNECTION_STATE") return rtcListeners;
            if (name === "CHANNEL_SELECT") return channelSelections;
            assert.ok(voiceEventListeners.has(name));
            return voiceEventListeners.get(name);
        };
        const drafts = { [me]: {} };
        const draftStore = { getState: () => drafts };
        const draftHandlers = [{ name: "DraftStore", actionHandler(payload) {
            const channel = drafts[me][payload.channelId] ??= {};
            if (payload.draft) channel[payload.draftType] = { draft: payload.draft.slice(0, 4500), timestamp: 1 };
            else delete channel[payload.draftType];
            return payload.type === "DRAFT_SAVE";
        } }];
        const orderedDraftHandlers = () => draftHandlers;
        const channelDispatcher = {
            _actionHandlers: { getOrderedActionHandlers: orderedDraftHandlers },
            dispatch,
            subscribe: (name, listener) => { listenersFor(name).add(listener); },
            unsubscribe: (name, listener) => { listenersFor(name).delete(listener); },
        };
        let typingStarts = 0, typingStops = 0;
        const typing = { startTyping() { typingStarts++; }, stopTyping() { typingStops++; } };
        const startTyping = typing.startTyping;
        const avatarHash = "a_0123456789abcdef0123456789abcdef";
        const icons = { getUserAvatarURL(user, animate, size) {
            assert.equal(animate, true);
            assert.equal(size, 1024);
            if (user.id === other) return "https://evil.example/avatars/" + user.id + "/" + avatarHash + ".gif";
            return user.id === me ? "//cdn.discordapp.com/embed/avatars/0.png"
                : "https://cdn.discordapp.com/avatars/" + user.id + "/" + avatarHash + ".gif?size=" + size;
        }, getGuildIconURL(options) { return options.canAnimate; } };
        let autoUpgrades = 0;
        const splitLimit = { getMaxMessageLength: () => 2000 };
        const composerSends = [];
        const nativeConfirmations = [];
        const nativeComposerSend = input => { composerSends.push(input.text); };
        const splitComposer = { chatInputHandleSendText: nativeComposerSend,
            chatInputValidateContentLength: ({ text }) => text.length <= splitLimit.getMaxMessageLength() ? { content: text } : undefined };
        const upgradeChannel = function (channelId) { assert.equal(this, stores.UnreadSettingNoticeStore2); autoUpgrades++; return channelId; };
        let pingDnd = false, pingMuted = false;
        let motionPreference = false;
        let motionUpdates = 0;
        class AccessibilityStore {
            get useReducedMotion() { return motionPreference; }
            emitChange() { motionUpdates++; }
        }
        let voicePingMs, voicePingChannel, voicePingConnected;
        const stores = {
            RTCConnectionStore: {
                getLastPing: () => voicePingMs,
                getChannelId: () => voicePingChannel,
                isConnected: () => voicePingConnected,
            },
            DraftStore: draftStore,
            AccessibilityStore: new AccessibilityStore(),
            PresenceStore: { getStatus: () => pingDnd ? "dnd" : "online" },
            UserGuildSettingsStore: { isMuted: () => pingMuted },
            UnreadSettingNoticeStore2: { maybeAutoUpgradeChannel: upgradeChannel },
            UserStore: { getCurrentUser: () => ({ id: me }), getUser: id => [me, sender, other].includes(id) ? { id } : undefined },
            UserProfileStore: {
                getUserProfile: id => id === sender ? { themeColors: Object.freeze([0, 0x12abcd]), banner: "a_" + "a".repeat(32) } : undefined,
                getGuildMemberProfile: (id, guild) => id === sender && guild === guildId ? { themeColors: [0x123, 0xffffff] } : undefined,
            },
            ChannelStore: { getChannel: id => id === queueChannel.id ? queueChannel : id === jumpChannel.id ? jumpChannel : ({ id, name: "test", recipients: [sender], nsfw: id === "nsfw-channel", guild_id: id === "guild-channel" || id === repeatChannel ? guildId : undefined,
                rateLimitPerUser: id === "slow-channel" ? 10 : 0 }) },
            PermissionStore: { can: (bit, channel) => channel?.id === queueChannel.id
                ? bit === embedPermissions.MOVE_MEMBERS ? canBypassQueue : canJoinQueue
                : canSend },
            GuildMemberStore: { getMemberIds: () => [me, sender], getMembers: () => [{ userId: sender, roles: [roleId], nick: "Tester@everyone" }] },
            GuildStore: { getGuilds: () => ({ [guildId]: { id: guildId } }),
                getGuild: id => id === guildId ? { id, ownerId: me } : undefined },
            GuildChannelStore: { getChannels: () => ({
                SELECTABLE: [{ channel: { id: "first" } }, { channel: { id: "missing" } }],
                VOCAL: [{ channel: { id: "first" } }],
            }) },
            ActiveJoinedThreadsStore: { getActiveJoinedThreadsForGuild: () => ({ group: { thread: { channel: { id: "thread" } } } }) },
            ReadStateStore: { hasUnread: () => true, lastMessageId: id => id === "missing" ? null : "last-" + id },
            SpotifyStore: { getTrack: () => ({
                id: trackId, album: { id: trackId }, artists: [{ id: trackId, external_urls: { spotify: "https://untrusted.example" } }],
            }) },
            MessageStore: {
                getMessages: id => id === reactionChannel ? reactionCache : undefined,
                getMessage: (channel, id) => channel === embedMessage?.channel_id && id === embedMessage.id ? embedMessage
                    : channel === gestureChannel ? gestureMessages.get(id) : { author: { id: id === "partial" ? sender : me } },
                getLastMessage: () => latestMessage, getLastEditableMessage: () => latestMessage,
            },
            EmojiStore: {
                getSearchResultsOrder(emojis, _query, count) { return count ? emojis.slice(0, count) : emojis; },
                searchWithoutFetchingLatest({ count }) {
                    return {
                        unlocked: this.getSearchResultsOrder([customEmoji, { type: 0, name: "cat" }], "cat", count),
                        locked: this.getSearchResultsOrder([{ type: 1, name: "locked", guildId: "another-guild" }], "cat", 0),
                    };
                },
                getUsableGuildEmoji: () => [customEmoji],
                getUsableCustomEmojiById: id => id === me ? customEmoji : undefined,
                getGuilds: () => ({ [guildId]: { usableEmojis: [customEmoji] } }),
            },
            RelationshipStore: {
                isBlocked: id => id === sender, isIgnored: id => id === other,
                isFriend: id => id === sender,
                getPendingCount: () => 3, getPendingIncomingCount: () => 2,
            },
            VoiceStateStore: { getVoiceStateForUser: () => undefined,
                getVoiceStatesForChannel: id => id === queueChannel.id ? queueOccupants : {},
                addChangeListener: listener => voiceCountListeners.add(listener),
                removeChangeListener: listener => voiceCountListeners.delete(listener) },
            SelectedChannelStore: {
                getVoiceChannelId: () => currentVoice, getChannelId: () => selectedChannel,
                addChangeListener: listener => voiceListeners.add(listener),
                removeChangeListener: listener => voiceListeners.delete(listener),
            },
        };
        const transformHooks = new Set();
        const appearanceHooks = new Map();
        const nativeScrollView = () => null;
        const nativeFlatList = () => null;
        const nativeSectionList = () => null;
        const animatedScrollView = { render: () => null };
        const messagePresentation = Object.freeze({
            mentioned: true, highlightColor: 0x33ffff00,
            useAttachmentGridLayout: true,
            edited: true, stickers: Object.freeze([{ id: "sticker" }]), content: "hello <t:12345>",
            timestamp: "8:24 PM", timestampTooltip: "November 7 at 8:24 PM", timestampAccessibilityLabel: "8:24 PM",
        });
        const createMessageContent = (presentation = messagePresentation) => presentation?.cxTestPresentation ?? presentation;
        const messageRenderer = { default: createMessageContent };
        const parseTimestamp = node => node;
        const timestampUtils = { parseTimestamp };
        const nativeChannelName = channel => channel?.name;
        const nativeChannelRow = props => props;
        const channelNameModule = { default: nativeChannelName, computeChannelName: nativeChannelName };
        const channelRowModule = { renderChannelContent: nativeChannelRow };
        const attachmentTypes = { AttachmentType: { IMAGE: "image", VIDEO: "video", AUDIO: "audio", OTHER: "other" } };
        const headerIcons = Object.fromEntries(["PhoneCallIcon", "VideoIcon", "PhoneHangUpIcon", "VoiceNormalIcon", "Avatar",
            "MediaKeyboardButtonIcon", "ImageIcon", "ContextMenu", "ThreadIcon"]
            .map(name => [name, () => name]));
        let routeVisibilityChecks = 0;
        const useRoutePredicate = () => { routeVisibilityChecks++; return true; };
        const settingsEntrys = new Map([
            ["QuestHomeSetting", { type: "route", usePredicate: useRoutePredicate }],
            ["PremiumSetting", { type: "route" }],
            ["SupportSetting", { type: "pressable" }],
        ]);
        const pickerOrder = Object.freeze(["emoji", "gif", "sticker"]);
        const useSegmentedControlState = options => options;
        const design = { useSegmentedControlState };
        const segmentedControl = { useSegmentedControlState };
        const expressionPicker = { $$typeof: Symbol.for("react.memo"),
            type: props => (props.useDesignBarrel ? design : segmentedControl).useSegmentedControlState(props.options),
        };
        const desktopEmojiPicker = { type: { render: function EMOJI_PICKER_POPOUT(tree) { return tree; } } };
        const emojiPickerWaiters = new Map();
        const nativeEmojiFunctions = { computeCategories: options => options, computeSearchResults: options => options };
        const mobileEmojiPicker = { default: () => nativeEmojiFunctions };
        const pickerChanges = [];
        const pickerOptions = Object.freeze({
            items: Object.freeze(["Emoji", "GIFs", "Stickers"]),
            defaultIndex: 0,
            onSetActiveIndex: index => pickerChanges.push(pickerOrder[index]),
        });
        const renderPicker = props => {
            const original = jsx(expressionPicker, { options: pickerOptions, ...props });
            const hook = appearanceHooks.get(expressionPicker);
            const wrapped = hook(null, original);
            const resolved = wrapped.type(wrapped.props);
            return resolved === original ? expressionPicker.type(resolved.props) : resolved.type(resolved.props);
        };
        let drawerWidth = 260;
        let viewportWidth = 900;
        let dockedDrawer = true;
        let lockedChat = true;
        const getDrawerWidth = () => drawerWidth;
        const useDrawerWidth = () => drawerWidth;
        const drawerSizing = { getDrawerWidth, useDrawerWidth };
        const layout = { getChatLayout: () => ({ isChatBesideChannelList: dockedDrawer, isChatLockedOpen: lockedChat }) };
        const appContainer = { getBaseAppContainerDimensions: () => ({ width: viewportWidth }) };
        const renderHeader = tree => tree;
        const nativeHeaders = new Map(["PrivateChannelButtons", "MessagesHeader", "VoiceUserItem", "MediaModalSpoilerOverlay",
            "GuildBoostingMarketingProgressBar", "GuildPowerupsBoostGem", "PresenceActivityStatus", "ChatInputExpressionButton"].map(name => [
            name, { $$typeof: Symbol.for("react.memo"), displayName: name, type: renderHeader },
        ]));
        const forwardedRefs = [];
        function ActivityStatus(props) { return props.output; }
        nativeHeaders.set("ActivityStatus", ActivityStatus);
        function VoicePanelHeader(props) { return props.output; }
        nativeHeaders.set("VoicePanelHeader", VoicePanelHeader);
        const chatInputActions = {
            $$typeof: Symbol.for("react.memo"), type: {
                $$typeof: Symbol.for("react.forward_ref"), displayName: "ChatInputActions",
                render(tree, ref) { forwardedRefs.push(ref); return tree; },
            },
        };
        nativeHeaders.set("ChatInputActions", chatInputActions);
        const headerMessages = { t: { "5h0QOP": "Rechercher", "F+x38C": "Divulgâcheur", fyA115: "Demandes d’amis" }, intl: { string: value => value } };
        function TableRow() {}
        class Spoiler {
            constructor(element, revealed) { this.element = element; this.state = { revealed }; }
            render() { return this.element; }
        }
        const renderSpoiler = Spoiler.prototype.render;
        const colorOverlays = new Set();
        const menuPatches = new Set(), clipboardWrites = [];
        const nativeMediaActions = [{ label: "Download", action() {} }];
        const mediaShare = { useMediaShareActions: () => nativeMediaActions };
        let imageSearchSheet;
        const linkSheet = { showSimpleActionSheet(sheet) {
            if (sheet.key === "CxReverseImageSearch") imageSearchSheet = sheet;
            return sheet;
        } };
        const attachmentRows = { default: ({ attachments }) => attachments };
        const viewerSources = { setMediaViewerSources: state => state };
        const gifPicker = { default: () => jsx("Pressable", { accessibilityLabel: "GIF 3", accessibilityRole: "button" }) };
        const mediaAlerts = [];
        let inMemberRow = false;
        const typingEllipsis = function Ellipsis() {};
        class NativeCloudUploader {
            uploadFiles(files, options) {
                assert.ok(this instanceof NativeCloudUploader);
                return { files, options };
            }
        }
        function NativeUploadPreview() {
            return jsx("Sheet", { children: jsx("Stack", { spacing: 16, onLayout() {}, children: jsx("Text", { children: "Filename" }) }) });
        }
        const typingSubscribers = new Set();
        let protectedReads = 0;
        const diagnosticExports = {
            getAccount() { throw new Error("Reports must not call arbitrary methods"); },
            get privateValue() { protectedReads++; return "private diagnostic value"; },
        };
        const diagnosticCache = { 42: { exports: diagnosticExports } };
        const settings = {};
        Object.assign(headerMessages.t, { "CvQ18w": "Épingler le message", "Bse+F/": "Désépingler le message",
            p89ACt: "Confirmer", xFjByk: "Retirer des épingles", "ETE/oC": "Retirer" });
        const ownerRow = () => null;
        const nativeActivityText = () => ({ text: "Artist", tooltip: "Original tooltip" });
        const activityText = { default: nativeActivityText };
        const pinPrompts = [];
        const showPinAlert = alert => pinPrompts.push(alert);
        const nativePinAlerts = { show: showPinAlert };
        const validateJumpWithAlert = message => !message.blocked;
        const jumpValidator = { default: validateJumpWithAlert };
        const transformReactions = options => options;
        const reactionRenderer = { default: transformReactions };
        let profileUser;
        let expressionSelection;
        const expressionSheets = { MessageEmojiActionSheet: () => null, StickerDetailActionSheet: () => null,
            StickerOptionsActionSheet: () => null, BottomSheet: () => null, ActionSheet: NativeActionSheet };
        const editHooks = new Set();
        const AboutMeCard = () => null;
        const markupCache = new WeakMap();
        const markupParser = {
            parseMessageMarkup(message, contentMessage, hideSimpleEmbedContent, inline = false) {
                const cached = markupCache.get(message);
                if (cached?.inline === inline) return cached;
                const parsed = { message, text: hideSimpleEmbedContent ? "" : (contentMessage ?? message).content, inline };
                if (message.ast) Object.assign(parsed, { content: message.ast, isInlineReplyPreview: inline });
                markupCache.set(message, parsed);
                return parsed;
            },
        };
        const selectedTheme = { name: "Previously selected" };
        let nativeTheme = selectedTheme, nativeMode, stylesheet;
        let cursor = 0;
        const useState = initial => {
            const index = cursor++;
            if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
            return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
        };
        const jsx = (type, props) => ({ type, props });
        const commandApi = {
            commands: registered,
            ApplicationCommandInputType: { BUILT_IN: 0, BUILT_IN_TEXT: 1 },
            ApplicationCommandOptionType: { STRING: 3, INTEGER: 4, BOOLEAN: 5, USER: 6, ROLE: 8 },
            ApplicationCommandType: { CHAT: 1 },
            findOption: (args, name) => args.find(option => option.name === name)?.value,
            registerCommand(command) {
                registered[command.name] = command;
                return () => { delete registered[command.name]; };
            },
            unregisterCommand(name) { delete registered[name]; },
            sendMessage(...args) {
                if (args[0] === repeatChannel) repeated.push(args);
                return "sent normally";
            },
            sendBotMessage: (channel, message) => delivered.push([channel, typeof message === "string" ? message : message.content]),
        };
        const module = { exports: {} };
        const adapter = desktop ? "desktop/client/src/sincordplugins/cxExtensions/index.tsx"
            : "ios/runtime/src/core/ui/settings/pages/CxExtensions/index.tsx";
        const serverListButtons = new Set();
        const viewedProfiles = [];
        const savedProfileMedia = [];
        const nativeMediaType = { IMAGE: "native-image", GIF: "native-gif" };
        function GuildsBarFooterWrapper(props) { return props.children; }
        function UsersFastList(props) { return props; }
        let deviceFontScale = 1.25, discordFontScale = 1;
        const mocks = {
            "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
            "@utils/cxCatalog": { cxCatalog: { ...cxCatalog, themes: [...cxCatalog.themes, lazyEntry] } },
            "@api/AudioPlayer": { playAudio: name => queueSounds.push(name) },
            "@api/Commands": commandApi,
            "@api/Settings": { Settings: { plugins: { CallTimer: { enabled: false } } } },
            "@api/ContextMenu": {
                addContextMenuPatch: (menus, patch) => { assert.ok(["user-context", "expression-picker", "image-context", "message", "channel-context"].some(menu => menus.includes(menu))); menuPatches.add(patch); },
                findGroupChildrenByChildId: (id, children) => children.some(item => item?.props?.id === id) ? children : null,
                removeContextMenuPatch: (_, patch) => menuPatches.delete(patch),
            },
            "@utils/clipboard": { copyToClipboard: value => { clipboardWrites.push(value); return Promise.resolve(); } },
            "@utils/text": { escapeRegExp: value => value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&") },
            "@utils/discord": { openImageModal: item => viewedProfiles.push(item) },
            "@utils/web": { saveFile: file => savedProfileMedia.push(file) },
            "@utils/ccpInspect": reportModule.exports,
            "@api/MessageEvents": {
                addMessagePreSendListener(listener) { transformHooks.add(listener); return listener; },
                removeMessagePreSendListener(listener) { transformHooks.delete(listener); },
                addMessagePreEditListener(listener) { editHooks.add(listener); return listener; },
                removeMessagePreEditListener(listener) { editHooks.delete(listener); }
            },
            "@core/plugins/shared/sendMessage": {
                onSendMessage(listener) { transformHooks.add(listener); return () => { transformHooks.delete(listener); }; },
                onEditMessage(listener) { editHooks.add(listener); return () => { editHooks.delete(listener); }; }
            },
            "@api/Notifications": { showNotification: alert => { notifications.push(alert.body); desktopAlerts.push(alert); } },
            "@api/MessagePopover": {
                addMessagePopoverButton: (id, render) => messagePopover.set(id, render),
                removeMessagePopoverButton: id => messagePopover.delete(id),
            },
            "@api/ServerList": { ServerListRenderPosition: { Above: 0 },
                addServerListElement: (_, component) => serverListButtons.add(component),
                removeServerListElement: (_, component) => serverListButtons.delete(component),
            },
            "@components/Button": { TextButton: "TextButton" },
            "@components/ErrorBoundary": { __esModule: true, default: "ErrorBoundary" },
            "@components/Icons": { UpArrowIcon: "UpArrowIcon" },
            "@utils/cx": moduleBox.exports,
            "@utils/types": { __esModule: true, default: value => value },
            "@webpack": { wreq: { c: diagnosticCache }, findStore: name => stores[name],
                findComponentByCodeLazy: () => "ChannelToolbarIcon",
                waitFor: (filter, callback) => emojiPickerWaiters.set(filter, callback),
                waitForSubscriptions: emojiPickerWaiters, findByProps: key => key === "startTyping" ? typing : key === "getUserAvatarURL" ? icons
                : key === "createFriendInvite" ? inviteApi : key === "relativeTimeRounding" ? relativeTime
                    : key === "removeRelationship" ? relationshipActions : key === "sendMessage" ? commandApi
                        : key === "startEditMessage" ? messageEditor
                        : key === "convertNameToSurrogate" ? emojiConverters : undefined },
            "@webpack/common": {
                Alerts: { show(props) {
                    const target = props.title === "Confirm message" ? nativeConfirmations : queuePrompts;
                    target.push({ props, resolve: value => value ? props.onConfirm() : props.onCancel() });
                } },
                ComponentDispatch: { dispatchToLastSubscribed(event, payload) {
                    if (event === "INSERT_TEXT") mentionActions.push([event, payload.rawText, payload.plainText]);
                } },
                PermissionsBits: embedPermissions, PinActions: pinActions,
                React: { isValidElement: element => !!element?.type && !!element?.props,
                cloneElement: (element, props) => jsx(element.type, { ...element.props, ...props }),
                useCallback: callback => callback,
                useSyncExternalStore: (subscribe, read) => {
                if (typeof read() === "boolean") subscribe(() => typingSubscribers.add(read()));
                return read();
            } }, useState, useRef: initial => useState({ current: initial })[0], ...stores, ChannelActions: voiceActions, MessageActions: messageEditor, IconUtils: icons, showToast: message => notifications.push(message), Menu: { MenuItem: "MenuItem" }, NavigationRouter: { transitionTo: path => alertRoutes.push(path) }, FluxDispatcher: {
                _interceptors: incomingHooks,
                addInterceptor: callback => incomingHooks.push(callback),
                ...channelDispatcher,
            }, Constants: { Endpoints: { ...embedEndpoints, REACTION: (channel, message, emoji) => [channel, message, emoji] } },
                RestAPI: { get: getJump, patch: request => embedPatches.push(request), put: ({ url: [channel, message, emoji] }) => addReaction(channel, message, { name: emoji }) },
            },
            "@lib/api/cx": moduleBox.exports,
            "@lib/api/ccpInspect": reportModule.exports,
            "@lib/api/ccpReport": { copyCcpReport: async () => {
                const report = reportModule.exports.inspectCcpRuntime("mobile", name => stores[name], diagnosticCache);
                clipboardWrites.push(JSON.stringify(report));
                return report;
            } },
            "@lib/api/cxCatalog": { cxCatalog },
            "@lib/api/commands": commandApi,
            "@lib/api/commands/types": commandApi,
            "@lib/addons/themes/colors/patches/background": {
                mapChatBackgroundRenderer: (element, map) => element.type === "ThemeBackground"
                    ? jsx(element.type, { ...element.props, children: map(element.props.children) }) : map(element),
            },
            "@lib/addons/themes/colors/updater": {
                applyTemporaryTheme(value, mode) {
                    nativeTheme = value;
                    nativeMode = mode;
                    return () => { nativeTheme = selectedTheme; nativeMode = undefined; };
                },
                registerColorOverlay(value) { colorOverlays.add(value); return () => colorOverlays.delete(value); },
            },
            "@lib/api/native/modules": {},
            "@lib/api/native/loader": { isThemeSupported: () => true },
            "@lib/api/settings": { settings },
            "@lib/api/patcher": { instead(name, owner, callback) {
                const original = owner[name];
                owner[name] = function (...args) { return callback.call(this, args, original); };
                return () => { owner[name] = original; };
            } },
            "@lib/api/react/jsx": {
                onJsxCreate(name, hook, afterOthers) { assert.equal(afterOthers, true); appearanceHooks.set(name, hook); },
                deleteJsxCreate(name, hook, afterOthers) {
                    assert.equal(afterOthers, true);
                    assert.equal(appearanceHooks.get(name), hook);
                    appearanceHooks.delete(name);
                },
            },
            "@lib/ui/toasts": { showToast: message => notifications.push(message) },
            "@lib/ui/color": { resolveSemanticColor: value => value, semanticColors: { INTERACTIVE_TEXT_DEFAULT: "#bbbbbb" } },
            "@lib/api/flux": { intercept(callback) {
                incomingHooks.push(callback);
                return () => { incomingHooks.splice(incomingHooks.indexOf(callback), 1); };
            } },
            "@metro": { findByFilePath: path => path.endsWith("/ButtonEllipsis.native.tsx") ? { Ellipsis: typingEllipsis }
                : path.endsWith("/useMessageMaxLength.tsx") ? splitLimit
                : path.endsWith("/ChatInputSendUtils.tsx") ? splitComposer
                : path.endsWith("/useComputeEmojiPickerFunctions.tsx") ? mobileEmojiPicker
                : path.endsWith("/MessageEmojiActionSheet.tsx") ? { default: expressionSheets.MessageEmojiActionSheet }
                : path.endsWith("/LongPressMessageActionSheet.tsx") ? { default: LongPressMessageActionSheet }
                : path.endsWith("/PlaintextFilePreviewHelpers.tsx") ? { isPlaintextPreviewableFile: name => name.endsWith(".txt") }
                : path.endsWith("/StickerDetailActionSheet.tsx") ? { default: expressionSheets.StickerDetailActionSheet }
                : path.endsWith("/StickerOptionsActionSheet.tsx") ? { default: expressionSheets.StickerOptionsActionSheet }
                : path.endsWith("/MediaShareActions.tsx") ? mediaShare
                : path === "utils/MaskedLinkUtils.tsx" ? nativeSteamLinks
                : path === "modules/blocked_domains/BlockedDomainStore.tsx" ? { default: { isBlockedDomain: url => url.endsWith("/blocked") ? { url } : null } }
                : path.endsWith("/openMediaModal.tsx") ? { openMediaModal: options => viewedProfiles.push(options.initialSources[0]) }
                : path.endsWith("/MediaSourceUtil.tsx") ? { downloadMediaAssetWithContentType: (...args) => savedProfileMedia.push(args) }
                : path.endsWith("/SoundUtils.tsx") ? { playSound: name => queueSounds.push(name) }
                : path.endsWith("/MediaTypes.tsx") ? { MediaType: nativeMediaType }
                : path.endsWith("/transformMessageAttachments.tsx") ? attachmentRows
                : path.endsWith("/useMediaViewerSources.tsx") ? viewerSources
                : path.endsWith("/GIFPickerItemView.tsx") ? gifPicker
                : path.endsWith("/MarkupParsers.tsx") ? markupParser
                : path === "modules/messages/native/Messages.tsx" ? { default: NativeMessages }
                : path.endsWith("/MessagesRenderer.tsx") ? { default: MessagesRenderer }
                : path.endsWith("/FavoritesGuildSuggestedChannels.tsx") ? { default: FavoritesGuildSuggestedChannels }
                : path.endsWith("/UserProfileAboutMeCard.tsx") ? { default: AboutMeCard }
                : path === "lib/uploader/native/CloudUploader.tsx" ? { default: NativeCloudUploader }
                : path === "modules/media_uploads/native/UploadPreviewActionSheet.tsx" ? { default: NativeUploadPreview }
                : path === "modules/messages/native/renderer/createMessageContent.tsx" ? messageRenderer
                : path === "modules/main_tabs_v2/native/shared_components/user_list/UserRow.tsx" ? { default: ownerRow }
                : path === "modules/activity_status/getActivityStatusText.tsx" ? activityText
                : path === "actions/native/AlertActionCreators.tsx" ? { default: nativePinAlerts }
                : path === "modules/messages/native/renderer/transformReactions.tsx" ? reactionRenderer
                : path === "modules/messages/validateJumpWithAlert.tsx" ? jumpValidator
                : path === "modules/markup/TimestampUtils.tsx" ? timestampUtils
                : path.endsWith("/GuildsBarFooterWrapper.tsx") ? { default: GuildsBarFooterWrapper }
                : path.endsWith("/UsersFastList.tsx") ? { UsersFastList }
                : path.endsWith("/FontScaleStore.tsx") ? { useFontScaleStore: { getState: () => ({ fontScale: discordFontScale }) } }
                : path === "modules/channel/useChannelName.tsx" ? channelNameModule
                : path.endsWith("/guild_channels/ChannelContent.tsx") ? channelRowModule
                : path.endsWith("/useDrawerWidth.tsx") ? drawerSizing
                : path === "design/native.tsx" ? design
                : path === "design/components/TableRow/native/TableRow.native.tsx" ? { TableRow }
                : path.endsWith("/SegmentedControlState.native.tsx") ? segmentedControl
                : path.endsWith("/ExpressionPickerConstants.tsx") ? { ExpressionPickerOrder: pickerOrder }
                : path.endsWith("/ExpressionPicker.tsx") ? { default: expressionPicker }
                : path.includes("/defs/native/") ? { default: settingsEntrys.get(path.split("/").at(-1).replace(".tsx", "")) }
                : { default: path.endsWith("/Spoiler.tsx") ? Spoiler : nativeHeaders.get(path.split("/").at(-1).replace(".tsx", "")) },
                findByStoreName: name => stores[name], findByStoreNameLazy: name => stores[name], findByProps: name =>
                name === "ActionSheetRow" ? { ActionSheetRow: Object.assign(() => null, { Group: "ActionSheetRowGroup" }) }
                    : name === "openLazy" ? { hideActionSheet() { dismissedMentionSheets++; } }
                    : name === "HTTP" ? { HTTP: { get: getJump, patch: request => embedPatches.push(request) } }
                    : name === "transitionToChannel" ? { transitionToMessage: (channel, message) => jumpRoutes.push([channel, message]) }
                    : name === "pinMessage" ? pinActions
                    : name === "Fonts" ? { Permissions: embedPermissions }
                    : name === "getChatLayout" ? layout : name === "getBaseAppContainerDimensions" ? appContainer
                    : name === "getUserAvatarURL" ? icons : name === "startTyping" ? typing : ["editMessage", "jumpToMessage"].includes(name) ? messageEditor
                    : name === "createFriendInvite" ? inviteApi : name === "relativeTimeRounding" ? relativeTime
                        : name === "removeRelationship" ? relationshipActions : name === "selectVoiceChannel" ? voiceActions
                            : name === "intl" ? headerMessages : name === "AttachmentType" ? attachmentTypes : name === "addReaction" ? reactionActions
                                : name === "getNativeSyntheticEventData" ? { getNativeSyntheticEventData: event => event.nativeEvent }
                                : name === "convertNameToSurrogate" ? emojiConverters : name in expressionSheets ? expressionSheets
                                    : name === "showSimpleActionSheet" ? linkSheet : name in headerIcons ? headerIcons : undefined },
            "@metro/common": { React: {
                useState, useCallback: callback => callback, useSyncExternalStore: (subscribe, readSnapshot) => readSnapshot(),
                createContext: initial => ({ Provider: initial === false ? "MemberRowProvider" : initial === null ? "ExpressionProvider" : "ProfileUserProvider" }),
                useContext: context => context.Provider === "MemberRowProvider" ? inMemberRow
                    : context.Provider === "ExpressionProvider" ? expressionSelection : profileUser,
                Fragment: Symbol.for("react.fragment"),
                Children: { toArray: children => Array.isArray(children) ? children : children == null ? [] : [children] },
                isValidElement: element => !!element?.type && !!element?.props,
                createElement: jsx, memo: type => ({ type, $$typeof: Symbol.for("react.memo") }), forwardRef: render => ({ render }),
                cloneElement: (element, props) => ({ ...element, props: { ...element.props, ...props } }),
            }, clipboard: { setString: value => clipboardWrites.push(value) }, FluxDispatcher: channelDispatcher,
                commands: { getBuiltInCommands: () => [] }, messageUtil: commandApi },
            "@metro/common/components": { Stack: "Stack", TableRow: "TableRow", TableRowGroup: "TableRowGroup", TableSwitchRow: "TableSwitchRow" },
            "react-native": {
                Alert: { alert: (title, body, buttons, options) => {
                    if (title === "Confirm message") nativeConfirmations.push({ props: { title, body }, buttons, options });
                    else if (title === "Voice channel is full" || title === "A voice slot is open") {
                        queuePrompts.push({ props: { title, body, confirmText: buttons[1].text },
                            resolve: value => value ? buttons[1].onPress() : buttons[0].onPress() });
                    } else mediaAlerts.push([title, body]);
                } },
                PixelRatio: { getFontScale: () => deviceFontScale },
                ScrollView: nativeScrollView, FlatList: nativeFlatList, SectionList: nativeSectionList,
                Linking: { openURL: openExternal },
                Image: { getSize: (_, success) => success(1200, 480) },
                processColor: value => value === "#7c5cff2e" ? 0x2e7c5cff : undefined,
                Animated: { ScrollView: animatedScrollView }, Text: "Text", TextInput: "TextInput", View: "View", Pressable: "Pressable",
            },
        };
        vm.runInNewContext(transformSync(read(adapter), { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
            module,
            IS_WEB: false,
            Element: GestureElement,
            MutationObserver: class {
                constructor(callback) { this.callback = callback; }
                observe() { suggestedObserver = this.callback; }
                disconnect() { suggestedObserver = undefined; }
            },
            requestAnimationFrame: callback => { suggestedFrame = callback; return 1; },
            cancelAnimationFrame: () => { suggestedFrame = undefined; },
            VencordNative: { native: { openExternal } },
            setTimeout: (callback, delay) => delay === 10000 ? setTimeout(callback, delay) : pendingNotifications.push(callback),
            clearTimeout,
            queueMicrotask,
            AbortController,
            File,
            fetch: (...args) => fetchAttachment(...args),
            document: {
                body: {},
                querySelectorAll: selector => selector === 'ul[aria-label="Channels"]' ? [suggestedList] : [],
                createElement: () => ({ remove() { stylesheet = undefined; } }),
                head: { append: value => { stylesheet = value; } },
                addEventListener: (name, handler) => documentListeners.set(name, handler),
                removeEventListener: (name, handler) => {
                    assert.equal(documentListeners.get(name), handler);
                    documentListeners.delete(name);
                },
            },
            require(name) {
                assert.ok(name in mocks, "Unmocked adapter dependency: " + name);
                return mocks[name];
            },
        });
        const page = desktop ? module.exports.CxSettings : module.exports.default;
        function find(tree, predicate) {
            if (Array.isArray(tree)) return tree.map(child => find(child, predicate)).find(Boolean);
            if (!tree?.props) return;
            return predicate(tree) ? tree : find(tree.props.children, predicate);
        }
        const render = () => { cursor = 0; return page(); };
        const button = (tree, label) => find(tree, item => item.props.label === label || [].concat(item.props.children).every(part => typeof part === "string")
            && [].concat(item.props.children).join("") === label);
        const click = (tree, label) => button(tree, label).props[desktop ? "onClick" : "onPress"]();
        const searchFor = value => {
            const search = find(render(), element => element.props.placeholder === "Search CX catalog");
            if (desktop) search.props.onChange({ currentTarget: { value } });
            else search.props.onChangeText(value);
        };
        const selectCatalog = name => {
            if (!desktop) click(render(), "Browse catalog");
            searchFor(name);
            click(render(), name);
        };
        selectCatalog("QuickMention");
        click(render(), "Allow for this session");
        selectedChannel = "guild-channel";
        const mentionMessage = { channel_id: selectedChannel, author: { id: sender } };
        const mentionDraft = "<@" + sender + "> ";
        let insertMention;
        if (desktop) {
            const getAction = messagePopover.get("CxQuickMention");
            insertMention = getAction(mentionMessage).onClick;
            assert.deepEqual(mentionActions, []);
            canSend = false;
            assert.equal(getAction(mentionMessage), null);
            insertMention();
            assert.deepEqual(mentionActions, []);
            canSend = true;
            insertMention();
            assert.deepEqual(mentionActions, [["INSERT_TEXT", mentionDraft, mentionDraft]]);
        } else {
            const hook = appearanceHooks.get(LongPressMessageActionSheet);
            const ref = { current: { insertText: (...args) => mentionActions.push(args) } };
            const props = { message: mentionMessage, channel: stores.ChannelStore.getChannel(selectedChannel), chatInputRef: ref };
            const wrapped = hook(null, jsx(LongPressMessageActionSheet, props));
            const getMenu = () => {
                const content = wrapped.type(wrapped.props);
                return content.type(content.props);
            };
            const menu = getMenu();
            insertMention = button(menu, "Quick Mention").props.onPress;
            assert.ok(find(menu, item => item.type === "OriginalAction"));
            canSend = false;
            assert.equal(button(getMenu(), "Quick Mention"), undefined);
            insertMention();
            assert.deepEqual(mentionActions, []);
            canSend = true;
            insertMention();
            assert.deepEqual(mentionActions, [[mentionDraft, null, false, undefined, null]]);
            assert.equal(dismissedMentionSheets, 1);
            ref.current = null;
            insertMention();
            assert.equal(mentionActions.length, 1);
            ref.current = { insertText: (...args) => mentionActions.push(args) };
            settings.safeMode = { enabled: true };
            assert.equal(button(getMenu(), "Quick Mention"), undefined);
            insertMention();
            settings.safeMode = undefined;
        }
        selectedChannel = "test-channel";
        insertMention();
        click(render(), "Disable QuickMention");
        selectedChannel = "guild-channel";
        insertMention();
        assert.equal(mentionActions.length, 1);
        assert.equal(messagePopover.size, 0);
        selectedChannel = "test-channel";
        {
            selectCatalog("RepeatMessages");
            click(render(), "Allow for this session");
            selectedChannel = repeatChannel;
            const attachment = "https://cdn.discordapp.com/attachments/1/2/test.txt";
            const message = { id: sender, channel_id: repeatChannel, content: "hello <@" + other + ">",
                message_snapshots: [{ message: { attachments: [{ filename: "test.txt", url: attachment }] } }],
                sticker_items: [{ id: other }] };
            let reply;
            if (desktop) {
                const entries = [];
                [...menuPatches].at(-1)(entries, { message });
                assert.equal(button(entries, "Repeat").props.id, "cx-repeat");
                const action = messagePopover.get("CxRepeatMessages")(message);
                reply = () => action.onClick({ shiftKey: true });
            } else {
                const hook = appearanceHooks.get(LongPressMessageActionSheet);
                const props = { message, channel: stores.ChannelStore.getChannel(repeatChannel) };
                const wrapper = hook(null, jsx(LongPressMessageActionSheet, props));
                const sheet = wrapper.type(wrapper.props);
                const menu = sheet.type(sheet.props);
                assert.ok(button(menu, "Repeat"));
                reply = button(menu, "Repeat and Reply").props.onPress;
            }
            assert.equal(repeated.length, 0);
            canSend = false;
            reply();
            assert.equal(repeated.length, 0);
            canSend = true;
            reply();
            assert.equal(repeated.length, 1);
            const [destination, data, waitForChannel, options] = repeated[0];
            assert.equal(destination, repeatChannel);
            assert.equal(data.content, message.content + "\nAttachments:\n - test.txt (" + attachment + ")");
            assert.equal(waitForChannel, true);
            assert.deepEqual(JSON.parse(JSON.stringify(options)), {
                allowedMentions: { parse: [], replied_user: false },
                messageReference: { channel_id: repeatChannel, message_id: sender }, stickerIds: [other],
            });
            selectedChannel = "test-channel";
            reply();
            click(render(), "Disable RepeatMessages");
            selectedChannel = repeatChannel;
            reply();
            assert.equal(repeated.length, 1);
            assert.equal(messagePopover.size, 0);
            selectedChannel = "test-channel";
        }

        {
            selectCatalog("UnsuppressEmbeds");
            click(render(), "Allow for this session");
            selectedChannel = repeatChannel;
            embedMessage = { id: sender, channel_id: repeatChannel, author: { id: me }, flags: 4096, embeds: [{}] };
            const findAction = label => {
                if (desktop) {
                    const entries = [];
                    [...menuPatches].at(-1)(entries, { message: embedMessage });
                    return button(entries, label)?.props.action;
                }
                const hook = appearanceHooks.get(LongPressMessageActionSheet);
                const wrapper = hook(null, jsx(LongPressMessageActionSheet, {
                    message: embedMessage, channel: stores.ChannelStore.getChannel(repeatChannel),
                }));
                const sheet = wrapper.type(wrapper.props);
                return button(sheet.type(sheet.props), label)?.props.onPress;
            };
            const suppress = findAction("Suppress Embeds");
            assert.equal(typeof suppress, "function");
            canSend = false;
            suppress();
            assert.equal(embedPatches.length, 0);
            canSend = true;
            embedMessage = { ...embedMessage, flags: 4096 + 64 };
            suppress();
            assert.deepEqual(JSON.parse(JSON.stringify(embedPatches)), [{
                url: embedEndpoints.MESSAGE(repeatChannel, sender), body: { flags: 4096 + 64 + 4 },
            }]);
            embedMessage = { ...embedMessage, flags: 4100, embeds: [] };
            suppress();
            assert.equal(embedPatches.length, 1);
            const unsuppress = findAction("Unsuppress Embeds");
            assert.equal(typeof unsuppress, "function");
            unsuppress();
            assert.equal(embedPatches[1].body.flags, 4096);
            click(render(), "Disable UnsuppressEmbeds");
            unsuppress();
            assert.equal(embedPatches.length, 2);
            selectCatalog("NoConfirmPin");
            click(render(), "Allow for this session");
            embedMessage = { ...embedMessage, pinned: false };
            const pin = findAction("Pin Without Confirmation");
            assert.equal(typeof pin, "function");
            canSend = false;
            pin();
            assert.equal(pinCalls.length, 0);
            canSend = true;
            pin();
            assert.deepEqual(pinCalls, [["pin", repeatChannel, sender]]);
            embedMessage = { ...embedMessage, pinned: true };
            pin();
            assert.equal(pinCalls.length, 1);
            const unpin = findAction("Unpin Without Confirmation");
            assert.equal(typeof unpin, "function");
            unpin();
            assert.deepEqual(pinCalls[1], ["unpin", repeatChannel, sender]);
            click(render(), "Disable NoConfirmPin");
            unpin();
            assert.equal(pinCalls.length, 2);
            selectedChannel = "test-channel";
            embedMessage = undefined;
        }
        selectCatalog("HideSuggestedChannels");
        click(render(), "Allow for this session");
        if (desktop) {
            assert.equal(suggestedMarkers.size, 1);
            suggestedHeading.textContent = "Other";
            suggestedObserver([{ target: new GestureElement("channels", true), addedNodes: [] }]);
            suggestedFrame();
            assert.equal(suggestedMarkers.size, 0);
            suggestedHeading.textContent = "Suggested";
            suggestedObserver([{ target: new GestureElement("channels", true), addedNodes: [] }]);
            suggestedFrame();
            assert.equal(suggestedMarkers.size, 1);
        } else {
            const element = jsx(FavoritesGuildSuggestedChannels, { children: "Suggested channels" });
            const wrapped = appearanceHooks.get(FavoritesGuildSuggestedChannels)(null, element);
            assert.equal(wrapped.type(wrapped.props), null);
            settings.safeMode = { enabled: true };
            assert.equal(wrapped.type(wrapped.props), element);
            settings.safeMode = undefined;
        }
        click(render(), "Disable HideSuggestedChannels");
        assert.equal(suggestedMarkers.size + appearanceHooks.size, 0);
        assert.equal(suggestedObserver, undefined);
        for (const [target, rule] of Object.entries(moduleBox.exports.cxAppearanceTargets)) {
            const appearancePort = cxCatalog.plugins.find(entry => entry.name === rule.plugin).source;
            assert.throws(() => activateCx(appearancePort, host, []), /approval/);
            const action = rule.style ? "style" : "hide";
            assert.throws(() => parseCx(appearancePort.replace(action + " " + target, action + " unknown-target")), /appearance target/);
            selectCatalog(rule.plugin);
            click(render(), "Allow for this session");
            const baseStyle = Object.freeze({ color: "red" });
            const originalStyles = Object.freeze(rule.style?.key ? { [rule.style.key]: baseStyle } : {});
            const original = Object.freeze({ type: "NativeTarget", props: Object.freeze({ value: "original", style: baseStyle, styles: originalStyles }) });
            const wraps = [];
            if (desktop) assert.equal(stylesheet.textContent, rule.css);
            else if (rule.style?.centeredMessageList) {
                const element = jsx(NativeMessages, { style: baseStyle });
                const hook = appearanceHooks.get(NativeMessages);
                const wrapper = hook(null, element);
                const centered = wrapper.type(wrapper.props);
                assert.equal(centered.type, NativeMessages);
                assert.equal(centered.props.style[0], baseStyle);
                assert.deepEqual(JSON.parse(JSON.stringify(centered.props.style[1])), {
                    alignSelf: "center", width: "100%", maxWidth: 1100,
                });
                const wallpaper = jsx("ThemeBackground", { children: element });
                const wrappedWallpaper = hook(null, wallpaper);
                const styledWallpaper = wrappedWallpaper.type(wrappedWallpaper.props);
                assert.equal(styledWallpaper.type, wallpaper.type);
                assert.deepEqual(styledWallpaper.props.children.props.style, centered.props.style);
                assert.equal(wallpaper.props.children, element);
                settings.safeMode = { enabled: true };
                assert.equal(wrapper.type(wrapper.props), element);
                assert.equal(wrappedWallpaper.type(wrappedWallpaper.props), wallpaper);
                settings.safeMode = undefined;
            } else if (rule.style?.messageWidthRenderer) {
                const wide = Object.freeze({ constrainedWidth: 1000 });
                const input = { cxTestPresentation: wide, message: { content: "A wide message" } };
                assert.equal(messageRenderer.default(input).constrainedWidth, 800);
                assert.equal(wide.constrainedWidth, 1000);
                const narrow = Object.freeze({ constrainedWidth: 350 });
                assert.equal(messageRenderer.default({ ...input, cxTestPresentation: narrow }), narrow);
                assert.equal(messageRenderer.default({ ...input, isInlineReplyPreview: true }), wide);
                settings.safeMode = { enabled: true };
                assert.equal(messageRenderer.default(input), wide);
                settings.safeMode = undefined;
            } else if (rule.style?.blurredMedia) {
                const all = rule.style.blurredMedia === "all";
                const image = Object.freeze({ attachmentType: "image", url: "https://media.discordapp.net/attachments/1/2/image.png" });
                const video = Object.freeze({ ...image, attachmentType: "video" });
                const audio = Object.freeze({ ...image, attachmentType: "audio" });
                const restricted = Object.freeze({ ...image, verifyAge: true, obscure: "Discord safety notice" });
                const scanPending = Object.freeze({ ...image, obscureAwaitingScan: true });
                const existing = Object.freeze({ ...image, isSpoiler: true, spoiler: "Native label" });
                const embed = Object.freeze({ image: { url: image.url }, description: "Image description" });
                const textEmbed = Object.freeze({ description: "No media" });
                const row = Object.freeze({ channelId: "nsfw-channel",
                    attachments: Object.freeze([image, video, audio, restricted, scanPending, existing]),
                    embeds: Object.freeze([embed, textEmbed]) });
                const blurred = messageRenderer.default(row);
                assert.equal(blurred.attachments[0].isSpoiler, true);
                assert.equal(blurred.attachments[1].isSpoiler, true);
                for (let index = 2; index < row.attachments.length; index++)
                    assert.equal(blurred.attachments[index], row.attachments[index]);
                assert.equal(Boolean(blurred.embeds[0].spoiler), all);
                assert.equal(blurred.embeds[0].description, embed.description);
                assert.equal(blurred.embeds[1], textEmbed);
                const ordinary = { ...row, channelId: "guild-channel" };
                assert.equal(messageRenderer.default(ordinary) === ordinary, !all);
                settings.safeMode = { enabled: true };
                assert.equal(messageRenderer.default(row), row);
                settings.safeMode = undefined;
                if (all) {
                    selectCatalog("BlurNSFW");
                    click(render(), "Allow for this session");
                    click(render(), "Disable " + rule.plugin);
                    assert.equal(messageRenderer.default(ordinary), ordinary);
                    assert.equal(messageRenderer.default(row).attachments[0].isSpoiler, true);
                    click(render(), "Disable BlurNSFW");
                } else click(render(), "Disable " + rule.plugin);
                assert.equal(messageRenderer.default, createMessageContent);
                continue;
            }
            else if (rule.style?.reducedMotion) {
                const store = stores.AccessibilityStore;
                assert.equal(store.useReducedMotion, true);
                assert.equal(motionUpdates, 1);
                settings.safeMode = { enabled: true };
                assert.equal(store.useReducedMotion, false);
                motionPreference = true;
                assert.equal(store.useReducedMotion, true);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(Object.hasOwn(store, "useReducedMotion"), false);
                assert.equal(store.useReducedMotion, true);
                assert.equal(motionUpdates, 2);
                motionPreference = false;
                continue;
            }
            else if (rule.style?.mentionHighlight) {
                const highlighted = messageRenderer.default();
                assert.notEqual(highlighted, messagePresentation);
                assert.equal(highlighted.highlightColor, 0x2e7c5cff);
                assert.equal(highlighted.content, messagePresentation.content);
                const plain = Object.freeze({ ...messagePresentation, mentioned: false });
                assert.equal(messageRenderer.default(plain), plain);
                const unhighlighted = Object.freeze({ ...messagePresentation, highlightColor: 0 });
                assert.equal(messageRenderer.default(unhighlighted), unhighlighted);
                settings.safeMode = { enabled: true };
                assert.equal(messageRenderer.default(), messagePresentation);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(messageRenderer.default, createMessageContent);
                continue;
            }
            else if (rule.style?.component) {
                const wrapped = appearanceHooks.get(rule.style.component)(null, original);
                const next = wrapped.type(wrapped.props);
                if (rule.style.props) {
                    for (const [prop, value] of Object.entries(rule.style.props)) assert.equal(next.props[prop], value);
                    const excluded = jsx("NativeTarget", { [rule.style.skipWhenTrue]: true });
                    const exclusion = appearanceHooks.get(rule.style.component)(null, excluded);
                    assert.equal(exclusion.type(exclusion.props), excluded);
                } else {
                    const styles = rule.style.key ? next.props.styles[rule.style.key] : next.props.style;
                    assert.equal(styles[0], baseStyle);
                    assert.equal(styles[1], rule.style.values);
                }
                wraps.push(wrapped);
            } else if (rule.style?.drawerWidthDelta) {
                const wider = rule.style.drawerWidthDelta > 0;
                const expectWidth = width => {
                    assert.equal(drawerSizing.getDrawerWidth(), width);
                    assert.equal(drawerSizing.useDrawerWidth(), width);
                };
                expectWidth(260 + rule.style.drawerWidthDelta);
                viewportWidth = 600;
                expectWidth(wider ? 280 : 220);
                lockedChat = false;
                viewportWidth = 290;
                expectWidth(wider ? 260 : 220);
                dockedDrawer = false;
                expectWidth(260);
                dockedDrawer = true;
                viewportWidth = 900;
                drawerWidth = 180;
                expectWidth(wider ? 220 : 180);
                drawerWidth = 260;
                lockedChat = true;
                settings.safeMode = { enabled: true };
                expectWidth(260);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(drawerSizing.getDrawerWidth, getDrawerWidth);
                assert.equal(drawerSizing.useDrawerWidth, useDrawerWidth);
                continue;
            } else if (rule.style?.compactMemberList) {
                const row = { ...jsx(UsersFastList, { sections: [3] }), key: "guild-channel-user-list" };
                const search = { ...row, key: "guild-channel-user-list-search-results" };
                const custom = { ...row, props: { ...row.props, getItemSize: 52 } };
                const hook = appearanceHooks.get(UsersFastList);
                const wrapped = hook(null, row);
                const apply = input => {
                    const rendered = hook(null, input);
                    return rendered.type(rendered.props);
                };
                assert.equal(apply(row), row);
                deviceFontScale = 1;
                assert.equal(apply(row).props.getItemSize, 44);
                assert.equal(apply(row).props.sections, row.props.sections);
                assert.equal(apply(search), search);
                assert.equal(apply(custom), custom);
                discordFontScale = 1.25;
                assert.equal(apply(row), row);
                discordFontScale = 1;
                click(render(), "Disable " + rule.plugin);
                assert.equal(wrapped.type(wrapped.props), row);
                assert.equal(appearanceHooks.size, 0);
                deviceFontScale = 1.25;
                continue;
            } else if (rule.style?.renderedComponents) {
                const enabled = [];
                function Channel(props) { return jsx("Text", { children: props.title, style: baseStyle }); }
                for (const name of rule.style.renderedComponents) {
                    const hook = appearanceHooks.get(name);
                    const type = name === "ChannelContent" ? Channel : { $$typeof: Symbol.for("react.memo"), type: Channel };
                    const active = jsx(type, { title: "active", muted: false, unread: true });
                    const quiet = jsx(type, { title: "quiet", muted: false, unread: false });
                    const muted = jsx(type, { title: "muted", muted: true, unread: true });
                    const renderHook = element => {
                        const wrapped = hook(null, element);
                        return wrapped.type(wrapped.props);
                    };
                    assert.equal(renderHook(active), active);
                    const mutedStyle = renderHook(muted);
                    assert.equal(mutedStyle.type(mutedStyle.props).props.style[0], baseStyle);
                    assert.equal(mutedStyle.type(mutedStyle.props).props.style[1], rule.style.values);
                    assert.equal(mutedStyle.type(mutedStyle.props).props.children, "muted");
                    assert.equal(renderHook(muted).type, mutedStyle.type);
                    const quietStyle = renderHook(quiet);
                    if (rule.style.condition === "inactive") assert.equal(quietStyle.type(quietStyle.props).props.style[1], rule.style.values);
                    else assert.equal(quietStyle, quiet);
                    enabled.push([hook(null, muted), muted, mutedStyle]);
                }
                click(render(), "Disable " + rule.plugin);
                for (const [wrapped, original, styled] of enabled) {
                    assert.equal(wrapped.type(wrapped.props), original);
                    assert.equal(styled.type(styled.props).props.style, baseStyle);
                }
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.style?.serverIconScale) {
                const hook = appearanceHooks.get("GuildsBarAnimatedItemWrapper");
                const icon = jsx("GuildImage", { source: { uri: "guild" }, style: baseStyle });
                const initials = jsx("GuildLabel", { value: "Test Server", size: "large", animate: false });
                const badge = jsx("Badge", { value: 4 });
                const item = jsx("GuildWrapper", { children: icon, externalChildren: badge });
                const wrapped = hook(null, item);
                const styled = wrapped.type(wrapped.props);
                assert.equal(styled.props.externalChildren, badge);
                assert.equal(styled.props.children.props.source, icon.props.source);
                assert.equal(styled.props.children.props.style[0], baseStyle);
                assert.equal(styled.props.children.props.style[1].transform[0].scale, 1.1);
                const initialsWrapper = hook(null, jsx("GuildWrapper", { children: initials }));
                const styledInitials = initialsWrapper.type(initialsWrapper.props).props.children;
                assert.equal(styledInitials.props.children, initials);
                assert.equal(styledInitials.props.style.transform[0].scale, 1.1);
                for (const excluded of [{ preventClipping: true }, { isDragPreview: true }, { children: badge }]) {
                    const item = jsx("GuildWrapper", { children: icon, ...excluded });
                    const wrapped = hook(null, item);
                    assert.equal(wrapped.type(wrapped.props), item);
                }
                click(render(), "Disable " + rule.plugin);
                assert.equal(wrapped.type(wrapped.props), item);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.style?.spoilerOutline) {
                const hiddenText = new Spoiler(original, false);
                const revealedText = new Spoiler(original, true);
                assert.equal(hiddenText.render().props.style[0], baseStyle);
                assert.equal(hiddenText.render().props.style[1], rule.style.spoilerOutline);
                assert.equal(revealedText.render(), original);
                const hook = appearanceHooks.get("MediaModalSpoilerOverlay");
                const wrapped = hook(null, original);
                assert.equal(wrapped.type(wrapped.props).props.style[1], rule.style.spoilerOutline);
                const protectedMedia = jsx("NativeTarget", { source: { obscure: true }, style: baseStyle });
                const protectedWrapper = hook(null, protectedMedia);
                assert.equal(protectedWrapper.type(protectedWrapper.props), protectedMedia);
                settings.safeMode = { enabled: true };
                assert.equal(hiddenText.render(), original);
                assert.equal(wrapped.type(wrapped.props), original);
                settings.safeMode = undefined;
                wraps.push(wrapped);
            } else if (rule.style) assert.ok(colorOverlays.has(rule.style));
            else if (rule.mobile.renderComponent) {
                function ChannelActionButtons(props) { return props.output; }
                assert.equal(rule.mobile.renderComponent, ChannelActionButtons.name);
                const hook = appearanceHooks.get(ChannelActionButtons.name);
                const onPress = () => {};
                const threads = jsx("ChannelActionButton", Object.freeze({ IconComponent: headerIcons.ThreadIcon, onPress }));
                const search = jsx("ChannelActionButton", { IconComponent: headerIcons.Avatar, onPress });
                const decorativeThread = jsx("Icon", { IconComponent: headerIcons.ThreadIcon });
                const output = jsx("View", Object.freeze({ children: Object.freeze([threads, search, decorativeThread]) }));
                const original = jsx(ChannelActionButtons, { output });
                const wrapped = hook(null, original);
                const patched = wrapped.type(wrapped.props);
                assert.equal(wrapped.type(wrapped.props).type, patched.type);
                const filtered = patched.type(patched.props);
                assert.deepEqual(Array.from(filtered.props.children), [null, search, decorativeThread]);
                assert.equal(output.props.children[0], threads);
                settings.safeMode = { enabled: true };
                assert.equal(patched.type(patched.props), output);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(wrapped.type(wrapped.props), original);
                assert.equal(appearanceHooks.size, 0);
                continue;
            }
            else if (rule.mobile.hideControlIcons) {
                const hook = appearanceHooks.get(chatInputActions);
                const onPress = () => {};
                const attachment = jsx("ActionButton", { IconComponent: headerIcons.MediaKeyboardButtonIcon, onPress });
                const gallery = jsx("ActionButton", { IconComponent: headerIcons.ImageIcon, onPress });
                const menu = jsx(headerIcons.ContextMenu, { triggerOnLongPress: true, children: () => attachment });
                const apps = jsx("ActionButton", { IconComponent: headerIcons.Avatar, onPress });
                const regularMenu = jsx(headerIcons.ContextMenu, { children: () => apps });
                const tree = jsx("View", { children: [attachment, gallery, menu, apps, regularMenu] });
                const ref = { current: null };
                const original = jsx(chatInputActions, { ...tree, ref });
                const wrapped = hook(null, original);
                const patched = wrapped.type(wrapped.props);
                const renderActions = patched.type.type.render;
                assert.equal(patched.props.ref, ref);
                const result = renderActions(patched.props, patched.props.ref);
                assert.equal(forwardedRefs.at(-1), ref);
                assert.deepEqual(Array.from(result.props.children), [null, null, null, apps, regularMenu]);
                assert.deepEqual(tree.props.children, [attachment, gallery, menu, apps, regularMenu]);
                settings.safeMode = { enabled: true };
                assert.equal(renderActions(patched.props, patched.props.ref), patched.props);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(wrapped.type(wrapped.props), original);
                assert.equal(appearanceHooks.size, 0);
                continue;
            }
            else if (rule.mobile.renderTree) {
                const name = rule.mobile.renderTree.split("/").at(-1).replace(".tsx", "");
                const header = nativeHeaders.get(name);
                const button = (icon, label, accessibilityRole = "button") =>
                    jsx("Pressable", Object.freeze({ accessibilityRole, accessibilityLabel: label, onPress() {}, children: jsx(icon, {}) }));
                const voice = button(headerIcons.PhoneCallIcon, "Voice");
                const video = button(headerIcons.VideoIcon, "Video");
                const hangup = button(headerIcons.PhoneHangUpIcon, "Hang up");
                const search = button("SearchIcon", "Rechercher", "link");
                const addFriend = button("FriendIcon", "Ajouter un ami");
                const avatar = jsx(headerIcons.Avatar, { source: { uri: "avatar" }, size: 20 });
                const spoilerLabel = jsx("Text", { accessibilityRole: "text", children: "DIVULGÂCHEUR" });
                const contentWarning = jsx("Text", { accessibilityRole: "text", children: "CONTENU SENSIBLE" });
                const text = jsx("Text", { children: "Messages" });
                const row = children => jsx("View", Object.freeze({ children: Object.freeze(children) }));
                const input = row([text, row([voice, video, search, addFriend, avatar, spoilerLabel, contentWarning])]);
                const originalHeader = jsx(header, input);
                const hook = appearanceHooks.get(header);
                const unrelated = jsx({ ...header }, input);
                const unrelatedWrapper = hook(null, unrelated);
                assert.equal(unrelatedWrapper.type(unrelatedWrapper.props), unrelated);
                const wrapped = hook(null, originalHeader);
                const patched = wrapped.type(wrapped.props);
                const rendered = patched.type.type(input);
                const actual = rendered.props.children[1].props.children;
                const expected = rule.mobile.hideComponents ? [voice, video, search, addFriend, null, spoilerLabel, contentWarning]
                    : rule.mobile.hideIcons ? [null, null, search, addFriend, avatar, spoilerLabel, contentWarning]
                        : rule.mobile.hideText ? [voice, video, search, addFriend, avatar, null, contentWarning]
                            : [voice, video, null, addFriend, avatar, spoilerLabel, contentWarning];
                assert.equal(rendered.props.children[0], text);
                expected.forEach((item, index) => assert.equal(actual[index], item));
                assert.equal(input.props.children[1].props.children[0], voice);
                if (rule.mobile.hideIcons) {
                    const active = row([text, row([hangup, video, search, addFriend])]);
                    assert.equal(patched.type.type(active), active);
                }
                settings.safeMode = { enabled: true };
                assert.equal(wrapped.type(wrapped.props), originalHeader);
                assert.equal(patched.type.type(input), input);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(appearanceHooks.size, 0);
                assert.equal(wrapped.type(wrapped.props), originalHeader);
                assert.equal(header.type, renderHeader);
                assert.equal(patched.type.type(input), input);
                continue;
            } else if (rule.mobile.expressionPickerTab) {
                const gif = rule.mobile.expressionPickerTab === "gif";
                const picker = renderPicker({ useDesignBarrel: gif });
                assert.deepEqual(Array.from(picker.items), ["Emoji", gif ? "Stickers" : "GIFs"]);
                assert.equal(picker.defaultIndex, 0);
                picker.onSetActiveIndex(1);
                picker.onSetActiveIndex(2);
                assert.equal(pickerChanges.pop(), gif ? "sticker" : "gif");
                assert.equal(pickerChanges.length, 0);
                assert.equal(design.useSegmentedControlState(pickerOptions), pickerOptions);
                assert.equal(renderPicker({ visibleTabs: ["emoji"] }), pickerOptions);
                const explicitTab = { ...pickerOptions, defaultIndex: gif ? 1 : 2 };
                assert.equal(renderPicker({ options: explicitTab }), explicitTab);
                const otherTab = renderPicker({ options: { ...pickerOptions, defaultIndex: gif ? 2 : 1 } });
                assert.equal(otherTab.defaultIndex, 1);
                settings.safeMode = { enabled: true };
                assert.equal(renderPicker(), pickerOptions);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(design.useSegmentedControlState, useSegmentedControlState);
                assert.equal(segmentedControl.useSegmentedControlState, useSegmentedControlState);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.tableRow) {
                const { key, subLabelFor } = rule.mobile.tableRow;
                const onPress = () => {};
                const row = { ...jsx(TableRow, Object.freeze({ label: headerMessages.t[subLabelFor], subLabel: "3", onPress })), key };
                const unrelated = { ...jsx(TableRow, { label: "Notifications", subLabel: "3", onPress }), key: "rowNotifications" };
                const hook = appearanceHooks.get(TableRow);
                const wrapped = hook(TableRow, row);
                const kept = hook(TableRow, unrelated);
                assert.equal(kept.type(kept.props), unrelated);
                const result = wrapped.type(wrapped.props);
                if (key) assert.equal(result, null);
                else {
                    assert.equal(result.props.subLabel, undefined);
                    assert.equal(result.props.label, row.props.label);
                    assert.equal(result.props.onPress, onPress);
                    assert.equal(row.props.subLabel, "3");
                }
                settings.safeMode = { enabled: true };
                assert.equal(wrapped.type(wrapped.props), row);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(wrapped.type(wrapped.props), row);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.settingsEntry) {
                const route = settingsEntrys.get(rule.mobile.settingsEntry.split("/").at(-1).replace(".tsx", ""));
                const hadPredicate = rule.plugin === "HideQuestsTab";
                const checks = routeVisibilityChecks;
                assert.equal(route.usePredicate(), false);
                assert.equal(routeVisibilityChecks, checks + Number(hadPredicate));
                settings.safeMode = { enabled: true };
                assert.equal(route.usePredicate(), true);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(Object.hasOwn(route, "usePredicate"), hadPredicate);
                assert.equal(route.usePredicate, hadPredicate ? useRoutePredicate : undefined);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.hideComponentPaths) {
                const bindings = rule.mobile.hideComponentPaths.map(path => {
                    const type = nativeHeaders.get(path.split("/").at(-1).replace(".tsx", ""));
                    const native = jsx(type, { progress: 0.5 });
                    const wrapped = appearanceHooks.get(type)(type, native);
                    assert.equal(wrapped.type(wrapped.props), null);
                    settings.safeMode = { enabled: true };
                    assert.equal(wrapped.type(wrapped.props), native);
                    settings.safeMode = undefined;
                    return { native, wrapped };
                });
                click(render(), "Disable " + rule.plugin);
                assert.equal(appearanceHooks.size, 0);
                for (const { native, wrapped } of bindings) assert.equal(wrapped.type(wrapped.props), native);
                continue;
            } else if (rule.mobile.scrollIndicators) {
                for (const type of [nativeScrollView, nativeFlatList, nativeSectionList, animatedScrollView]) {
                    const hook = appearanceHooks.get(type);
                    const scroller = jsx(type, { scrollEnabled: true, showsVerticalScrollIndicator: true, onScroll() {} });
                    const wrapped = hook(type, scroller);
                    const hidden = wrapped.type(wrapped.props);
                    assert.equal(hidden.type, type);
                    assert.equal(hidden.props.scrollEnabled, true);
                    assert.equal(hidden.props.onScroll, scroller.props.onScroll);
                    assert.equal(hidden.props.showsHorizontalScrollIndicator, false);
                    assert.equal(hidden.props.showsVerticalScrollIndicator, false);
                    settings.safeMode = { enabled: true };
                    assert.equal(wrapped.type(wrapped.props), scroller);
                    settings.safeMode = undefined;
                }
                click(render(), "Disable " + rule.plugin);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.emptyServerFolders) {
                const hook = appearanceHooks.get("GuildsBarGuildFolder");
                const empty = jsx("Folder", { expanded: true, childNodes: [] });
                const wrapped = hook(null, empty);
                assert.equal(wrapped.type(wrapped.props), null);
                for (const excluded of [{ expanded: false }, { childNodes: ["guild"] }, { childNodes: undefined },
                    { isDragPreview: true }, { hideExpandedChildren: true }]) {
                    const folder = jsx("Folder", { ...empty.props, ...excluded });
                    const wrapped = hook(null, folder);
                    assert.equal(wrapped.type(wrapped.props), folder);
                }
                settings.safeMode = { enabled: true };
                assert.equal(wrapped.type(wrapped.props), empty);
                settings.safeMode = undefined;
                click(render(), "Disable " + rule.plugin);
                assert.equal(wrapped.type(wrapped.props), empty);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.customStatusEmojis) {
                const emoji = Object.freeze({ name: "cloud" });
                const status = Object.freeze({ emoji, state: "Working", type: 4 });
                const bubbles = [];
                for (const name of rule.mobile.customStatusEmojis) {
                    const hook = appearanceHooks.get(name);
                    const bubble = jsx("StatusBubble", { customStatusActivity: status, onPress() {} });
                    const wrapped = hook(null, bubble);
                    const changed = wrapped.type(wrapped.props);
                    assert.equal(changed.props.customStatusActivity.emoji, undefined);
                    assert.equal(changed.props.customStatusActivity.state, "Working");
                    assert.equal(changed.props.onPress, bubble.props.onPress);
                    assert.equal(status.emoji, emoji);
                    const editor = jsx("StatusBubble", { previewEmoji: emoji });
                    const editorWrapper = hook(null, editor);
                    assert.equal(editorWrapper.type(editorWrapper.props), editor);
                    settings.safeMode = { enabled: true };
                    assert.equal(wrapped.type(wrapped.props), bubble);
                    settings.safeMode = undefined;
                    bubbles.push([wrapped, bubble]);
                }
                const activity = jsx("ActivityStatus", { hideEmoji: false, userId: sender });
                const activityWrapper = appearanceHooks.get("ActivityStatus")(null, activity);
                assert.equal(activityWrapper.type(activityWrapper.props).props.hideEmoji, true);
                click(render(), "Disable " + rule.plugin);
                assert.equal(appearanceHooks.size, 0);
                assert.equal(activityWrapper.type(activityWrapper.props), activity);
                for (const [wrapped, bubble] of bubbles) assert.equal(wrapped.type(wrapped.props), bubble);
                continue;
            } else if (rule.mobile.memberActivityText) {
                const rowHook = appearanceHooks.get("UserRowSubLabel");
                const row = jsx("UserRowSubLabel", { guildId, user: { id: sender } });
                const rowWrap = rowHook(null, row);
                const scoped = rowWrap.type(rowWrap.props);
                assert.equal(scoped.type, "MemberRowProvider");
                assert.equal(scoped.props.value, true);
                assert.equal(scoped.props.children, row);
                const friendRow = jsx("UserRowSubLabel", { user: { id: sender } });
                const friendWrap = rowHook(null, friendRow);
                assert.equal(friendWrap.type(friendWrap.props), friendRow);
                const presence = nativeHeaders.get("PresenceActivityStatus");
                const presenceHook = appearanceHooks.get(presence);
                const tests = [];
                for (const type of [0, 2, 4]) {
                    const status = jsx(presence, { activity: { type }, hideText: false, hideIcon: false });
                    const wrapped = presenceHook(null, status);
                    const result = wrapped.type(wrapped.props);
                    assert.equal(result.type(result.props), status);
                    inMemberRow = true;
                    const hidden = result.type(result.props);
                    assert.equal(hidden.props.hideText, type !== 4);
                    assert.equal(hidden.props.hideIcon, false);
                    inMemberRow = false;
                    tests.push([wrapped, status]);
                }
                click(render(), "Disable " + rule.plugin);
                assert.equal(appearanceHooks.size, 0);
                for (const [wrapped, status] of tests) assert.equal(wrapped.type(wrapped.props), status);
                continue;
            } else if (rule.mobile.memberCustomStatus) {
                const hook = appearanceHooks.get("ActivityStatus");
                const presence = jsx("Presence", { label: "Playing Discord" });
                const separator = jsx("Text", { accessibilityElementsHidden: true, children: " · " });
                const custom = jsx(Symbol.for("react.fragment"), { children: ["Working", null] });
                const output = jsx("ActivityContainer", { style: baseStyle, children: Object.freeze([presence, separator, custom]) });
                const original = jsx(ActivityStatus, { output });
                const wrapped = hook(null, original);
                const scoped = wrapped.type(wrapped.props);
                assert.equal(scoped.type(scoped.props), original);
                inMemberRow = true;
                const filtered = scoped.type(scoped.props);
                assert.deepEqual(Array.from(filtered.type(filtered.props).props.children), [presence, null, null]);
                assert.equal(output.props.children[2], custom);
                const unknownOutput = jsx("ActivityContainer", { children: [presence, null, "untagged"] });
                assert.equal(filtered.type({ originalProps: { output: unknownOutput } }), unknownOutput);
                settings.safeMode = { enabled: true };
                assert.equal(scoped.type(scoped.props), original);
                settings.safeMode = undefined;
                inMemberRow = false;
                selectCatalog("HideMemberActivities");
                click(render(), "Allow for this session");
                selectCatalog("HideStatusEmojis");
                click(render(), "Allow for this session");
                assert.equal(scoped.type(scoped.props), original);
                const withBoth = wrapped.type(wrapped.props);
                assert.equal(withBoth.type(withBoth.props).props.hideEmoji, true);
                inMemberRow = true;
                assert.equal(withBoth.type(withBoth.props).props.originalProps.hideEmoji, true);
                inMemberRow = false;
                click(render(), "Disable HideStatusEmojis");
                const row = jsx("UserRowSubLabel", { guildId });
                const rowWrapper = appearanceHooks.get("UserRowSubLabel")(null, row);
                assert.equal(rowWrapper.type(rowWrapper.props).props.children, row);
                click(render(), "Disable HideCustomStatuses");
                assert.equal(wrapped.type(wrapped.props), original);
                assert.equal(rowWrapper.type(rowWrapper.props).props.children, row);
                click(render(), "Disable HideMemberActivities");
                assert.equal(rowWrapper.type(rowWrapper.props), row);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.mentionBadges) {
                const badge = appearanceHooks.get("Badge");
                const marked = jsx("NativeBadge", { value: 3, isMentionLowImportance: false });
                const unrelated = jsx("NativeBadge", { value: 3 });
                const modern = badge(null, marked);
                const legacy = appearanceHooks.get("MentionsBadge")(null, original);
                assert.equal(modern.type(modern.props), null);
                assert.equal(legacy.type(legacy.props), null);
                const other = badge(null, unrelated);
                assert.equal(other.type(other.props), unrelated);
                click(render(), "Disable " + rule.plugin);
                assert.equal(modern.type(modern.props), marked);
                assert.equal(legacy.type(legacy.props), original);
                assert.equal(appearanceHooks.size, 0);
                continue;
            } else if (rule.mobile.messagePresentation) {
                const rendered = messageRenderer.default();
                assert.equal(rendered.content, messagePresentation.content);
                assert.equal(rendered.edited, rule.mobile.messagePresentation !== "edited");
                assert.equal(rendered.stickers.length, rule.mobile.messagePresentation === "stickers" ? 0 : 1);
                for (const field of ["timestamp", "timestampTooltip", "timestampAccessibilityLabel"]) {
                    assert.equal(rendered[field], rule.mobile.messagePresentation === "timestamps" ? undefined : messagePresentation[field]);
                }
                settings.safeMode = { enabled: true };
                assert.equal(messageRenderer.default(), messagePresentation);
                settings.safeMode = undefined;
            } else for (const name of rule.mobile) {
                const wrapped = appearanceHooks.get(name)(null, original);
                assert.equal(wrapped.type(wrapped.props), null);
                wraps.push(wrapped);
            }
            click(render(), "Disable " + rule.plugin);
            assert.equal(appearanceHooks.size, 0);
            assert.equal(messageRenderer.default, createMessageContent);
            assert.equal(Spoiler.prototype.render, renderSpoiler);
            assert.equal(colorOverlays.size, 0);
            assert.equal(stylesheet, undefined);
            for (const wrapped of wraps) assert.equal(wrapped.type(wrapped.props), original);
        }
        if (!desktop) {
            for (const name of ["WiderChannelList", "NarrowChannelList"]) {
                selectCatalog(name);
                click(render(), "Allow for this session");
            }
            assert.equal(drawerSizing.useDrawerWidth(), 220);
            click(render(), "Disable NarrowChannelList");
            assert.equal(drawerSizing.useDrawerWidth(), 300);
            click(render(), "Disable WiderChannelList");
            assert.equal(drawerSizing.useDrawerWidth, useDrawerWidth);
            for (const name of ["HideGifButton", "HideStickerButton"]) {
                selectCatalog(name);
                click(render(), "Allow for this session");
            }
            assert.deepEqual(Array.from(renderPicker().items), ["Emoji"]);
            click(render(), "Disable HideGifButton");
            assert.deepEqual(Array.from(renderPicker().items), ["Emoji", "GIFs"]);
            click(render(), "Disable HideStickerButton");
            assert.equal(design.useSegmentedControlState, useSegmentedControlState);
            assert.equal(appearanceHooks.size, 0);
            for (const name of ["HideEditedLabel", "HideStickers", "HideTimestamps"]) {
                selectCatalog(name);
                click(render(), "Allow for this session");
            }
            let rendered = messageRenderer.default();
            assert.equal(rendered.edited, false);
            assert.equal(rendered.stickers.length, 0);
            assert.equal(rendered.content, messagePresentation.content);
            assert.equal(rendered.timestamp, undefined);
            click(render(), "Disable HideEditedLabel");
            rendered = messageRenderer.default();
            assert.equal(rendered.edited, true);
            assert.equal(rendered.stickers.length, 0);
            assert.equal(rendered.timestamp, undefined);
            click(render(), "Disable HideStickers");
            click(render(), "Disable HideTimestamps");
            assert.equal(messageRenderer.default, createMessageContent);
            for (const name of ["FloatingChatBar", "RoundedChatBar"]) {
                selectCatalog(name);
                click(render(), "Allow for this session");
            }
            assert.equal(appearanceHooks.size, 1);
            const original = jsx("NativeTarget", Object.freeze({ style: Object.freeze({ padding: 2 }) }));
            const wrapped = appearanceHooks.get("FloatingChatInputContainer")(null, original);
            const readStyles = () => wrapped.type(wrapped.props).props.style;
            assert.equal(readStyles().flat()[1].marginBottom, 8);
            assert.equal(readStyles().flat()[2].borderRadius, 24);
            click(render(), "Disable FloatingChatBar");
            assert.equal(appearanceHooks.size, 1);
            assert.equal(readStyles()[0], original.props.style);
            assert.equal(readStyles()[1].borderRadius, 24);
            click(render(), "Disable RoundedChatBar");
            assert.equal(appearanceHooks.size, 0);
            assert.equal(wrapped.type(wrapped.props), original);
        }
        const copyUrl = cxCatalog.plugins.find(entry => entry.name === "CopyUserURLs").source;
        assert.throws(() => activateCx(copyUrl, host, []), /approval/);
        assert.throws(() => parseCx(copyUrl.replace("copy user-url", "copy token")), /Unknown or duplicate profile menu/);
        assert.throws(() => parseCx(copyUrl.replace(/^  needs profilemenu\.copy\r?\n/m, "")), /permissions/);
        for (const name of ["CopyUserURLs", "CopyUserMention"]) {
            selectCatalog(name);
            click(render(), "Allow for this session");
        }
        const actionList = (id, guild) => {
            if (desktop) {
                const children = [];
                for (const patch of menuPatches) patch(children, { user: { id }, guildId: guild });
                return children.map(child => child.props);
            }
            const profile = jsx("UserProfileOverflowMenu", { user: { id }, displayProfile: { guildId: guild } });
            const wrapped = appearanceHooks.get("UserProfileOverflowMenu")(null, profile);
            const originalItems = Object.freeze([Object.freeze([{ label: "Existing action" }]), Object.freeze([])]);
            const original = jsx("ContextMenu", Object.freeze({ items: originalItems, onOpen() {}, children() {} }));
            const menu = appearanceHooks.get("ContextMenu")(null, original);
            profileUser = wrapped.props.value;
            const updated = menu.type(menu.props);
            profileUser = undefined;
            assert.equal(menu.type(menu.props), original);
            assert.equal(original.props.items.length, 2);
            return updated.props.items[2] ?? [];
        };
        assert.deepEqual(actionList("invalid"), []);
        const menuActions = actionList(sender);
        assert.deepEqual(Array.from(menuActions, item => item.label), ["Copy User URL", "Copy User Mention"]);
        assert.equal(clipboardWrites.length, 0);
        for (const action of menuActions) action.action();
        if (!desktop) {
            settings.safeMode = { enabled: true };
            menuActions[1].action();
            settings.safeMode.enabled = false;
        }
        click(render(), "Disable CopyUserURLs");
        menuActions[0].action();
        assert.deepEqual(Array.from(actionList(sender), item => item.label), ["Copy User Mention"]);
        click(render(), "Disable CopyUserMention");
        menuActions[1].action();
        assert.deepEqual(clipboardWrites, ["<https://discord.com/users/" + sender + ">", "<@" + sender + ">"]);
        assert.equal(menuPatches.size + appearanceHooks.size, 0);
        selectCatalog("CopyProfileColors");
        click(render(), "Allow for this session");
        assert.deepEqual(Array.from(actionList(sender), item => item.label), ["Copy Profile Colors"]);
        const colorActions = actionList(sender, guildId);
        assert.deepEqual(Array.from(colorActions, item => item.label), ["Copy Profile Colors", "Copy Server Profile Colors"]);
        for (const action of colorActions) action.action();
        assert.deepEqual(clipboardWrites.slice(-2), ["Primary-color #000000, Secondary-Color #12abcd", "Primary-color #000123, Secondary-Color #ffffff"]);
        actionList(other, guildId)[0].action();
        assert.equal(notifications.pop(), "No profile colors found.");
        click(render(), "Disable CopyProfileColors");
        const profileMedia = cxCatalog.plugins.find(entry => entry.name === "ProfileMedia").source;
        assert.throws(() => activateCx(profileMedia, host, []), /approval/);
        assert.throws(() => parseCx(profileMedia.replace(/^  needs profilemenu\.media\r?\n/m, "")), /permissions/);
        assert.equal(moduleBox.exports.getCxProfileMedia(sender, { avatar: "https://example.com/avatar.png" }, "invalid").length, 0);
        selectCatalog("ProfileMedia");
        click(render(), "Allow for this session");
        const mediaActions = actionList(sender);
        assert.deepEqual(Array.from(mediaActions, item => item.label), ["View Avatar", "Download Avatar", "View Banner", "Download Banner"]);
        assert.deepEqual(Array.from(actionList(other), item => item.label), ["View Avatar", "Download Avatar"]);
        const bannerUrl = "https://cdn.discordapp.com/banners/" + sender + "/a_" + "a".repeat(32) + ".gif?size=4096";
        fetchAttachment = async (url, options) => {
            assert.equal(url, bannerUrl);
            assert.equal(options.credentials, "omit");
            assert.equal(options.redirect, "error");
            return { ok: true, blob: () => new Blob(["image"], { type: "image/gif" }) };
        };
        mediaActions[0].action();
        mediaActions[2].action();
        await mediaActions[3].action();
        await new Promise(setImmediate);
        const mediaUrl = entry => desktop ? entry.url : entry.uri;
        assert.match(mediaUrl(viewedProfiles[0]), /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png$/);
        assert.equal(mediaUrl(viewedProfiles[1]), bannerUrl);
        if (desktop) assert.equal(savedProfileMedia[0].name, "banner_" + sender + ".gif");
        else {
            assert.equal(viewedProfiles[1].height, 480);
            assert.deepEqual(savedProfileMedia[0], [bannerUrl, nativeMediaType.GIF, "image/gif"]);
        }
        click(render(), "Disable ProfileMedia");
        mediaActions[0].action();
        await mediaActions[3].action();
        assert.equal(viewedProfiles.length, 2);
        assert.equal(savedProfileMedia.length, 1);
        assert.equal(menuPatches.size + appearanceHooks.size, 0);
        selectCatalog("foreignCopyHandler");
        click(render(), "Allow for this session");
        const category = { id: guildId, name: "Team channels", type: 4 };
        const getCopy = channel => {
            if (desktop) {
                const items = [];
                for (const patch of menuPatches) patch(items, { channel });
                return items[0]?.props;
            }
            const hook = appearanceHooks.get("ChannelLongPressActionSheetConnected");
            const wrapped = hook(null, jsx(ChannelLongPressActionSheetConnected, { channel }));
            const item = wrapped.type(wrapped.props);
            const tree = item.type(item.props);
            assert.ok(find(tree, entry => entry.type === "OriginalAction"));
            return find(tree, entry => entry.props.label?.startsWith("Copy "))?.props;
        };
        const beforeChannelCopies = clipboardWrites.length;
        assert.equal(getCopy({ id: "invalid", name: "Invalid" }), undefined);
        const categoryCopy = getCopy(category);
        const dmCopy = getCopy({ id: other, type: 3 });
        assert.equal(categoryCopy.label, "Copy Category Name");
        assert.equal(dmCopy.label, "Copy Channel Name");
        const invokeCopy = action => action[desktop ? "action" : "onPress"]();
        invokeCopy(categoryCopy);
        invokeCopy(dmCopy);
        click(render(), "Disable foreignCopyHandler");
        invokeCopy(categoryCopy);
        assert.deepEqual(clipboardWrites.slice(beforeChannelCopies), ["Team channels", "Group DM"]);
        assert.equal(menuPatches.size + appearanceHooks.size, 0);
        await new Promise(setImmediate);
        const guarded = cxCatalog.plugins.find(entry => entry.name === "HoldYourTongue").source;
        assert.throws(() => activateCx(guarded, host, []), /approval/);
        assert.throws(() => parseCx(guarded.replace('"lipton green tea citrus"', '""')), /Invalid text/);
        assert.throws(() => parseCx(guarded.replace('"lipton green tea citrus"', '"same","SAME"')), /distinct/);
        selectCatalog("HoldYourTongue");
        click(render(), "Allow for this session");
        const phrase = "I have LIPTON Green Tea Citrus";
        const guardListener = [...transformHooks][0];
        const submitGuarded = text => desktop ? guardListener(selectedChannel, { content: text })
            : splitComposer.chatInputHandleSendText({ text, params: { channel: { id: selectedChannel } } });
        await submitGuarded("ordinary message");
        assert.equal(nativeConfirmations.length, 0);
        const denied = submitGuarded(phrase);
        const deny = nativeConfirmations.at(-1);
        assert.match(deny.props.body, /lipton green tea citrus/);
        const duplicate = await submitGuarded(phrase);
        assert.equal(nativeConfirmations.length, 1);
        if (desktop) {
            assert.equal(duplicate.cancel, true);
            deny.resolve(false);
            assert.equal((await denied).cancel, true);
        } else deny.buttons[0].onPress();
        const allowed = submitGuarded(phrase);
        const allow = nativeConfirmations.at(-1);
        if (desktop) {
            allow.props.onCloseCallback();
            allow.resolve(true);
            assert.equal((await allowed).cancel, false);
        } else {
            allow.buttons[1].onPress();
            allow.buttons[1].onPress();
            assert.deepEqual(composerSends, ["ordinary message", phrase]);
        }
        const stale = submitGuarded(phrase);
        const staleAlert = nativeConfirmations.at(-1);
        click(render(), "Disable HoldYourTongue");
        if (desktop) {
            staleAlert.resolve(true);
            assert.equal((await stale).cancel, true);
            assert.equal(transformHooks.size, 0);
        } else {
            staleAlert.buttons[1].onPress();
            assert.deepEqual(composerSends, ["ordinary message", phrase]);
            assert.equal(splitComposer.chatInputHandleSendText, nativeComposerSend);
        }
        const editor = find(render(), item => item.type === (desktop ? "textarea" : "TextInput"));
        if (desktop) editor.props.onChange({ currentTarget: { value: counter } });
        else editor.props.onChangeText(counter);
        click(render(), "Review CX");
        assert.equal(Object.keys(registered).length, 0, platform + " waits for approval");
        click(render(), "Allow for this session");
        const command = registered["ccp-count"];
        const inspect = registered["ccp-inspect"];
        const clipboardBeforeInspect = clipboardWrites.length;
        const diagnosticContext = { channel: { id: "test-channel" } };
        assert.equal(inspect.execute([], diagnosticContext), undefined);
        await new Promise(setImmediate);
        assert.match(delivered.pop()[1], /^Copied the diagnostic report\. Found 1 loaded modules/);
        assert.equal(clipboardWrites.length, clipboardBeforeInspect + 1);
        const copiedReport = clipboardWrites.at(-1);
        assert.equal(protectedReads, 0);
        assert.ok(!copiedReport.includes("private diagnostic value") && !copiedReport.includes(sender));
        const report = JSON.parse(copiedReport);
        assert.equal(report.platform, platform);
        assert.deepEqual(report.modules[0].methods, ["getAccount"]);
        assert.deepEqual(report.modules[0].accessorNames, ["privateValue"]);
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        click(render(), "Disable CX Character Counter");
        inspect.execute([], diagnosticContext);
        assert.equal(clipboardWrites.length, clipboardBeforeInspect + 1);
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        assert.deepEqual(delivered, [["test-channel", "3 characters"]]);
        assert.equal(Object.keys(registered).length, 0, platform + " unregisters on disable");

        const incomingCases = [
            ["StickerBlocker", null, () => ({
                type: "LOAD_MESSAGES_SUCCESS",
                messages: [{ content: "a", sticker_items: [{ id: "sticker" }] }, { content: "b" }],
            }), result => { assert.equal(result.messages[0].sticker_items.length, 0); assert.equal(result.messages[0].content, "a"); }],
            ["SilenceUsers", sender, () => ({
                type: "MESSAGE_CREATE", message: { author: { id: sender }, mentions: [{ id: me }, { id: other }], mention_everyone: true },
            }), result => { assert.equal(result.message.mention_everyone, false); assert.equal(result.message.mentions[0].id, other); }],
            ["ReplyPingControl", null, () => ({
                type: "MESSAGE_CREATE", message: { author: { id: sender }, mentions: [{ id: me }], message_reference: { channel_id: "test-channel", message_id: "reply" } },
            }), result => assert.equal(result.message.mentions.length, 0)],
            ["IgnoreCalls", sender, () => ({
                type: "CALL_UPDATE", channelId: "test-channel", ringing: [me, other],
            }), result => { assert.equal(result.ringing.length, 1); assert.equal(result.ringing[0], other); }],
            ["KeywordNotify", "deploy", () => ({
                type: "MESSAGE_CREATE", message: { author: { id: sender, username: "Tester" }, content: "DEPLOY done", channel_id: "test-channel" },
            }), () => { pendingNotifications.shift()(); assert.equal(notifications.at(-1), "Tester in #test: DEPLOY done"); }],
            ["MessageNotifier", sender, () => ({
                type: "MESSAGE_CREATE", message: { author: { id: sender, username: "Tester" }, content: "hello", channel_id: "test-channel" },
            }), () => { pendingNotifications.shift()(); assert.equal(notifications.at(-1), "Tester in #test: hello"); }],
        ];
        for (const [name, configuration, event, check] of incomingCases) {
            selectCatalog(name);
            if (configuration !== null) {
                const input = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
                const source = input.props.value.replace('""', JSON.stringify(configuration));
                if (desktop) input.props.onChange({ currentTarget: { value: source } });
                else input.props.onChangeText(source);
                click(render(), "Review CX");
            }
            assert.equal(incomingHooks.length, 0);
            click(render(), "Allow for this session");
            assert.equal(incomingHooks.length, 1);
            const payload = event();
            const next = incomingHooks[0](payload);
            check(next ? { ...payload, ...next } : payload);
            click(render(), "Disable " + name);
            assert.equal(incomingHooks.length, 0);
        }
        const pingSource = read("examples/cx/catalog/plugins/ping-notifications.cx");
        assert.throws(() => parseCx(pingSource.replace('"mentions,dms"', '"active,include-muted"')), /Choose mentions/);
        assert.throws(() => activateCx(pingSource, host, ["messages.watchlocal"]), /approval/);
        const originalChannel = stores.ChannelStore.getChannel;
        const originalBlock = stores.RelationshipStore.isBlocked;
        const originalSelection = selectedChannel;
        let channelType = 0, blocked = false;
        stores.ChannelStore.getChannel = id => id === other
            ? { type: channelType, name: "Test channel", guild_id: channelType === 0 ? guildId : undefined, recipients: [sender] }
            : originalChannel(id);
        stores.RelationshipStore.isBlocked = () => blocked;
        selectCatalog("PingNotifications");
        click(render(), "Allow for this session");
        const emitPing = (mentions = [], extra = {}) => incomingHooks[0]({ type: "MESSAGE_CREATE",
            message: { id: roleId, channel_id: other, author: { id: sender, username: "Tester" }, content: `hi <@${me}>`, mentions, ...extra } });
        const mention = [{ id: me, username: "$&tester" }];
        emitPing();
        emitPing(mention, { state: "SENDING" });
        selectedChannel = other;
        emitPing(mention);
        selectedChannel = originalSelection;
        pingDnd = true;
        emitPing(mention);
        pingDnd = false;
        pingMuted = true;
        emitPing(mention);
        pingMuted = false;
        blocked = true;
        emitPing(mention);
        blocked = false;
        assert.equal(pendingNotifications.length, 0);
        emitPing(mention);
        assert.equal(pendingNotifications.length, 1);
        pendingNotifications.shift()();
        assert.equal(notifications.at(-1), desktop ? "hi @$&tester" : "Tester in Test channel: hi @$&tester");
        if (desktop) {
            assert.equal(desktopAlerts.at(-1).noPersist, true);
            desktopAlerts.at(-1).onClick();
            assert.deepEqual(alertRoutes, [`/channels/${guildId}/${other}/${roleId}`]);
        }
        channelType = 1;
        emitPing();
        assert.equal(pendingNotifications.length, 1);
        click(render(), "Disable PingNotifications");
        const beforeDisabledPing = notifications.length;
        pendingNotifications.shift()();
        assert.equal(notifications.length, beforeDisabledPing);
        stores.ChannelStore.getChannel = originalChannel;
        stores.RelationshipStore.isBlocked = originalBlock;
        const hopOn = read("examples/cx/catalog/plugins/hop-on.cx");
        const hopEvent = (author = other, channel = "test-channel", content = "HOP ON tonight") => ({
            type: "MESSAGE_CREATE", message: { author: { id: author }, channel_id: channel, content },
        });
        const destination = "https://example.org/game?party=1";
        for (const invalid of ["http://example.org", "javascript:alert(1)", "https://user@example.org", "https://example.org:44", "https://example.org\\other"])
            assert.throws(() => parseCx(hopOn.replace('"hop on |"', JSON.stringify("hop on | " + invalid))), /HTTPS destination/);
        selectCatalog("HopOn");
        click(render(), "Allow for this session");
        incomingHooks[0](hopEvent());
        assert.equal(pendingNotifications.length, 0);
        click(render(), "Disable HopOn");
        selectCatalog("HopOn");
        const hopSource = hopOn.replace('"hop on |"', JSON.stringify("hop on | " + destination));
        const hopInput = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
        if (desktop) hopInput.props.onChange({ currentTarget: { value: hopSource } });
        else hopInput.props.onChangeText(hopSource);
        click(render(), "Review CX");
        assert.ok(moduleBox.exports.reviewCx(hopSource).effects.some(effect => effect.includes(destination)));
        click(render(), "Allow for this session");
        const [openOnMessage] = incomingHooks;
        for (const event of [hopEvent(sender), hopEvent(other, "elsewhere"), hopEvent(other, "test-channel", "irrelevant"),
            { ...hopEvent(), optimistic: true }, { ...hopEvent(), type: "MESSAGE_UPDATE" }]) openOnMessage(event);
        assert.equal(pendingNotifications.length, 0);
        assert.equal(openOnMessage(hopEvent()), undefined);
        openOnMessage(hopEvent());
        assert.equal(pendingNotifications.length, 1);
        pendingNotifications.shift()();
        assert.deepEqual(openedLinks, [destination]);
        click(render(), "Disable HopOn");
        click(render(), "Review CX");
        click(render(), "Allow for this session");
        incomingHooks[0](hopEvent());
        assert.equal(pendingNotifications.length, 1);
        selectedChannel = "elsewhere";
        pendingNotifications.shift()();
        assert.deepEqual(openedLinks, [destination]);
        selectedChannel = "test-channel";
        click(render(), "Disable HopOn");
        assert.equal(incomingHooks.length, 0);
        const voice = (channelId, userId = sender) => ({ type: "VOICE_STATE_UPDATES", voiceStates: [{ userId, channelId }] });
        selectCatalog("VoiceJoinMessages");
        click(render(), "Allow for this session");
        const observeVoice = incomingHooks[0];
        observeVoice(voice(voiceTarget, other));
        observeVoice(voice(voiceTarget));
        observeVoice(voice(voiceTarget));
        assert.equal(pendingNotifications.length, 1);
        pendingNotifications.shift()();
        assert.equal(notifications.pop(), "A friend joined test");
        click(render(), "Disable VoiceJoinMessages");
        observeVoice(voice(secondVoice));
        assert.equal(pendingNotifications.length, 0);

        selectCatalog("FollowVoiceUser");
        const followSource = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
        const configuredFollow = followSource.props.value.replace('""', JSON.stringify(sender));
        if (desktop) followSource.props.onChange({ currentTarget: { value: configuredFollow } });
        else followSource.props.onChangeText(configuredFollow);
        click(render(), "Review CX");
        click(render(), "Allow for this session");
        const observeFollow = incomingHooks[0];
        observeFollow(voice(voiceTarget));
        await new Promise(setImmediate);
        assert.equal(voiceJoins.length, 0);
        currentVoice = voiceTarget;
        observeFollow(voice(secondVoice, other));
        observeFollow(voice(secondVoice));
        await new Promise(setImmediate);
        assert.deepEqual(voiceJoins, [secondVoice]);
        currentVoice = secondVoice;
        observeFollow(voice(voiceTarget));
        click(render(), "Disable FollowVoiceUser");
        await new Promise(setImmediate);
        assert.deepEqual(voiceJoins, [secondVoice]);

        selectCatalog("RelationshipNotifier");
        click(render(), "Allow for this session");
        const observeRelationships = incomingHooks[0];
        const removal = { type: "RELATIONSHIP_REMOVE", relationship: { id: sender, type: 1 } };
        relationshipActions.removeRelationship(sender);
        observeRelationships(removal);
        observeRelationships(removal);
        assert.deepEqual(removals, [sender]);
        assert.equal(pendingNotifications.length, 0);
        observeRelationships({ ...removal, relationship: { id: other, type: 1 } });
        pendingNotifications.shift()();
        assert.equal(notifications.pop(), "Someone removed you as a friend");
        click(render(), "Disable RelationshipNotifier");
        assert.equal(relationshipActions.removeRelationship, removeRelationship);
        assert.equal(incomingHooks.length, 0);
        for (const [name, configuration, matched, kept] of [
            ["NoBlockedMessages", null, { author: { id: other } }, { author: { id: guildId } }],
            ["ClientSideBlock", sender, { author: { id: sender } }, { author: { id: other } }],
            ["BlockKeywords", "spoiler,c.a", { author: { id: sender }, embeds: [{ title: "Plot SPOILER!" }] },
                { author: { id: sender }, content: "spoilers and cXa" }],
        ]) {
            selectCatalog(name);
            if (configuration) {
                const editor = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
                const configured = editor.props.value.replace('""', JSON.stringify(configuration));
                if (desktop) editor.props.onChange({ currentTarget: { value: configured } });
                else editor.props.onChangeText(configured);
                click(render(), "Review CX");
            }
            click(render(), "Allow for this session");
            const [hook] = incomingHooks;
            const blocked = desktop ? true : false;
            assert.equal(hook({ type: "MESSAGE_CREATE", message: matched }), blocked);
            assert.equal(hook({ type: "MESSAGE_UPDATE", message: matched }), blocked);
            if (name === "ClientSideBlock" || name === "NoBlockedMessages")
                assert.equal(hook({ type: "MESSAGE_UPDATE", message: { id: "partial", channel_id: "test-channel" } }), blocked);
            assert.equal(hook({ type: "MESSAGE_CREATE", message: kept }), undefined);
            assert.equal(hook({ type: "MESSAGE_CREATE", optimistic: true, message: matched }), undefined);
            const own = { ...matched, author: { id: me } };
            assert.equal(hook({ type: "MESSAGE_CREATE", message: own }), undefined);
            const history = { type: "LOAD_MESSAGES_SUCCESS", messages: [matched, own, kept] };
            assert.deepEqual(Array.from((hook(history) ?? history).messages), [own, kept]);
            click(render(), "Disable " + name);
            assert.equal(hook({ type: "MESSAGE_CREATE", message: matched }), undefined);
            assert.equal(incomingHooks.length, 0);
        }

        const systemPort = cxCatalog.plugins.find(entry => entry.name === "HideSystemMessages").source;
        assert.throws(() => parseCx(systemPort.replace("pins,joins,boosts", "pins,moderation")), /Choose pins, joins, or boosts/);
        selectCatalog("HideSystemMessages");
        click(render(), "Allow for this session");
        const [filterSystem] = incomingHooks;
        const ordinary = { id: "regular", type: 0 };
        const safetyNotice = { id: "moderation", type: 24 };
        const systemMessages = [6, 7, 8, 9, 10, 11].map(type => ({ id: String(type), type }));
        for (const message of systemMessages) {
            assert.equal(filterSystem({ type: "MESSAGE_CREATE", message }), desktop ? true : false);
        }
        const history = { type: "LOAD_MESSAGES_SUCCESS", messages: [...systemMessages, ordinary, safetyNotice] };
        assert.deepEqual(Array.from((filterSystem(history) ?? history).messages), [ordinary, safetyNotice]);
        assert.equal(filterSystem({ type: "MESSAGE_CREATE", message: safetyNotice }), undefined);
        click(render(), "Disable HideSystemMessages");
        assert.equal(filterSystem({ type: "MESSAGE_CREATE", message: systemMessages[0] }), undefined);

        const replyDefaultPort = cxCatalog.plugins.find(entry => entry.name === "NoReplyPing").source;
        assert.throws(() => parseCx(replyDefaultPort.replace('reply-ping-default ""', 'reply-ping-default "always"')), /take no options/);
        const replyDefaultLf = replyDefaultPort.replaceAll("\r\n", "\n");
        for (const source of [replyDefaultLf, replyDefaultLf.replaceAll("\n", "\r\n")]) {
            assert.throws(() => parseCx(source.replace(/^  needs replies\.suppressping\r?\n/m, "")), /permissions/);
        }
        selectCatalog("NoReplyPing");
        click(render(), "Allow for this session");
        const [replyDefault] = incomingHooks;
        const pendingReply = { type: "CREATE_PENDING_REPLY", message: Object.freeze({ id: "123" }), shouldMention: true, showMentionToggle: true };
        const replyPatch = replyDefault(pendingReply);
        const createdReply = { ...pendingReply, ...replyPatch };
        assert.equal(createdReply.shouldMention, false);
        assert.equal(createdReply.showMentionToggle, true);
        assert.equal(createdReply.message, pendingReply.message);
        const manualToggle = { type: "SET_PENDING_REPLY_SHOULD_MENTION", shouldMention: true };
        assert.equal(replyDefault(manualToggle), undefined);
        assert.equal(manualToggle.shouldMention, true);
        assert.equal(replyDefault({ type: "CREATE_PENDING_REPLY", shouldMention: false }), undefined);
        if (!desktop) {
            settings.safeMode = { enabled: true };
            assert.equal(replyDefault({ ...pendingReply, shouldMention: true }), undefined);
            settings.safeMode = undefined;
        }
        click(render(), "Disable NoReplyPing");
        assert.equal(incomingHooks.length, 0);
        assert.equal(replyDefault({ ...pendingReply, shouldMention: true }), undefined);

        const profilePort = cxCatalog.plugins.find(entry => entry.name === "NoProfileThemes").source;
        assert.throws(() => parseCx(profilePort.replace('hide-profile-themes ""', 'hide-profile-themes "anything"')), /takes no options/);
        assert.ok(reviewCx(profilePort).effects.includes("Hide other users’ theme colors when their profiles load"));
        selectCatalog("NoProfileThemes");
        click(render(), "Allow for this session");
        const [filterProfile] = incomingHooks;
        const colors = Object.freeze([123, 456]);
        const userProfile = Object.freeze({ theme_colors: colors, bio: "hello", accent_color: 123 });
        const guildProfile = Object.freeze({ themeColors: colors, pronouns: "they/them" });
        const badges = Object.freeze([{ id: "early-supporter" }]);
        const profileEvent = id => ({
            type: "USER_PROFILE_FETCH_SUCCESS",
            userProfile: Object.freeze({ user: { id }, user_profile: userProfile, guild_member_profile: guildProfile, badges }),
        });
        const foreign = profileEvent(other);
        const filtered = (filterProfile(foreign) ?? foreign).userProfile;
        assert.equal(filtered.user_profile.theme_colors, undefined);
        assert.equal(filtered.user_profile.bio, "hello");
        assert.equal(filtered.user_profile.accent_color, 123);
        assert.equal(filtered.guild_member_profile.themeColors, undefined);
        assert.equal(filtered.guild_member_profile.pronouns, "they/them");
        assert.equal(filtered.badges, badges);
        assert.equal(userProfile.theme_colors, colors);
        assert.equal(guildProfile.themeColors, colors);
        const ownProfile = profileEvent(me);
        assert.equal((filterProfile(ownProfile) ?? ownProfile).userProfile.user_profile, userProfile);
        const flat = { type: "USER_PROFILE_FETCH_SUCCESS", userId: other, theme_colors: colors, badges };
        const flatResult = { ...flat, ...(filterProfile(flat) ?? flat) };
        assert.equal(flatResult.theme_colors, undefined);
        assert.equal(flatResult.badges, badges);
        click(render(), "Disable NoProfileThemes");
        assert.equal(incomingHooks.length, 0);
        const afterDisable = profileEvent(other);
        assert.equal((filterProfile(afterDisable) ?? afterDisable).userProfile.user_profile, userProfile);

        selectCatalog("FakeProfileThemes");
        click(render(), "Allow for this session");
        const paletteCommand = registered["cx-profile-colors"];
        const encodeColors = (primary, accent) => paletteCommand.execute([{ name: "primary", value: primary }, { name: "accent", value: accent }],
            { channel: { id: "test-channel" } });
        assert.equal(encodeColors("#7289DA", "00ff88"), undefined);
        const [replyChannel, paletteReply] = delivered.pop();
        assert.equal(replyChannel, "test-channel");
        const encoded = paletteReply.split("\n")[2];
        assert.equal([...encoded].map(char => String.fromCodePoint(char.codePointAt(0) - 0xe0000)).join(""), "[#7289da,#00ff88]");
        const [applyBioTheme] = incomingHooks;
        const bioProfile = Object.freeze({ bio: "hello " + encoded, pronouns: "they/them" });
        const createBioEvent = profile => ({
            type: "USER_PROFILE_FETCH_SUCCESS",
            userProfile: Object.freeze({ user: { id: other }, user_profile: profile, guild_member_profile: guildProfile, badges, premium_type: 0 }),
        });
        const event = createBioEvent(bioProfile);
        const bioResult = (applyBioTheme(event) ?? event).userProfile;
        assert.deepEqual(Array.from(bioResult.user_profile.theme_colors), [0x7289da, 0x00ff88]);
        assert.equal(bioResult.user_profile.bio, bioProfile.bio);
        assert.equal(bioResult.user_profile.pronouns, "they/them");
        assert.equal(bioResult.guild_member_profile, guildProfile);
        assert.equal(bioResult.badges, badges);
        assert.equal(bioResult.premium_type, 0);
        assert.equal(Object.hasOwn(bioProfile, "theme_colors"), false);
        const nativePaletteEvent = createBioEvent(Object.freeze({ ...bioProfile, themeColors: colors }));
        assert.equal(applyBioTheme(nativePaletteEvent), undefined);
        assert.equal(applyBioTheme(createBioEvent({ bio: "not a color code" })), undefined);
        assert.equal(encodeColors("not-a-color", "00ff88"), undefined);
        assert.match(delivered.pop()[1], /six hex digits/);
        click(render(), "Disable FakeProfileThemes");
        assert.equal(incomingHooks.length, 0);
        assert.equal(registered["cx-profile-colors"], undefined);

        const avatarPort = cxCatalog.plugins.find(entry => entry.name === "AvatarGrabber").source;
        assert.throws(() => parseCx(avatarPort.replace(/^  needs profile\.avatar\r?\n/m, "")), /permissions/);
        assert.throws(() => parseCx(avatarPort.replace('"user" user optional', '"user" text optional')), /named text functions/);
        selectCatalog("AvatarGrabber");
        click(render(), "Allow for this session");
        const avatar = registered.avatar;
        assert.equal(avatar.options[0].type, commandApi.ApplicationCommandOptionType.USER);
        const runAvatar = id => avatar.execute(id === undefined ? [] : [{ name: "user", value: id }], { channel: { id: "test-channel" } });
        assert.equal(runAvatar().content, "https://cdn.discordapp.com/embed/avatars/0.png");
        assert.equal(runAvatar(sender).content, "https://cdn.discordapp.com/avatars/" + sender + "/" + avatarHash + ".gif?size=1024");
        assert.equal(runAvatar(other), undefined);
        assert.equal(delivered.pop()[1], "Couldn't find that user.");
        assert.equal(runAvatar("invalid"), undefined);
        click(render(), "Disable AvatarGrabber");
        assert.equal(runAvatar(sender), undefined);

        for (const name of ["InRole", "ReadAllNotifications", "SpotifyShareCommands"]) {
            selectCatalog(name);
            click(render(), "Allow for this session");
        }
        const inrole = registered.inrole;
        assert.equal(inrole.options[0].type, commandApi.ApplicationCommandOptionType.ROLE);
        assert.equal(inrole.execute([{ name: "role", value: roleId }], { guild: { id: guildId }, channel: { id: "guild-channel" } }), undefined);
        assert.match(delivered.pop()[1], /1 loaded member.*Tester＠everyone/s);
        assert.equal(inrole.execute([{ name: "role", value: roleId }], { channel: { id: "dm" } }), undefined);
        assert.equal(delivered.pop()[1], "Use this in a server.");
        const readall = registered.readall;
        assert.equal(acknowledged.length, 0);
        assert.equal(readall.execute([], { channel: { id: "guild-channel" } }), undefined);
        assert.equal(delivered.pop()[1], "Marked 2 channels as read.");
        assert.equal(acknowledged[0].type, "BULK_ACK");
        assert.deepEqual(Array.from(acknowledged[0].channels, row => row.channelId), ["first", "thread"]);
        for (const name of ["track", "album", "artist"]) {
            const result = registered[name].execute([{ name: "message", value: "Now playing" }], { channel: { id: "guild-channel" } });
            assert.equal(result.content, "Now playing https://open.spotify.com/" + name + "/" + trackId);
        }
        click(render(), "Disable InRole");
        click(render(), "Disable ReadAllNotifications");
        click(render(), "Disable SpotifyShareCommands");
        readall.execute([], { channel: { id: "guild-channel" } });
        assert.equal(acknowledged.length, 1);

        const guildContext = { guild: { id: guildId }, channel: { id: "guild-channel", guild_id: guildId } };
        const wikiSource = cxCatalog.plugins.find(entry => entry.name === "WikiLookup").source;
        assert.throws(() => activateCx(wikiSource, host, ["commands.register", "reply.local"]), /approval/);
        assert.throws(() => parseCx(wikiSource.replace('lookup wikipedia "message"', 'lookup webhook "message"')), /Unknown CX instruction/);
        selectCatalog("WikiLookup");
        wikiRequest = undefined;
        click(render(), "Allow for this session");
        assert.equal(wikiRequest, undefined);
        const wiki = registered.wiki;
        assert.equal(wiki.execute([{ name: "message", value: "Earth & Moon" }], guildContext), undefined);
        const firstRequest = wikiRequest;
        assert.equal(firstRequest.url, "https://en.wikipedia.org/api/rest_v1/page/summary/Earth%20%26%20Moon");
        assert.equal(firstRequest.options.credentials, "omit");
        assert.equal(firstRequest.options.redirect, "error");
        assert.deepEqual(Object.keys(firstRequest.options.headers), ["Api-User-Agent"]);
        wiki.execute([{ name: "message", value: "Mars" }], guildContext);
        assert.equal(wikiRequest, firstRequest);
        firstRequest.resolve({ ok: true, json: () => ({ title: "Earth", extract: "Planet @everyone",
            content_urls: { desktop: { page: "https://untrusted.example/wiki/Earth" } } }) });
        await new Promise(setImmediate);
        assert.deepEqual(delivered.pop(), ["guild-channel", "**Earth**\nPlanet ＠everyone\n<https://en.wikipedia.org/wiki/Earth%20%26%20Moon>"]);
        wiki.execute([{ name: "message", value: "Mars" }], guildContext);
        wikiRequest.resolve({ ok: false, status: 404 });
        await new Promise(setImmediate);
        assert.match(delivered.pop()[1], /No Wikipedia article/);
        wiki.execute([{ name: "message", value: "Mercury" }], guildContext);
        const replyCount = delivered.length;
        click(render(), "Disable WikiLookup");
        assert.equal(wikiRequest.options.signal.aborted, true);
        await new Promise(setImmediate);
        assert.equal(delivered.length, replyCount);

        selectCatalog("AtSomeone");
        click(render(), "Allow for this session");
        assert.equal(registered.someone.execute([{ name: "message", value: "hi" }], guildContext).content, "<@" + sender + "> hi");
        assert.equal(registered.someone.execute([], { channel: { id: "dm" } }), undefined);
        assert.match(delivered.pop()[1], /No other loaded members/);
        click(render(), "Disable AtSomeone");

        const friendInvites = cxCatalog.plugins.find(entry => entry.name === "FriendInvites").source;
        for (const newline of ["\n", "\r\n"]) {
            const source = friendInvites.replace(/\r?\n/g, newline);
            assert.throws(() => parseCx(source.replace(/^  needs friends\.invites\.revoke\r?\n/m, "")), /permissions/);
        }
        selectCatalog("FriendInvites");
        assert.equal(registered["create-friend-invite"], undefined);
        click(render(), "Allow for this session");
        const createInvite = registered["create-friend-invite"];
        assert.equal(registered["view-friend-invites"].execute([], guildContext), undefined);
        assert.equal(registered["revoke-friend-invites"].execute([], guildContext), undefined);
        await new Promise(setImmediate);
        assert.deepEqual(inviteCalls, ["list", "revoke"]);
        assert.ok(delivered.some(([, text]) => text === "discord.gg/abc · Used 1/5"));
        assert.ok(delivered.some(([, text]) => text === "All friend invites have been revoked."));
        assert.equal(createInvite.execute([], guildContext), undefined);
        resolveInvite({ code: "new-invite", expires_at: "2026-11-08T00:00:00Z", max_uses: 5 });
        await new Promise(setImmediate);
        assert.match(delivered.at(-1)[1], /^discord\.gg\/new-invite · Expires <t:\d+:R> · Max uses: 5$/);
        assert.equal(createInvite.execute([], guildContext), undefined);
        click(render(), "Disable FriendInvites");
        resolveInvite({ code: "late" });
        await new Promise(setImmediate);
        assert.ok(delivered.every(([, text]) => !text.includes("discord.gg/late")));
        createInvite.execute([], guildContext);
        assert.deepEqual(inviteCalls, ["list", "revoke", "create", "create"]);

        const focus = { focused: true };
        const desktopPlugin = module.exports.default;
        {
            if (desktop) {
                const patch = desktopPlugin.patches.find(patch => patch.find === "renderConnectionStatus(){");
                const targets = [
                    'renderConnectionStatus(){return f(0,{lineClamp:1,children:text});}',
                    '"RTCConnectionMenu",f(0,{lineClamp:1,children:text});',
                ];
                patch.replacement.forEach(({ match, replace }, index) => {
                    const regex = new RegExp(match.source.replaceAll("\\i", "[a-zA-Z_$][\\w$]*"));
                    const patched = targets[index].replace(regex, replace);
                    assert.ok(patched.includes('children:[text,$self.renderCallTime(this?.props?.channel?.id),$self.renderVoicePing(this?.props?.channel?.id)]'));
                    const legacy = targets[index].replace("children:text", "children:[text,legacyTimer()]");
                    assert.ok(legacy.replace(regex, replace).includes("children:[[text,legacyTimer()],$self.renderCallTime("));
                });
            }
            const port = cxCatalog.plugins.find(entry => entry.name === "CallTimeCounter").source;
            assert.throws(() => activateCx(port, host, ["voice.followfriend"]), /approval/);
            selectCatalog("CallTimeCounter");
            click(render(), "Allow for this session");
            const renderTime = channelId => {
                let timer;
                if (desktop) {
                    timer = desktopPlugin.renderCallTime(channelId);
                } else {
                    const output = jsx("View", { children: jsx("VoiceControls", {}) });
                    const hook = appearanceHooks.get(VoicePanelHeader);
                    const wrapped = hook(null, jsx(VoicePanelHeader, { channelId, output }));
                    const header = wrapped.type(wrapped.props);
                    const result = header.type(header.props);
                    assert.ok(find(result, item => item.type === "VoiceControls"));
                    timer = find(result, item => item.type?.name === "CallTime");
                }
                return timer?.type(timer.props)?.props.children?.join("") ?? null;
            };
            const changeVoice = id => {
                currentVoice = id;
                voiceListeners.forEach(listener => listener());
            };
            const savedVoice = currentVoice;
            changeVoice(null);
            assert.equal(renderTime(voiceTarget), null);
            assert.equal(clockTimers.size, 0);
            clockTime = 1_000_000;
            changeVoice(voiceTarget);
            assert.equal(renderTime(voiceTarget), "Time elapsed: 00:00:00");
            assert.equal(renderTime(secondVoice), null);
            if (desktop) assert.equal(renderTime(undefined), "Time elapsed: 00:00:00");
            if (desktop) {
                mocks["@api/Settings"].Settings.plugins.CallTimer.enabled = true;
                assert.equal(renderTime(voiceTarget), null);
                mocks["@api/Settings"].Settings.plugins.CallTimer.enabled = false;
            }
            clockTime += 3661_000;
            clockTimers.forEach(tick => tick());
            assert.equal(renderTime(voiceTarget), "Time elapsed: 01:01:01");
            rtcListeners.forEach(listener => listener({ state: "RTC_DISCONNECTED", streamKey: "stream" }));
            assert.equal(renderTime(voiceTarget), "Time elapsed: 01:01:01");
            changeVoice(secondVoice);
            assert.equal(renderTime(voiceTarget), null);
            assert.equal(renderTime(secondVoice), "Time elapsed: 00:00:00");
            clockTime += 2000;
            clockTimers.forEach(tick => tick());
            assert.equal(renderTime(secondVoice), "Time elapsed: 00:00:02");
            rtcListeners.forEach(listener => listener({ state: "RTC_DISCONNECTED" }));
            assert.equal(renderTime(secondVoice), "Time elapsed: 00:00:00");
            changeVoice(null);
            assert.equal(clockTimers.size, 0);
            changeVoice(secondVoice);
            click(render(), "Disable CallTimeCounter");
            assert.equal(clockTimers.size + rtcListeners.size + voiceListeners.size, 0);
            if (desktop) assert.equal(renderTime(secondVoice), null);
            else assert.equal(appearanceHooks.has(VoicePanelHeader), false);
            currentVoice = savedVoice;
            clockTime = undefined;
        }
        {
            const port = cxCatalog.plugins.find(entry => entry.name === "ShowPing").source;
            assert.throws(() => activateCx(port, host, ["voice.calltime"]), /approval/);
            selectCatalog("ShowPing");
            click(render(), "Allow for this session");
            const pingListeners = voiceEventListeners.get("RTC_CONNECTION_PING");
            const renderPing = channelId => {
                let ping;
                if (desktop) {
                    ping = desktopPlugin.renderVoicePing(channelId);
                } else {
                    const output = jsx("View", { children: jsx("VoiceControls", {}) });
                    const hook = appearanceHooks.get(VoicePanelHeader);
                    const wrapped = hook(null, jsx(VoicePanelHeader, { channelId, output }));
                    const header = wrapped.type(wrapped.props);
                    const result = header.type(header.props);
                    assert.ok(find(result, item => item.type === "VoiceControls"));
                    ping = find(result, item => item.type?.name === "VoicePing");
                }
                return ping?.type(ping.props)?.props.children ?? null;
            };
            assert.equal(pingListeners.size, 1);
            assert.equal(rtcListeners.size, 1);
            assert.equal(renderPing(voiceTarget), null);
            voicePingConnected = true;
            voicePingChannel = voiceTarget;
            voicePingMs = NaN;
            assert.equal(renderPing(voiceTarget), null);
            voicePingMs = 24.8;
            pingListeners.forEach(listener => listener());
            assert.equal(renderPing(voiceTarget), "25 ms");
            assert.equal(renderPing(secondVoice), null);
            if (!desktop) {
                settings.safeMode = { enabled: true };
                assert.equal(renderPing(voiceTarget), null);
                settings.safeMode = undefined;
            }
            voicePingConnected = false;
            rtcListeners.forEach(listener => listener());
            assert.equal(renderPing(voiceTarget), null);
            click(render(), "Disable ShowPing");
            assert.equal(pingListeners.size + rtcListeners.size, 0);
            if (!desktop) assert.equal(appearanceHooks.has(VoicePanelHeader), false);
        }
        {
            const port = cxCatalog.plugins.find(entry => entry.name === "AllCallTimeCounter").source;
            assert.throws(() => activateCx(port, host, ["voice.calltime"]), /approval/);
            assert.throws(() => parseCx(port.replace("use all-call-time-counter", "use all-call-time-counter human human")), /timer options/);
            if (!desktop) {
                selectCatalog("HideVoiceUserAvatars");
                click(render(), "Allow for this session");
            }
            selectCatalog("AllCallTimeCounter");
            click(render(), "Allow for this session");
            const row = nativeHeaders.get("VoiceUserItem");
            const originalRow = row.type;
            row.type = props => props.output;
            const renderTime = (id, channelId, collapsed = false) => {
                let timer;
                if (desktop) timer = desktopPlugin.renderVoiceMemberTime(id, channelId);
                else {
                    const hook = appearanceHooks.get(row);
                    const output = jsx("View", { children: [jsx(headerIcons.Avatar, {}), jsx("VoiceMemberName", {})] });
                    const wrapped = hook(null, jsx(row, { user: { id }, channelId, guildId, collapsed, output }));
                    const renderer = wrapped.type(wrapped.props);
                    const tree = renderer.type.type(renderer.props);
                    assert.ok(find(tree, item => item.type === "VoiceMemberName"));
                    assert.equal(find(tree, item => item.type === headerIcons.Avatar), undefined);
                    timer = find(tree, item => item.type?.name === "VoiceMemberTime");
                }
                return timer?.type(timer.props)?.props.children ?? null;
            };
            const emit = (event, payload) => voiceEventListeners.get(event).forEach(listener => listener(payload));
            const from = { userId: sender, channelId: voiceTarget, guildId };
            const moved = { ...from, channelId: secondVoice };
            clockTime = 1_000_000;
            assert.equal(renderTime(sender, voiceTarget), null);
            emit("VOICE_STATE_UPDATES", { voiceStates: [from, { userId: other, channelId: voiceTarget }] });
            assert.equal(renderTime(sender, voiceTarget), "00:00");
            assert.equal(renderTime(other, voiceTarget), null);
            if (!desktop) assert.equal(renderTime(sender, voiceTarget, true), null);
            clockTime += 61_000;
            emit("VOICE_STATE_UPDATES", { voiceStates: [from] });
            assert.equal(renderTime(sender, voiceTarget), "01:01");
            emit("VOICE_STATE_UPDATES", { voiceStates: [moved] });
            assert.equal(renderTime(sender, voiceTarget), null);
            assert.equal(renderTime(sender, secondVoice), "00:00");
            emit("PASSIVE_UPDATE_V1", { guildId, voiceStates: [] });
            assert.equal(renderTime(sender, secondVoice), null);
            emit("VOICE_STATE_UPDATES", { voiceStates: [moved] });
            emit("LOGOUT", {});
            assert.equal(renderTime(sender, secondVoice), null);
            click(render(), "Disable AllCallTimeCounter");
            assert.ok([...voiceEventListeners.values()].every(listeners => !listeners.size));
            if (!desktop) {
                click(render(), "Disable HideVoiceUserAvatars");
                assert.equal(appearanceHooks.has(row), false);
            }
            row.type = originalRow;

            const clock = moduleBox.exports.createCxVoiceMemberClock();
            let liveState = from;
            const stop = clock.bind({
                account: () => me, state: () => liveState,
                channelGuild: () => guildId, dispatcher: channelDispatcher,
            }, { human: true, minutesOnly: true, excludeSelf: true });
            const first = clock.subscribe(sender, () => {});
            const second = clock.subscribe(me, () => {});
            assert.equal(clockTimers.size, 1);
            assert.equal(clock.read(me), undefined);
            assert.equal(clock.read(sender, voiceTarget), "0m");
            clockTime += 61_000;
            assert.equal(clock.read(sender, voiceTarget), "1m");
            liveState = moved;
            emit("PASSIVE_UPDATE_V2", {});
            assert.equal(clock.read(sender, voiceTarget), undefined);
            assert.equal(clock.read(sender, secondVoice), "0m");
            first();
            second();
            assert.equal(clockTimers.size, 0);
            stop();
            clockTime = undefined;
        }
        {
            const port = cxCatalog.plugins.find(entry => entry.name === "WaitForSlot").source;
            assert.throws(() => activateCx(port, host, ["voice.followfriend"]), /approval/);
            assert.throws(() => parseCx(port.replace("use wait-for-slot", "use wait-for-slot auto-join auto-join")), /queue options/);
            const autoPort = port.replace("use wait-for-slot", "use wait-for-slot auto-join quiet");
            assert.ok(reviewCx(autoPort).effects.some(effect => effect.startsWith("Automatically join")));
            selectCatalog("WaitForSlot");
            click(render(), "Allow for this session");
            const getMenu = () => {
                if (desktop) {
                    const children = [];
                    for (const patch of menuPatches) patch(children, { channel: queueChannel });
                    return children.find(item => item.props.id === "cx-wait-for-slot")?.props;
                }
                const hook = appearanceHooks.get("ChannelLongPressActionSheetConnected");
                const wrapped = hook(null, jsx(ChannelLongPressActionSheetConnected, { channel: queueChannel }));
                const renderer = wrapped.type(wrapped.props);
                return find(renderer.type(renderer.props), item => /^(?:Leave|Join) Queue$/.test(item.props.label))?.props;
            };
            const clickQueue = () => getMenu()[desktop ? "action" : "onPress"]();
            const emitSlotChange = () => voiceEventListeners.get("VOICE_STATE_UPDATES").forEach(listener => listener({}));
            const beforeJoins = voiceJoins.length;
            const beforeSounds = queueSounds.length;
            const initialOccupants = queueOccupants;
            canJoinQueue = false;
            assert.equal(getMenu(), undefined);
            canJoinQueue = true;
            canBypassQueue = true;
            assert.equal(getMenu(), undefined);
            canBypassQueue = false;
            voiceActions.selectVoiceChannel(queueChannel.id);
            assert.equal(voiceJoins.length, beforeJoins);
            assert.equal(queuePrompts[0].props.confirmText, "Wait");
            // A slot opening while the Wait dialog is up still requires Join.
            queueOccupants = { [sender]: {} };
            queuePrompts.shift().resolve(true);
            assert.equal(voiceJoins.length, beforeJoins);
            assert.equal(queuePrompts[0].props.confirmText, "Join");
            queueOccupants = initialOccupants;
            queuePrompts.shift().resolve(true);
            assert.equal(getMenu().label, "Leave Queue");
            clickQueue();
            assert.equal(getMenu().label, "Join Queue");
            clickQueue();
            queueOccupants = { [sender]: {} };
            emitSlotChange();
            assert.equal(queuePrompts[0].props.confirmText, "Join");
            queuePrompts.shift().resolve(true);
            assert.deepEqual(voiceJoins.slice(beforeJoins), [queueChannel.id]);
            assert.deepEqual(queueSounds.slice(beforeSounds), ["user_join", "user_join"]);
            const patchedJoin = voiceActions.selectVoiceChannel;
            click(render(), "Disable WaitForSlot");
            assert.notEqual(voiceActions.selectVoiceChannel, patchedJoin);
            assert.ok([...voiceEventListeners.values()].every(listeners => !listeners.size));

            let currentAccount = me, count = 2;
            const joins = [];
            const automatic = moduleBox.exports.createCxVoiceQueue({
                account: () => currentAccount, currentVoice: () => undefined,
                room: () => ({ name: queueChannel.name, limit: 2, occupants: count }),
                join: id => joins.push(id), prompt: () => assert.fail("Auto-join must not prompt"),
                sound: () => assert.fail("Quiet must not play sound"),
            }, { autoJoin: true, quiet: true });
            automatic.menu(queueChannel.id).run();
            count = 1;
            automatic.update();
            currentAccount = other;
            await Promise.resolve();
            assert.equal(joins.length, 0);
            count = 2;
            automatic.menu(queueChannel.id).run();
            count = 1;
            automatic.update();
            await Promise.resolve();
            assert.deepEqual(joins, [queueChannel.id]);
            automatic.stop();
        }
        {
            const port = cxCatalog.plugins.find(entry => entry.name === "WebcamStartNotifier").source;
            assert.throws(() => activateCx(port, host, ["voice.waitslot"]), /approval/);
            assert.throws(() => parseCx(port.replace("use webcam-start-notifier", "use webcam-start-notifier dm-only server-only")), /camera notifications/);
            const savedVoice = currentVoice, savedOccupants = queueOccupants;
            const off = { userId: sender, channelId: queueChannel.id, selfVideo: false };
            currentVoice = queueChannel.id;
            queueOccupants = { [sender]: off };
            const soundsStart = queueSounds.length;
            const emitCamera = (...states) => voiceEventListeners.get("VOICE_STATE_UPDATES")
                .forEach(listener => listener({ voiceStates: states }));
            selectCatalog("WebcamStartNotifier");
            click(render(), "Allow for this session");
            emitCamera({ ...off, selfVideo: true });
            emitCamera({ ...off, selfVideo: true });
            emitCamera({ ...off, selfVideo: undefined });
            emitCamera(off);
            emitCamera({ ...off, channelId: secondVoice, selfVideo: true });
            emitCamera({ ...off, selfVideo: true });
            assert.deepEqual(queueSounds.slice(soundsStart), ["user_join", "user_leave"]);
            if (!desktop) {
                settings.safeMode = { enabled: true };
                emitCamera(off);
                settings.safeMode = undefined;
                assert.equal(queueSounds.length, soundsStart + 2);
            }
            click(render(), "Disable WebcamStartNotifier");
            assert.ok([...voiceEventListeners.values()].every(listeners => !listeners.size));
            currentVoice = savedVoice;
            queueOccupants = savedOccupants;
        }
        {
            const port = cxCatalog.plugins.find(entry => entry.name === "VoiceCount").source;
            assert.throws(() => activateCx(port, host, ["voice.membertime"]), /approval/);
            assert.throws(() => parseCx(port.replace("use voice-channel-count", "use voice-channel-count show-empty show-empty")), /count options/);
            const normalRow = channelRowModule.renderChannelContent;
            const content = jsx("ChannelContentComponent", { name: queueChannel.name });
            channelRowModule.renderChannelContent = () => content;
            const originalOccupants = queueOccupants;
            selectCatalog("VoiceCount");
            click(render(), "Allow for this session");
            assert.equal(voiceCountListeners.size, 1);
            const renderRow = (channel, locked = false) => desktop ? desktopPlugin.renderVoiceChannelCount(channel)
                : channelRowModule.renderChannelContent({ channel, locked });
            const getCount = row => {
                if (!row || row === content) return null;
                const rendered = row.type(row.props);
                if (desktop) return rendered?.props.children ?? null;
                if (rendered === content) return null;
                assert.ok(find(rendered, item => item === content));
                return find(rendered, item => item.props.accessibilityLabel?.startsWith("Voice occupancy ")).props.children;
            };
            queueOccupants = { [sender]: {}, [other]: {} };
            assert.equal(getCount(renderRow(queueChannel)), "2/2");
            if (desktop) {
                canJoinQueue = false;
                assert.equal(renderRow(queueChannel), null);
                canJoinQueue = true;
            } else {
                assert.equal(renderRow(queueChannel, true), content);
            }
            assert.equal(getCount(renderRow({ ...queueChannel, type: 13, userLimit: 0 })), "2");
            assert.equal(getCount(renderRow({ ...queueChannel, type: 0 })), null);
            queueOccupants = {};
            assert.equal(getCount(renderRow(queueChannel)), null);
            click(render(), "Disable VoiceCount");
            assert.equal(voiceCountListeners.size, 0);
            channelRowModule.renderChannelContent = normalRow;
            queueOccupants = originalOccupants;

            const count = moduleBox.exports.createCxVoiceCount();
            const stop = count.bind(stores.VoiceStateStore, { showEmpty: true, hideLimit: true });
            const updates = [];
            const unsubscribe = count.subscribe(() => updates.push(count.read(queueChannel)));
            queueOccupants = {};
            voiceCountListeners.forEach(listener => listener());
            queueOccupants = { [sender]: {} };
            voiceCountListeners.forEach(listener => listener());
            assert.deepEqual(updates, ["0", "1"]);
            unsubscribe();
            stop();
            queueOccupants = originalOccupants;
        }
        {
            selectCatalog("NoRoleHeaders");
            if (desktop) assert.equal(desktopPlugin.hideRoleHeaders(), false);
            click(render(), "Allow for this session");
            if (desktop) {
                const { match, replace } = desktopPlugin.patches.find(patch => patch.find === "this.updateMaxContentFeedRowSeen()").replacement;
                const regex = new RegExp(match.source.replaceAll("\\i", "[a-zA-Z_$][\\w$]*"));
                const fixture = 'return mode===Store.Group.UNKNOWN?"placeholder":"label";';
                const script = fixture.replace(regex, () => replace.replace("$self", "plugin"));
                assert.notEqual(script, fixture);
                const renderHeader = new Function("plugin", "mode", "Store", script);
                const constants = { Group: { UNKNOWN: 0 } };
                assert.equal(renderHeader(desktopPlugin, 1, constants), null);
                click(render(), "Disable NoRoleHeaders");
                assert.equal(renderHeader(desktopPlugin, 1, constants), "label");
            } else {
                const hook = appearanceHooks.get(UsersFastList);
                const heading = Object.freeze({ type: "section", props: Object.freeze({ title: "Members — 3" }) });
                const placeholder = { type: "placeholder" };
                const actionable = { type: "section", props: { title: "See more", action() {} } };
                const getSectionProps = index => [heading, placeholder, actionable][index];
                const list = { ...jsx(UsersFastList, { getSectionProps, sections: [3, 0, 1] }), key: "guild-channel-user-list" };
                const search = { ...list, key: "guild-channel-user-list-search-results" };
                const wrapped = hook(null, list);
                const patched = wrapped.type(wrapped.props);
                const untouched = hook(null, search);
                assert.equal(patched.props.getSectionProps(0), undefined);
                assert.equal(patched.props.getSectionProps(1), placeholder);
                assert.equal(patched.props.getSectionProps(2), actionable);
                assert.equal(patched.props.sections, list.props.sections);
                assert.equal(untouched.type(untouched.props), search);
                assert.equal(list.props.getSectionProps(0), heading);
                settings.safeMode = { enabled: true };
                assert.equal(patched.props.getSectionProps(0), heading);
                settings.safeMode = undefined;
                deviceFontScale = 1;
                selectCatalog("CompactMemberList");
                click(render(), "Allow for this session");
                const compact = wrapped.type(wrapped.props);
                assert.equal(compact.props.getItemSize, 44);
                assert.equal(compact.props.getSectionProps(0), undefined);
                click(render(), "Disable NoRoleHeaders");
                assert.equal(patched.props.getSectionProps(0), heading);
                assert.equal(wrapped.type(wrapped.props).props.getItemSize, 44);
                click(render(), "Disable CompactMemberList");
                deviceFontScale = 1.25;
                assert.equal(appearanceHooks.size, 0);
            }
        }
        {
            const getGiftOption = (prefix = "") => find(render(), item => (desktop ? item.props["aria-label"] : item.props.label) === prefix + "Hide the chat gift button");
            const checked = prefix => getGiftOption(prefix).props[desktop ? "checked" : "value"];
            const toggleGift = (value, prefix) => desktop ? getGiftOption(prefix).props.onChange({ currentTarget: { checked: value } })
                : getGiftOption(prefix).props.onValueChange(value);
            selectCatalog("Declutter");
            assert.equal(checked(), true);
            selectCatalog("ChatButtonsBegone");
            assert.equal(checked(), false);
            toggleGift(true);
            assert.equal(checked(), true);
            assert.equal(appearanceHooks.size, 0);
            assert.equal(stylesheet, undefined);
            click(render(), "Allow for this session");
            if (desktop) assert.match(stylesheet.textContent, /Send a gift/);
            else assert.deepEqual([...appearanceHooks.keys()], ["PremiumAnimatedGiftButton"]);
            const active = "ChatButtonsBegone · ";
            assert.equal(checked(active), true);
            toggleGift(false, active);
            assert.equal(checked(active), false);
            assert.equal(appearanceHooks.size, 0);
            assert.equal(stylesheet, undefined);
            toggleGift(true, active);
            assert.equal(checked(active), true);
            if (desktop) assert.match(stylesheet.textContent, /Send a gift/);
            else assert.deepEqual([...appearanceHooks.keys()], ["PremiumAnimatedGiftButton"]);
            click(render(), "Disable ChatButtonsBegone");
            assert.equal(appearanceHooks.size, 0);
            assert.equal(stylesheet, undefined);
        }
        {
            const crown = (props, stock = false) => {
                if (desktop) return desktopPlugin.showOwnerCrown(props, stock);
                const element = jsx(ownerRow, { ...props, isOwner: stock });
                const wrapper = appearanceHooks.get(ownerRow)?.(null, element);
                return wrapper ? wrapper.type(wrapper.props).props.isOwner : stock;
            };
            const owner = { guildId, user: { id: me } };
            const member = { guildId, user: { id: sender } };
            const dm = { user: owner.user, channel: { type: 3 } };
            const status = { type: 2, name: "Spotify", details: "Track", state: "Artist" };
            const text = activity => desktop ? desktopPlugin.spotifySongName(activity, "Artist") : activityText.default(activity, true).text;
            assert.equal(crown(owner), false);
            assert.equal(text(status), "Artist");
            selectCatalog("ForceOwnerCrown");
            click(render(), "Allow for this session");
            assert.equal(crown(owner), true);
            assert.equal(crown(member), false);
            assert.equal(crown(member, true), true);
            assert.equal(crown(dm), false);
            assert.equal(crown(dm, true), true);
            if (desktop) assert.equal(crown({ user: owner.user, channel: { guild_id: guildId } }), true);
            selectCatalog("ShowSongName");
            click(render(), "Allow for this session");
            assert.equal(text(status), "Track");
            assert.equal(text({ ...status, details: "" }), "Artist");
            assert.equal(text({ ...status, type: 0 }), "Artist");
            assert.equal(text({ ...status, name: "Another service" }), "Artist");
            if (!desktop) {
                assert.equal(activityText.default(status, true).tooltip, "Original tooltip");
                assert.equal(activityText.default(status, false).text, "Artist");
                assert.equal(text({ ...status, state: "Different artist" }), "Artist");
                settings.safeMode = { enabled: true };
                assert.equal(crown(owner), false);
                assert.equal(text(status), "Artist");
                settings.safeMode = undefined;
            }
            click(render(), "Disable ForceOwnerCrown");
            click(render(), "Disable ShowSongName");
            assert.equal(crown(owner), false);
            assert.equal(text(status), "Artist");
            assert.equal(activityText.default, nativeActivityText);
        }

        {
            const port = cxCatalog.plugins.find(entry => entry.name === "NoDraftLengthLimit").source;
            assert.throws(() => activateCx(port, host, ["appearance.style"]), /approval/);
            const draft = "a".repeat(4501) + "full draft";
            const save = { type: "DRAFT_SAVE", channelId: other, draft, draftType: 0 };
            const change = { ...save, type: "DRAFT_CHANGE", draft: draft + " changed" };
            const run = payload => channelDispatcher._actionHandlers.getOrderedActionHandlers(payload)[0].actionHandler(payload);
            const stored = () => drafts[me][other]?.[0]?.draft;
            if (desktop) assert.equal(desktopPlugin.keepLongDrafts(), false);
            else {
                assert.equal(run(save), true);
                assert.equal(stored(), draft.slice(0, 4500));
            }
            selectCatalog("NoDraftLengthLimit");
            click(render(), "Allow for this session");
            if (desktop) {
                assert.equal(desktopPlugin.keepLongDrafts(), true);
                const patch = desktopPlugin.patches.find(entry => entry.find === "ApplicationLauncherCommand=3").replacement;
                const regex = new RegExp(patch.match.source.replaceAll("\\i", "[a-zA-Z_$][\\w$]*"));
                const source = "(c=i).length>4500&&(c=c.substr(0,4500)),i=c";
                const patched = source.replace(regex, patch.replace.replace("$self", "plugin"));
                const runPatched = Function("i", "plugin", "let c;" + patched + ";return i;");
                assert.equal(runPatched(draft, desktopPlugin), draft);
                assert.equal(runPatched(draft, { keepLongDrafts: () => false }), draft.slice(0, 4500));
            } else {
                assert.equal(run(save), true);
                assert.equal(stored(), draft);
                assert.equal(run(change), false);
                assert.equal(stored(), change.draft);
                assert.equal(drafts[me][other][0].timestamp, 1);
                assert.equal(channelDispatcher._actionHandlers.getOrderedActionHandlers({ ...save, type: "MESSAGE_SEND" }), draftHandlers);
                assert.equal(channelDispatcher._actionHandlers.getOrderedActionHandlers({ ...save, draft: "short" }), draftHandlers);
                assert.equal(run({ ...save, draft: "" }), true);
                assert.equal(stored(), undefined);
                settings.safeMode = { enabled: true };
                assert.equal(run(save), true);
                assert.equal(stored(), draft.slice(0, 4500));
                settings.safeMode = undefined;
            }
            click(render(), "Disable NoDraftLengthLimit");
            assert.equal(channelDispatcher._actionHandlers.getOrderedActionHandlers, orderedDraftHandlers);
            if (desktop) assert.equal(desktopPlugin.keepLongDrafts(), false);
        }

        {
            const port = cxCatalog.plugins.find(entry => entry.name === "BypassPinPrompt").source;
            assert.throws(() => activateCx(port, host, ["appearance.style"]), /approval/);
            const confirmations = [];
            const prompt = (title, confirmText) => ({ title, confirmText, onConfirm: () => confirmations.push(title) });
            const valid = prompt("Épingler le message", "Confirmer");
            if (desktop) assert.equal(desktopPlugin.shouldSkipPinPrompt(), false);
            else nativePinAlerts.show(valid);
            selectCatalog("BypassPinPrompt");
            click(render(), "Allow for this session");
            if (desktop) assert.equal(desktopPlugin.shouldSkipPinPrompt(), true);
            else {
                const unpin = prompt("Désépingler le message", "Confirmer");
                const fromPins = prompt("Retirer des épingles", "Retirer");
                for (const alert of [valid, unpin, fromPins]) nativePinAlerts.show(alert);
                assert.deepEqual(confirmations, [valid.title, unpin.title, fromPins.title]);
                const otherTitle = prompt("Supprimer le message", "Confirmer");
                const otherAction = prompt(valid.title, "Supprimer");
                nativePinAlerts.show(otherTitle);
                nativePinAlerts.show(otherAction);
                settings.safeMode = { enabled: true };
                nativePinAlerts.show(valid);
                settings.safeMode = undefined;
                assert.deepEqual(pinPrompts, [valid, otherTitle, otherAction, valid]);
                assert.equal(confirmations.length, 3);
            }
            click(render(), "Disable BypassPinPrompt");
            assert.equal(nativePinAlerts.show, showPinAlert);
            if (desktop) assert.equal(desktopPlugin.shouldSkipPinPrompt(), false);
        }

        {
            const reactions = Object.freeze([
                { count: 1, emoji: "low" }, { count: 5, emoji: "first" }, { count: 5, emoji: "second" },
            ]);
            const options = Object.freeze({ reactions, animateEmoji: true });
            const read = () => desktop
                ? desktopPlugin.sortMessageReactions(reactions)
                : reactionRenderer.default(options).reactions;
            assert.equal(read(), reactions);
            selectCatalog("SortReactions");
            click(render(), "Allow for this session");
            assert.deepEqual(Array.from(read(), reaction => reaction.emoji), ["first", "second", "low"]);
            assert.equal(reactions[0].emoji, "low");
            if (!desktop) {
                assert.equal(reactionRenderer.default(options).animateEmoji, true);
                settings.safeMode = { enabled: true };
                assert.equal(reactionRenderer.default(options), options);
                settings.safeMode = undefined;
            }
            click(render(), "Disable SortReactions");
            assert.equal(read(), reactions);
            assert.equal(reactionRenderer.default, transformReactions);
        }

        {
            const jumpPort = cxCatalog.plugins.find(entry => entry.name === "NoUnblockToJump").source;
            const message = { blocked: true };
            const canSkip = () => desktop
                ? desktopPlugin.canJumpWithoutUnblocking()
                : jumpValidator.default(message);
            assert.equal(canSkip(), false);
            assert.throws(() => activateCx(jumpPort, host, ["channels.jump"]), /approval/);
            selectCatalog("NoUnblockToJump");
            click(render(), "Allow for this session");
            assert.equal(canSkip(), true);
            if (!desktop) {
                settings.safeMode = { enabled: true };
                assert.equal(canSkip(), false);
                settings.safeMode = undefined;
                assert.equal(canSkip(), true);
            }
            click(render(), "Disable NoUnblockToJump");
            assert.equal(canSkip(), false);
            assert.equal(jumpValidator.default, validateJumpWithAlert);
        }

        {
            const originalSelection = selectedChannel;
            const channel = { id: other, type: 0 };
            selectedChannel = channel.id;
            function ChannelActionButtons(props) { return props.output; }
            const originalHeader = jsx("View", { children: jsx("NativeControl", {}) });
            function renderJump(selected) {
                if (desktop) return desktopPlugin.renderJumpToFirst(selected);
                const hook = appearanceHooks.get("ChannelActionButtons");
                if (!hook) return originalHeader;
                const wrapped = hook(null, jsx(ChannelActionButtons, { channel: selected, output: originalHeader }));
                const renderer = wrapped.type(wrapped.props);
                return renderer.type(renderer.props);
            }
            const readFooter = jsx(GuildsBarFooterWrapper, { children: jsx("NativeRailButton", {}) });
            const renderReadAll = () => {
                if (desktop) return [...serverListButtons][0]?.();
                const hook = appearanceHooks.get(GuildsBarFooterWrapper);
                if (!hook) return readFooter;
                const wrapped = hook(null, readFooter);
                return wrapped.type(wrapped.props);
            };
            const jumpButton = () => find(renderJump(channel), el => (el.props.tooltip ?? el.props.label) === "Jump to First Message");
            assert.equal(jumpButton(), undefined);
            selectCatalog("JumpToTop");
            click(render(), "Allow for this session");
            assert.ok(!find(renderJump({ ...channel, type: 15 }), el => (el.props.tooltip ?? el.props.label) === "Jump to First Message"));
            assert.ok(!find(renderJump({ ...channel, isForumPost: () => true }), el => (el.props.tooltip ?? el.props.label) === "Jump to First Message"));
            const clickJump = jumpButton().props[desktop ? "onClick" : "onPress"];
            selectedChannel = sender;
            await clickJump();
            assert.equal(jumps.length, 0);
            selectedChannel = channel.id;
            await clickJump();
            assert.deepEqual({ ...jumps.pop() }, { channelId: other, messageId: other, flash: false, jumpType: "INSTANT" });
            click(render(), "Disable JumpToTop");
            await clickJump();
            assert.equal(jumps.length, 0);
            assert.equal(jumpButton(), undefined);
            selectedChannel = originalSelection;

            const initialRoutes = alertRoutes.length;
            const message = { channel_id: jumpChannel.id, author: { id: sender } };
            const jumpPort = cxCatalog.plugins.find(entry => entry.name === "JumpTo").source;
            assert.throws(() => activateCx(jumpPort, host, ["channels.jump"]), /approval/);
            selectCatalog("JumpTo");
            click(render(), "Allow for this session");
            const getAction = (first, byAuthor = false) => {
                const label = first ? "Jump to First Message" : "Jump to Last Message";
                const props = byAuthor ? { channel: jumpChannel, message } : { channel: jumpChannel };
                if (desktop) {
                    const children = [];
                    [...menuPatches][byAuthor ? 1 : 0](children, props);
                    return children.find(child => child.props.label === label)?.props.action;
                }
                const type = byAuthor ? LongPressMessageActionSheet : ChannelLongPressActionSheetConnected;
                const hook = appearanceHooks.get(byAuthor ? type : type.name);
                const wrapped = hook(null, jsx(type, props));
                const renderer = wrapped.type(wrapped.props);
                const tree = renderer.type(renderer.props);
                assert.ok(find(tree, item => item.type === "OriginalAction"));
                return find(tree, item => item.props.label === label)?.props.onPress;
            };
            const expectJump = id => {
                if (desktop) assert.equal(alertRoutes.pop(), "/channels/" + guildId + "/" + jumpChannel.id + "/" + id);
                else assert.deepEqual(jumpRoutes.pop(), [jumpChannel.id, id]);
            };
            selectedChannel = jumpChannel.id;
            await getAction(true)();
            expectJump(jumpChannel.id);
            assert.equal(jumpRequests.length, 0);
            if (!desktop) {
                const thread = { id: other, type: 11, guild_id: guildId, isForumPost: () => true };
                function ForumPostLongPressActionSheet() {
                    return jsx(NativeActionSheet, { children: jsx("OriginalAction", {}) });
                }
                const hook = appearanceHooks.get("ForumPostLongPressActionSheet");
                const wrapped = hook(null, jsx(ForumPostLongPressActionSheet, { thread }));
                const renderer = wrapped.type(wrapped.props);
                await find(renderer.type(renderer.props), item => item.props.label === "Jump to First Message").props.onPress();
                assert.deepEqual(jumpRoutes.pop(), [other, other]);
            }
            const latest = getAction(false)();
            assert.deepEqual(jumpRequests.pop(), { url: "/channels/" + jumpChannel.id + "/messages", query: { limit: 1 } });
            resolveJump({ body: [{ id: other, channel_id: jumpChannel.id }] });
            await latest;
            expectJump(other);
            const earliestByAuthor = getAction(true, true)();
            assert.deepEqual(jumpRequests.pop(), { url: "/guilds/" + guildId + "/messages/search", query: {
                author_id: sender, channel_id: jumpChannel.id, sort_by: "timestamp", sort_order: "asc",
            } });
            resolveJump({ body: { messages: [[
                { id: other, channel_id: me, author: { id: sender }, hit: true },
                { id: sender, channel_id: jumpChannel.id, author: { id: sender }, hit: true },
            ]] } });
            await earliestByAuthor;
            expectJump(sender);
            const lastByAuthor = getAction(false, true)();
            assert.equal(jumpRequests.pop().query.sort_order, "desc");
            selectedChannel = sender;
            resolveJump({ body: { messages: [[{ id: sender, channel_id: jumpChannel.id, author: { id: sender } }]] } });
            await lastByAuthor;
            assert.equal(alertRoutes.length, initialRoutes);
            assert.equal(jumpRoutes.length, 0);
            const pending = getAction(false)();
            assert.equal(jumpRequests.length, 1);
            click(render(), "Disable JumpTo");
            resolveJump({ body: [{ id: other, channel_id: jumpChannel.id }] });
            await pending;
            assert.equal(alertRoutes.length, initialRoutes);
            assert.equal(jumpRoutes.length, 0);
            selectedChannel = originalSelection;

            const previousAcks = acknowledged.length;
            selectCatalog("ReadAllNotificationsButton");
            click(render(), "Allow for this session");
            const readButton = find(renderReadAll(), el => el.props.label === "Mark Servers as Read" || el.props.children === "Read All");
            const clickRead = readButton.props[desktop ? "onClick" : "onPress"];
            assert.equal(acknowledged.length, previousAcks);
            if (!desktop) {
                settings.safeMode = { enabled: true };
                assert.equal(renderReadAll(), readFooter);
                await clickRead();
                assert.equal(acknowledged.length, previousAcks);
                settings.safeMode = undefined;
            }
            rejectBulkAck = true;
            await clickRead();
            assert.equal(acknowledged.length, previousAcks);
            assert.equal(notifications.pop(), "Couldn't mark servers as read.");
            rejectBulkAck = false;
            await clickRead();
            const readEvent = acknowledged.pop();
            assert.equal(readEvent.type, "BULK_ACK");
            assert.equal(Array.from(readEvent.channels, item => item.channelId).join(), "first,thread");
            assert.equal(notifications.pop(), "Marked 2 channels as read.");
            click(render(), "Disable ReadAllNotificationsButton");
            await clickRead();
            assert.equal(acknowledged.length, previousAcks);
            assert.equal(serverListButtons.size, 0);
            assert.equal(appearanceHooks.size, 0);
        }
        const stamp = new Date(2022, 6, 10, 14, 42, 19);
        const nativeTimestamp = Object.freeze({ timestamp: "2:42 PM", timestampTooltip: "Original tooltip", timestampAccessibilityLabel: "Original label" });
        const nativeTimestampInput = Object.freeze({ message: Object.freeze({ timestamp: stamp }), cxTestPresentation: nativeTimestamp });
        const nativeTimestampMarkup = Object.freeze({ full: "Original full time", parsed: stamp, formatted: "Original inline text" });
        const formatTimestamp = () => desktop ? desktopPlugin.formatTimestamp(stamp, "cozy", nativeTimestamp.timestamp)
            : messageRenderer.default(nativeTimestampInput).timestamp;
        const formatMarkup = () => desktop ? desktopPlugin.formatTimestamp(stamp, "markdown", nativeTimestampMarkup.full)
            : timestampUtils.parseTimestamp(nativeTimestampMarkup).full;
        assert.equal(formatTimestamp(), nativeTimestamp.timestamp);
        selectCatalog("RealtimeTimestamps");
        click(render(), "Allow for this session");
        assert.equal(formatTimestamp(), "14:42:19");
        assert.match(formatMarkup(), /14:42:19/);
        if (desktop) {
            assert.equal(desktopPlugin.formatTimestamp(stamp, "compact", nativeTimestamp.timestamp), "14:42:19");
            assert.equal(desktopPlugin.formatTimestamp(undefined, "cozy", nativeTimestamp.timestamp), nativeTimestamp.timestamp);
        } else {
            assert.match(messageRenderer.default(nativeTimestampInput).timestampTooltip, /14:42:19/);
            assert.equal(timestampUtils.parseTimestamp(nativeTimestampMarkup).formatted, nativeTimestampMarkup.formatted);
            assert.equal(messageRenderer.default({ ...nativeTimestampInput, isInlineReplyPreview: true }), nativeTimestamp);
            settings.safeMode = { enabled: true };
            assert.equal(messageRenderer.default(nativeTimestampInput), nativeTimestamp);
            assert.equal(timestampUtils.parseTimestamp(nativeTimestampMarkup), nativeTimestampMarkup);
            settings.safeMode = undefined;
        }
        selectCatalog("CustomTimestamps");
        click(render(), "Allow for this session");
        assert.equal(formatTimestamp(), "Sun 10.07.2022 14:42:19");
        assert.match(formatMarkup(), /• .+ ago$/);
        click(render(), "Disable CustomTimestamps");
        assert.equal(formatTimestamp(), "14:42:19");
        click(render(), "Disable RealtimeTimestamps");
        assert.equal(formatTimestamp(), nativeTimestamp.timestamp);
        assert.equal(formatMarkup(), nativeTimestampMarkup.full);
        assert.equal(timestampUtils.parseTimestamp, parseTimestamp);
        assert.equal(messageRenderer.default, createMessageContent);
        const channelStore = stores.ChannelStore;
        const originalGetChannel = channelStore.getChannel;
        const rawChannel = Object.freeze({ id: "channel", name: "🎈-ʜᴇʟʟᴏ-world", guild_id: guildId, type: 0 });
        const rawProps = Object.freeze({ name: rawChannel.name, channel: rawChannel, anotherProp: true });
        channelStore.getChannel = () => rawChannel;
        const readChannelName = () => desktop ? channelStore.getChannel(rawChannel.id).name : channelNameModule.default(rawChannel);
        const baseGetChannel = channelStore.getChannel;
        selectCatalog("CleanChannelName");
        click(render(), "Allow for this session");
        assert.equal(readChannelName(), "hello-world");
        selectCatalog("BetterChatNames");
        click(render(), "Allow for this session");
        assert.equal(readChannelName(), "Hello World");
        assert.equal(rawChannel.name, "🎈-ʜᴇʟʟᴏ-world");
        if (desktop) {
            assert.equal(channelStore.getChannel(rawChannel.id), channelStore.getChannel(rawChannel.id));
            desktopPlugin.flux.CHANNEL_SETTINGS_INIT({ channelId: rawChannel.id });
            assert.equal(channelStore.getChannel(rawChannel.id), rawChannel);
            desktopPlugin.flux.CHANNEL_SETTINGS_CLOSE();
            assert.equal(readChannelName(), "Hello World");
        } else {
            assert.equal(channelNameModule.computeChannelName(rawChannel), "Hello World");
            const row = channelRowModule.renderChannelContent(rawProps);
            assert.equal(row.name, "Hello World");
            assert.equal(row.channel, rawChannel);
            assert.equal(row.anotherProp, true);
            settings.safeMode = { enabled: true };
            assert.equal(readChannelName(), rawChannel.name);
            assert.equal(channelRowModule.renderChannelContent(rawProps), rawProps);
            settings.safeMode = undefined;
        }
        click(render(), "Disable CleanChannelName");
        assert.equal(readChannelName(), "🎈 ʜᴇʟʟᴏ World");
        click(render(), "Disable BetterChatNames");
        assert.equal(readChannelName(), rawChannel.name);
        assert.equal(channelStore.getChannel, baseGetChannel);
        assert.equal(channelNameModule.default, nativeChannelName);
        assert.equal(channelRowModule.renderChannelContent, nativeChannelRow);
        channelStore.getChannel = originalGetChannel;
        const fixExtensions = cxCatalog.plugins.find(entry => entry.name === "FixFileExtensions").source;
        assert.throws(() => activateCx(fixExtensions, host, ["appearance.style"]), /approval/);
        const uploader = new NativeCloudUploader();
        const nativeUpload = uploader.uploadFiles;
        const uploadOptions = { mode: "attachment" };
        const runUpload = files => {
            if (desktop) desktopPlugin.fixUploadExtensions(files);
            else {
                const result = uploader.uploadFiles(files, uploadOptions);
                assert.equal(result.files, files);
                assert.equal(result.options, uploadOptions);
            }
        };
        const data = { type: "image/tiff" };
        const uploadFiles = () => [
            { filename: "SPOILER_Scan.TIFF", item: data },
            { filename: "archive.tar.avi" },
            { filename: "LICENSE" },
            Object.freeze({ filename: "read-only.avi" }),
            { filename: "clip.mkv" },
        ];
        let files = uploadFiles();
        runUpload(files);
        assert.equal(files[0].filename, "SPOILER_Scan.TIFF");
        selectCatalog("FixFileExtensions");
        click(render(), "Allow for this session");
        runUpload(files);
        assert.deepEqual(files.map(file => file.filename), ["SPOILER_Scan.jpg", "archive.tar.avi", "LICENSE", "read-only.avi", "clip.mp4"]);
        assert.equal(files[0].item, data);
        assert.deepEqual(data, { type: "image/tiff" });
        if (!desktop) {
            settings.safeMode = { enabled: true };
            files = uploadFiles();
            runUpload(files);
            assert.equal(files[0].filename, "SPOILER_Scan.TIFF");
            settings.safeMode = undefined;
        }
        click(render(), "Disable FixFileExtensions");
        files = uploadFiles();
        runUpload(files);
        assert.equal(files[0].filename, "SPOILER_Scan.TIFF");
        assert.equal(uploader.uploadFiles, nativeUpload);

        const anonymous = cxCatalog.plugins.find(entry => entry.name === "AnonymiseFileNames").source;
        assert.throws(() => activateCx(anonymous, host, ["uploads.rename"]), /approval/);
        assert.throws(() => parseCx(anonymous.replace("random 7", 'consistent "../private"')), /upload names/);
        assert.throws(() => parseCx(anonymous.replace("random 7", "random 25")), /filename length/);
        selectCatalog("AnonymiseFileNames");
        click(render(), "Allow for this session");
        const draftFile = { filename: "personal.tar.gz", item: {} };
        const named = { filename: "KeepOriginal.png", item: {} };
        const preview = jsx(NativeUploadPreview, { upload: named });
        const toggleUploadName = () => {
            if (desktop) {
                const option = desktopPlugin.renderAnonymousUploadButton({ upload: named, canEdit: true });
                option.type(option.props).props.onClick();
            } else {
                const bound = appearanceHooks.get(NativeUploadPreview)(null, preview);
                const wrapper = bound.type(bound.props);
                const tree = wrapper.type(wrapper.props);
                const control = find(tree, item => item.type?.name === "AnonymousUploadRow");
                control.type(control.props).props.onPress();
            }
        };
        toggleUploadName();
        const keepName = { ...named };
        runUpload([draftFile, keepName]);
        assert.match(draftFile.filename, /^[0123456789bdfhjkmnpqrstvwxz]{7}\.tar\.gz$/);
        assert.equal(keepName.filename, "KeepOriginal.png");
        const stableName = draftFile.filename;
        runUpload([draftFile]);
        assert.equal(draftFile.filename, stableName);
        registered.spoiler.execute([{ name: "value", value: true }], { channel: { id: "test" } });
        runUpload([draftFile, keepName]);
        assert.equal(draftFile.filename, "SPOILER_" + stableName);
        assert.equal(keepName.filename, "SPOILER_KeepOriginal.png");
        const protectedFile = { filename: "NeverLeak.png" };
        assert.throws(() => runUpload([protectedFile, Object.freeze({ filename: "private.png" })]), /(?:filename|read only)/i);
        assert.equal(protectedFile.filename, "NeverLeak.png");
        click(render(), "Disable AnonymiseFileNames");
        assert.equal(registered.spoiler, undefined);
        assert.equal(appearanceHooks.has(NativeUploadPreview), false);
        runUpload([protectedFile]);
        assert.equal(protectedFile.filename, "NeverLeak.png");

        const randomNames = cxCatalog.plugins.find(entry => entry.name === "FileNameRandomization").source;
        assert.throws(() => activateCx(randomNames, host, []), /approval/);
        assert.throws(() => parseCx(randomNames.replace("{random}", "../{original}")), /underscores/);
        assert.throws(() => parseCx(randomNames.replace("{random}", "{token}")), /underscores/);
        selectCatalog("FileNameRandomization");
        click(render(), "Allow for this session");
        const formattedUpload = { ...named };
        runUpload([formattedUpload]);
        assert.equal(formattedUpload.filename, "KeepOriginal.png");
        toggleUploadName();
        runUpload([formattedUpload]);
        assert.match(formattedUpload.filename, /^[A-Za-z0-9]{10}\.png$/);
        click(render(), "Disable FileNameRandomization");
        let formatter;
        const customNames = randomNames.replace('"{random}" random 10 manual', '"prefix-{original}-{timestamp}-{random}" random 4 uppercase');
        const stopFormat = activateCx(customNames, { ...host, registerUploadAnonymiser(value) {
            formatter = value;
            return () => { formatter = undefined; };
        } }, ["uploads.rename"]);
        const customFile = { filename: "SPOILER_my file.tar.gz" };
        formatter.apply([customFile]);
        assert.match(customFile.filename, /^SPOILER_PREFIX-MY_FILE-\d{13}-[A-Z0-9]{4}\.tar\.gz$/);
        stopFormat();
        assert.equal(formatter, undefined);

        if (desktop) assert.equal(desktopPlugin.useTypingFocus(focus), focus);
        selectCatalog("NoTypingAnimation");
        click(render(), "Allow for this session");
        if (desktop) {
            assert.equal(desktopPlugin.useTypingFocus(focus).focused, false);
            assert.deepEqual([...typingSubscribers], [true]);
        } else {
            const indicator = jsx("TypingIndicatorInner", { children: "User is typing" });
            const scope = appearanceHooks.get("TypingIndicatorInner")(null, indicator);
            assert.equal(scope.type(scope.props).props.children, indicator);
            const nativeDots = jsx(typingEllipsis, {});
            const wrapped = appearanceHooks.get(typingEllipsis)(null, nativeDots);
            const scopedDots = wrapped.type(wrapped.props);
            assert.equal(scopedDots.type(scopedDots.props), nativeDots);
            inMemberRow = true; // The context mock uses the same switch for boolean scopes.
            const renderedDots = scopedDots.type(scopedDots.props);
            assert.equal(renderedDots.props.children.length, 3);
            assert.equal(renderedDots.props.children[0].props.style.backgroundColor, "#bbbbbb");
            settings.safeMode = { enabled: true };
            assert.equal(scopedDots.type(scopedDots.props), nativeDots);
            settings.safeMode = undefined;
            inMemberRow = false;
        }
        click(render(), "Disable NoTypingAnimation");
        if (desktop) {
            assert.equal(desktopPlugin.useTypingFocus(focus), focus);
            assert.deepEqual([...typingSubscribers], [true, false]);
        } else assert.equal(appearanceHooks.size, 0);

        const plusReacts = cxCatalog.plugins.find(entry => entry.name === "BetterPlusReacts").source;
        assert.throws(() => activateCx(plusReacts, host, ["messages.transform"]), /approval/);
        selectCatalog("BetterPlusReacts");
        const sendBeforeReactions = commandApi.sendMessage;
        click(render(), "Allow for this session");
        const send = (content, options) => commandApi.sendMessage(reactionChannel, { content }, undefined, options);
        await send("++:thumbsup:");
        await send("+👍🏽");
        await send("++:custom:");
        await send(`+<a:custom:${me}>`);
        assert.deepEqual(reactionCalls, [
            [reactionChannel, sender, "👍"], [reactionChannel, other, "👍🏽"],
            [reactionChannel, sender, "custom:" + me], [reactionChannel, other, "custom:" + me],
        ]);
        assert.equal(send("+++👍"), "sent normally");
        assert.equal(send("+not an emoji"), "sent normally");
        assert.equal(send("+:unknown:"), "sent normally");
        assert.equal(send("+👍", { attachmentsToUpload: ["file"] }), "sent normally");
        assert.equal(send("+👍", { replyOptions: { messageReference: sender } }), "sent normally");
        assert.equal(send("+👍", { scheduledTimestamp: Date.now() }), "sent normally");
        reactionCache.hasMoreAfter = true;
        assert.equal(send("+👍"), "sent normally");
        reactionCache.hasMoreAfter = false;
        rejectReaction = true;
        assert.equal(await send("+👍"), undefined);
        assert.match(notifications.pop(), /Couldn.t react/);
        if (!desktop) {
            settings.safeMode = { enabled: true };
            assert.equal(send("+👍"), "sent normally");
            settings.safeMode = undefined;
        }
        click(render(), "Disable BetterPlusReacts");
        assert.equal(commandApi.sendMessage, sendBeforeReactions);
        assert.equal(send("+👍"), "sent normally");
        assert.equal(reactionCalls.length, 4);

        const silent = cxCatalog.plugins.find(entry => entry.name === "SilentTyping").source;
        assert.throws(() => activateCx(silent, host, []), /approval/);
        assert.throws(() => parseCx(silent.replace("use silent-typing", "use token")), /Unknown or duplicate client effect/);
        const flatLayout = desktop ? module.exports.default.useFlatAttachmentLayout
            : () => messageRenderer.default().useAttachmentGridLayout === false;
        const desktopLayout = desktop ? (() => {
            const patches = module.exports.default.patches.flatMap(patch => patch.replacement)
                .filter(({ replace }) => typeof replace === "string" && replace.includes("useFlatAttachmentLayout"));
            const examples = [
                'function isVisual(kind) { return "IMAGE"===kind||"VIDEO"===kind||"CLIP"===kind; }',
                'function layout(item) { return{visualMediaItems:[],props:item,key:item.item.uniqueId}; }',
                'function carousel(a) { sink({url:a.url});return true; }',
            ];
            assert.equal(patches.length, examples.length);
            return examples.map((fixture, index) => {
                const { match, replace } = patches[index];
                const regex = new RegExp(match.source.replaceAll("\\i", "[a-zA-Z_$][\\w$]*"), match.flags);
                const patched = fixture.replace(regex, replace.replaceAll("$self", "extension"));
                assert.notEqual(patched, fixture);
                return vm.runInNewContext("(" + patched + ")", { extension: module.exports.default, sink() {} });
            });
        })() : [];
        function checkDesktopLayout(flat) {
            if (!desktop) return;
            const [isVisual, layout, carousel] = desktopLayout;
            assert.equal(isVisual("IMAGE"), !flat);
            assert.equal(isVisual("FILE"), false);
            assert.equal(Object.hasOwn(layout({ item: { type: "IMAGE", uniqueId: "one" } }), "useFullWidth"), flat);
            assert.equal(Object.hasOwn(layout({ item: { type: "FILE", uniqueId: "one" } }), "useFullWidth"), false);
            assert.equal(carousel({ content_type: "video/mp4" }), !flat);
            assert.equal(carousel({ content_type: "image/png" }), true);
        }
        assert.equal(flatLayout(), false);
        checkDesktopLayout(false);
        selectCatalog("NoMosaic");
        click(render(), "Allow for this session");
        assert.equal(flatLayout(), true);
        checkDesktopLayout(true);
        if (!desktop) {
            assert.equal(messageRenderer.default().content, messagePresentation.content);
            const alreadyFlat = Object.freeze({ ...messagePresentation, useAttachmentGridLayout: false });
            assert.equal(messageRenderer.default(alreadyFlat), alreadyFlat);
            settings.safeMode = { enabled: true };
            assert.equal(flatLayout(), false);
            settings.safeMode = undefined;
        }
        click(render(), "Disable NoMosaic");
        assert.equal(flatLayout(), false);
        checkDesktopLayout(false);
        const attachment = "https://media.discordapp.net/attachments/1/2/image.png?ex=12&hm=abc%2Bdef&width=200&height=100&format=webp";
        const originalImage = "https://cdn.discordapp.com/attachments/1/2/image.png?ex=12&hm=abc%2Bdef";
        const rows = Object.freeze([Object.freeze({ url: attachment, width: 4000, height: 2000 }),
            Object.freeze({ url: attachment, width: 100, height: 100, obscure: true })]);
        const inline = Object.freeze({ attachments: rows, shouldInlineAttachmentMedia: true });
        const viewer = Object.freeze({ sources: Object.freeze([{ uri: attachment }, { uri: attachment, spoiler: true }]), initialIndex: 1 });
        const readImage = (modal = false, src = attachment, frozen) => desktop
            ? desktopPlugin.getAttachmentImageSrc({ src, width: 4000, height: 2000, trigger: modal ? "media" : undefined }, frozen)
            : modal ? viewerSources.setMediaViewerSources(viewer).sources[0].uri : attachmentRows.default(inline)[0].url;
        selectCatalog("FixImagesQuality");
        click(render(), "Allow for this session");
        assert.equal(readImage(true), originalImage);
        const attachmentPreview = new URL(readImage());
        assert.equal(attachmentPreview.hostname, "media.discordapp.net");
        assert.equal(attachmentPreview.searchParams.get("hm"), "abc+def");
        const width = Number(attachmentPreview.searchParams.get("width")), height = Number(attachmentPreview.searchParams.get("height"));
        assert.ok(width > 200 && width * height <= 2_400_000);
        if (desktop) {
            assert.equal(readImage(false, "https://example.com/attachments/1/2/image.png"), undefined);
            const gif = new URL(readImage(false, attachment.replace("image.png", "image.gif"), true));
            assert.equal(gif.searchParams.get("animated"), "false");
            assert.equal(gif.searchParams.get("format"), "webp");
        } else {
            assert.equal(viewerSources.setMediaViewerSources(viewer).sources[1], viewer.sources[1]);
            assert.equal(viewerSources.setMediaViewerSources(viewer).initialIndex, 1);
            assert.equal(attachmentRows.default(inline)[1], rows[1]);
            assert.equal(attachmentRows.default({ ...inline, shouldInlineAttachmentMedia: false }), rows);
            settings.safeMode = { enabled: true };
            assert.equal(attachmentRows.default(inline), rows);
            assert.equal(viewerSources.setMediaViewerSources(viewer), viewer);
            settings.safeMode = undefined;
        }
        click(render(), "Disable FixImagesQuality");
        assert.equal(readImage(), desktop ? undefined : attachment);
        const sourceField = find(render(), element => element.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
        const fullResSource = read("examples/cx/catalog/plugins/fix-images-quality.cx").replace("use attachment-image-quality", "use original-attachment-images");
        if (desktop) sourceField.props.onChange({ currentTarget: { value: fullResSource } });
        else sourceField.props.onChangeText(fullResSource);
        click(render(), "Review CX");
        click(render(), "Allow for this session");
        assert.equal(readImage(), originalImage);
        click(render(), "Disable FixImagesQuality");
        const descriptiveGif = "https://media.discordapp.net/attachments/1/2/cat%20dance-23.gif?ex=12&hm=abc";
        const gifLabel = "GIF - cat dance";
        selectCatalog("ImageFilename");
        click(render(), "Allow for this session");
        selectCatalog("BetterGifAltText");
        click(render(), "Allow for this session");
        if (desktop) {
            assert.equal(desktopPlugin.getMediaTitle(attachment).title, "image.png");
            const tenor = "https://media.tenor.com/hash/cat.gif?width=32";
            assert.equal(desktopPlugin.getMediaTitle(tenor).title, tenor);
            assert.equal(desktopPlugin.getMediaTitle("https://tenor.com.example/video"), undefined);
            assert.equal(desktopPlugin.getMediaGifAlt({ src: descriptiveGif, alt: "GIF" }, () => "GIF"), gifLabel);
            assert.equal(desktopPlugin.getMediaGifAlt({ src: descriptiveGif, alt: "User description" }, () => "GIF"), "User description");
            const mutableGif = { src: descriptiveGif };
            desktopPlugin.updateGifAlt(mutableGif);
            assert.equal(mutableGif.alt, gifLabel);
        } else {
            const mediaOptions = { source: { uri: attachment }, shareable: true };
            const filenameAction = mediaShare.useMediaShareActions(mediaOptions).find(item => item.label === "Image Filename (CX)");
            assert.equal(mediaAlerts.length, 0);
            filenameAction.action();
            assert.deepEqual(mediaAlerts, [["Image Filename (CX)", "image.png"]]);
            const authored = Object.freeze({ url: descriptiveGif, alt: "Hand-written alt text" });
            const gifRows = Object.freeze([Object.freeze({ url: descriptiveGif, alt: "GIF" }), authored]);
            const gifInline = { ...inline, attachments: gifRows };
            assert.equal(attachmentRows.default(gifInline)[0].alt, gifLabel);
            assert.equal(attachmentRows.default(gifInline)[1], authored);
            const gifViewer = { ...viewer, sources: [{ uri: descriptiveGif }, { uri: descriptiveGif, spoiler: true }] };
            assert.equal(viewerSources.setMediaViewerSources(gifViewer).sources[0].description, gifLabel);
            assert.equal(viewerSources.setMediaViewerSources(gifViewer).sources[1], gifViewer.sources[1]);
            const pickerProps = { item: { src: descriptiveGif } };
            assert.equal(gifPicker.default(pickerProps).props.accessibilityLabel, "GIF 3. " + gifLabel);
            click(render(), "Disable ImageFilename");
            filenameAction.action();
            assert.equal(mediaAlerts.length, 1);
            assert.equal(mediaShare.useMediaShareActions(mediaOptions), nativeMediaActions);
        }
        if (desktop) click(render(), "Disable ImageFilename");
        click(render(), "Disable BetterGifAltText");
        if (desktop) {
            assert.equal(desktopPlugin.getMediaTitle(attachment), undefined);
            assert.equal(desktopPlugin.getMediaGifAlt({ src: descriptiveGif, alt: "" }, () => "GIF"), "");
        } else {
            assert.equal(gifPicker.default({ item: { src: descriptiveGif } }).props.accessibilityLabel, "GIF 3");
        }
        const imageMessage = Object.freeze({ content: descriptiveGif });
        const nativeMarkup = markupParser.parseMessageMarkup(imageMessage, undefined, true);
        selectCatalog("ImageLink");
        click(render(), "Allow for this session");
        if (desktop) {
            const patch = desktopPlugin.patches.find(patch => patch.find === "unknownUserMentionPlaceholder:");
            const condition = "simple.has(embed.type)&&(0,utils.isInline)(embed)";
            const match = new RegExp(patch.replacement.match.source.replaceAll("\\i", "[a-zA-Z_$][\\w$]*"));
            const patched = condition.replace(match, patch.replacement.replace.replace("$self", "plugin"));
            assert.notEqual(patched, condition);
            const hide = new Function("plugin", "simple", "embed", "utils", "return " + patched);
            assert.equal(hide(desktopPlugin, new Set(["gif"]), { type: "gif" }, { isInline: () => true }), false);
            click(render(), "Disable ImageLink");
            assert.equal(hide(desktopPlugin, new Set(["gif"]), { type: "gif" }, { isInline: () => true }), true);
        } else {
            const visibleMarkup = markupParser.parseMessageMarkup(imageMessage, undefined, true);
            assert.equal(visibleMarkup.text, descriptiveGif);
            assert.notEqual(visibleMarkup.message, imageMessage);
            assert.equal(markupParser.parseMessageMarkup(imageMessage, undefined, true), visibleMarkup);
            const forwarded = Object.freeze({ content: "" });
            assert.equal(markupParser.parseMessageMarkup(forwarded, imageMessage, true, true).text, descriptiveGif);
            const textOnly = Object.freeze({ content: "ordinary message" });
            assert.equal(markupParser.parseMessageMarkup(textOnly, undefined, true).message, textOnly);
            click(render(), "Disable ImageLink");
            assert.equal(markupParser.parseMessageMarkup(imageMessage, undefined, true), nativeMarkup);
        }
        const splitDraft = "a".repeat(1999) + "🙂" + "b".repeat(20);
        const plannedParts = moduleBox.exports.planCxMessageParts(splitDraft);
        assert.equal(plannedParts[0].length, 1999);
        assert.equal(plannedParts[1].slice(0, 2), "🙂");
        assert.equal(plannedParts.join(""), splitDraft);
        assert.equal(moduleBox.exports.planCxMessageParts(splitDraft, 2), undefined);
        assert.equal(moduleBox.exports.planCxMessageParts("x".repeat(16_001)), undefined);
        const originalSender = commandApi.sendMessage;
        const originalValidator = splitComposer.chatInputValidateContentLength;
        const sentParts = [];
        commandApi.sendMessage = (...args) => { sentParts.push(args); return Promise.resolve("first result"); };
        selectCatalog("SplitLargeMessages");
        click(render(), "Allow for this session");
        if (desktop) assert.equal(module.exports.default.canSplitDraft(splitDraft), true);
        else {
            const validate = (id, hasAttachmentsToUpload) => splitComposer.chatInputValidateContentLength({
                text: splitDraft, params: { channel: { id }, hasAttachmentsToUpload },
            });
            assert.equal(validate("test-channel").content, splitDraft);
            assert.equal(validate("slow-channel"), undefined);
            assert.equal(validate("test-channel", true), undefined);
            assert.equal(splitLimit.getMaxMessageLength(), 2000);
        }
        const originalReply = { messageReference: { messageId: "reply" }, flags: 4096 };
        assert.equal(await commandApi.sendMessage("test-channel", { content: splitDraft }, true, originalReply), "first result");
        assert.deepEqual(sentParts.map(args => args[1].content), Array.from(plannedParts));
        assert.equal(sentParts[0][3], originalReply);
        assert.equal(sentParts[1][3].messageReference, undefined);
        assert.equal(sentParts[1][3].flags, 4096);
        sentParts.length = 0;
        await commandApi.sendMessage("slow-channel", { content: splitDraft });
        assert.equal(sentParts.length, 1);
        assert.equal(sentParts[0][1].content, splitDraft);
        click(render(), "Disable SplitLargeMessages");
        assert.equal(splitComposer.chatInputValidateContentLength, originalValidator);
        if (desktop) assert.equal(module.exports.default.canSplitDraft(splitDraft), false);
        commandApi.sendMessage = originalSender;

        const emojiSearch = stores.EmojiStore.searchWithoutFetchingLatest;
        const emojiOrder = stores.EmojiStore.getSearchResultsOrder;
        const searchOptions = Object.freeze({ query: "cat", intention: 3, count: 1, channel: { guild_id: guildId } });
        const searchNames = options => Array.from(stores.EmojiStore.searchWithoutFetchingLatest(options).unlocked, emoji => emoji.name);
        const ordinaryResults = searchNames(searchOptions);
        assert.deepEqual(ordinaryResults, [customEmoji.name]);
        selectCatalog("NoServerEmojis");
        click(render(), "Allow for this session");
        assert.deepEqual(searchNames(searchOptions), ["cat"]);
        assert.equal(stores.EmojiStore.searchWithoutFetchingLatest(searchOptions).locked.length, 0);
        assert.deepEqual(searchNames({ ...searchOptions, intention: 0 }), ordinaryResults);
        assert.equal(searchNames({ ...searchOptions, count: 0 }).length, 2);
        if (!desktop) {
            settings.safeMode = { enabled: true };
            assert.deepEqual(searchNames(searchOptions), ordinaryResults);
            settings.safeMode = undefined;
        }
        click(render(), "Disable NoServerEmojis");
        assert.equal(stores.EmojiStore.searchWithoutFetchingLatest, emojiSearch);
        assert.equal(stores.EmojiStore.getSearchResultsOrder, emojiOrder);
        const stopLocalEmoji = moduleBox.exports.filterCxEmojiAutocomplete(stores.EmojiStore, "local");
        assert.deepEqual(searchNames(searchOptions), ordinaryResults);
        assert.deepEqual(searchNames({ ...searchOptions, channel: {} }), ["cat"]);
        assert.equal(stores.EmojiStore.searchWithoutFetchingLatest(searchOptions).locked.length, 0);
        stopLocalEmoji();
        selectCatalog("HideDisabledEmojis");
        click(render(), "Allow for this session");
        if (desktop) {
            const [[matchesPicker, onPickerLoaded]] = emojiPickerWaiters;
            assert.equal(matchesPicker(desktopEmojiPicker), true);
            emojiPickerWaiters.delete(matchesPicker);
            onPickerLoaded(desktopEmojiPicker);
            const input = jsx("Grid", {
                emojiGrid: Object.freeze([Object.freeze([{ id: "a" }, { id: "b", isDisabled: true }]),
                    Object.freeze([{ id: "c", isDisabled: true }]), Object.freeze([{ id: "d" }])]),
                rowCountBySection: Object.freeze([1, 1, 1]),
                sectionDescriptors: Object.freeze([{ count: 2 }, { count: 1 }, { count: 1 }]),
            });
            const pickerTree = jsx("Picker", { children: input });
            const rendered = desktopEmojiPicker.type.render(pickerTree).props.children.props;
            assert.deepEqual(Array.from(rendered.rowCountBySection), [1, 1]);
            assert.deepEqual(Array.from(rendered.sectionDescriptors, section => section.count), [1, 1]);
            assert.deepEqual(Array.from(rendered.emojiGrid, row => row[0].id), ["a", "d"]);
            assert.equal(input.props.emojiGrid[0].length, 2);
            click(render(), "Disable HideDisabledEmojis");
            assert.equal(desktopEmojiPicker.type.render(pickerTree), pickerTree);
            selectCatalog("HideDisabledEmojis");
            click(render(), "Allow for this session");
            assert.equal(emojiPickerWaiters.size, 1);
            click(render(), "Disable HideDisabledEmojis");
            assert.equal(emojiPickerWaiters.size, 0);
        } else {
            const pickerFunctions = mobileEmojiPicker.default();
            assert.equal(mobileEmojiPicker.default(), pickerFunctions);
            const unavailable = { id: "locked" }, available = { id: "available" };
            const categories = Object.freeze([Object.freeze({ emojis: [unavailable, available], emojisDisabled: new Set(["locked"]) }),
                Object.freeze({ isNitroLocked: true }), Object.freeze({ name: "Unicode" })]);
            const filteredCategories = pickerFunctions.computeCategories({ categories }).categories;
            assert.equal(filteredCategories.length, 2);
            assert.deepEqual(Array.from(filteredCategories[0].emojis), [available]);
            assert.equal(categories[0].emojis.length, 2);
            const input = { emojis: { locked: [unavailable], unlocked: [available] } };
            assert.equal(pickerFunctions.computeSearchResults(input).emojis.locked.length, 0);
            assert.equal(pickerFunctions.computeSearchResults(input).emojis.unlocked, input.emojis.unlocked);
            settings.safeMode = { enabled: true };
            assert.equal(pickerFunctions.computeSearchResults(input), input);
            settings.safeMode = undefined;
            click(render(), "Disable HideDisabledEmojis");
            assert.equal(pickerFunctions.computeSearchResults(input), input);
            assert.equal(mobileEmojiPicker.default(), nativeEmojiFunctions);
        }
        for (const [name, target] of [["CopyEmojiMarkdown", "MessageEmojiActionSheet"], ["CopyStickerLinks", "StickerDetailActionSheet"]]) {
            const isEmoji = name === "CopyEmojiMarkdown";
            const url = "https://media.discordapp.net/stickers/" + sender + ".gif?size=512&lossless=true";
            const expected = isEmoji ? "<a:wave:" + sender + ">" : url;
            selectCatalog(name);
            click(render(), "Allow for this session");
            const copies = clipboardWrites.length, opens = openedLinks.length;
            let actions;
            if (desktop) {
                actions = [];
                const props = isEmoji
                    ? { target: { dataset: { type: "emoji", name: "wave~2", id: sender }, firstChild: { src: "https://cdn.discordapp.com/emojis/1.gif" } } }
                    : { favoriteableType: "sticker", favoriteableId: sender, message: { stickerItems: [{ id: sender, format_type: 4 }] } };
                for (const patch of menuPatches) patch(actions, props);
            } else {
                const sheet = expressionSheets[target];
                const initial = jsx(sheet, isEmoji ? { emojiNode: { alt: ":wave:", id: sender, src: "https://cdn.discordapp.com/emojis/1.gif" } }
                    : { renderableSticker: { id: sender, formatType: 4 } });
                const scope = appearanceHooks.get(sheet)(null, initial);
                const provider = scope.type(scope.props);
                assert.equal(provider.props.value.value, expected);
                expressionSelection = provider.props.value;
                const wrapper = appearanceHooks.get(expressionSheets.BottomSheet)(null, jsx(expressionSheets.BottomSheet, { children: "original content" }));
                const component = wrapper.type(wrapper.props);
                actions = component.type(component.props);
                expressionSelection = undefined;
            }
            assert.equal(clipboardWrites.length, copies);
            assert.equal(openedLinks.length, opens);
            const copyItem = find(actions, element => element.props.label === (isEmoji ? "Copy Emoji Markdown" : "Copy Sticker Link"));
            (copyItem.props.action ?? copyItem.props.onPress)();
            assert.equal(clipboardWrites.at(-1), expected);
            if (!isEmoji) {
                const openItem = find(actions, element => element.props.label === "Open Sticker Link");
                (openItem.props.action ?? openItem.props.onPress)();
                assert.equal(openedLinks.at(-1), url);
            }
            click(render(), "Disable " + name);
            (copyItem.props.action ?? copyItem.props.onPress)();
            assert.equal(clipboardWrites.length, copies + 1);
        }
        if (!desktop) {
            for (const name of ["CopyEmojiMarkdown", "CopyStickerLinks"]) {
                selectCatalog(name);
                click(render(), "Allow for this session");
            }
            const sheetHook = appearanceHooks.get(expressionSheets.BottomSheet);
            assert.equal(typeof sheetHook, "function");
            click(render(), "Disable CopyEmojiMarkdown");
            assert.equal(appearanceHooks.get(expressionSheets.BottomSheet), sheetHook);
            assert.equal(appearanceHooks.has(expressionSheets.MessageEmojiActionSheet), false);
            assert.equal(appearanceHooks.has(expressionSheets.StickerDetailActionSheet), true);
            click(render(), "Disable CopyStickerLinks");
            assert.equal(appearanceHooks.has(expressionSheets.BottomSheet), false);
        }
        const signedMedia = "https://cdn.discordapp.com/attachments/1/2/pic.png?ex=123&hm=abc";
        const plainLink = "https://example.com/path?a=b#part";
        const beforeMediaCopy = clipboardWrites.length;
        selectCatalog("CopyMediaLink");
        click(render(), "Allow for this session");
        let copyMedia, copyLink;
        if (desktop) {
            const patch = [...menuPatches][0];
            const actions = [jsx("MenuItem", { id: "copy-native-link" })];
            patch(actions, { src: signedMedia });
            patch(actions, { src: signedMedia });
            assert.equal(actions.length, 2);
            copyMedia = actions[1].props.action;
            const links = [];
            patch(links, { href: "https://user:pass@example.com/" });
            assert.equal(links.length, 0);
            patch(links, { itemHref: plainLink });
            copyLink = links[0].props.action;
        } else {
            const options = { source: { shareURI: signedMedia }, shareable: true };
            const actions = mediaShare.useMediaShareActions(options);
            assert.equal(actions[0], nativeMediaActions[0]);
            assert.equal(nativeMediaActions.length, 1);
            assert.equal(mediaShare.useMediaShareActions({ ...options, shareable: false }), nativeMediaActions);
            assert.equal(mediaShare.useMediaShareActions({ ...options, source: { ...options.source, obscure: true } }), nativeMediaActions);
            copyMedia = actions[1].action;
            const sheet = { key: "LongPressUrl", header: { subtitle: plainLink }, options: [] };
            copyLink = linkSheet.showSimpleActionSheet(sheet).options[0].onPress;
            assert.equal(sheet.options.length, 0);
            const unrelated = { ...sheet, key: "Unrelated" };
            assert.equal(linkSheet.showSimpleActionSheet(unrelated), unrelated);
            settings.safeMode = { enabled: true };
            copyMedia();
            copyLink();
            settings.safeMode = undefined;
        }
        assert.equal(clipboardWrites.length, beforeMediaCopy);
        copyMedia();
        copyLink();
        assert.deepEqual(clipboardWrites.slice(beforeMediaCopy), [signedMedia, plainLink]);
        click(render(), "Disable CopyMediaLink");
        copyMedia();
        copyLink();
        assert.equal(clipboardWrites.length, beforeMediaCopy + 2);
        const reverseSearch = cxCatalog.plugins.find(entry => entry.name === "ReverseImageSearch").source;
        assert.throws(() => activateCx(reverseSearch, host, ["media.clipboard"]), /approval/);
        selectCatalog("ReverseImageSearch");
        click(render(), "Allow for this session");
        const imageSearch = "https://cdn.discordapp.com/photo.png?a=2&b=3";
        const searchStart = openedLinks.length;
        let chooseSearch;
        if (desktop) {
            const patch = [...menuPatches][0];
            const items = [];
            patch(items, { itemSrc: imageSearch, cxImageSearchType: "video" });
            patch(items, { src: "file:///secret.png" });
            assert.equal(items.length, 0);
            patch(items, { itemSrc: imageSearch, cxImageSearchType: "img" });
            const options = items[0].props.children.flat();
            assert.equal(options.length, 8);
            chooseSearch = options.find(item => item.props.label === "Google").props.action;
        } else {
            const media = { source: { sourceURI: imageSearch }, shareable: true };
            const actions = mediaShare.useMediaShareActions(media);
            assert.equal(actions[0], nativeMediaActions[0]);
            assert.equal(mediaShare.useMediaShareActions({ ...media, shareable: false }), nativeMediaActions);
            assert.equal(mediaShare.useMediaShareActions({ ...media, source: { ...media.source, obscure: true } }), nativeMediaActions);
            assert.equal(mediaShare.useMediaShareActions({ ...media, source: { ...media.source, videoURI: "https://example.org/video.mp4" } }), nativeMediaActions);
            assert.equal(mediaShare.useMediaShareActions({ ...media, source: { sourceURI: "https://example.org/video?preview=a.png" } }), nativeMediaActions);
            const showSearch = actions.find(action => action.label === "Search Image (CX)").action;
            settings.safeMode = { enabled: true };
            showSearch();
            assert.equal(imageSearchSheet, undefined);
            settings.safeMode = undefined;
            showSearch();
            assert.equal(imageSearchSheet.options.length, 7);
            chooseSearch = imageSearchSheet.options.find(option => option.label === "Google").onPress;
        }
        assert.equal(openedLinks.length, searchStart);
        chooseSearch();
        assert.equal(openedLinks.at(-1), "https://lens.google.com/uploadbyurl?url=" + encodeURIComponent(imageSearch));
        click(render(), "Disable ReverseImageSearch");
        chooseSearch();
        assert.equal(openedLinks.length, searchStart + 1);

        const priorChannel = selectedChannel;
        const priorLastMessage = stores.ReadStateStore.lastMessageId;
        const beforeScroll = acknowledged.length;
        stores.ReadStateStore.lastMessageId = () => guildId;
        selectCatalog("ScrollToLatest");
        click(render(), "Allow for this session");
        const select = (channelId, messageId) => {
            selectedChannel = channelId;
            for (const listener of channelSelections) listener({ channelId, messageId });
        };
        const afterSelection = () => new Promise(resolve => setTimeout(resolve, 5));
        select(sender);
        select(other);
        select(other);
        await afterSelection();
        assert.deepEqual(JSON.parse(JSON.stringify(acknowledged.slice(beforeScroll))), [
            { type: "BULK_ACK", context: "APP", channels: [{ channelId: other, messageId: guildId, readStateType: 0 }] },
            { type: "CHANNEL_LOCAL_ACK", channelId: other },
        ]);
        assert.deepEqual(JSON.parse(JSON.stringify(jumps)), [{ channelId: other, messageId: guildId, flash: false }]);
        select(sender, guildId);
        await afterSelection();
        assert.equal(acknowledged.length, beforeScroll + 2);
        select(sender);
        click(render(), "Disable ScrollToLatest");
        await afterSelection();
        assert.equal(jumps.length, 1);
        assert.equal(acknowledged.length, beforeScroll + 2);
        assert.equal(channelSelections.size, 0);
        acknowledged.splice(beforeScroll);
        stores.ReadStateStore.lastMessageId = priorLastMessage;
        selectedChannel = priorChannel;
        const stopAutoUnread = cxCatalog.plugins.find(entry => entry.name === "StopAutoUnread").source;
        assert.throws(() => activateCx(stopAutoUnread, host, ["appearance.hide"]), /approval/);
        for (const name of ["SilentTyping", "NoPendingCount", "AlwaysAnimate", "DontRoundMyTimestamps", "StopAutoUnread"]) {
            selectCatalog(name);
            click(render(), "Allow for this session");
        }
        typing.startTyping();
        typing.stopTyping();
        assert.equal(typingStarts, 0);
        assert.equal(typingStops, 1);
        assert.equal(stores.RelationshipStore.getPendingCount(), 0);
        assert.equal(stores.RelationshipStore.getPendingIncomingCount(), 0);
        const iconOptions = Object.freeze({ canAnimate: false });
        assert.equal(icons.getGuildIconURL(iconOptions), true);
        assert.equal(iconOptions.canAnimate, false);
        assert.equal(rounding(7.6), 7);
        assert.equal(stores.UnreadSettingNoticeStore2.maybeAutoUpgradeChannel("first"), false);
        assert.equal(autoUpgrades, 0);
        if (!desktop) {
            settings.safeMode = { enabled: true };
            typing.startTyping();
            assert.equal(typingStarts, 1);
            assert.equal(stores.RelationshipStore.getPendingCount(), 3);
            assert.equal(icons.getGuildIconURL(iconOptions), false);
            assert.equal(rounding(7.6), 8);
            assert.equal(stores.UnreadSettingNoticeStore2.maybeAutoUpgradeChannel("first"), "first");
            assert.equal(autoUpgrades, 1);
            settings.safeMode.enabled = false;
        }
        click(render(), "Disable SilentTyping");
        click(render(), "Disable NoPendingCount");
        click(render(), "Disable AlwaysAnimate");
        click(render(), "Disable DontRoundMyTimestamps");
        click(render(), "Disable StopAutoUnread");
        assert.equal(stores.UnreadSettingNoticeStore2.maybeAutoUpgradeChannel, upgradeChannel);
        assert.equal(rounding, Math.ceil);
        const highRes = cxCatalog.plugins.find(entry => entry.name === "High-Res Profile Images").source;
        const originalAvatarGetter = icons.getUserAvatarURL;
        assert.throws(() => parseCx(highRes.replace("256", "255")), /avatar size/);
        assert.throws(() => activateCx(highRes, host, []), /approval/);
        selectCatalog("High-Res Profile Images");
        const avatarSource = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
        const configuredAvatar = avatarSource.props.value.replace("avatar-resolution 256", "avatar-resolution 2048");
        if (desktop) avatarSource.props.onChange({ currentTarget: { value: configuredAvatar } });
        else avatarSource.props.onChangeText(configuredAvatar);
        click(render(), "Review CX");
        click(render(), "Allow for this session");
        assert.match(icons.getUserAvatarURL({ id: sender }, true, 1024), /\?size=2048$/);
        assert.match(icons.getUserAvatarURL({ id: other }, true, 1024), /^https:\/\/evil\.example\//);
        assert.equal(icons.getUserAvatarURL({ id: me }, true, 1024), "//cdn.discordapp.com/embed/avatars/0.png");
        if (!desktop) {
            settings.safeMode.enabled = true;
            assert.match(icons.getUserAvatarURL({ id: sender }, true, 1024), /\?size=1024$/);
            settings.safeMode.enabled = false;
        }
        selectCatalog("AlwaysAnimate");
        click(render(), "Allow for this session");
        click(render(), "Disable High-Res Profile Images");
        assert.match(icons.getUserAvatarURL({ id: sender }, true, 1024), /\?size=1024$/);
        click(render(), "Disable AlwaysAnimate");
        assert.equal(icons.getUserAvatarURL, originalAvatarGetter);
        assert.equal(typing.startTyping, startTyping);
        assert.equal(stores.RelationshipStore.getPendingCount(), 3);
        assert.equal(icons.getGuildIconURL(iconOptions), false);

        const embedded = cxCatalog.plugins.find(entry => entry.name === "EmbeddedURLs").source;
        assert.throws(() => parseCx(embedded.replace(/^  needs messages\.redirectlinks\r?\n/m, "")), /permissions/);
        assert.throws(() => parseCx(embedded.replace('"https://x.com"', '"https://x.com/path"')), /bare HTTPS domain/);
        assert.ok(moduleBox.exports.reviewCx(embedded).effects.includes("https://x.com → https://www.fxtwitter.com"));
        selectCatalog("EmbeddedURLs");
        click(render(), "Allow for this session");
        const redirect = [...transformHooks][0];
        const redirectDraft = content => {
            const message = { content };
            if (desktop) redirect("test-channel", message);
            else redirect(message);
            return message.content;
        };
        assert.equal(redirectDraft("https://x.com/user/status/1?lang=en#anchor"), "https://www.fxtwitter.com/user/status/1?lang=en");
        assert.equal(redirectDraft("https://x.com.evil.example/user"), "https://x.com.evil.example/user");
        assert.equal(redirectDraft("look https://x.com/user"), "look https://x.com/user");
        click(render(), "Disable EmbeddedURLs");

        const converter = cxCatalog.plugins.find(entry => entry.name === "LinkConverter").source;
        assert.throws(() => parseCx(converter.replace(/^  needs profile\.redirectlinks\r?\n/m, "")), /permissions/);
        assert.throws(() => parseCx(converter.replace("before profile rewrite-link", "before profile replace")), /profile bios/);
        selectCatalog("LinkConverter");
        click(render(), "Allow for this session");
        const convertLinks = [...transformHooks][0];
        const originalLinks = "See (https://x.com/test?x=1#note) and <http://old.reddit.com/r/example>.";
        const convertedLinks = "See (https://fxtwitter.com/test?x=1#note) and <https://rxddit.com/r/example>.";
        const linkDraft = { content: originalLinks };
        if (desktop) convertLinks("test-channel", linkDraft);
        else convertLinks(linkDraft);
        assert.equal(linkDraft.content, convertedLinks);
        const unsafeLinks = { content: "https://x.com.evil.example https://x.com.@evil.example https://x.com!@evil.example https://x.com:8443/ https://x.com%2fevil.example" };
        const unchanged = unsafeLinks.content;
        if (desktop) convertLinks("test-channel", unsafeLinks);
        else convertLinks(unsafeLinks);
        assert.equal(unsafeLinks.content, unchanged);
        if (desktop) {
            const patch = desktopPlugin.patches.find(patch => patch.find === "disableInteractions:");
            const fixture = "let{userBio:a,disableInteractions:b}=props;return a;";
            const match = new RegExp(patch.replacement.match.source.replaceAll("\\i", "[a-zA-Z_$][\\w$]*"));
            const code = fixture.replace(match, patch.replacement.replace.replace("$self", "plugin"));
            const readBio = new Function("plugin", "props", code);
            const props = Object.freeze({ userBio: originalLinks, disableInteractions: false });
            assert.equal(readBio(desktopPlugin, props), convertedLinks);
            assert.equal(props.userBio, originalLinks);
            click(render(), "Disable LinkConverter");
            assert.equal(readBio(desktopPlugin, props), originalLinks);
        } else {
            const props = Object.freeze({ displayProfile: { getPreviewBio: pending => pending ?? originalLinks } });
            const card = jsx(AboutMeCard, props);
            const wrapped = appearanceHooks.get(AboutMeCard)(null, card);
            assert.equal(wrapped.type(wrapped.props).props.pendingBio, convertedLinks);
            assert.equal(card.props.pendingBio, undefined);
            click(render(), "Disable LinkConverter");
            assert.equal(wrapped.type(wrapped.props), card);
        }

        selectCatalog("FixCodeblockGap");
        click(render(), "Allow for this session");
        if (desktop) {
            const { find: codeBlockSource, replacement } = desktopPlugin.patches.find(patch =>
                typeof patch.replacement.replace === "string" && patch.replacement.replace.includes("codeBlockMatcher"));
            const original = new RegExp(codeBlockSource, "i");
            const fixture = "source => " + String(original) + ".exec(source)";
            const code = fixture.replace(replacement.match, replacement.replace.replace("$self", "plugin"));
            assert.notEqual(code, fixture);
            const match = new Function("plugin", "return " + code)(desktopPlugin);
            const fence = String.fromCharCode(96).repeat(3);
            const block = fence + "ts\nconst x = 1;\n" + fence;
            const source = block + "\n\nMore text";
            assert.equal(match(source)[0], block + "\n");
            assert.equal(match(source)[1], "ts");
            assert.equal(match(source)[2], "const x = 1;");
            assert.equal(match("ordinary text"), null);
            click(render(), "Disable FixCodeblockGap");
            assert.equal(match(source)[0], block);
        } else {
            const code = Object.freeze({ type: "codeBlock", content: "const x = 1;" });
            const text = Object.freeze({ type: "text", content: "\n\nMore text" });
            const newline = Object.freeze({ type: "newline", content: "\n" });
            const ast = Object.freeze([newline, code, text, code, newline, newline]);
            const message = { ast };
            const compact = markupParser.parseMessageMarkup(message, undefined, false);
            assert.deepEqual(Array.from(compact.content, node => node.content), ["\n", code.content, "\nMore text", code.content, "\n"]);
            assert.equal(compact.content[1], code);
            assert.equal(markupParser.parseMessageMarkup(message, undefined, false), compact);
            assert.equal(markupParser.parseMessageMarkup(message, undefined, false, true).content, ast);
            assert.equal(markupParser.parseMessageMarkup({ ast: [newline, text] }, undefined, false).content[1], text);
            const quoted = { type: "blockQuote", content: Object.freeze([code, newline, text]) };
            const quote = markupParser.parseMessageMarkup({ ast: [quoted] }, undefined, false).content[0];
            assert.deepEqual(Array.from(quote.content), [code, text]);
            assert.equal(quoted.content.length, 3);
            click(render(), "Disable FixCodeblockGap");
            assert.equal(markupParser.parseMessageMarkup(message, undefined, false).content, ast);
        }

        selectCatalog("OpenSteamLinksInApp");
        click(render(), "Allow for this session");
        const steamLink = "https://store.steampowered.com/app/440/";
        const beforeSteam = openedLinks.length;
        if (desktop) {
            const onClick = documentListeners.get("click");
            const steamClick = (href, text = href, eventProps = {}) => {
                const target = new GestureElement(me);
                target.closest = () => ({ getAttribute: () => href, textContent: text, closest: () => ({}) });
                const event = { target, button: 0, isTrusted: true, preventDefault() { this.defaultPrevented = true; },
                    stopPropagation() { this.propagationStopped = true; }, ...eventProps };
                onClick(event);
                return event;
            };
            assert.equal(steamClick(steamLink, "Click here").defaultPrevented, undefined);
            assert.equal(steamClick(steamLink, steamLink, { ctrlKey: true }).defaultPrevented, undefined);
            assert.equal(steamClick(steamLink, steamLink, { isTrusted: false }).defaultPrevented, undefined);
            for (const invalid of ["steam://run/440", "https://steamcommunity.com.evil.test/", "https://steamcommunity.com/linkfilter/?url=https://evil.test",
                "https://store.steampowered.com/app/%2e%2e/steamlink", "https://s.team/anything"]) {
                assert.equal(steamClick(invalid).defaultPrevented, undefined);
            }
            assert.equal(openedLinks.length, beforeSteam);
            const event = steamClick(steamLink);
            assert.equal(event.defaultPrevented, true);
            assert.equal(event.propagationStopped, true);
            assert.equal(openedLinks.at(-1), "steam://openurl/" + steamLink);
        } else {
            const options = { href: steamLink, trusted: true, messageId: me, channelId: gestureChannel };
            assert.equal(nativeSteamLinks.handleClick({ ...options, trusted: false }), steamLink);
            assert.equal(nativeSteamLinks.handleClick({ ...options, shouldConfirm: true }), steamLink);
            const blocked = "https://steamcommunity.com/blocked";
            assert.equal(nativeSteamLinks.handleClick({ ...options, href: blocked }), blocked);
            const support = "https://help.steampowered.com/en/";
            assert.equal(nativeSteamLinks.handleClick({ ...options, href: support }), support);
            assert.equal(openedLinks.length, beforeSteam);
            nativeSteamLinks.handleClick(options);
            assert.equal(openedLinks.at(-1), steamLink);
        }
        click(render(), "Disable OpenSteamLinksInApp");
        assert.equal(nativeSteamLinks.handleClick, stockSteamClick);
        assert.equal(documentListeners.has("click"), false);

        selectCatalog("DoubleClickEdit");
        click(render(), "Allow for this session");
        selectCatalog("DoubleClickToReply");
        click(render(), "Allow for this session");
        const savedGestureChannel = selectedChannel;
        selectedChannel = gestureChannel;
        if (desktop) {
            const listener = documentListeners.get("dblclick");
            const clickMessage = (id, interactive = false) => {
                const event = { target: new GestureElement(id, interactive), preventDefault() { this.defaultPrevented = true; } };
                listener(event);
                return event.defaultPrevented;
            };
            assert.equal(clickMessage(me, true), undefined);
            assert.equal(clickMessage(other), undefined);
            assert.equal(clickMessage(me), true);
            assert.deepEqual(composerActions.pop(), ["edit", me, "my message"]);
            assert.equal(clickMessage(sender), true);
            assert.equal(acknowledged.pop().message.id, sender);
            click(render(), "Disable DoubleClickEdit");
            assert.equal(clickMessage(me), undefined);
            click(render(), "Disable DoubleClickToReply");
            assert.equal(documentListeners.size, 0);
        } else {
            const native = jsx("NativeChatView", {
                channelId: gestureChannel,
                onDoubleTapMessage: () => composerActions.push("reaction"),
                onInitiateEdit: event => composerActions.push(["edit", event.nativeEvent.messageId]),
                onInitiateReply: event => composerActions.push(["reply", event.nativeEvent.messageId]),
                onMessageAccessibilityAction: () => composerActions.push("accessibility reaction"),
            });
            const tree = jsx("Container", { children: native });
            const messageRenderer = jsx(MessagesRenderer, { output: tree });
            const wallpaper = jsx("ThemeBackground", { direct: true, children: messageRenderer });
            const wrapped = appearanceHooks.get(MessagesRenderer)(null, wallpaper);
            const themed = wrapped.type(wrapped.props);
            assert.equal(themed.type, wallpaper.type);
            const renderer = themed.props.children;
            const props = renderer.type(renderer.props).props.children.props;
            const tap = id => props.onDoubleTapMessage({ nativeEvent: { messageId: id } });
            tap(me);
            tap(sender);
            tap(other);
            props.onMessageAccessibilityAction();
            settings.safeMode = { enabled: true };
            tap(me);
            settings.safeMode = undefined;
            click(render(), "Disable DoubleClickEdit");
            tap(me);
            tap(sender);
            click(render(), "Disable DoubleClickToReply");
            tap(sender);
            assert.deepEqual(composerActions.splice(0), [
                ["edit", me], ["reply", sender], "reaction", "accessibility reaction", "reaction", "reaction", ["reply", sender], "reaction",
            ]);
            assert.equal(appearanceHooks.has(MessagesRenderer), false);
        }
        selectedChannel = savedGestureChannel;

        for (const [name, content, expected] of [
            ["SedEnhanced", "s/a.b/done/g", "Fix done twice: done"],
            ["MessageBurst", "one more line", "Fix a.b twice: a.b\none more line"],
        ]) {
            selectCatalog(name);
            click(render(), "Allow for this session");
            latestMessage = { ...latestMessage, timestamp: Date.now() };
            const listener = [...transformHooks][0];
            const send = async (draft, extra = false) => desktop
                ? listener("test-channel", { content: draft }, extra ? { uploads: ["file"] } : {})
                : commandApi.sendMessage("test-channel", { content: draft, attachments: extra ? ["file"] : [] });
            await send(content, true);
            assert.equal(previousEdits.length, 0);
            const result = await send(content);
            if (desktop) assert.equal(result.cancel, true);
            assert.deepEqual(previousEdits.pop(), ["test-channel", "previous", expected]);
            latestMessage = { ...latestMessage, author: { id: sender } };
            await send(content);
            assert.equal(previousEdits.length, 0);
            latestMessage = { ...latestMessage, author: { id: me } };
            click(render(), "Disable " + name);
        }

        const testCases = [
            ["ReverseText", "reverse", "a🐈", "🐈a"],
            ["SpaceOut", "spaceout", "abc", "a b c"],
            ["ClapText", "clap", " a\t b ", "a 👏 b"],
            ["LeetText", "leet", "LEET", "1337"],
            ["BoldText", "bold", "Aa0 !", "𝐀𝐚𝟎 !"],
            ["Starify", "starify", "hi", "✦ﾟ｡⋆ hi ⋆｡ﾟ✦"],
        ];
        for (const [name, commandName, input, result] of testCases) {
            const port = cxCatalog.plugins.find(entry => entry.name === name).source;
            assert.throws(() => activateCx(port, commandHost, ["commands.register"]), /approval/);
            assert.throws(() => parseCx(port + '    send "duplicate"\n'), /one outgoing message/);
            selectCatalog(name);
            assert.equal(Object.keys(registered).length, 0, platform + " catalog review waits for approval");
            click(render(), "Allow for this session");
            const outgoing = registered[commandName];
            if (desktop) assert.equal(outgoing.inputType, commandApi.ApplicationCommandInputType.BUILT_IN_TEXT);
            const invoke = value => outgoing.execute([{ name: "text", value }], { channel: { id: "test-channel" } });
            assert.equal(invoke(input).content, result);
            assert.equal(invoke(""), undefined);
            click(render(), "Disable " + name);
            assert.equal(invoke(input), undefined);
        }
        for (const [name, commandName] of [["Calculator", "calc"], ["UnitConverter", "convert"]]) {
            selectCatalog(name);
            click(render(), "Allow for this session");
            const command = registered[commandName];
            const invoke = (value, send) => command.execute([{ name: "text", value }, { name: "send", value: send }], { channel: { id: "test-channel" } });
            if (commandName === "calc") {
                assert.equal(invoke("2**3**2").content, "`2**3**2` = **512**");
                assert.equal(invoke("2 * (3 + 4) - .5").content, "`2 * (3 + 4) - .5` = **13.5**");
                for (const invalid of ["1/0", "1/*2*/+3", "2 3", "-2**2", "1+alert(1)", "1".repeat(193)]) {
                    assert.equal(invoke(invalid), undefined);
                    assert.match(delivered.at(-1)[1], /Enter numbers/);
                }
            } else {
                assert.equal(command.options.find(option => option.name === "send").type, 5);
                assert.equal(invoke("5 km"), undefined);
                assert.equal(delivered.at(-1)[1], "5 km = 3.11 mi");
                assert.equal(invoke("70 F", true).content, "70°F = 21.11°C");
                assert.equal(invoke("5 km", "true"), undefined);
                assert.equal(invoke("5 constructor", true), undefined);
                assert.match(delivered.at(-1)[1], /Try something/);
            }
            click(render(), "Disable " + name);
        }
        const invokeNamed = (name, values = {}) => registered[name].execute(
            Object.entries(values).map(([name, value]) => ({ name, value })), { channel: { id: "test-channel" } }
        )?.content;
        selectCatalog("GoogleThat");
        click(render(), "Allow for this session");
        assert.equal(registered.googlethat.options.find(option => option.name === "engine").choices.length, 10);
        assert.equal(invokeNamed("googlethat", { input: "cats & dogs" }), "https://www.google.com/search?q=cats%20%26%20dogs");
        assert.equal(invokeNamed("googlethat", { input: "cat", engine: "Bing", hyperlink: true, "hide-embed": true }),
            "[cat](<https://www.bing.com/search?q=cat>)");
        assert.equal(invokeNamed("googlethat", { input: "cat", engine: "constructor" }), undefined);
        click(render(), "Disable GoogleThat");
        selectCatalog("ShipCalc");
        click(render(), "Allow for this session");
        const score = content => /\*\*(\d+)%\*\*$/.exec(content)[1];
        assert.equal(score(invokeNamed("ship", { a: "Alice", b: "Bob" })), score(invokeNamed("ship", { a: "BOB", b: "alice" })));
        assert.equal(invokeNamed("ship", { a: "Alice" }), undefined);
        click(render(), "Disable ShipCalc");
        selectCatalog("VibeCheck");
        click(render(), "Allow for this session");
        const vibeSource = cxCatalog.plugins.find(entry => entry.name === "VibeCheck").source;
        const vibes = parseCx(vibeSource).commands[0].actions[0].choices;
        assert.equal(vibes.length, 10);
        assert.ok(vibes.includes(invokeNamed("vibe")));
        assert.throws(() => parseCx(vibeSource.replace("✦ the vibes are immaculate ✦", "${token}")), /literal messages/);
        click(render(), "Disable VibeCheck");
        selectCatalog("MoreCommands");
        click(render(), "Allow for this session");
        assert.equal(Object.keys(registered).length, 35);
        assert.equal(registered.randomnumber.options[0].type, 4);
        assert.equal(invokeNamed("randomnumber", { min: "4", max: 4 }), "4");
        assert.equal(invokeNamed("randomnumber", { min: 4.5, max: 6 }), undefined);
        assert.equal(invokeNamed("rolldice", { sides: 1 }), "You rolled a 1");
        assert.equal(invokeNamed("choose", { choices: "one, ," }), "one");
        assert.ok(["Heads", "Tails"].includes(invokeNamed("flipcoin")));
        assert.equal(invokeNamed("wordcount", { text: "one two" }), undefined);
        assert.equal(delivered.at(-1)[1], "2 words, 7 characters");
        assert.equal(invokeNamed("transform", { text: "a🐈", style: "upper", reverse: true, repeat: 2 }), "🐈A🐈A");
        assert.equal(invokeNamed("transform", { text: "aa", style: "upper", repeat: 3000 }), undefined);
        assert.match(delivered.at(-1)[1], /positive repeat count/);
        assert.equal(invokeNamed("morse", { text: "... --- ..." }), "Sos");
        assert.equal(invokeNamed("morse", { text: "SOS" }), "... --- ...");
        assert.equal(invokeNamed("happy", { message: "hi" }), "hi ヽ(´▽`)/");
        assert.equal(invokeNamed("smug"), " ಠ_ಠ");
        click(render(), "Disable MoreCommands");
        assert.equal(Object.keys(registered).length, 0);
        const transforms = [
            ["TalkInReverse", "a🐈", "🐈a"],
            ["WriteUpperCase", "hello. bye! ok now", "Hello. Bye! ok now"],
            ["Unindent", "```js\n    one();\n      two();\n```", "```js\none();\n  two();\n```"],
            ["NormalizeMessageLinks", "https://ptb.discord.com/channels/1/2/3", "https://discord.com/channels/1/2/3"],
            ["Ingtoninator", "CAT https://example.test/keep", "CATINGTON https://example.test/keep"],
            ["PolishWording", "dont change \x60dont\x60 or https://example.test/dont", "don't change \x60dont\x60 or https://example.test/dont"],
            ["Signature", "hello", "hello\n> a chronic discord user"],
            ["ClearURLs", "https://example.test/?utm_source=ad&t=4&bad%XX=1#anchor", "https://example.test/?t=4&bad%XX=1#anchor"],
            ["SilentMessageToggle", "hello", "@silent hello"],
            ["AutoVaporwave", "Hi 2", "Ｈｉ　２"],
            ["TextReplace", "hi :shrug:", "hi ¯\\_(ツ)_/¯"],
            ["ZeroWidthSanitizer", "hel\u200blo", "hello"],
            ["Equius'sTypingQuirk", "LOO strong x https://example.test/X", "D --> 100 STRONG % https://example.test/X"],
            ["EridanTypingQuirk", "V w v W www.example.test/w", "VV ww vv WW www.example.test/w"],
            ["FeferiTypingQuirk", "EEE E H", "--E -E )("],
            ["Gamzee'sTypingQuirk", "aB https://example.test/Cd cd", "Ab https://example.test/Cd Cd"],
            ["Nepeta'sTypingQuirk", "awesome https://example.test/awesome", ":33 < pawsome https://example.test/awesome"],
            ["SolluxTypingQuirk", "this is to", "thii2 ii2 two"],
            ["TereziTypingQuirk", "Ai e", "41 3"],
            ["Vriska'sTypingQuirk", "great B www.example.test/great", "gr8 8 www.example.test/great"],
        ];
        for (const [name, input, expected] of transforms) {
            const source = cxCatalog.plugins.find(entry => entry.name === name).source;
            assert.throws(() => activateCx(source, commandHost, []), /approval/);
            assert.throws(() => parseCx(source + "  before send constructor\n"), /Unknown or duplicate/);
            selectCatalog(name);
            assert.equal(transformHooks.size, 0);
            click(render(), "Allow for this session");
            assert.equal(transformHooks.size, 1);
            const hook = [...transformHooks][0];
            const message = { content: input, attachments: ["image"] };
            if (desktop) hook("channel", message);
            else hook(message);
            assert.equal(message.content, expected);
            assert.deepEqual(message.attachments, ["image"]);
            if (name === "ClearURLs") {
                assert.equal(editHooks.size, 1);
                const edit = [...editHooks][0];
                message.content = "Look at https://x.com/test?s=20&keep=1!";
                if (desktop) edit("channel", "message", message);
                else edit(message);
                assert.equal(message.content, "Look at https://x.com/test?keep=1!");
                message.content = "[link](https://example.test/?utm_source=ad)";
                if (desktop) edit("channel", "message", message);
                else edit(message);
                assert.equal(message.content, "[link](https://example.test/)");
                const windowsSource = source.replace(/\r?\n/g, "\r\n");
                assert.throws(() => parseCx(windowsSource.replace(/  needs messages\.edit\.transform\r\n/, "")), /permissions/);
            } else if (name === "ZeroWidthSanitizer") {
                assert.equal(editHooks.size, 1);
                const edit = [...editHooks][0];
                message.content = "a\u2060b";
                if (desktop) edit("channel", "message", message);
                else edit(message);
                assert.equal(message.content, "ab");
            } else {
                assert.equal(editHooks.size, 0);
            }
            click(render(), "Disable " + name);
            assert.equal(transformHooks.size, 0);
            assert.equal(editHooks.size, 0);
            message.content = input;
            if (desktop) hook("channel", message);
            else hook(message);
            assert.equal(message.content, input);
        }
        selectCatalog("SendTimestamps");
        click(render(), "Allow for this session");
        const timestampHook = [...transformHooks][0];
        const draft = { content: "\x6012:30 AM\x60 \x6025:00\x60 \x60\x60\x60\x6011:05\x60\x60\x60\x60" };
        if (desktop) timestampHook("channel", draft);
        else timestampHook(draft);
        assert.match(draft.content, /^<t:\d+:t> \x6025:00\x60 \x60{4}11:05\x60{4}$/);
        click(render(), "Disable SendTimestamps");
        selectCatalog("NoReplyMention");
        const noReply = cxCatalog.plugins.find(entry => entry.name === "NoReplyMention").source;
        assert.throws(() => activateCx(noReply, host, ["messages.transform"]), /approval/);
        assert.equal(transformHooks.size, 0);
        click(render(), "Allow for this session");
        const replyHook = [...transformHooks][0];
        const replyOption = desktop ? "repliedUser" : "replied_user";
        const reply = { messageReference: { messageId: "id" }, allowedMentions: { parse: [], users: ["123"], [replyOption]: true } };
        const runReply = options => desktop ? replyHook("channel", {}, { replyOptions: options }) : replyHook({}, options);
        runReply(reply);
        assert.equal(reply.allowedMentions[replyOption], false);
        assert.deepEqual(reply.allowedMentions.parse, []);
        assert.deepEqual(reply.allowedMentions.users, ["123"]);
        const nonReply = {};
        runReply(nonReply);
        assert.equal(nonReply.allowedMentions, undefined);
        click(render(), "Disable NoReplyMention");
        assert.equal(transformHooks.size, 0);
        const replacements = 'plugin "Custom Rules":\n  needs messages.transform\n  before send replace "a" with "$&"\n  before send replace "b" with ""';
        let replaceText;
        const stopReplace = activateCx(replacements, {
            ...host, registerMessageTransform(transform) { replaceText = transform; return () => {}; },
        }, ["messages.transform"]);
        assert.equal(replaceText("ab"), "$&");
        assert.equal(replaceText("a".repeat(3999)), "a".repeat(3999));
        stopReplace();
        assert.throws(() => parseCx(replacements + '\n  before send replace "a" with "again"'), /Duplicate/);
        if (!desktop) click(render(), "Browse catalog");
        searchFor("");
        assert.ok(!button(render(), cxCatalog.plugins[12].name));
        click(render(), "Next plugins page");
        assert.ok(button(render(), cxCatalog.plugins[12].name));
        click(render(), "Previous plugins page");
        assert.ok(button(render(), cxCatalog.plugins[0].name));
        click(render(), "Next plugins page");
        searchFor(cxCatalog.plugins[0].name);
        assert.ok(button(render(), cxCatalog.plugins[0].name));
        if (desktop) {
            selectCatalog("Lazy Wallpaper");
            assert.equal(button(render(), "Allow for this session"), undefined);
            selectCatalog("Blue Hour");
            resolveCatalogEntry('theme "Lazy Wallpaper":\n  background: #101018');
            await new Promise(setImmediate);
            assert.match(find(render(), item => item.props["aria-label"] === "CX source").props.value, /theme "Blue Hour"/);
        }
        searchFor("Blue Hour");
        click(render(), "Blue Hour");
        click(render(), "Allow for this session");
        if (desktop) {
            assert.match(stylesheet.textContent, /--background-secondary: #1c2746/);
            assert.match(stylesheet.textContent, /linear-gradient\(#12192d40, #12192d40\)/);
        } else {
            assert.equal(nativeTheme.semanticColors.BACKGROUND_SECONDARY[0], "#1c2746");
            assert.equal(nativeTheme.background.alpha, 0.75);
        }
        click(render(), "Disable Blue Hour");
        assert.equal(stylesheet, undefined);
        assert.equal(nativeTheme, selectedTheme);
        selectCatalog("Blue Hour");
        const wallpaperSource = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
        const noOpacity = wallpaperSource.props.value.replace(/^  wallpaper-opacity: .+\n?/m, "");
        if (desktop) wallpaperSource.props.onChange({ currentTarget: { value: noOpacity } });
        else wallpaperSource.props.onChangeText(noOpacity);
        click(render(), "Review CX");
        click(render(), "Allow for this session");
        if (desktop) assert.match(stylesheet.textContent, /linear-gradient\(#12192d00, #12192d00\)/);
        else assert.equal(nativeTheme.background.alpha, 1);
        click(render(), "Disable Blue Hour");

        for (const [name, background, text, mode] of [
            ["Latte", "#eff1f5", "#4c4f69", "light"],
            ["Frappé", "#303446", "#c6d0f5", "dark"],
            ["Macchiato", "#24273a", "#cad3f5", "dark"],
            ["Mocha", "#1e1e2e", "#cdd6f4", "dark"],
        ]) {
            const label = "Catppuccin " + name;
            selectCatalog(label);
            click(render(), "Allow for this session");
            if (desktop) {
                assert.ok(stylesheet.textContent.includes("color-scheme: " + mode));
                assert.ok(stylesheet.textContent.includes("--chat-background-default: " + background));
                assert.ok(stylesheet.textContent.includes("--text-default: " + text));
            } else {
                assert.equal(nativeTheme.semanticColors.BACKGROUND_PRIMARY[0], mode === "light" ? "#e6e9ef" : background);
                assert.equal(nativeTheme.semanticColors.TEXT_DEFAULT[0], text);
                assert.equal(nativeMode, mode);
            }
            click(render(), "Disable " + label);
        }
        selectCatalog("Catppuccin Mocha - Mauve");
        click(render(), "Allow for this session");
        if (desktop) {
            assert.ok(stylesheet.textContent.includes("--brand-500: #cba6f7;"));
            assert.ok(stylesheet.textContent.includes("--background-mentioned: #f9e2af17;"));
        } else {
            assert.equal(nativeTheme.rawColors.BRAND_500, "#cba6f7");
            assert.equal(nativeTheme.semanticColors.BACKGROUND_MENTIONED[0], "#f9e2af17");
        }
        click(render(), "Disable Catppuccin Mocha - Mauve");
        selectCatalog("Futuristic - Orbit");
        const themeSource = find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source");
        assert.equal(themeSource.props.value, "");
        click(render(), "Edit CX source");
        assert.ok(find(render(), item => item.props[desktop ? "aria-label" : "accessibilityLabel"] === "CX source").props.value.length > 300000);
        click(render(), "Allow for this session");
        if (desktop) assert.match(stylesheet.textContent, /url\("data:image\/jpeg;base64,/);
        else {
            assert.match(nativeTheme.background.url, /^data:image\/jpeg;base64,/);
            assert.equal(nativeTheme.background.alpha, 0.62);
        }
        click(render(), "Disable Futuristic - Orbit");
        selectCatalog("Rosé Pine");
        click(render(), "Allow for this session");
        if (desktop) assert.match(stylesheet.textContent, /url\("data:image\/png;base64,/);
        else {
            assert.match(nativeTheme.background.url, /^data:image\/png;base64,/);
            assert.equal(nativeTheme.background.alpha, 1);
        }
        click(render(), "Disable Rosé Pine");
        selectCatalog("Purple Mountains");
        click(render(), "Allow for this session");
        if (desktop) assert.match(stylesheet.textContent, /filter: blur\(0\.6px\)/);
        else assert.equal(nativeTheme.background.blur, 0.6);
        click(render(), "Disable Purple Mountains");
        for (const [name, background, opacity] of [
            ["Moss", "#253129"],
            ["Lotus", "#5e3640"],
            ["Mars", "#36263a"],
            ["Mist", "#56626d"],
            ["Nord for Enmity", "#434C5E"],
            ["Dracula for BetterDiscord", "#282a36"],
            ["Dreamy", "#061428", 0.5],
            ["Glorious Sunset", "#1d2021", 1],
        ]) {
            selectCatalog(name);
            click(render(), "Allow for this session");
            if (desktop) {
                assert.ok(stylesheet.textContent.includes("--background-primary: " + background));
                assert.equal(stylesheet.textContent.includes("data:image/jpeg;base64,"), opacity !== undefined);
            } else {
                assert.equal(nativeTheme.semanticColors.BACKGROUND_PRIMARY[0], background);
                assert.equal(nativeTheme.background?.alpha, opacity);
                if (opacity !== undefined) assert.match(nativeTheme.background.url, /^data:image\/jpeg;base64,/);
            }
            click(render(), "Disable " + name);
        }
        selectCatalog("Midnight - Light");
        click(render(), "Allow for this session");
        if (desktop) assert.match(stylesheet.textContent, /color-scheme: light/);
        else assert.equal(nativeMode, "light");
        click(render(), "Disable Midnight - Light");

        {
            const clipboardBefore = clipboardWrites.length;
            selectCatalog("CopyFileContents");
            click(render(), "Allow for this session");
            if (desktop) {
                const action = module.exports.default.renderTextAttachmentCopy;
                assert.equal(action({ fileContents: "loading" }), null);
                const partial = action({ fileContents: "first part", bytesLeft: 20 });
                assert.equal(partial.props.disabled, true);
                partial.props.onClick();
                assert.equal(clipboardWrites.length, clipboardBefore);
                const complete = action({ fileContents: "complete é", bytesLeft: 0 });
                complete.props.onClick();
                assert.equal(clipboardWrites.at(-1), "complete é");
                click(render(), "Disable CopyFileContents");
                complete.props.onClick();
                assert.equal(clipboardWrites.length, clipboardBefore + 1);
            } else {
                const prior = selectedChannel;
                selectedChannel = repeatChannel;
                const url = "https://cdn.discordapp.com/attachments/" + repeatChannel + "/" + sender + "/test.txt?ex=123&hm=abc";
                const file = Uint8Array.from(Buffer.from("complete é", "utf8"));
                const props = { channel: stores.ChannelStore.getChannel(repeatChannel), message: {
                    channel_id: repeatChannel, attachments: [
                        { filename: "test.TXT", url, size: file.byteLength },
                        { filename: "bad.txt", url: "https://example.org/test.txt", size: 1 },
                        { filename: "image.png", url, size: 1 },
                    ],
                } };
                const hook = appearanceHooks.get(LongPressMessageActionSheet);
                const wrapper = hook(null, jsx(LongPressMessageActionSheet, props));
                const sheet = wrapper.type(wrapper.props);
                const menu = sheet.type(sheet.props);
                const copyFile = button(menu, "Copy File Contents (test.TXT)").props.onPress;
                assert.equal(button(menu, "Copy File Contents (bad.txt)"), undefined);
                assert.equal(button(menu, "Copy File Contents (image.png)"), undefined);
                let truncated = true;
                fetchAttachment = async (request, options) => {
                    assert.equal(request, url);
                    assert.equal(options.redirect, "error");
                    assert.equal(options.credentials, "omit");
                    return { url, status: 200, headers: { get: key => key === "content-length" ? String(file.byteLength) : null },
                        arrayBuffer: async () => truncated ? file.slice(0, -1).buffer : file.buffer };
                };
                copyFile();
                await new Promise(setImmediate);
                assert.equal(clipboardWrites.length, clipboardBefore);
                truncated = false;
                canSend = false;
                copyFile();
                await new Promise(setImmediate);
                canSend = true;
                assert.equal(clipboardWrites.at(-1), "complete é");
                let completeFetch;
                let signal;
                fetchAttachment = (_, options) => {
                    signal = options.signal;
                    return new Promise(resolve => { completeFetch = resolve; });
                };
                copyFile();
                click(render(), "Disable CopyFileContents");
                assert.equal(signal.aborted, true);
                completeFetch({ url, status: 200, headers: { get: key => key === "content-length" ? String(file.byteLength) : null },
                    arrayBuffer: async () => file.buffer });
                await new Promise(setImmediate);
                assert.equal(clipboardWrites.length, clipboardBefore + 1);
                selectedChannel = prior;
            }
        }
        const activationFailures = [];
        const installedHooks = () => ({
            commands: Object.keys(registered).sort(),
            send: transformHooks.size,
            edit: editHooks.size,
            incoming: incomingHooks.length,
            menus: menuPatches.size,
            popover: messagePopover.size,
            appearance: appearanceHooks.size,
            colors: colorOverlays.size,
            pendingEmojiPicker: emojiPickerWaiters.size,
            document: documentListeners.size,
            stylesheet,
        });
        const baseline = installedHooks();
        for (const entry of cxCatalog.plugins) {
            selectCatalog(entry.name);
            click(render(), "Allow for this session");
            const deactivate = "Disable " + entry.name;
            if (!button(render(), deactivate)) {
                const status = find(render(), item => item.props.accessibilityLiveRegion === "polite" || item.props.role === "status");
                activationFailures.push([entry.name, status?.props.children]);
                continue;
            }
            click(render(), deactivate);
            assert.equal(button(render(), deactivate), undefined, entry.name + " should deactivate");
            assert.deepEqual(installedHooks(), baseline, entry.name + " should release its adapter registrations");
        }
        assert.deepEqual(activationFailures, [], (desktop ? "Desktop" : "Mobile") + " CX catalog activation failures");
        for (const entry of cxCatalog.themes) {
            const theme = parseCx(entry.source);
            selectCatalog(entry.name);
            click(render(), "Allow for this session");
            if (desktop) {
                assert.ok(stylesheet?.textContent.includes("--background-primary: " + theme.background), entry.name);
                if (theme.wallpaper) assert.ok(stylesheet.textContent.includes(theme.wallpaper), entry.name);
            } else {
                assert.equal(nativeTheme.name, entry.name);
                assert.equal(nativeMode, theme.mode, entry.name);
                assert.equal(nativeTheme.background?.url, theme.wallpaper, entry.name);
                assert.equal(nativeTheme.background?.alpha, theme.wallpaper ? theme.wallpaperOpacity ?? 1 : undefined, entry.name);
                assert.equal(nativeTheme.background?.blur, theme.wallpaperBlur, entry.name);
            }
            click(render(), "Disable " + entry.name);
            assert.equal(stylesheet, undefined, entry.name);
            assert.equal(nativeTheme, selectedTheme, entry.name);
        }
    }
    const { migrateCxPalette } = await import("../../desktop/client/scripts/cx-migrate-palette.mjs");
    assert.equal(parseCx(migrateCxPalette(":root { --background-primary: #123; --brand-500: #8765ab; }", "Test")).background, "#112233");
    assert.throws(() => migrateCxPalette('@import "https://example.com/a.css"; :root { --background-primary: #123; }', "Test"), /manual port/);
    assert.throws(() => migrateCxPalette(":root { --background-primary: #123; } .chat { display: none; }", "Test"), /manual port/);
    assert.throws(() => migrateCxPalette(":root { --background-primary: #123; --bg: url(a); }", "Test"), /manual port/);
    const migrated = parseCx(migrateCxPalette(`:root { --background-primary: #123; --background-secondary: #345;
        --background-image: url("${png}"); --background-opacity: 75%; }`, "Wallpaper"));
    assert.equal(migrated.surface, "#334455");
    assert.equal(migrated.wallpaper, png);
    assert.equal(migrated.wallpaperOpacity, 0.75);
    const gradient = parseCx(migrateCxPalette(
        ":root { --background-primary: #123; --background-image: linear-gradient(180deg, #ff0000 0%, #0000ff 100%); }", "Gradient"
    ));
    const gradientPng = Buffer.from(gradient.wallpaper.split(",")[1], "base64");
    const width = gradientPng.readUInt32BE(16), height = gradientPng.readUInt32BE(20);
    const pixels = inflateSync(gradientPng.subarray(41, 41 + gradientPng.readUInt32BE(33)));
    const bottom = (height - 1) * (width * 3 + 1) + 1;
    assert.deepEqual([...pixels.subarray(1, 4)], [255, 0, 0]);
    assert.deepEqual([...pixels.subarray(bottom, bottom + 3)], [0, 0, 255]);
    assert.throws(() => migrateCxPalette(
        ":root { --background-primary: #123; --background-image: linear-gradient(180deg, #123456 80%, #abcdef 20%); }", "Invalid"
    ), /manual port/);
    const { migrateCxVendetta } = await import("../../desktop/client/scripts/cx-migrate-vendetta.mjs");
    const vendetta = { name: "Sample", spec: 2, semanticColors: { BACKGROUND_PRIMARY: ["#abcdef", "#123456"] }, rawColors: { BRAND_500: "#fedcba" } };
    assert.equal(parseCx(migrateCxVendetta(vendetta, "dark")).semanticColors.BACKGROUND_PRIMARY, "#abcdef");
    assert.equal(parseCx(migrateCxVendetta(vendetta, "light")).semanticColors.BACKGROUND_PRIMARY, "#123456");
    assert.throws(() => migrateCxVendetta({ ...vendetta, background: { url: "https://example.com/bg.jpg" } }, "dark"), /without wallpapers/);
    const portableVendetta = parseCx(migrateCxVendetta({
        ...vendetta, rawColors: { BRAND_500: "#abc" }, semanticColors: {
            ...vendetta.semanticColors, SCROLLBAR_THIN_TRACK: ["transparent"],
        }, background: { url: "https://example.com/bg.png", alpha: 5, blur: 0.6 },
    }, "dark", "Local Wallpaper", png));
    assert.equal(portableVendetta.accent, "#aabbcc");
    assert.equal(portableVendetta.semanticColors.SCROLLBAR_THIN_TRACK, "#00000000");
    assert.equal(portableVendetta.wallpaper, png);
    assert.equal(portableVendetta.wallpaperOpacity, 1);
    assert.equal(portableVendetta.wallpaperBlur, 0.6);
    console.log(`PASS shared CX catalog with ${cxCatalog.plugins.length} plugins and ${cxCatalog.themes.length} themes, permission approval, both command adapters and strict palette migration`);
})().catch(error => { console.error(error); process.exitCode = 1; });
