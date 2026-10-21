const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const good = 'CloudCord' + ' '.repeat(11000);
const timers = new Map();
let nextTimer = 0, finishBody, writes = 0, mode = 'stalled';
const context = { module: { exports: {} }, exports: {}, Date, Promise,
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async () => ({ ok: true, text: () => mode === 'stalled' ? new Promise(resolve => { finishBody = resolve; }) : Promise.resolve(good) })
};
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('ios/runtime/src/lib/api/native/runtimeUpdates.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
(async () => {
    const updater = context.module.exports.createRainUpdater({ writeFile: async () => { writes++; } });
    const download = updater.download();
    const rejected = assert.rejects(download, /timed out/);
    await flush();
    assert.equal(typeof finishBody, 'function', 'the stalled response body must have started');
    assert.equal(timers.size, 1, 'the download deadline must still cover a stalled response body');
    [...timers.values()][0]();
    await rejected;
    assert.equal(timers.size, 0, 'the expired timer is cleaned up');
    finishBody(good); await flush();
    assert.equal(writes, 0, 'a late body cannot overwrite the runtime after timeout');
    mode = 'ready';
    await updater.download();
    assert.equal(writes, 1, 'a timeout releases the pending download for a successful retry');
    assert.equal(timers.size, 0);
    console.log('PASS runtime response-body deadline, late response isolation and retry after timeout');
})().catch(error => { console.error(error); process.exitCode = 1; });
