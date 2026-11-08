const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildBatchPlan, buildPlan, checkAppearancePaths, classifyPorts, fetchReviewedBetterDiscordSources, inspectPlugin, portFiles, scan, selectReadyPorts, verifyPorts } = require("./cx-bulk-plugins.cjs");
const { buildCatalog, loadCxRuntime } = require("./sync-cx-catalog.cjs");

const source = [
    '/* SPDX-License-Identifier: GPL-3.0-or-later */',
    'import definePlugin from "@utils/types";',
    'export default definePlugin({',
    '    name: "LiteralReplace",',
    '    onBeforeMessageSend(_, message) {',
    '        message.content = message.content.replaceAll("a.b", "x");',
    '    },',
    '    onBeforeMessageEdit(_, _id, message) {',
    '        message.content = message.content.replaceAll("c", "");',
    '    }',
    '});',
].join("\n");
const inspect = input => inspectPlugin("fixture.ts", input, "desktop");
const { activateCx, createCxSession, parseCx, cxAppearanceTargets, cxNativeEffects } = loadCxRuntime();
const candidate = inspect(source);
assert.equal(candidate.capability, "outgoing-text");
assert.deepEqual(candidate.hooks, ["outgoing-message"]);
assert.equal(parseCx(candidate.cx).messageTransforms.length, 2);
const catalog = buildCatalog();
const prospective = buildCatalog(new Map([["literal-replace.cx", candidate.cx]]));
assert.equal(prospective.plugins, catalog.plugins + 1);
assert.equal(prospective.themes, catalog.themes);
const previousLines = new Set(catalog.source.split("\n"));
const nextLines = new Set(prospective.source.split("\n"));
assert.ok([...previousLines].every(line => nextLines.has(line)), "adding a port keeps existing imports and catalog rows stable");
assert.equal(nextLines.size, previousLines.size + 2);
assert.throws(() => buildCatalog(new Map([["../invalid.cx", candidate.cx]])), /Invalid or existing CX filename/);
assert.throws(() => buildCatalog(new Map([["clap-text.cx", candidate.cx]])), /Invalid or existing CX filename/);
assert.throws(() => buildCatalog(new Map([["duplicate-probe.cx", candidate.cx.replace("LiteralReplace", "ClapText")]])), /Duplicate CX name/);
assert.equal(inspect(source.replace('"a.b"', "/a.b/g")).cx, undefined);
assert.equal(inspect(source.replace('"x"', '"$&x"')).cx, undefined);
assert.equal(inspect(source.replace('import definePlugin', 'import "./unreviewed";\nimport definePlugin')).cx, undefined);
assert.equal(inspect(source.replace('name: "LiteralReplace",', 'name: "LiteralReplace", start() { fetch("/data"); },')).cx, undefined);
assert.equal(inspect(source.replace('name: "LiteralReplace",', 'name: "LiteralReplace", name: "Other",')).cx, undefined);

const actionPlugin = (name, operation) => inspect(`import definePlugin from "@utils/types";
export default definePlugin({
    name: "${name}",
    contextMenus: { message: (children) => { children.push({ action: () => ${operation} }); } },
    flux: { MESSAGE_CREATE() { showToast("visible"); } },
    start() { openModal(); },
});`);
const copyPlugins = ["Copy one", "Copy two"].map(name => ({
    ...actionPlugin(name, 'copyToClipboard("value")'), status: "needs-adapter",
}));
const linkPlugin = { ...actionPlugin("Open URL", 'openExternal("https://example.org")'), status: "needs-adapter" };
assert.deepEqual(copyPlugins[0].behaviors, ["event:MESSAGE_CREATE → notification", "menu:message → clipboard"]);
const grouped = buildBatchPlan([...copyPlugins, linkPlugin]);
assert.deepEqual(grouped.behaviorBatches.map(({ behavior, count }) => [behavior, count]),
    [["event:MESSAGE_CREATE → notification", 3], ["menu:message → clipboard", 2]]);
assert.deepEqual(grouped.behaviorBatches[1].sources.map(({ name }) => name), ["Copy one", "Copy two"]);
const betterDiscordActions = inspectPlugin("menu.plugin.js", `/**
 * @name Menu actions
 */
module.exports = class {
    start() { ContextMenu.patch("message", () => ({ action: () => DiscordNative.clipboard.copy("value") })); }
    onUserContextMenu() { BdApi.UI.showToast("visible"); }
};`, "betterdiscord");
assert.deepEqual(betterDiscordActions.behaviors, ["menu:message → clipboard", "menu:user-context → notification"]);

const runtime = loadCxRuntime();
const batchPorts = selectReadyPorts([
    { name: "ClapText", file: "existing", cx: candidate.cx },
    { name: "Malformed", file: "invalid", cx: "unknown" },
    { name: "Duplicate command", file: "duplicate", cx: 'plugin "Duplicate command":\n  needs commands.register\n  needs messages.send\n  on command "ccp-count":\n    send "hello"\n' },
    candidate,
    candidate,
], catalog, runtime);
assert.deepEqual([...batchPorts.files.keys()], ["literal-replace.cx"]);
assert.deepEqual(batchPorts.skipped.map(({ file }) => file), ["existing", "invalid", "duplicate"]);
assert.match(batchPorts.skipped[2].reason, /duplicate CX command/);
assert.deepEqual([...selectReadyPorts([candidate], { ...catalog, plugins: 600 }, runtime).files], []);

const silentMessageAlias = {
    name: "AutoSilentMessage", file: "upstream-alias",
    cx: 'plugin "AutoSilentMessage":\r\n\r\n  needs messages.transform\r\n  before send silentMessage\r\n',
};
const duplicateBehavior = selectReadyPorts([silentMessageAlias, candidate, {
    ...candidate, name: "RenamedLiteralReplace", file: "batch-alias",
    cx: candidate.cx.replace("LiteralReplace", "RenamedLiteralReplace"),
}], catalog, runtime);
assert.deepEqual([...duplicateBehavior.files.keys()], ["literal-replace.cx"]);
assert.deepEqual(duplicateBehavior.skipped.map(({ file, reason }) => [file, reason]), [
    ["upstream-alias", "duplicate CX plugin behavior already provided by SilentMessageToggle"],
    ["batch-alias", "duplicate CX plugin behavior already provided by LiteralReplace"],
]);
assert.throws(() => buildCatalog(new Map([["auto-silent-message.cx", silentMessageAlias.cx]])),
    /Duplicate CX plugin behavior.*(?:AutoSilentMessage|SilentMessageToggle)/);

const records = scan(undefined, { includeCompanions: true });
assert.equal(records.find(record => record.name === "CCPCharacterCounter")?.status, "in-catalog");
const folders = records.find(record => record.name === "BetterFolders");
assert.equal(folders.status, "needs-adapter");
assert.ok(folders.companions.some(file => file.endsWith("/FolderSideBar.tsx")));
assert.ok(folders.companions.some(file => file.endsWith("/style.css")));
assert.ok(folders.targets.includes("css:grid-area"));
const compose = records.find(record => record.name === "CompactCompose");
assert.equal(compose.status, "needs-adapter");
assert.ok(compose.targets.includes("css:min-height"));
const matches = records.filter(record => record.cx);
const declutter = matches.find(record => record.name === "Declutter");
assert.equal(declutter?.capability, "configurable-appearance");
assert.equal(parseCx(declutter.cx).optionalHides.get("nameplates"), true);
assert.equal(parseCx(declutter.cx).optionalHides.get("avatar-decorations"), false);
const configured = 'plugin "Appearance fixture":\n  needs appearance.hide\n  option hide nameplates default-on\n  option hide chat-gift-button\n';
const hidden = new Set();
const appearanceHost = { hideAppearanceTarget(target) { hidden.add(target); return () => hidden.delete(target); } };
assert.throws(() => activateCx(configured, appearanceHost, [], ["chat-gift-button"]), /approval/);
assert.throws(() => activateCx(configured, appearanceHost, ["appearance.hide"], ["bot-tags"]), /Unknown selected/);
assert.throws(() => parseCx(configured + "  hide nameplates"), /duplicate appearance target/);
assert.equal(hidden.size, 0);
const restoreDefaults = activateCx(configured, appearanceHost, ["appearance.hide"]);
assert.deepEqual([...hidden], ["nameplates"]);
restoreDefaults();
const restoreSelected = activateCx(configured, appearanceHost, ["appearance.hide"], ["chat-gift-button"]);
assert.deepEqual([...hidden], ["chat-gift-button"]);
restoreSelected();
assert.equal(hidden.size, 0);
verifyPorts(portFiles([declutter]));
const liveOptions = createCxSession();
const appearanceFixture = "plugin:Appearance fixture";
liveOptions.enable(configured, {
    hideAppearanceTarget(target) {
        if (target === "chat-gift-button") throw new Error("Missing gift control");
        return appearanceHost.hideAppearanceTarget(target);
    },
}, ["appearance.hide"]);
assert.throws(() => liveOptions.setAppearanceOption(appearanceFixture, "bot-tags", true), /Unknown active/);
assert.throws(() => liveOptions.setAppearanceOption(appearanceFixture, "chat-gift-button", true), /Missing gift control/);
assert.deepEqual(Array.from(liveOptions.appearanceOptions(appearanceFixture), option => option.enabled), [true, false]);
liveOptions.setAppearanceOption(appearanceFixture, "nameplates", false);
assert.equal(hidden.size, 0);
liveOptions.setAppearanceOption(appearanceFixture, "nameplates", true);
liveOptions.disable(appearanceFixture);
assert.equal(hidden.size, 0);
assert.deepEqual(Array.from(liveOptions.appearanceOptions(appearanceFixture)), []);
const roleHeaders = matches.find(record => record.name === "NoRoleHeaders");
assert.deepEqual(Array.from(parseCx(roleHeaders.cx).nativeEffects), ["hide-role-headers"]);
verifyPorts(portFiles([roleHeaders]));
for (const [name, effect, permission] of [
    ["JumpToTop", "jump-to-first-message", "channels.jump"],
    ["ReadAllNotificationsButton", "read-all-servers-button", "servers.markread"],
]) {
    const port = matches.find(record => record.name === name);
    assert.equal(port?.capability, "native-effect");
    const parsed = parseCx(port.cx);
    assert.deepEqual(Array.from(parsed.nativeEffects), [effect]);
    assert.deepEqual(Array.from(parsed.permissions), [permission]);
    verifyPorts(portFiles([port]));
}
for (const name of ["RealtimeTimestamps", "CustomTimestamps"]) {
    const port = matches.find(record => record.name === name);
    assert.equal(port?.capability, "timestamp-format");
    const [file, source] = [...portFiles([port])][0];
    const original = path.resolve(__dirname, "../../..", port.file);
    assert.equal(fs.readFileSync(path.resolve(__dirname, "../../../examples/cx/catalog/plugins", file), "utf8").replaceAll("\r\n", "\n"), source);
    const code = fs.readFileSync(original, "utf8");
    assert.equal(inspectPlugin(port.file, code + "\n// Source changed", "desktop").cx, undefined);
    if (name === "CustomTimestamps") {
        const defaults = fs.readFileSync(path.join(path.dirname(original), "utils.tsx"), "utf8");
        assert.equal(inspectPlugin(port.file, code, "desktop", {}, {}, () => defaults + "\n// Changed defaults").cx, undefined);
    }
    assert.throws(() => parseCx(source + '  format timestamp cozy "LT"'), /duplicate timestamp target/);
}
const wikiLookup = matches.find(record => record.name === "WikiLookup");
assert.equal(wikiLookup?.capability, "external-lookup");
assert.equal(parseCx(wikiLookup.cx).commands[0].actions[0].service, "wikipedia");
const wikiSource = fs.readFileSync(path.join(__dirname, "../../..", wikiLookup.file), "utf8");
assert.equal(inspectPlugin(wikiLookup.file, wikiSource.replace("en.wikipedia.org", "untrusted.example"), "desktop").cx, undefined);
const stopAutoUnread = matches.find(record => record.name === "StopAutoUnread");
assert.equal(stopAutoUnread?.capability, "native-effect");
assert.deepEqual(Array.from(parseCx(stopAutoUnread.cx).nativeEffects), ["stop-auto-unread"]);
assert.deepEqual(Array.from(parseCx(stopAutoUnread.cx).permissions), ["notifications.preventautoupgrade"]);
const stopAutoUnreadSource = fs.readFileSync(path.join(__dirname, "../../..", stopAutoUnread.file), "utf8");
assert.equal(inspectPlugin(stopAutoUnread.file, stopAutoUnreadSource.replace("return !1;", "return !0;"), "desktop", {}, cxNativeEffects).cx, undefined);
const staticTyping = matches.find(record => record.name === "NoTypingAnimation");
const imageLink = matches.find(record => record.name === "ImageLink");
assert.equal(parseCx(imageLink.cx).nativeEffects[0], "preserve-image-links");
const imageLinkSource = fs.readFileSync(path.join(__dirname, "../../..", imageLink.file), "utf8");
assert.equal(inspectPlugin(imageLink.file, imageLinkSource.replace('replace: "false"', 'replace: "true"'), "desktop", {}, cxNativeEffects).cx, undefined);
assert.equal(staticTyping?.capability, "native-effect");
assert.deepEqual(Array.from(parseCx(staticTyping.cx).nativeEffects), ["static-typing-dots"]);
const staticTypingSource = fs.readFileSync(path.join(__dirname, "../../..", staticTyping.file), "utf8");
assert.equal(inspectPlugin(staticTyping.file, staticTypingSource.replace("dotCycle", "otherCycle"), "desktop", {}, cxNativeEffects).cx, undefined);
const fixExtensions = matches.find(record => record.name === "FixFileExtensions");
assert.deepEqual(Array.from(parseCx(fixExtensions.cx).permissions), ["uploads.rename"]);
assert.deepEqual(Array.from(parseCx(fixExtensions.cx).nativeEffects), ["fix-file-extensions"]);
const anonymous = matches.find(record => record.name === "AnonymiseFileNames");
assert.equal(anonymous?.capability, "upload-naming");
assert.equal(parseCx(anonymous.cx).uploadNaming.length, 7);
assert.equal(parseCx(anonymous.cx).commands[0].name, "spoiler");
verifyPorts(new Map([["anonymise-file-names.cx", anonymous.cx]]));
for (const [mode, expected] of [['consistent "document" manual', /^document\.png$/], ["timestamp", /^\d{13}\.png$/]]) {
    let naming;
    const stop = activateCx(anonymous.cx.replace("random 7", mode), {
        registerUploadAnonymiser(value) { naming = value; return () => { naming = undefined; }; },
        registerCommand() { return () => {}; },
    }, ["uploads.rename", "commands.register", "reply.local"]);
    const upload = { filename: "my-name.png" };
    if (mode.endsWith("manual")) {
        naming.apply([upload]);
        assert.equal(upload.filename, "my-name.png");
        naming.setAnonymous(upload, true);
    }
    naming.apply([upload]);
    assert.match(upload.filename, expected);
    naming.setAnonymous(upload, false);
    upload.filename = upload.filename.replace(/\.png$/, ".jpg");
    naming.apply([upload]);
    assert.equal(upload.filename, "my-name.jpg");
    stop();
    assert.equal(naming, undefined);
}
const reactionPorts = matches.filter(record => record.name === "BetterPlusReacts");
assert.deepEqual(reactionPorts.map(record => record.platform).sort(), ["desktop", "mobile"]);
assert.equal(reactionPorts[0].cx, reactionPorts[1].cx);
assert.deepEqual([...portFiles(reactionPorts).keys()], ["better-plus-reacts.cx"]);
assert.throws(() => portFiles([reactionPorts[0], { ...reactionPorts[1], cx: reactionPorts[1].cx + "\n" }]), /Ambiguous output name/);
const statuses = records => classifyPorts(records, new Set(), false).map(record => record.status);
assert.deepEqual(statuses(reactionPorts), ["ready", "equivalent-source"]);
const linkPorts = matches.filter(record => record.name === "HopOn");
assert.deepEqual(statuses(linkPorts), ["ready", "equivalent-source"]);
for (const port of linkPorts) {
    assert.equal(port.capability, "link-trigger");
    assert.ok(port.targets.includes("event:MESSAGE_CREATE"));
    assert.equal(parseCx(port.cx).incoming[0].kind, "open-link");
    const original = fs.readFileSync(path.resolve(__dirname, "../../..", port.file), "utf8");
    assert.equal(inspectPlugin(port.file, original + "\n// Source changed", port.platform).cx, undefined);
}
const profileColorPorts = matches.filter(record => record.name === "FakeProfileThemes");
assert.deepEqual(statuses(profileColorPorts), ["ready", "equivalent-source"]);
for (const port of profileColorPorts) {
    assert.equal(port.capability, "profile-bio-colors");
    assert.equal(parseCx(port.cx).incoming[0].values[0], "prefer-native");
    assert.equal(parseCx(port.cx).commands[0].name, "cx-profile-colors");
}
const splitPorts = matches.filter(record => record.name === "SplitLargeMessages");
assert.deepEqual(statuses(splitPorts), ["ready", "equivalent-source"]);
assert.deepEqual(Array.from(parseCx(splitPorts[0].cx).nativeEffects), ["split-long-messages"]);
assert.deepEqual(statuses([reactionPorts[0], { ...reactionPorts[1], platform: "betterdiscord" }]), ["compare-sources", "source-review"]);
assert.deepEqual(statuses([reactionPorts[0], { ...reactionPorts[1], cx: undefined }]), ["compare-mobile", "needs-adapter"]);
assert.deepEqual(Array.from(parseCx(reactionPorts[0].cx).permissions), ["messages.reactshortcut"]);
for (const [name, platform, rule] of [["HideSystemMessages", "desktop", "hide-system"], ["NoProfileThemes", "mobile", "hide-profile-themes"]]) {
    const port = matches.find(record => record.name === name && record.platform === platform);
    assert.equal(port?.capability, "incoming-filter");
    assert.equal(parseCx(port.cx).incoming[0].kind, rule);
}
for (const [name, kind] of [["VoiceJoinMessages", "friends-voice"], ["FollowVoiceUser", "follow-voice"], ["RelationshipNotifier", "friend-removals"]]) {
    const port = matches.find(record => record.name === name && record.platform === "mobile");
    assert.equal(port?.capability, "social-event");
    assert.equal(parseCx(port.cx).incoming[0].kind, kind);
}
const embedded = matches.find(record => record.name === "EmbeddedURLs");
assert.equal(embedded?.capability, "origin-rewrite");
assert.equal(parseCx(embedded.cx).messageTransforms.length, 5);
for (const [name, kind] of [["SedEnhanced", "correct"], ["MessageBurst", "merge"]]) {
    const port = matches.find(record => record.name === name && record.platform === "mobile");
    assert.equal(port?.capability, "previous-edit");
    assert.equal(parseCx(port.cx).previousRule.kind, kind);
}
for (const [name, effect] of [["SilentTyping", "silent-typing"], ["NoPendingCount", "pending-friend-count"], ["AlwaysAnimate", "animated-assets"], ["DontRoundMyTimestamps", "floor-relative-time"]]) {
    const port = matches.find(record => record.name === name && record.platform === "mobile");
    assert.equal(port?.capability, "native-effect");
    assert.equal(parseCx(port.cx).nativeEffects[0], effect);
}
for (const [name, count] of [["InRole", 1], ["ReadAllNotifications", 1], ["SpotifyShareCommands", 3], ["AtSomeone", 1], ["FriendInvites", 3]]) {
    const port = matches.find(record => record.name === name && record.platform === "mobile");
    assert.equal(port?.capability, "client-command");
    assert.equal(parseCx(port.cx).commands.length, count);
}
for (const name of ["NoBlockedMessages", "BlockKeywords", "ClientSideBlock"]) {
    const port = matches.find(record => record.name === name && record.platform === "mobile");
    assert.equal(port?.capability, "incoming-filter");
    assert.equal(parseCx(port.cx).incoming.length, 1);
    const source = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../../..", port.file), "utf8");
    assert.equal(inspectPlugin(port.file, source.replace("start() {", 'start() { fetch("/");'), "mobile").cx, undefined);
}
for (const name of ["ReverseText", "ClapText", "SpaceOut", "Starify", "VibeCheck"]) {
    const port = matches.find(record => record.name === name);
    assert.ok(port, name + " should compile");
    assert.equal(parseCx(port.cx).name, name);
}
for (const [key, rule] of Object.entries(cxAppearanceTargets)) {
    if (rule.desktopOnly) continue;
    const port = matches.find(record => record.name === rule.plugin);
    assert.ok(port, rule.plugin + " should compile from the original stylesheet");
    const document = parseCx(port.cx);
    assert.equal(("style" in rule ? document.styledTargets : document.hiddenTargets)[0], key);
}
const tweak = 'import { defineTweak } from "@utils/cloudcordTweak";\n' +
    'export default defineTweak("HideBotTags", "Hides bot tags", "body { display: none; }");';
assert.equal(inspectPlugin("tweak.ts", tweak, "desktop", cxAppearanceTargets).cx, undefined);

const styles = [cxAppearanceTargets["bot-tags"].css, cxAppearanceTargets["profile-effects"].css].join("\n");
const combinedTweak = tweak.replace('"HideBotTags"', '"CompactProfiles"').replace('"body { display: none; }"', JSON.stringify(styles));
const inspectTweak = code => inspectPlugin("tweak.ts", code, "desktop", cxAppearanceTargets);
assert.equal(inspectTweak(tweak.replace('"body { display: none; }"',
    JSON.stringify(cxAppearanceTargets["voice-krisp-button"].css))).cx, undefined);
const avatarTweak = (name, size) => inspectTweak(tweak.replace('"HideBotTags"', JSON.stringify(name))
    .replace('"body { display: none; }"', JSON.stringify(`[class*="avatar"] { width: ${size}px; height: ${size}px; }`)));
const avatarBatch = buildBatchPlan([avatarTweak("Larger avatar", 48), avatarTweak("Smaller avatar", 32)]
    .map(record => ({ ...record, status: "needs-adapter" })));
assert.equal(avatarBatch.batches[0].anchor, 'style:[class*="avatar"] → height, width');
assert.equal(avatarBatch.batches[0].sources.length, 2);
assert.deepEqual(avatarBatch.unbatched, []);
assert.equal(inspectTweak(tweak.replace('"body { display: none; }"', '"@media print { body { display: none; } }"'))
    .targets.some(target => target.startsWith("selector:")), false);
assert.deepEqual([...parseCx(inspectTweak(combinedTweak).cx).hiddenTargets], ["bot-tags", "profile-effects"]);
const reformattedStyles = styles.replaceAll(" { ", "{\n  ").replaceAll(": ", ":").replaceAll("; }", "\n}\n");
assert.deepEqual([...parseCx(inspectTweak(combinedTweak.replace(JSON.stringify(styles), JSON.stringify(reformattedStyles))).cx).hiddenTargets], ["bot-tags", "profile-effects"]);
assert.equal(inspectTweak(combinedTweak.replace(JSON.stringify(styles), JSON.stringify(styles + "body { display: none; }"))).cx, undefined);
assert.equal(inspectTweak(combinedTweak.replace(JSON.stringify(styles), JSON.stringify(styles.replace("none", "block")))).cx, undefined);
assert.equal(inspectTweak(combinedTweak.replace(');', ', getOptions());')).cx, undefined);
const managedStyle = [
    '/* SPDX-License-Identifier: GPL-3.0-or-later */',
    'import definePlugin from "@utils/types";',
    'import { enableStyle, disableStyle } from "@api/Styles";',
    'import style from "./style.css?managed";',
    'export default definePlugin({ name: "Managed Appearance", start: () => enableStyle(style), stop: () => disableStyle(style) });',
].join("\n");
const inspectManaged = (code, css = styles) => inspectPlugin("managed/index.ts", code, "desktop", cxAppearanceTargets, {}, name => {
    assert.equal(name, "style.css");
    return css;
});
assert.deepEqual([...parseCx(inspectManaged(managedStyle).cx).hiddenTargets], ["bot-tags", "profile-effects"]);
assert.equal(inspectManaged(managedStyle.replace("./style.css", "../style.css")).cx, undefined);
assert.equal(inspectManaged(managedStyle.replace("disableStyle(style)", "enableStyle(style)")).cx, undefined);
assert.equal(inspectManaged(managedStyle.replace("enableStyle(style)", '{ enableStyle(style); fetch("/data"); }')).cx, undefined);
assert.equal(inspectManaged(managedStyle.replace("import { enableStyle", "import type { enableStyle")).cx, undefined);
assert.equal(inspectManaged(managedStyle, styles + "body { display: none; }").cx, undefined);
const bd = [
    "/**",
    " * @name ReduceVisualClutter",
    " * SPDX-License-Identifier: MIT",
    " */",
    "module.exports = class {",
    '    start() { BdApi.DOM.addStyle("clean", ' + JSON.stringify(styles) + '); }',
    '    stop() { BdApi.DOM.removeStyle("clean"); }',
    "};",
].join("\n");
const inspectBd = code => inspectPlugin("example.plugin.js", code, "betterdiscord", cxAppearanceTargets);
const bundledHides = '[class*="chipletContainer"]{display:none!important}'
    + '[class*="botTag"],[class*="clanTag"]{display:none!important}';
const expectedHides = ["bot-tags", "server-tags"];
assert.deepEqual([...parseCx(inspectTweak(combinedTweak.replace(JSON.stringify(styles), JSON.stringify(bundledHides))).cx).hiddenTargets].sort(), expectedHides);
assert.deepEqual([...parseCx(inspectManaged(managedStyle, bundledHides).cx).hiddenTargets].sort(), expectedHides);
assert.deepEqual([...parseCx(inspectBd(bd.replace(JSON.stringify(styles), JSON.stringify(bundledHides))).cx).hiddenTargets].sort(), expectedHides);
for (const stylesheet of [
    bundledHides.replace('[class*="chipletContainer"]{display:none!important}', ""),
    bundledHides + 'body{display:none!important}',
    bundledHides + '[class*="botTag"]{display:block!important}',
    "@media print{" + bundledHides + "}",
]) assert.equal(inspectManaged(managedStyle, stylesheet).cx, undefined);
const external = '/**\n * @name Reviewed avatar test\n */\nconst VALID_SIZES = [256, 512];';
const reviewed = require("./cx-betterdiscord-sources.json");
const digest = require("node:crypto").createHash("sha256").update(external, "utf8").digest("hex");
try {
    reviewed[digest] = { name: "Reviewed avatar test", recipe: "avatar-resolution", license: "MIT" };
    assert.equal(parseCx(inspectBd(external).cx).avatarResolution, 256);
    assert.equal(inspectBd(external).review.sha256, digest);
    assert.equal(inspectBd(external.replace("256", "4096")).cx, undefined);
} finally {
    delete reviewed[digest];
}
const replyDefault = '/**\n * @name Reviewed reply default\n */\nmodule.exports = class {};';
const replyDigest = require("node:crypto").createHash("sha256").update(replyDefault).digest("hex");
try {
    reviewed[replyDigest] = { name: "Reviewed reply default", recipe: "reply-ping-default", license: "Unlicense" };
    const compiled = inspectBd(replyDefault);
    assert.equal(compiled.review.sha256, replyDigest);
    assert.equal(parseCx(compiled.cx).incoming[0].kind, "reply-ping-default");
    assert.equal(inspectBd(replyDefault + "// modified").cx, undefined);
    verifyPorts(new Map([["reviewed-reply-default.cx", compiled.cx]]));
} finally {
    delete reviewed[replyDigest];
}
const bdPort = inspectBd(bd);
const typingQuirk = [
    "/**", " * @name Reviewed typing rules", " */",
    "module.exports = class { constructor() { this.quirkPatterns = [",
    '{ name: "phrase", regex: /\\b(foo|bar)\\b/gi, replace: "test" },',
    '{ name: "pair", regex: /[eE][eE]/g, replace: "33" },',
    '{ name: "prefix", regex: /^/, replace: "> " },',
    "]; } };",
].join("\n");
const typingDigest = require("node:crypto").createHash("sha256").update(typingQuirk).digest("hex");
try {
    reviewed[typingDigest] = { name: "Reviewed typing rules", recipe: "typing-rules", license: "Unlicense" };
    const compiled = inspectBd(typingQuirk.replaceAll("\n", "\r\n"));
    assert.equal(compiled.review.sha256, typingDigest);
    assert.equal(parseCx(compiled.cx).messageTransforms[0].rules.length, 3);
    assert.equal(inspectBd(typingQuirk.replace('"test"', '"tampered"')).cx, undefined);
    assert.throws(() => parseCx(compiled.cx.replace('["foo","bar"]', '[""]')), /text alternatives/);
    assert.throws(() => parseCx(compiled.cx.replace("    prefix", "    fetch")), /Unknown text rewrite rule/);
    verifyPorts(new Map([["reviewed-typing-rules.cx", compiled.cx]]));
} finally {
    delete reviewed[typingDigest];
}
assert.equal(bdPort.capability, "appearance");
assert.equal(parseCx(bdPort.cx).hiddenTargets.join(","), "bot-tags,profile-effects");
assert.equal(inspectBd(bd.replace('removeStyle("clean")', 'removeStyle("other")')).cx, undefined);
assert.equal(inspectBd(bd.replace("SPDX-License-Identifier: MIT", "License unavailable")).cx, undefined);
assert.equal(inspectBd(bd.replace("start() {", "start() { fetch('/');")).cx, undefined);
assert.equal(inspectBd(bd.replace("class {", "class extends Global {")).cx, undefined);
assert.equal(inspectBd(bd.replace(JSON.stringify(styles), JSON.stringify(styles + " body { display: none; }"))).cx, undefined);
verifyPorts(new Map([["reduce-visual-clutter.cx", bdPort.cx], ["literal-replace.cx", candidate.cx]]));
const mixedPort = inspectBd(bd.replace(JSON.stringify(styles), JSON.stringify(styles + "\n" + cxAppearanceTargets["underlined-links"].css)));
assert.equal(parseCx(mixedPort.cx).styledTargets[0], "underlined-links");
verifyPorts(new Map([["mixed-appearance.cx", mixedPort.cx]]));
assert.throws(() => verifyPorts(new Map([["bad.cx", bdPort.cx.replace("hide bot-tags", "hide everything")]])), /^Error: bad.cx:/);
const plan = buildPlan([
    { ...bdPort, status: "ready" },
    { ...bdPort, file: "second.plugin.js", status: "compare-sources" },
    { ...candidate, status: "needs-adapter" },
]);
assert.equal(plan.sources, 3);
assert.equal(plan.distinctPluginNames, 2);
assert.equal(plan.groups.find(group => group.hooks === "appearance").plugins[0].sources.length, 2);
const voiceSource = source.replace('name: "LiteralReplace",', 'name: "Voice Example", start() { findByProps("selectVoiceChannel"); },')
    .replace('import definePlugin', 'import { findByProps } from "@webpack";\nimport definePlugin');
const target = inspect(voiceSource);
assert.ok(target.targets.includes("module:selectVoiceChannel"));
const patchAndMenu = inspect(source.replace('name: "LiteralReplace",', `name: "Patch Example",
    patches: [{ find: "ChannelCallHeader", replacement: { match: /old/, replace: "new" } }],
    contextMenus: { "image-context": () => {}, [dynamicMenu]: () => {} },`));
assert.ok(patchAndMenu.targets.includes("patch:ChannelCallHeader"));
assert.deepEqual(patchAndMenu.targets.filter(target => target.startsWith("menu:")), ["menu:image-context"]);
const betterDiscordAnchors = inspectPlugin("fixture.plugin.js", [
    "/**",
    " * @name AnchorExample",
    " */",
    "module.exports = class {",
    '    start() {',
    '        this.modulePatches = { after: ["MemberList", dynamic] };',
    '        BdApi.ContextMenu.patch("message", handler);',
    '        BdApi.Patcher.after("AnchorExample", UserStore, "getCurrentUser", handler);',
    '        BdApi.Patcher.after(ChannelStore, "getChannel", handler);',
    '        BdApi.Webpack.Filters.byKeys("getActivities");',
    '        BdApi.DOM.addStyle("anchor", ".sample { opacity: .5 }");',
    "    }",
    "};",
].join("\n"), "betterdiscord");
assert.deepEqual(betterDiscordAnchors.targets, [
    "component:MemberList", "css:opacity", "menu:message", "method:ChannelStore.getChannel", "method:UserStore.getCurrentUser",
    "module:getActivities", "selector:.sample", "store:ChannelStore", "store:UserStore", "style:.sample → opacity",
]);
assert.equal(betterDiscordAnchors.cx, undefined);
const nativeAnchor = inspect(source.replace('name: "LiteralReplace",', 'name: "LiteralReplace", start() { findByFilePath("modules/chat/native/MemberList.tsx"); },'));
assert.ok(nativeAnchor.targets.includes("native:modules/chat/native/MemberList.tsx"));
assert.ok(nativeAnchor.targets.includes("component:MemberList"));
const adapterPlan = buildPlan([
    { ...target, status: "needs-adapter" },
    { ...target, platform: "mobile", status: "needs-adapter" },
    { ...target, name: "Another Voice Example", platform: "betterdiscord", status: "needs-adapter" },
]);
const voiceQueue = adapterPlan.adapterQueues.find(queue => queue.target === "module:selectVoiceChannel");
assert.equal(voiceQueue.count, 2);
assert.deepEqual(voiceQueue.plugins[0].platforms, ["desktop", "mobile"]);
const batchSource = (name, platform, status, ...targets) => ({ name, platform, status, targets });
const batches = buildBatchPlan([
    batchSource("Shared", "desktop", "needs-adapter", "event:MESSAGE_CREATE", "module:open"),
    batchSource("shared", "mobile", "needs-adapter", "event:MESSAGE_CREATE"),
    batchSource("Event only", "desktop", "needs-adapter", "event:MESSAGE_CREATE", "store:UserStore"),
    batchSource("Other event", "betterdiscord", "needs-adapter", "event:MESSAGE_CREATE"),
    batchSource("Module one", "desktop", "needs-adapter", "module:open", "store:UserStore"),
    batchSource("Module two", "mobile", "needs-adapter", "module:open", "store:UserStore"),
    batchSource("Already converted", "desktop", "in-catalog", "module:open"),
    batchSource("already converted", "mobile", "needs-adapter", "module:open"),
    batchSource("Ready", "desktop", "ready", "event:MESSAGE_CREATE"),
    batchSource("Compare", "desktop", "compare-mobile", "event:MESSAGE_CREATE"),
    batchSource("Review", "betterdiscord", "source-review", "event:MESSAGE_CREATE"),
]);
assert.equal(batches.sources, 11);
assert.equal(batches.distinct, 9);
assert.deepEqual([batches.ready, batches.compare, batches.review, batches.pending, batches.covered], [1, 1, 1, 5, 5]);
assert.deepEqual(batches.batches.map(({ anchor, distinct, additional, mobileSources }) => [anchor, distinct, additional, mobileSources]),
    [["module:open", 3, 3, 2], ["event:MESSAGE_CREATE", 3, 2, 0]]);
assert.deepEqual(batches.batches[1].plugins, ["Event only", "Other event"]);
assert.deepEqual(buildBatchPlan([
    batchSource("Unique", "desktop", "needs-adapter", "patch:unique"),
]).unbatched, [{ name: "Unique", sources: [{ file: undefined, platform: "desktop", hooks: undefined, targets: ["patch:unique"] }] }]);
const recipePriority = buildBatchPlan([
    batchSource("One", "desktop", "needs-adapter", "recipe:hide-component", "event:MESSAGE_CREATE"),
    batchSource("Two", "desktop", "needs-adapter", "recipe:hide-component", "event:MESSAGE_CREATE"),
    batchSource("Three", "desktop", "needs-adapter", "event:MESSAGE_CREATE"),
]);
assert.equal(recipePriority.batches[0].anchor, "recipe:hide-component");
assert.equal(recipePriority.covered, 2);
const clipboardPort = inspectPlugin("clipboard.ts", `
    import { copyToClipboard as copy } from "@utils/clipboard";
    export default definePlugin({ name: "Copy Message", contextMenus: { message() { copy("example"); } } });
`, "desktop");
const mobileClipboardPort = inspectPlugin("clipboard.ts", `
    export default defineCorePlugin({ name: "Copy Profile", start() { Clipboard.setString("example"); } });
`, "mobile");
const betterDiscordClipboardPort = inspectPlugin("clipboard.plugin.js", `/**
 * @name Copy Message
 */
module.exports = class { start() { DiscordNative.clipboard.copy("example"); } };
`, "betterdiscord");
const modalPort = inspectPlugin("modal.ts", `
    export default definePlugin({ name: "Message Details", contextMenus: { message() { openModal(() => null); } } });
`, "desktop");
const operationPlan = buildBatchPlan(classifyPorts([clipboardPort, mobileClipboardPort, betterDiscordClipboardPort, modalPort], new Set()));
assert.deepEqual(operationPlan.operationBatches.map(({ operation, count, mobileSources }) => [operation, count, mobileSources]), [["clipboard", 2, 1]]);
assert.deepEqual(operationPlan.operationBatches[0].plugins.map(plugin => plugin.name), ["Copy Message", "Copy Profile"]);
assert.equal(operationPlan.operationBatches[0].plugins[0].sources.length, 2);
assert.equal(operationPlan.ready, 0);
assert.deepEqual(checkAppearancePaths({
    route: { plugin: "Route", mobile: { settingsEntry: "native/Route.tsx" } },
    component: { plugin: "Component", mobile: { hideComponentPaths: ["native/First.tsx", "native/Second.tsx"] } },
    nameOnly: { plugin: "Name", mobile: ["NamedComponent"] },
}, {
    Android: new Set(["native/Route.tsx", "native/First.tsx", "native/Second.tsx"]),
    iOS: new Set(["native/Route.tsx", "native/First.tsx"]),
}), { checked: 2, missing: [{ plugin: "Component", platform: "iOS", path: "native/Second.tsx" }] });
async function testReviewedFetch() {
    const code = "reviewed source\n";
    const hash = require("node:crypto").createHash("sha256").update(code).digest("hex");
    const rev = "a".repeat(40);
    const source = "https://github.com/Owner/Repo/blob/" + rev + "/folder/Example.plugin.js";
    const sources = { [hash]: { name: "Example", source } };
    const fetched = await fetchReviewedBetterDiscordSources(sources, (url, options) => {
        assert.equal(url, "https://raw.githubusercontent.com/Owner/Repo/" + rev + "/folder/Example.plugin.js");
        assert.equal(options.redirect, "error");
        assert.ok(options.signal);
        return new Response(code.replaceAll("\n", "\r\n"));
    });
    assert.deepEqual(fetched, [{ file: "Owner/Repo/folder/Example.plugin.js", code: "reviewed source\r\n", sha256: hash }]);
    await assert.rejects(fetchReviewedBetterDiscordSources(sources, () => new Response("changed")), /hash differs/);
    await assert.rejects(fetchReviewedBetterDiscordSources(sources, () => new Response("", { status: 404 })), /HTTP 404/);
    await assert.rejects(fetchReviewedBetterDiscordSources(sources, () => new Response("x".repeat(512 * 1024 + 1))), /exceeds 512 KiB/);
    await assert.rejects(fetchReviewedBetterDiscordSources({ [hash]: { name: "Example", source: source.replace(rev, "main") } }, () => {
        assert.fail("An unpinned source must never be fetched");
    }), /Invalid reviewed source pin/);
}

testReviewedFetch().then(() => {
    console.log("PASS CX bulk conversion, reviewed source download, original command sources and unsupported hook rejection");
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
