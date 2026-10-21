const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
// Native settings may read the table before registration, or after a plugin
// unregisters its last section. Neither case may break Discord's settings.
const sections = {};
const nativeConfig = { ACCOUNT: { type: 'route' } };
const rendererModule = { SETTING_RENDERER_CONFIG: nativeConfig };
const tabsModule = { exports: {} };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('ios/runtime/src/lib/ui/settings/patches/tabs.tsx', 'utf8'), { loader: 'tsx', format: 'cjs' }).code, {
    module: tabsModule, exports: tabsModule.exports,
    require(name) {
        if (name === '@ui/settings') return { registeredSections: sections };
        if (name === '@lib/api/settings') return { settings: {} };
        if (name === '@metro/wrappers') return { findByPropsLazy: () => rendererModule, findByNameLazy: () => ({}), findByFilePathLazy: () => ({}) };
        if (name === '@lib/api/patcher') return { after: () => () => {} };
        if (name === './shared') return { wrapOnPress: () => () => {}, CustomPageRenderer: () => null };
        return {};
    }
});
const cleanups = [];
tabsModule.exports.patchTabsUI(cleanups);
assert.equal(rendererModule.SETTING_RENDERER_CONFIG.ACCOUNT, nativeConfig.ACCOUNT);
sections.CloudCord = [{ key: 'PROFILE', title: () => 'Profile' }];
assert.equal(rendererModule.SETTING_RENDERER_CONFIG.PROFILE.key, 'PROFILE');
delete sections.CloudCord;
assert.equal(rendererModule.SETTING_RENDERER_CONFIG.ACCOUNT, nativeConfig.ACCOUNT);
assert.equal(rendererModule.SETTING_RENDERER_CONFIG.PROFILE, undefined);
cleanups.forEach(cleanup => cleanup());
assert.equal(rendererModule.SETTING_RENDERER_CONFIG, nativeConfig);
const source = fs.readFileSync('ios/runtime/src/lib/ui/settings/patches/shared.tsx', 'utf8');
let route;
const effects = [];
const React = { memo: x => x, createElement: (type, props, ...children) => ({ type, props, children }), useEffect: f => effects.push(f) };
const nav = { setOptions() {} };
const alerts = [];
const context = { React, module: { exports: {} }, exports: {}, require: name => {
    if (name === '@metro/common') return { NavigationNative: { useNavigation: () => nav, useRoute: () => route }, ReactNative: { View: 'View', Text: 'Text', Alert: { alert: (...args) => alerts.push(args) } } };
    if (name === '@lib/utils/asyncTimeout') return { withTimeout: promise => promise };
    if (name === '@metro/wrappers') return { findByPropsLazy: () => ({}) };
    if (name === '@ui/components') return { ErrorBoundary: 'Boundary' };
    return {};
}};
vm.runInNewContext(esbuild.transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code, context);
const render = context.module.exports.CustomPageRenderer;
for (const value of [undefined, {}, { params: undefined }, { params: {} }]) {
    route = value;
    assert.equal(render().type, 'View');
}
const Page = () => null;
route = { params: { render: Page, title: 'Profile' } };
assert.equal(render().children[0].type, Page);
effects.forEach(f => f());
(async () => {
    const wrap = context.module.exports.wrapOnPress;
    const navigations = [];
    const navigation = { navigate: (...args) => navigations.push(args), isFocused: () => true };
    let finish, imports = 0;
    const press = wrap(undefined, navigation, () => { imports++; return new Promise(resolve => { finish = resolve; }); }, 'Profile');
    const first = press(); await Promise.resolve();
    await press();
    assert.equal(imports, 1, 'repeated taps do not stack page imports');
    finish({ default: Page }); await first;
    assert.equal(navigations.length, 1);
    let fail = true;
    const retry = wrap(undefined, navigation, async () => { if (fail) throw Error('import failed'); return { default: Page }; });
    await retry(); assert.equal(alerts.length, 1, 'page import failures are caught and displayed');
    fail = false; await retry();
    assert.equal(navigations.length, 2, 'failed imports release the tap lock and can retry');
    navigation.isFocused = () => false;
    await wrap(undefined, navigation, async () => ({ default: Page }))();
    assert.equal(navigations.length, 2, 'a page cannot open after the originating view loses focus');
    await wrap(async () => { throw Error('action failed'); })();
    assert.equal(alerts.length, 2, 'async click-handler failures are caught too');
    console.log('PASS missing route fallback, normal rendering, duplicate taps, rejected imports, retry and navigation-away isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
