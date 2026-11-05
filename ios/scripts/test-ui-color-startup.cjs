const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
const compile = (file, loader = 'ts') => esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader, format: 'cjs' }).code;
const code = compile('ios/runtime/src/lib/ui/color.ts');

for (const shape of ['default-meta', 'default-internal', 'named-colors']) {
    let now = 1000, inspected = 0, themeReady = false;
    const registry = {};
    const color = { exports: {} };
    const realm = {
        module: color, __CLOUDCORD_MODULE_VIEW__: registry,
        Date: { now: () => now },
        require(name) {
            // The shipped failing module called findByProps and then
            // color.default.meta at import time, exactly the screenshot stack.
            if (name === '@metro/wrappers') return {
                findByProps: () => undefined,
                findByStoreNameLazy: () => new Proxy({}, { get() { if (!themeReady) throw Error('ThemeStore not ready'); return 'light'; } })
            };
            if (name === '@metro/common') return { constants: { ThemeColorMap: {}, Colors: {} } };
            throw Error('unexpected dependency: ' + name);
        }
    };
    vm.runInNewContext(code, realm);
    registry[1] = { isInitialized: false, get publicModule() { throw Error('dormant module accessed'); } };
    registry[2] = { isInitialized: true, get publicModule() { inspected++; return { exports: {} }; } };
    const api = color.exports;
    assert.equal(api.semanticColors.TEXT_DEFAULT, '#f2f3f5');
    const initialReads = inspected;
    for (let i = 0; i < 50; i++) assert.equal(api.semanticColors.TEXT_DEFAULT, '#f2f3f5');
    assert.equal(inspected, initialReads, 'missing theme module must not rescan the registry on every property');
    assert.equal(api.isSemanticColor({}), false);
    assert.equal(api.resolveSemanticColor('#123456'), '#123456');
    assert.equal(api.resolveSemanticColor({}), undefined);
    const token = Symbol('native-color');
    const calls = [];
    const resolver = Object.freeze({
        isSemanticColor: value => value === token,
        resolveSemanticColor(theme, value) { assert.equal(this, resolver); calls.push([theme, value]); return '#abcdef'; }
    });
    const native = Object.freeze({
        colors: Object.freeze({ TEXT_DEFAULT: token }),
        unsafe_rawColors: Object.freeze({ WHITE: '#eeeeee' }),
        [shape === 'default-internal' ? 'internal' : 'meta']: resolver
    });
    registry[3] = { isInitialized: true, publicModule: { exports: shape === 'named-colors' ? native : { SemanticColor: {}, default: native } } };
    now += 251;
    assert.equal(api.semanticColors.TEXT_DEFAULT, token, 'late native colors replace temporary fallback values');
    assert.equal(api.rawColors.WHITE, '#eeeeee');
    assert.equal(api.isSemanticColor(token), true);
    assert.equal(api.resolveSemanticColor(token), '#abcdef');
    assert.equal(calls.at(-1)[0], 'dark', 'missing ThemeStore does not break a valid resolver');
    themeReady = true;
    api.resolveSemanticColor(token);
    assert.equal(calls.at(-1)[0], 'light');
    api.resolveSemanticColor(token, 'amoled');
    assert.equal(calls.at(-1)[0], 'amoled');
    assert.equal(Object.hasOwn(native, 'meta'), shape !== 'default-internal', 'no mutation of frozen Discord exports');
    assert.deepEqual(Object.keys(api.semanticColors), ['TEXT_DEFAULT']);
}

for (const os of ['ios', 'android']) {
    let styleFactory, fontReads = 0;
    const module = { exports: {} };
    vm.runInNewContext(compile('ios/runtime/src/lib/ui/components/Codeblock.tsx', 'tsx'), {
        module,
        require(name) {
            if (name === '@metro/common') return { constants: new Proxy({}, { get() { fontReads++; throw Error('Fonts unavailable'); } }) };
            if (name === '@ui/color') return { semanticColors: { TEXT_DEFAULT: '#ffffff' } };
            if (name === '@ui/styles') return { createStyles(factory) { styleFactory = factory; return () => factory(); } };
            if (name === 'react-native') return { Platform: { OS: os } };
            throw Error('unexpected dependency: ' + name);
        }
    });
    assert.equal(fontReads, 0, 'importing the error component must not resolve native fonts');
    assert.equal(styleFactory().codeBlock.fontFamily, os === 'ios' ? 'Menlo' : 'monospace');
}
console.log('PASS missing startup colors, late/frozen/default/named theme modules, bounded retries, theme resolution and lazy error-screen fonts');
