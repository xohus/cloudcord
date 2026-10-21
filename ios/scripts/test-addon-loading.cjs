const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), esbuild = require('esbuild');
const compile = file => esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: 'tsx', format: 'cjs' }).code;
const React = { memo: fn => fn, useMemo: fn => fn(), createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const alerts = [], navigations = [];
const history = [{ name: 'PUPU_CUSTOM_PAGE', params: { title: 'Add-ons' } }];
const navigation = {
    navigate: (name, params) => { navigations.push([name, params]); const previous = history.findLast(entry => entry.name === name); if (previous) previous.params = params; else history.push({ name, params }); },
    push: (name, params) => { navigations.push([name, params]); history.push({ name, params }); },
    isFocused: () => true
};
const common = { React, NavigationNative: { useNavigation: () => navigation }, ReactNative: { Alert: { alert: (...args) => alerts.push(args) } } };
const shared = { module: { exports: {} }, React, require: name => name === '@metro/common' ? common : name === '@lib/utils/asyncTimeout' ? { withTimeout: p => p } : name === '@metro/wrappers' ? { findByPropsLazy: () => ({}) } : {} };
vm.runInNewContext(compile('ios/runtime/src/lib/ui/settings/patches/shared.tsx'), shared);
let fail = true, imports = 0;
const Plugin = () => null;
const page = { module: { exports: {} }, React, require: name => {
    if (name === '@metro/common') return common;
    if (name === '@metro/common/components') return { Stack: 'Stack', TableRow: Object.assign(() => null, { Icon: 'Icon' }), TableRowGroup: 'Group' };
    if (name === 'react-native') return { ScrollView: 'ScrollView' };
    if (name === '@lib/api/native/loader') return { isThemeSupported: () => false, isFontSupported: () => false };
    if (name === '@lib/api/assets') return { findAssetId: () => 1 };
    if (name === '@lib/ui/settings/patches/shared') return shared.module.exports;
    if (name === '@core/ui/settings/pages/Plugins') { imports++; if (fail) throw Error('plugin page unavailable'); return { default: Plugin }; }
    return {};
} };
vm.runInNewContext(compile('ios/runtime/src/core/ui/settings/pages/Addons/index.tsx'), page);
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(walk)];
(async () => {
    const installed = walk(page.module.exports.default()).find(n => n.props?.label === 'Installed plugins');
    assert(installed, 'installed plugins row must exist');
    await installed.props.onPress();
    assert.equal(navigations.length, 0, 'a failed import must not navigate into a crashing screen');
    assert.equal(alerts.length, 1, 'load failure offers the existing error/retry alert');
    fail = false;
    const before = imports;
    await Promise.all([installed.props.onPress(), installed.props.onPress()]);
    assert.equal(imports - before, 1, 'repeated taps share the in-flight page load');
    assert.equal(navigations.length, 1);
    assert.equal(navigations[0][0], 'PUPU_CUSTOM_PAGE');
    assert.equal(navigations[0][1].render().type, Plugin);
    assert.equal(history.length, 2, 'a nested add-on page must push a separate screen, not replace the Add-ons screen');
    history.pop();
    assert.equal(history[0].params.title, 'Add-ons', 'Back must return to the original Add-ons screen');
    const lazy = { module: { exports: {} }, __DEV__: false };
    vm.runInNewContext(compile('ios/runtime/src/lib/utils/lazy.ts'), lazy);
    let lookups = 0;
    const browser = { module: { exports: {} }, React, require: name => name === '@metro/common' ? common : name === '@lib/utils/lazy' ? lazy.module.exports : name === '@metro' ? { findByProps: () => { lookups++; return undefined; } } : {} };
    vm.runInNewContext(compile('ios/runtime/src/core/ui/settings/pages/PluginBrowser/index.tsx'), browser);
    assert.equal(typeof browser.module.exports.default, 'function');
    assert.equal(lookups, 0, 'loading the marketplace must not eagerly resolve an unavailable action-sheet module');
    console.log('PASS add-on failed-import recovery, duplicate-tap isolation, valid routing and lazy marketplace native lookup');
})().catch(error => { console.error(error); process.exitCode = 1; });
