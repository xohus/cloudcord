const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync(process.env.CLOUDCORD_NETWORK_SOURCE || 'src/utils/profileSyncNetwork.ts', 'utf8');
const timers = new Map(); let nextTimer = 0, signal;
const ctx = vm.createContext({ module: { exports: {} }, AbortController, Error, Promise,
    setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: id => timers.delete(id),
    fetch: async (_url, options) => { signal = options.signal; return { ok: true, status: 200, headers: {}, json: async () => ({ saved: true }) }; } });
vm.runInContext(esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code, ctx);
const { fetchProfileResponse } = ctx.module.exports;
(async () => {
    assert.equal((await (await fetchProfileResponse('https://example.test')).json()).saved, true);
    assert.equal(timers.size, 0);
    for (const stalledBody of [false, true]) {
        ctx.fetch = async (_url, options) => {
            signal = options.signal;
            return stalledBody ? { ok: true, status: 200, headers: {}, json: () => new Promise(() => {}) } : new Promise(() => {});
        };
        const pending = fetchProfileResponse('https://example.test');
        const rejected = assert.rejects(pending, /request timed out/);
        for (const fire of [...timers.values()]) fire();
        await rejected;
        assert.equal(signal.aborted, true);
        assert.equal(timers.size, 0, 'both stalled headers and stalled bodies release their deadline');
    }
    ctx.fetch = async () => ({ ok: true, status: 200, headers: {}, json: async () => { throw Error('HTML instead of JSON'); } });
    await assert.rejects(fetchProfileResponse('https://example.test'), /invalid JSON/);
    ctx.fetch = async () => ({ ok: false, status: 503, headers: {}, json: async () => { throw Error('HTML'); } });
    const unavailable = await fetchProfileResponse('https://example.test');
    assert.equal(unavailable.status, 503);
    assert.equal(await unavailable.json(), null);
    assert.equal(timers.size, 0);
    console.log('PASS bounded PC profile requests, stalled response bodies, abort-ignoring transports, non-JSON outages and timer cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
