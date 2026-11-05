const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const esbuild = require("esbuild");
let active = null;
const imported = [];
const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: () => [active, value => { active = value; }]
};
const moduleObject = { exports: {} };
const realm = { module: moduleObject, exports: moduleObject.exports, require(name) {
    if (name === "./styles.css") return {};
    if (name === "@webpack/common") return { React };
    if (name === "@api/Settings") return { useSettings: () => ({ plugins: { Settings: {} } }) };
    if (name === "../BaseTab") return { SettingsTab: "section", wrapTab: c => c };
    if (name === "@components/Icons") return Object.fromEntries(["CloudIcon", "PaintbrushIcon", "PluginIcon", "PluginsIcon"].map(k => [k, k]));
    if (name === "@components/ErrorBoundary") return { __esModule: true, default: "Boundary" };
    if (name.startsWith("@components/")) return { [name.split("/").pop()]: name };
    imported.push(name);
    throw new Error("broken optional page");
} };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync("src/components/settings/tabs/addons/index.tsx", "utf8"), { loader: "tsx", format: "cjs" }).code, realm);
const Addons = moduleObject.exports.default;
let tree = Addons();
assert.equal(imported.length, 0);
const buttons = tree.props.children[2].props.children[0];
assert.equal(buttons.length, 4);
for (let i = 0; i < buttons.length; i++) {
    buttons[i].props.onClick();
    tree = Addons();
    assert.equal(imported.length, i, "Choosing a page does not import unrelated pages");
    const [back, boundary] = tree.props.children;
    assert.equal(boundary.type, "Boundary");
    assert.throws(() => boundary.props.children[0].type(), /broken optional page/);
    back.props.onClick();
    tree = Addons();
    assert.equal(tree.props.children[2].props.children[0].length, 4);
}
assert.deepEqual(imported, ["../plugins", "../../../ThemeSettings/ThemesTab", "../sync/CloudTab", "../extras"]);
console.log("PASS Add-ons defers optional imports and keeps navigation outside failed pages");
