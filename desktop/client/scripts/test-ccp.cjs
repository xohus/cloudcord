const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("esbuild");

const client = path.resolve(__dirname, "..");
function load(file, dependencies = {}) {
    const module = { exports: {} };
    const code = transformSync(fs.readFileSync(file, "utf8"), { loader: "ts", format: "cjs" }).code;
    vm.runInNewContext(code, {
        module,
        require(name) {
            assert.ok(Object.hasOwn(dependencies, name), "Unexpected dependency: " + name);
            return dependencies[name];
        },
    });
    return module.exports;
}

const runtime = load(path.join(client, "src/utils/ccp.ts"));
const inspector = load(path.join(client, "src/utils/ccpInspect.ts"));
const desktop = path.join(client, "src/sincordplugins/ccpCharacterCounter");
const source = fs.readFileSync(path.join(desktop, "character-counter.ccp"), "utf8");
const { ccpCommandCapabilities: capabilities, parseCcp } = runtime;
assert.throws(() => parseCcp(source.replace("ccp 1", "ccp 2"), capabilities), /version/);
assert.throws(() => parseCcp(source, new Set(["command.register"])), /reply.local/);
assert.throws(() => parseCcp(source.replace("length(text)", "eval(text)"), capabilities), /literal text/);
assert.throws(() => parseCcp(source + "\nnetwork.send(text)", capabilities), /single command handler/);

const replies = [];
const copied = [];
const store = { getCurrentUser: () => ({ privateValue: "do not copy this" }) };
const moduleExports = { example() {}, get lazy() { throw new Error("Getter should stay lazy"); } };
const context = { channel: { id: "test-channel" } };
const args = [{ name: "text", value: "Cloud ☁️" }];
const commandTypes = { ApplicationCommandOptionType: { STRING: 3 } };
const desktopPlugin = load(path.join(desktop, "index.ts"), {
    "@api/Commands": {
        ...commandTypes,
        ApplicationCommandInputType: { BUILT_IN: 0 },
        findOption: (options, name, fallback) => options.find(option => option.name === name)?.value ?? fallback,
        sendBotMessage: (channel, message) => replies.push([channel, message.content]),
    },
    "@utils/ccp": runtime,
    "@utils/ccpInspect": inspector,
    "@utils/clipboard": { copyToClipboard: text => copied.push(JSON.parse(text)) },
    "@webpack": { wreq: { c: { 1: { exports: moduleExports } } } },
    "@webpack/common": { UserStore: store },
    "@utils/types": plugin => plugin,
    "./character-counter.ccp": source,
}).default;
desktopPlugin.commands[0].execute(args, context);

const mobileCommands = new Map();
const mobileReport = load(path.resolve(client, "../../ios/runtime/src/lib/api/ccpReport.ts"), {
    "@lib/api/ccpInspect": inspector,
    "@metro": { findByStoreName: name => name === "UserStore" ? store : null },
    "@metro/common": { clipboard: { setString: text => copied.push(JSON.parse(text)) } },
});
const mobilePlugin = load(path.resolve(client, "../../ios/runtime/src/core/plugins/ccpCharacterCounter/index.ts"), {
    "..": { defineCorePlugin: plugin => plugin },
    "@lib/api/ccp": runtime,
    "@lib/api/ccpReport": mobileReport,
    "@lib/api/commands": {
        registerCommand(command) {
            assert.equal(mobileCommands.has(command.name), false);
            mobileCommands.set(command.name, command);
            return () => { mobileCommands.delete(command.name); };
        },
    },
    "@lib/api/commands/types": commandTypes,
    "@metro/common": {
        messageUtil: { sendBotMessage: (channel, content) => replies.push([channel, content]) },
    },
    "./character-counter.ccp": source,
}).default;
mobilePlugin.start();
mobilePlugin.start();
const commandName = desktopPlugin.commands[0].name;
for (const command of mobileCommands.values()) {
    assert.notEqual(command.shouldHide(), false, "Mobile's command filter must show the command");
}
mobileCommands.get(commandName).execute(args, context);
assert.deepEqual(replies, [["test-channel", "8 characters"], ["test-channel", "8 characters"]]);

(async () => {
    await desktopPlugin.commands[1].execute([], context);
    await mobileCommands.get("ccp-inspect").execute([], context);
    assert.deepEqual(copied.map(report => report.platform), ["desktop", "mobile"]);
    assert.deepEqual(copied[0].modules[0], { id: "1", exports: "object", methods: ["example"], accessorNames: ["lazy"] });
    assert(copied.every(report => report.checks["UserStore.getCurrentUser"] === "object"));
    assert(!JSON.stringify(copied).includes("do not copy this"));
    mobilePlugin.stop();
    assert.equal(mobileCommands.size, 0);
    console.log("PASS CCP validation, platform results, local diagnostics and mobile cleanup");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
