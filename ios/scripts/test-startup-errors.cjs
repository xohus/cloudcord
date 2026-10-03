const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../runtime/src/entry.ts'), 'utf8');
const start = source.indexOf('async function initializeCloudCord()');
const end = source.indexOf('\nif (typeof window.__r');
const initialize = source.slice(start, end).replaceAll('(globalThis as any)', 'globalThis').replaceAll(': unknown', '');
(async () => {
    for (const phase of ['cache', 'runtime', 'success', 'pending']) {
        const messages = [];
        let started = false;
        const realm = vm.createContext({
            __CLOUDCORD_BRIDGELESS__: true, version: 'test',
            console: { log: (...args) => messages.push(args), error: (...args) => messages.push(args) },
            // Force the error reporter itself to fail too.
            alert: () => { throw new Error('UI not available'); },
            require(name) {
                if (name === '@metro/internals/caches') return { async initMetroCache() {
                    if (phase === 'cache') throw new Error('cache failed');
                }};
                if (name === '.') return { async default() {
                    started = true;
                    if (phase === 'pending') return new Promise(() => {});
                    if (phase === 'runtime') throw new Error('runtime failed');
                }};
                throw new Error('native modules unavailable');
            }
        });
        vm.runInContext(initialize, realm);
        await Promise.race([
            realm.initializeCloudCord(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('optional startup blocked Discord launch')), 100))
        ]);
        assert.equal(started, phase !== 'cache');
        assert.equal(messages.length > 0, phase === 'cache' || phase === 'runtime');
    }
    console.log('startup errors handled; unresolved optional startup cannot block Discord launch');
})().catch(error => { console.error(error); process.exitCode = 1; });
