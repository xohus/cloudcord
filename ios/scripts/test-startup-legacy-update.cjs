const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('ios/runtime/src/index.ts', 'utf8');
const code = esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code;

(async () => {
    for (const bridgeless of [false, true]) for (const mode of ['pending', 'reject', 'throw', 'success']) {
        const module = { exports: {} };
        let settings = 0, refreshes = 0, warnings = 0;
        const nativeLogs = [];
        const lib = { unload: [] };
        const noop = () => undefined;
        const context = {
            module, exports: module.exports, window: {}, __CLOUDCORD_BRIDGELESS__: bridgeless,
            console: { log(message) { nativeLogs.push(message); }, warn() { warnings++; } },
            require(name) {
                if (name === './lib') return lib;
                if (name === '@lib/utils/logger') return { logger: { log() {} } };
                if (name === '@core/ui/settings') return { __esModule: true, default() { settings++; return noop; } };
                if (name === '@lib/api/native/legacyRuntimeRefresh') return { initLegacyRuntimeRefresh() {
                    refreshes++;
                    if (mode === 'pending') return new Promise(() => {});
                    if (mode === 'reject') return Promise.reject(new Error('storage failed'));
                    if (mode === 'throw') throw new Error('bridge failed');
                } };
                if (name === '@core/vendetta/plugins') return { VdPluginManager: { initPlugins: noop } };
                return new Proxy({ __esModule: true, default: noop }, { get: (_, key) => key === '__esModule' ? true : noop });
            }
        };
        vm.runInNewContext(code, context);
        let deadline;
        try {
            await Promise.race([
                module.exports.default(),
                new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Legacy updater blocked settings')), 100); })
            ]);
        } finally { clearTimeout(deadline); }
        await new Promise(setImmediate);
        assert.equal(settings, 1, `${mode}: settings must register`);
        assert.equal(refreshes, bridgeless ? 0 : 1);
        assert.equal(warnings, !bridgeless && ['throw', 'reject'].includes(mode) ? 1 : 0);
        assert.ok(context.window.bunny, 'Runtime finishes despite a pending legacy updater');
        assert.deepEqual(nativeLogs, ['CloudCord is ready!'], 'native readiness is emitted at completed startup');
    }
    const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
    assert.ok(!workflow.includes('await initLegacyRuntimeRefresh();'), 'Release patching must not restore the startup wait');
    console.log('PASS settings startup with pending, rejected and throwing legacy updates; bridgeless skip');
})().catch(error => { console.error(error); process.exitCode = 1; });
