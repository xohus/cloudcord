const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("esbuild");

const root = path.join(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const moduleBox = { exports: {} };
const code = transformSync(read("desktop/client/src/utils/cx.ts"), { loader: "ts", format: "cjs" }).code;
vm.runInNewContext(code, { module: moduleBox });
const { activateCx, createCxSession, parseCx, reviewCx } = moduleBox.exports;
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
    assert.throws(() => parseCx(counter.replace("length(text)", "token")), /only length/);
    assert.throws(() => parseCx(counter.replace('  needs reply.local', '  needs ui.toast')), /permissions/);
    assert.throws(() => parseCx(counter.replace('  needs reply.local', '  needs reply.local\n  needs ui.toast')), /unused/);

    for (const platform of ["desktop", "mobile"]) {
        const desktop = platform === "desktop";
        const states = [], registered = {}, delivered = [];
        let cursor = 0;
        const useState = initial => {
            const index = cursor++;
            if (!(index in states)) states[index] = initial;
            return [states[index], value => { states[index] = value; }];
        };
        const jsx = (type, props) => ({ type, props });
        const commandApi = {
            commands: registered,
            ApplicationCommandInputType: { BUILT_IN: 0 },
            ApplicationCommandOptionType: { STRING: 3 },
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
            "react/jsx-runtime": { jsx, jsxs: jsx },
            "@api/Commands": commandApi,
            "@api/Notifications": {},
            "@utils/cx": moduleBox.exports,
            "@utils/types": { __esModule: true, default: value => value },
            "@webpack/common": { useState },
            "@lib/api/cx": moduleBox.exports,
            "@lib/api/commands": commandApi,
            "@lib/api/commands/types": commandApi,
            "@lib/addons/themes": {},
            "@lib/addons/themes/colors/updater": {},
            "@lib/api/native/modules": {},
            "@lib/api/native/loader": {},
            "@lib/api/settings": { settings: {} },
            "@lib/ui/toasts": {},
            "@metro": {},
            "@metro/common": { React: { useState }, commands: { getBuiltInCommands: () => [] }, messageUtil: commandApi },
            "@metro/common/components": { Stack: "Stack", TableRow: "TableRow", TableRowGroup: "TableRowGroup" },
            "react-native": { ScrollView: "ScrollView", Text: "Text", TextInput: "TextInput" },
        };
        vm.runInNewContext(transformSync(read(adapter), { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
            module,
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
        click(render(), "Review CX");
        assert.equal(Object.keys(registered).length, 0, platform + " waits for approval");
        click(render(), "Allow for this session");
        const command = registered["ccp-count"];
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        click(render(), "Disable CX Character Counter");
        command.execute([{ name: "text", value: "abc" }], { channel: { id: "test-channel" } });
        assert.deepEqual(delivered, [["test-channel", "3 characters"]]);
        assert.equal(Object.keys(registered).length, 0, platform + " unregisters on disable");
    }
    const { migrateCxPalette } = await import("../../desktop/client/scripts/cx-migrate-palette.mjs");
    assert.equal(parseCx(migrateCxPalette(":root { --background-primary: #123; --brand-500: #8765ab; }", "Test")).background, "#112233");
    assert.throws(() => migrateCxPalette('@import "https://example.com/a.css"; :root { --background-primary: #123; }', "Test"), /manual port/);
    assert.throws(() => migrateCxPalette(":root { --background-primary: #123; } .chat { display: none; }", "Test"), /manual port/);
    assert.throws(() => migrateCxPalette(":root { --background-primary: #123; --bg: url(a); }", "Test"), /manual port/);
    console.log("PASS CX counter parity, both approval and reply adapters, and strict palette migration");
})().catch(error => { console.error(error); process.exitCode = 1; });
