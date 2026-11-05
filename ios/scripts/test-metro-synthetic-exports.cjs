const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
const compile = file => esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const modulesCode = compile('ios/runtime/src/metro/internals/modules.ts');
const findersCode = compile('ios/runtime/src/metro/finders.ts');
const enumsModule = { exports: {} };
vm.runInNewContext(compile('ios/runtime/src/metro/internals/enums.ts'), { module: enumsModule });

for (const bridgeless of [true, false]) {
    const calls = [];
    const tableRow = function TableRow() {};
    const redesign = { __esModule: true, default: { TableRow: tableRow } };
    const nativeExports = { NativeReady: true };
    const registry = {
        0: { isInitialized: false, publicModule: { exports: {} } },
        8: { isInitialized: true, publicModule: { exports: nativeExports } },
        9: { isInitialized: false, publicModule: { exports: {} } }
    };
    const cache = { findIndex: {}, flagsIndex: {}, polyfillIndex: {} };
    const caches = {
        getMetroCache: () => cache,
        getCacherForUniq: () => ({ cacheId() {}, finish() {} }),
        indexBlacklistFlag() {}, indexExportsFlags() {}
    };
    const modules = { exports: {} };
    vm.runInNewContext(modulesCode, {
        module: modules, __CLOUDCORD_BRIDGELESS__: bridgeless,
        __CLOUDCORD_MODULE_VIEW__: registry,
        window: { __r(id) { calls.push(id); if (id === -1) throw Error('synthetic module passed to Metro'); return registry[id]?.publicModule.exports; } },
        ErrorUtils: { getGlobalHandler: () => () => {}, setGlobalHandler() {} },
        require(name) {
            if (name === '@metro/internals/caches') return caches;
            if (name === './enums') return enumsModule.exports;
            if (name === 'spitroast') return require('spitroast');
            if (name === '@metro/polyfills/redesign') return redesign;
            throw Error('unexpected dependency: ' + name);
        }
    });
    const finders = { exports: {} };
    vm.runInNewContext(findersCode, { module: finders, require(name) {
        if (name === './internals/caches') return caches;
        if (name === './internals/modules') return modules.exports;
        throw Error('unexpected dependency: ' + name);
    } });
    const byTableRow = Object.assign(value => !!value.TableRow, { uniq: 'test.TableRow', raw: false });
    // This used to find the synthetic default export, then dereference
    // requireModule(-1).default after the native readiness guard returned undefined.
    assert.equal(finders.exports.findExports(byTableRow), redesign.default);
    assert.equal(calls.length, 0, 'CloudCord UI components must not require Discord entrypoint/module -1');
    assert.equal(modules.exports.requireModule(-1), redesign);
    assert.equal(modules.exports.requireModule('-1'), redesign);
    assert.equal(calls.length, 0);
    assert.equal(finders.exports.findAllExports(byTableRow)[0].TableRow, tableRow);
    if (bridgeless) {
        assert(calls.every(id => id === 8), 'all-exports lookup may only inspect already initialized native modules');
        calls.length = 0;
        assert.equal(modules.exports.requireModule(9), undefined, 'dormant native modules must remain guarded');
        assert.equal(calls.length, 0);
        assert.equal(modules.exports.requireModule(8), nativeExports);
        assert.deepEqual(calls, [8]);
    }
}
console.log('PASS real Metro finder + loader: synthetic default exports resolve on both architectures without forcing native modules');
