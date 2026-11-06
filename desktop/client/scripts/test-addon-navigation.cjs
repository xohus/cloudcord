const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const desktop = fs.readFileSync('src/plugins/_core/settings.tsx', 'utf8');
assert.match(desktop, /settings\.store\.diagnosticsMode === true && buildEntry\(\{\s*key: "cloudcord_diagnostics"/);
const layoutSource = desktop.slice(desktop.indexOf('    buildLayout(originalLayoutBuilder:'), desktop.indexOf('    addControlsToDeveloperPage(layout:'));
const layoutState = { showCloudCordSection: true, showSectionHeading: true, settingsLocation: 'top' };
const layoutContext = vm.createContext({ settings: { store: layoutState }, LayoutTypes: { SECTION: 1 }, isTruthy: Boolean,
    VencordTab: 'overview', BotCordTab: 'bot', FakeProfileTab: 'profile', AddonsTab: 'addons', CloudCordDiagnosticsTab: 'diagnostics',
    InfoIcon: 'icon', RobotIcon: 'icon', UserIcon: 'icon', PluginsIcon: 'icon', MainSettingsIcon: 'icon' });
vm.runInContext(esbuild.transformSync(`globalThis.builder = { ${layoutSource} };`, { loader: 'ts' }).code, layoutContext);
layoutContext.builder.buildEntry = options => options;
layoutContext.builder.addControlsToDeveloperPage = () => {};
for (const enabled of [undefined, false, true, false]) {
    layoutState.diagnosticsMode = enabled;
    const layout = layoutContext.builder.buildLayout({ key: '$Root', buildLayout: () => [{ key: 'user_section' }] });
    const entries = layout.find(node => node.key === 'cloudcord_section').buildLayout();
    assert.equal(entries.some(node => node.key === 'cloudcord_diagnostics'), enabled === true);
    assert.ok(entries.some(node => node.key === 'cloudcord_cloud_sync' && node.Component === 'addons'));
}
const mobile = fs.readFileSync('../../ios/runtime/src/core/ui/settings/index.ts', 'utf8');
assert.match(mobile, /usePredicate: \(\) => useProxy\(settings\)\.cloudcordDiagnosticsEnabled === true/);
const mobileState = {}, sections = [];
const mobileContext = vm.createContext({ settings: mobileState, PupuIcon: 'icon', Strings: { THEMES: 'Themes', FONTS: 'Fonts' }, version: 'test',
    findAssetId: () => 1, isThemeSupported: () => true, isFontSupported: () => true, useProxy: value => value, registerSection: section => sections.push(section) });
const mobileSource = mobile.replace(/^import .*;\r?\n/gm, '').replace('export { PupuIcon };', '').replace('export default function initSettings', 'function initSettings');
vm.runInContext(esbuild.transformSync(mobileSource, { loader: 'ts' }).code, mobileContext);
mobileContext.initSettings();
const diagnosticRow = sections.find(section => section.name === 'CloudCord').items.find(row => row.key === 'CLOUDCORD_DIAGNOSTICS');
for (const enabled of [undefined, false, true, false]) {
    mobileState.cloudcordDiagnosticsEnabled = enabled;
    assert.equal(diagnosticRow.usePredicate(), enabled === true);
}
mobileState.cloudcordDiagnosticsEnabled = true;
mobileState.cloudcordSectionHidden = true;
assert.equal(diagnosticRow.usePredicate(), false);
console.log('PASS desktop and mobile Diagnostics visibility follows off/on/off');
