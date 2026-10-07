const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
let selected = null;
const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useState: () => [selected, value => { selected = value; }] };
const context = vm.createContext({ React, useSettings: () => ({ plugins: { Settings: {} } }), Button: 'button', SettingsTab: 'section', Heading: 'heading', Paragraph: 'paragraph', PluginsIcon: 'icon', PaintbrushIcon: 'icon', CloudIcon: 'icon', PluginsTab: 'plugins', ThemesTab: 'themes', CloudTab: 'sync' });
const source = fs.readFileSync('src/components/settings/tabs/addons/index.tsx', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export default .*;\r?$/gm, '');
vm.runInContext(esbuild.transformSync(source, { loader: 'tsx', jsxFactory: 'React.createElement' }).code, context);
for (const [index, page] of ['plugins', 'themes', 'sync'].entries()) {
    const listing = context.Addons();
    listing.props.children[2][index].props.children[2].props.onClick();
    const opened = context.Addons();
    assert.equal(opened.props.children[1].type, page);
    opened.props.children[0].props.onClick();
    assert.equal(selected, null);
}
const desktop = fs.readFileSync('src/plugins/_core/settings.tsx', 'utf8');
assert.match(desktop, /settings\.store\.diagnosticsMode === true && buildEntry\(\{\s*key: "cloudcord_diagnostics"/);
const mobile = fs.readFileSync('../../ios/runtime/src/core/ui/settings/index.ts', 'utf8');
assert.match(mobile, /usePredicate: \(\) => useProxy\(settings\)\.cloudcordDiagnosticsEnabled === true/);
console.log('PASS: all three addon navigation handlers open and return; Diagnostics visibility source guards');
