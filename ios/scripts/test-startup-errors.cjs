const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../runtime/src/entry.ts'), 'utf8');
const start = source.indexOf('async function initializeCloudCord()');
const end = source.indexOf('\nif (typeof window.__r');
const initialize = source.slice(start, end).replaceAll('(globalThis as any)', 'globalThis');
(async () => {
    for (const phase of ['cache', 'runtime', 'success']) {
        const messages = [];
        let started = false;
        const realm = vm.createContext({
            __CLOUDCORD_BRIDGELESS__: true, version: 'test',
            console: { log: (...args) => messages.push(args) },
            // Force the error reporter itself to fail too.
            alert: () => { throw new Error('UI not available'); },
            require(name) {
                if (name === '@metro/internals/caches') return { async initMetroCache() {
                    if (phase === 'cache') throw new Error('cache failed');
                }};
                if (name === '.') return { async default() {
                    started = true;
                    if (phase === 'runtime') throw new Error('runtime failed');
                }};
                throw new Error('native modules unavailable');
            }
        });
        vm.runInContext(initialize, realm);
        await realm.initializeCloudCord();
        assert.equal(started, phase !== 'cache');
        assert.equal(messages.length > 0, phase !== 'success');
    }
    console.log('startup async rejection and failed error-reporting regression passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
