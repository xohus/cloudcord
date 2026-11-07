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
    bundle: true, write: false, format: "cjs", minify: true,
}).outputFiles[0].text;
vm.runInNewContext(code, { module: moduleBox });
const { activateCx, createCxSession, parseCx, reviewCx } = moduleBox.exports;
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
    let run;
    const commandHost = {
        ...host,
        registerCommand(name, callback, acceptsText) {
            assert.equal(name, "ccp-count");
            assert.equal(acceptsText, true);
            run = callback;
            return () => {};
        },
    };
    assert.throws(() => activateCx(counter, commandHost, ["commands.register"]), /approval/);
    const stop = activateCx(counter, commandHost, ["commands.register", "reply.local"]);
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
        const incomingHooks = [], notifications = [], pendingNotifications = [];
        const me = "100000000000000001", sender = "100000000000000002", other = "100000000000000003";
        const guildId = "100000000000000004";
        const roleId = "100000000000000005";
        const voiceTarget = "100000000000000006", secondVoice = "100000000000000007";
        let currentVoice = null;
        const voiceJoins = [];
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
        const messageEditor = { editMessage: (channel, id, message) => previousEdits.push([channel, id, message.content]) };
        let latestMessage = { id: "previous", author: { id: me }, content: "Fix a.b twice: a.b", timestamp: Date.now(), channel_id: "test-channel" };
        const dispatch = event => acknowledged.push(event);
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
        const stores = {
            UserStore: { getCurrentUser: () => ({ id: me }), getUser: id => [me, sender, other].includes(id) ? { id } : undefined },
            UserProfileStore: {
                getUserProfile: id => id === sender ? { themeColors: Object.freeze([0, 0x12abcd]) } : undefined,
                getGuildMemberProfile: (id, guild) => id === sender && guild === guildId ? { themeColors: [0x123, 0xffffff] } : undefined,
            },
            ChannelStore: { getChannel: id => ({ name: "test", recipients: [sender], guild_id: id === "guild-channel" ? guildId : undefined }) },
            GuildMemberStore: { getMemberIds: () => [me, sender], getMembers: () => [{ userId: sender, roles: [roleId], nick: "Tester@everyone" }] },
            GuildStore: { getGuilds: () => ({ [guildId]: { id: guildId } }) },
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
                getMessage: (_channel, id) => ({ author: { id: id === "partial" ? sender : me } }),
                getLastMessage: () => latestMessage, getLastEditableMessage: () => latestMessage,
            },
            RelationshipStore: {
                isBlocked: id => id === sender, isIgnored: id => id === other,
                isFriend: id => id === sender,
                getPendingCount: () => 3, getPendingIncomingCount: () => 2,
            },
            SelectedChannelStore: { getVoiceChannelId: () => currentVoice },
        };
        const transformHooks = new Set();
        const appearanceHooks = new Map();
        const messagePresentation = Object.freeze({ edited: true, stickers: Object.freeze([{ id: "sticker" }]), content: "hello" });
        const createMessageContent = () => messagePresentation;
        const messageRenderer = { default: createMessageContent };
        const colorOverlays = new Set();
        const menuPatches = new Set(), clipboardWrites = [];
        const settings = {};
        let profileUser;
        const editHooks = new Set();
        const selectedTheme = { name: "Previously selected" };
        let nativeTheme = selectedTheme, nativeMode, stylesheet;
        let cursor = 0;
        const useState = initial => {
            const index = cursor++;
            if (!(index in states)) states[index] = initial;
            return [states[index], value => { states[index] = value; }];
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
            sendMessage() { return "sent normally"; },
            sendBotMessage: (channel, message) => delivered.push([channel, typeof message === "string" ? message : message.content]),
        };
        const module = { exports: {} };
        const adapter = desktop ? "desktop/client/src/sincordplugins/cxExtensions/index.tsx"
            : "ios/runtime/src/core/ui/settings/pages/CxExtensions/index.tsx";
        const mocks = {
            "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
            "@utils/cxCatalog": { cxCatalog: { ...cxCatalog, themes: [...cxCatalog.themes, lazyEntry] } },
            "@api/Commands": commandApi,
            "@api/ContextMenu": {
                addContextMenuPatch: (menus, patch) => { assert.ok(menus.includes("user-context")); menuPatches.add(patch); },
                removeContextMenuPatch: (_, patch) => menuPatches.delete(patch),
            },
            "@utils/clipboard": { copyToClipboard: value => { clipboardWrites.push(value); return Promise.resolve(); } },
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
            "@api/Notifications": { showNotification: ({ body }) => notifications.push(body) },
            "@utils/cx": moduleBox.exports,
            "@utils/types": { __esModule: true, default: value => value },
            "@webpack": { findByProps: key => key === "startTyping" ? typing : key === "getUserAvatarURL" ? icons
                : key === "createFriendInvite" ? inviteApi : key === "relativeTimeRounding" ? relativeTime
                    : key === "removeRelationship" ? relationshipActions : undefined },
            "@webpack/common": { useState, useRef: initial => useState({ current: initial })[0], ...stores, ChannelActions: voiceActions, MessageActions: messageEditor, IconUtils: icons, showToast: message => notifications.push(message), Menu: { MenuItem: "MenuItem" }, FluxDispatcher: {
                _interceptors: incomingHooks,
                addInterceptor: callback => incomingHooks.push(callback),
                dispatch,
            } },
            "@lib/api/cx": moduleBox.exports,
            "@lib/api/cxCatalog": { cxCatalog },
            "@lib/api/commands": commandApi,
            "@lib/api/commands/types": commandApi,
            "@lib/addons/themes": { getCurrentTheme: () => ({ data: selectedTheme }) },
            "@lib/addons/themes/colors/updater": {
                updateBunnyColor: (value, options) => { nativeTheme = value; nativeMode = options?.mode; },
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
            "@lib/api/flux": { intercept(callback) {
                incomingHooks.push(callback);
                return () => { incomingHooks.splice(incomingHooks.indexOf(callback), 1); };
            } },
            "@metro": { findByFilePath: path => path === "modules/messages/native/renderer/createMessageContent.tsx" ? messageRenderer : undefined,
                findByStoreNameLazy: name => stores[name], findByProps: name =>
                name === "getUserAvatarURL" ? icons : name === "startTyping" ? typing : name === "editMessage" ? messageEditor
                    : name === "createFriendInvite" ? inviteApi : name === "relativeTimeRounding" ? relativeTime
                        : name === "removeRelationship" ? relationshipActions : name === "selectVoiceChannel" ? voiceActions : undefined },
            "@metro/common": { React: {
                useState, useSyncExternalStore: (subscribe, readSnapshot) => readSnapshot(),
                createContext: () => ({ Provider: "ProfileUserProvider" }), useContext: () => profileUser,
                cloneElement: (element, props) => jsx(element.type, { ...element.props, ...props }),
            }, clipboard: { setString: value => clipboardWrites.push(value) }, FluxDispatcher: { dispatch },
                commands: { getBuiltInCommands: () => [] }, messageUtil: commandApi },
            "@metro/common/components": { Stack: "Stack", TableRow: "TableRow", TableRowGroup: "TableRowGroup" },
            "react-native": { ScrollView: "ScrollView", Text: "Text", TextInput: "TextInput" },
        };
        vm.runInNewContext(transformSync(read(adapter), { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
            module,
            setTimeout: callback => pendingNotifications.push(callback),
            document: {
                createElement: () => ({ remove() { stylesheet = undefined; } }),
                head: { append: value => { stylesheet = value; } }
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
            } else if (rule.style) assert.ok(colorOverlays.has(rule.style));
            else if (rule.mobile.messagePresentation) {
                const rendered = messageRenderer.default();
                assert.equal(rendered.content, messagePresentation.content);
                assert.equal(rendered.edited, rule.mobile.messagePresentation !== "edited");
                assert.equal(rendered.stickers.length, rule.mobile.messagePresentation === "stickers" ? 0 : 1);
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
            assert.equal(colorOverlays.size, 0);
            assert.equal(stylesheet, undefined);
            for (const wrapped of wraps) assert.equal(wrapped.type(wrapped.props), original);
        }
        if (!desktop) {
            for (const name of ["HideEditedLabel", "HideStickers"]) {
                selectCatalog(name);
                click(render(), "Allow for this session");
            }
            let rendered = messageRenderer.default();
            assert.equal(rendered.edited, false);
            assert.equal(rendered.stickers.length, 0);
            assert.equal(rendered.content, "hello");
            click(render(), "Disable HideEditedLabel");
            rendered = messageRenderer.default();
            assert.equal(rendered.edited, true);
            assert.equal(rendered.stickers.length, 0);
            click(render(), "Disable HideStickers");
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
        const editor = find(render(), item => item.type === (desktop ? "textarea" : "TextInput"));
        if (desktop) editor.props.onChange({ currentTarget: { value: counter } });
        else editor.props.onChangeText(counter);
        click(render(), "Review CX");
        assert.equal(Object.keys(registered).length, 0, platform + " waits for approval");
        click(render(), "Allow for this session");
        const command = registered["ccp-count"];
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        click(render(), "Disable CX Character Counter");
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

        const silent = cxCatalog.plugins.find(entry => entry.name === "SilentTyping").source;
        assert.throws(() => activateCx(silent, host, []), /approval/);
        assert.throws(() => parseCx(silent.replace("use silent-typing", "use token")), /Unknown or duplicate client effect/);
        for (const name of ["SilentTyping", "NoPendingCount", "AlwaysAnimate", "DontRoundMyTimestamps"]) {
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
        if (!desktop) {
            settings.safeMode = { enabled: true };
            typing.startTyping();
            assert.equal(typingStarts, 1);
            assert.equal(stores.RelationshipStore.getPendingCount(), 3);
            assert.equal(icons.getGuildIconURL(iconOptions), false);
            assert.equal(rounding(7.6), 8);
            settings.safeMode.enabled = false;
        }
        click(render(), "Disable SilentTyping");
        click(render(), "Disable NoPendingCount");
        click(render(), "Disable AlwaysAnimate");
        click(render(), "Disable DontRoundMyTimestamps");
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
