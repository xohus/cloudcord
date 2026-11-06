const assert = require("node:assert/strict");
const { inspectPlugin, scan } = require("./cx-bulk-plugins.cjs");
const { loadCxRuntime } = require("./sync-cx-catalog.cjs");

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
const { parseCx, cxAppearanceTargets } = loadCxRuntime();
const candidate = inspect(source);
assert.equal(candidate.capability, "outgoing-text");
assert.equal(parseCx(candidate.cx).messageTransforms.length, 2);
assert.equal(inspect(source.replace('"a.b"', "/a.b/g")).cx, undefined);
assert.equal(inspect(source.replace('"x"', '"$&x"')).cx, undefined);
assert.equal(inspect(source.replace('import definePlugin', 'import "./unreviewed";\nimport definePlugin')).cx, undefined);
assert.equal(inspect(source.replace('name: "LiteralReplace",', 'name: "LiteralReplace", start() { fetch("/data"); },')).cx, undefined);
assert.equal(inspect(source.replace('name: "LiteralReplace",', 'name: "LiteralReplace", name: "Other",')).cx, undefined);

const matches = scan().filter(record => record.cx);
for (const name of ["ReverseText", "ClapText", "SpaceOut", "Starify", "VibeCheck"]) {
    const port = matches.find(record => record.name === name);
    assert.ok(port, name + " should compile");
    assert.equal(parseCx(port.cx).name, name);
}
for (const [key, rule] of Object.entries(cxAppearanceTargets)) {
    const port = matches.find(record => record.name === rule.plugin);
    assert.ok(port, rule.plugin + " should compile from the original stylesheet");
    assert.equal(parseCx(port.cx).hiddenTargets[0], key);
}
const tweak = 'import { defineTweak } from "@utils/cloudcordTweak";\n' +
    'export default defineTweak("HideBotTags", "Hides bot tags", "body { display: none; }");';
assert.equal(inspectPlugin("tweak.ts", tweak, "desktop", cxAppearanceTargets).cx, undefined);
console.log("PASS CX bulk conversion, original command sources and unsupported hook rejection");
