const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const schema = { module: { exports: {} }, URL };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('src/utils/profileAppearance.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, schema);
const context = { module: { exports: {} }, require: () => schema.module.exports };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('src/utils/connectionSettings.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
let owner = 'account-a', enabled = true, calls = 0, notices = 0, changes = 0;
let data = { customConnections: [{ id: 'same-id', service: 'steam', username: 'custom', accountId: 'real-looking-id' }] };
const real = Object.freeze([Object.freeze({ id: 'real-account', type: 'steam', name: 'Real' })]);
const store = { getAccounts: () => real, emitChange: () => changes++ };
const rest = { del: async () => { calls++; }, patch: async () => { calls++; }, put: async () => { calls++; } };
const original = { get: store.getAccounts, del: rest.del, patch: rest.patch };
const stop = context.module.exports.installConnectionSettings({ store, rest, ownId: () => owner,
    getData: () => enabled ? data : null,
    remove: id => { data = { customConnections: data.customConnections.filter(entry => entry.id !== id) }; },
    explain: () => notices++ });
(async () => {
    const rows = store.getAccounts();
    assert.equal(rows.length, 2);
    assert.equal(rows[0], real[0]);
    assert.equal(rows[1].verified, false, 'local entries do not claim OAuth verification');
    assert.equal(store.getAccounts(), rows, 'unchanged reads retain snapshot identity');
    const url = '/users/@me/connections/steam/' + encodeURIComponent(rows[1].id);
    await assert.rejects(rest.patch({ url, body: { visibility: 0 } }), /CloudCord Profile/);
    assert.equal(notices, 1); assert.equal(calls, 0);
    owner = 'account-b';
    await rest.del({ url });
    assert.equal(data.customConnections.length, 1, 'old account rows cannot delete new account data');
    assert.notEqual(store.getAccounts(), rows);
    const ownURL = '/users/@me/connections/steam/' + encodeURIComponent(store.getAccounts()[1].id);
    await rest.del({ url: ownURL });
    assert.equal(data.customConnections.length, 0);
    assert.equal(changes, 1); assert.equal(calls, 0);
    assert.equal(store.getAccounts(), real, 'removal restores native rows');
    await rest.del({ url: '/users/@me/connections/steam/real-account' });
    assert.equal(calls, 1, 'real account actions still use Discord');
    enabled = false; assert.equal(store.getAccounts(), real);
    stop(); assert.equal(store.getAccounts, original.get); assert.equal(rest.del, original.del); assert.equal(rest.patch, original.patch);
    console.log('PASS connections list snapshots, local deletion, account isolation, no synthetic network writes and cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
