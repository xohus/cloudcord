const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('ios/runtime/src/lib/ui/toasts.ts', 'utf8');
const platform = { OS: 'android' };
const nativeCalls = [], systemCalls = [], alerts = [];
const system = { SHORT: 0, show: (...args) => systemCalls.push(args) };
const deps = {
    '@core/i18n': { Strings: { COPIED_TO_CLIPBOARD: 'Copied' } },
    '@lib/api/assets': { findAssetId: () => 42 },
    '@lib/utils/lazy': { lazyDestructure: fn => fn() },
    '@metro/common': { toasts: { open: options => {
        assert.notEqual(platform.OS, 'android', 'Android must never enter the incompatible Discord toast renderer');
        nativeCalls.push(options);
    } } },
    '@metro/wrappers': { findByProps: () => ({ uuid4: () => 'test-id' }) },
    'react-native': { Platform: platform, ToastAndroid: system, Alert: { alert: (...args) => alerts.push(args) } }
};
const context = vm.createContext({ module: { exports: {} }, require: name => {
    assert(name in deps, `Unexpected dependency ${name}`);
    return deps[name];
} });
vm.runInContext(esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code, context);
const { showToast } = context.module.exports;
showToast('Copied gift link.');
showToast.showCopyToClipboard();
assert.deepEqual(systemCalls, [['Copied gift link.', 0], ['Copied', 0]]);
assert.equal(nativeCalls.length, 0);
system.show = () => { throw Error('Native toast unavailable'); };
showToast('Saved');
assert.deepEqual(alerts, [['CloudCord', 'Saved']]);
assert.equal(nativeCalls.length, 0);
platform.OS = 'ios';
showToast('Saved on iOS', 42);
assert.equal(nativeCalls.length, 1);
assert.equal(nativeCalls[0].content, 'Saved on iOS');
assert.equal(nativeCalls[0].icon, 42);
assert.equal(nativeCalls[0].key, 'vd-toast-test-id');
assert(fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8').includes('cp "../ios/runtime/src/lib/ui/toasts.ts" "src/lib/ui/toasts.ts"'));
console.log('PASS Android confirmation feedback bypasses incompatible Discord toast renderer, fallback remains visible and iOS toast behavior is preserved');
