const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../runtime/src/entry.ts'), 'utf8');
const code = require('esbuild').transformSync(source.slice(source.indexOf('let recoveryStarted'), source.indexOf('\nif (typeof window.__r')), { loader: 'ts' }).code;
(async () => {
    for (const failRegistration of [false, true]) {
        const calls = [];
        const realm = { window: { modules: {} }, __CLOUDCORD_BRIDGELESS__: true, version: 'test', console: { log() {}, error() {} }, alert() {}, require(name) {
            if (name === './recoveryGesture') return { installRecoveryGesture() {} };
            if (name === '@metro/internals/caches') return { initMetroCache() {} };
            if (name === '@core/ui/settings') return { default() { calls.push('register'); if (failRegistration) throw Error('registration failure'); } };
            if (name === '@ui/settings') return { patchSettings() { calls.push('patch'); return () => {}; } };
            if (name === '.') { calls.push('optional'); throw Error('optional top-level import failed'); }
            throw Error('native unavailable');
        } };
        vm.createContext(realm); vm.runInContext(code, realm);
        await realm.initializeCloudCord();
        assert.deepEqual(calls, ['register', 'patch', 'optional']);
        const status = realm.__CLOUDCORD_CORE_SETTINGS_BOOTSTRAP__;
        assert.equal(status.registered, !failRegistration);
        assert.equal(status.patched, true, 'one core failure must not skip the other');
        assert.equal(status.unloads.length, 1);
        await realm.initializeCloudCord();
        assert.equal(calls.filter(x => x === 'patch').length, 1, 'never patch settings twice');
        assert.equal(calls.filter(x => x === 'register').length, failRegistration ? 2 : 1);
    }
    console.log('Core settings bootstrap: optional import failure, independent failures and duplicate prevention passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
