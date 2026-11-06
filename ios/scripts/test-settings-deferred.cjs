const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const compile = (file, loader = 'tsx') => esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader, format: 'cjs' }).code;
const observerCode = compile('ios/runtime/src/lib/ui/settings/observeModules.ts', 'ts');
const tabsCode = compile('ios/runtime/src/lib/ui/settings/patches/tabs.tsx');
const patcher = require('spitroast');

// Execute real settings code with modules that become available only when
// Discord opens settings. A startup-only finder can never pass this fixture.
for (const platform of ['android', 'ios']) for (const delayed of [false, true]) {
  for (const screenKind of ['memo-sections', 'default-node', 'named-node']) {
    for (const readonlyNamespace of [false, true]) {
        const rows = { CloudCord: [{ key: 'CLOUDCORD', title: () => 'Overview', render: async () => ({ default: () => null }) }] };
        const nativeTable = { ACCOUNT: { type: 'route' } };
        const renderer = {};
        Object.defineProperty(renderer, 'SETTING_RENDERER_CONFIG', {
            value: nativeTable, writable: !readonlyNamespace, configurable: !readonlyNamespace, enumerable: true
        });
        const lists = [0, 1].map(() => ({ createList: config => ({ sections: config.sections.map(s => ({ ...s, settings: [...s.settings] })) }) }));
        // iOS Discord 344.1 SettingsOverviewScreen (HBC function 64655)
        // passes its memoized createList result to SearchableSettingsList.node.
        // Build the list before patching, as happens when settings was mounted
        // before CloudCord finished starting. Hooking createList alone misses it.
        const cachedNode = lists[0].createList({ sections: [{ settings: ['ACCOUNT'] }] });
        function SettingsOverviewScreen() {
            return { props: screenKind === 'memo-sections' ? cachedNode : { node: cachedNode } };
        }
        const overview = screenKind === 'memo-sections' ? { default: { type: SettingsOverviewScreen } }
            : screenKind === 'named-node' ? { SettingsOverviewScreen } : { default: SettingsOverviewScreen };
        const screenParent = screenKind === 'memo-sections' ? overview.default : overview;
        const screenKey = screenKind === 'memo-sections' ? 'type' : screenKind === 'named-node' ? 'SettingsOverviewScreen' : 'default';
        const originalOverview = screenParent[screenKey];
        let factoryCalls = 0, lookupCalls = 0;
        const records = [renderer, ...lists, overview].map(exports => ({
            isInitialized: !delayed, publicModule: { exports: delayed ? {} : exports },
            factory(g, r, d, a, module) { factoryCalls++; module.exports = exports; return 'factory-result'; }
        }));
        const lateRecord = { isInitialized: false, publicModule: { exports: {} }, factory() { throw Error('native factory failure'); } };
        const originalLate = lateRecord.factory;
        const modules = Object.fromEntries([...records, lateRecord].map((r, i) => [i, r]));
        const shared = { __CLOUDCORD_MODULE_VIEW__: modules, console };
        const observer = { exports: {} };
        vm.runInNewContext(observerCode, { ...shared, module: observer });
        const module = { exports: {} };
        vm.runInNewContext(tabsCode, {
            ...shared, module,
            require(name) {
                if (name === '../observeModules') return observer.exports;
                if (name === '@lib/api/patcher') return patcher;
                if (name === '@ui/settings') return { registeredSections: rows };
                if (name === '@lib/api/settings') return { settings: {} };
                if (name === '@lib/api/native/modules') return { NativeClientInfoModule: { getConstants: () => ({ Version: '352.17' }) } };
                if (name === '@metro/wrappers') {
                    const lazy = () => new Proxy({}, { get() { lookupCalls++; throw Error('module not ready'); } });
                    return { findByPropsLazy: lazy, findByFilePathLazy: lazy, findByNameLazy: lazy, findByPropsAll: () => [], findByNameAll: () => [] };
                }
                if (name === './shared') return { wrapOnPress: () => () => {}, CustomPageRenderer: function Page() {} };
                if (name === '@lib/utils') return { findInReactTree: (tree, predicate) => predicate(tree) ? tree : undefined };
                if (name === 'react-native') return { Platform: { OS: platform } };
                return {};
            }
        });
        const cleanups = [];
        module.exports.patchTabsUI(cleanups);
        assert.equal(factoryCalls, 0, 'settings setup must not force dormant native modules');
        assert.equal(lookupCalls, 0, 'modern setup must not use eager or negative-cached finders');
        if (delayed) for (const record of records) {
            assert.equal(record.factory(null, null, null, null, record.publicModule), 'factory-result');
            record.isInitialized = true;
        }
        assert.equal(nativeTable.CLOUDCORD.key, 'CLOUDCORD', 'captured live renderer table gets rows');
        assert.equal(typeof nativeTable.PUPU_CUSTOM_PAGE.screen.getComponent(), 'function', 'custom page route registered');
        for (const list of lists) {
            const config = { sections: [{ settings: ['ACCOUNT'] }] };
            for (let repeat = 0; repeat < 3; repeat++) {
                const result = list.createList(config);
                assert.equal(result.sections.filter(s => s.label === 'CloudCord').length, 1, 'every list copy sees one section, without duplicates');
                assert.equal(result.sections[1].settings[0], 'CLOUDCORD');
            }
        }
        for (let render = 0; render < 3; render++) {
            const output = screenParent[screenKey]();
            const sections = output.props.node?.sections ?? output.props.sections;
            assert.equal(sections[1]?.label, 'CloudCord', screenKind + ': cached native screen list gets CloudCord');
            assert.equal(sections.filter(s => s.label === 'CloudCord').length, 1, 'cached screen never accumulates duplicate sections');
        }
        assert.throws(() => lateRecord.factory(), /native factory failure/, 'native errors must not be swallowed');
        cleanups.forEach(fn => fn());
        assert.equal(lateRecord.factory, originalLate, 'unload restores pending factories');
        assert.equal(screenParent[screenKey], originalOverview, 'unload restores screen');
        assert.equal(nativeTable.CLOUDCORD, undefined, 'unload removes injected renderer rows');
        assert.equal(nativeTable.PUPU_CUSTOM_PAGE, undefined, 'unload removes routes');
        assert.equal(renderer.SETTING_RENDERER_CONFIG, nativeTable);
    }
  }
}
console.log('PASS Android/iOS deferred settings, both list exports, captured/frozen namespaces, memo screens, no forced factories, cleanup');

// Split bundles register modules after the startup snapshot has been made.
for (const asMap of [false, true]) {
    const live = asMap ? new Map() : {};
    const snapshot = {};
    const visited = [];
    let factoryCalls = 0;
    const originalDefine = function(factory, id) {
        assert.equal(this.marker, 'receiver');
        const record = { factory, isInitialized: false, publicModule: { exports: {} } };
        if (asMap) live.set(id, record); else live[id] = record;
        return 'defined';
    };
    const realm = { module: { exports: {} }, console, Map, __d: originalDefine,
        __c: () => live, __CLOUDCORD_MODULE_VIEW__: snapshot };
    vm.createContext(realm);
    vm.runInContext(observerCode, realm);
    const stop = realm.module.exports.observeSettingsModules(value => visited.push(value));
    const factory = function(g, r, d, a, module) {
        factoryCalls++;
        module.exports = { createList() {} };
        return 'loaded';
    };
    assert.equal(realm.__d.call({ marker: 'receiver' }, factory, 42), 'defined');
    assert.equal(factoryCalls, 0);
    const record = asMap ? live.get(42) : live[42];
    assert.equal(snapshot[42], record, 'new definitions enter the private finder view');
    assert.equal(record.factory(null, null, null, null, record.publicModule), 'loaded');
    assert.equal(visited.length, 1);
    assert.equal(record.factory, factory, 'completed observer releases its wrapper');
    realm.__d.call({ marker: 'receiver' }, factory, 43);
    stop();
    assert.equal(realm.__d, originalDefine);
    assert.equal((asMap ? live.get(43) : live[43]).factory, factory);
}
console.log('PASS late Metro definitions: object/Map registry, no eager import, original return/receiver, cleanup');
