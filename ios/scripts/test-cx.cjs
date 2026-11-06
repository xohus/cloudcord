const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
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
const basicBackground = parseCx(cxCatalog.themes.find(entry => entry.name === "BasicBackground (Chat)").source);
assert.equal(basicBackground.wallpaperOpacity, 0.85);
assert.match(basicBackground.wallpaper, /^data:image\/jpeg;base64,/);
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
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZ0AAAAASUVORK5CYII=";
assert.equal(parseCx(theme + '\n  wallpaper: "' + png + '"').wallpaper, png);
assert.throws(() => parseCx(theme + '\n  wallpaper-opacity: 75'), /embedded wallpaper/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "' + png + '"\n  wallpaper-opacity: 101'), /0 to 100/);
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
        const states = [], registered = {}, delivered = [];
        const transformHooks = new Set();
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
            ApplicationCommandOptionType: { STRING: 3, INTEGER: 4, BOOLEAN: 5 },
            ApplicationCommandType: { CHAT: 1 },
            findOption: (args, name) => args.find(option => option.name === name)?.value,
            registerCommand(command) {
                registered[command.name] = command;
                return () => { delete registered[command.name]; };
            },
            unregisterCommand(name) { delete registered[name]; },
            sendBotMessage: (channel, message) => delivered.push([channel, typeof message === "string" ? message : message.content]),
        };
        const module = { exports: {} };
        const adapter = desktop ? "desktop/client/src/sincordplugins/cxExtensions/index.tsx"
            : "ios/runtime/src/core/ui/settings/pages/CxExtensions/index.tsx";
        const mocks = {
            "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
            "@utils/cxCatalog": { cxCatalog },
            "@api/Commands": commandApi,
            "@api/MessageEvents": {
                addMessagePreSendListener(listener) { transformHooks.add(listener); return listener; },
                removeMessagePreSendListener(listener) { transformHooks.delete(listener); }
            },
            "@core/plugins/shared/sendMessage": {
                onSendMessage(listener) { transformHooks.add(listener); return () => { transformHooks.delete(listener); }; }
            },
            "@api/Notifications": {},
            "@utils/cx": moduleBox.exports,
            "@utils/types": { __esModule: true, default: value => value },
            "@webpack/common": { useState },
            "@lib/api/cx": moduleBox.exports,
            "@lib/api/cxCatalog": { cxCatalog },
            "@lib/api/commands": commandApi,
            "@lib/api/commands/types": commandApi,
            "@lib/addons/themes": { getCurrentTheme: () => ({ data: selectedTheme }) },
            "@lib/addons/themes/colors/updater": { updateBunnyColor: (value, options) => { nativeTheme = value; nativeMode = options?.mode; } },
            "@lib/api/native/modules": {},
            "@lib/api/native/loader": { isThemeSupported: () => true },
            "@lib/api/settings": { settings: {} },
            "@lib/ui/toasts": {},
            "@metro": {},
            "@metro/common": { React: { useState }, commands: { getBuiltInCommands: () => [] }, messageUtil: commandApi },
            "@metro/common/components": { Stack: "Stack", TableRow: "TableRow", TableRowGroup: "TableRowGroup" },
            "react-native": { ScrollView: "ScrollView", Text: "Text", TextInput: "TextInput" },
        };
        vm.runInNewContext(transformSync(read(adapter), { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
            module,
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
        const editor = find(render(), item => item.type === (desktop ? "textarea" : "TextInput"));
        if (desktop) editor.props.onChange({ currentTarget: { value: counter } });
        else editor.props.onChangeText(counter);
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
        click(render(), "Review CX");
        assert.equal(Object.keys(registered).length, 0, platform + " waits for approval");
        click(render(), "Allow for this session");
        const command = registered["ccp-count"];
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        click(render(), "Disable CX Character Counter");
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        assert.deepEqual(delivered, [["test-channel", "3 characters"]]);
        assert.equal(Object.keys(registered).length, 0, platform + " unregisters on disable");

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
            click(render(), "Disable " + name);
            assert.equal(transformHooks.size, 0);
            message.content = input;
            if (desktop) hook("channel", message);
            else hook(message);
            assert.equal(message.content, input);
        }
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
                assert.equal(nativeTheme.semanticColors.BACKGROUND_PRIMARY[0], background);
                assert.equal(nativeTheme.semanticColors.TEXT_DEFAULT[0], text);
                assert.equal(nativeMode, mode);
            }
            click(render(), "Disable " + label);
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
    console.log(`PASS shared CX catalog with ${cxCatalog.plugins.length} plugins and ${cxCatalog.themes.length} themes, permission approval, both command adapters and strict palette migration`);
})().catch(error => { console.error(error); process.exitCode = 1; });
