const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), esbuild = require('esbuild');
const source = fs.readFileSync('src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const restore = source.slice(source.indexOf('async function loadData()'), source.indexOf('function realProfileMenuItem('));
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
async function scenario(change, legacy = false) {
    let resolveRead, saves = 0;
    const old = { globalName: 'Old cached profile', syncRevision: 1 };
    const ctx = vm.createContext({ owner: 'account-a', profileRuntimeActive: true, profileRuntimeGeneration: 1,
        storedData: {}, isEnabled: false, allAccountsData: {}, allAccountsEnabled: {},
        DS_ALL_DATA: 'all', DS_ALL_ENABLED: 'enabled-all', DS_KEY: 'own', DS_ENABLED: 'enabled',
        saveAllDataSync() { saves++; }, saveDataSync() { saves++; } });
    ctx.activeUserId = () => ctx.owner;
    ctx.AuthenticationStore = { getId: () => ctx.owner };
    ctx.syncCurrentUserData = () => { ctx.storedData = ctx.allAccountsData[ctx.owner] || {}; ctx.isEnabled = ctx.allAccountsEnabled[ctx.owner] || false; };
    ctx.DataStore = { get: key => {
        if (key === (legacy ? 'own' : 'all')) return new Promise(resolve => { resolveRead = resolve; });
        return Promise.resolve(key === 'enabled-all' ? { 'account-a': true } : key === 'enabled' ? true : null);
    }, set: async () => { saves++; } };
    vm.runInContext(esbuild.transformSync(restore, { loader: 'ts' }).code, ctx);
    const loading = ctx.loadData(); await flush();
    change?.(ctx);
    resolveRead(legacy ? old : { 'account-a': old }); await loading;
    return { ctx, saves };
}
(async () => {
    const normal = await scenario();
    assert.equal(normal.ctx.storedData.globalName, 'Old cached profile', 'unchanged startup restores its saved profile');
    const migrated = await scenario(undefined, true);
    assert.equal(migrated.ctx.allAccountsData['account-a'].globalName, 'Old cached profile', 'unchanged legacy startup still migrates its saved profile to the correct account');
    for (const legacy of [false, true]) {
        const edited = await scenario(ctx => {
            const current = { globalName: 'New edit', syncRevision: 2 };
            ctx.storedData = current; ctx.isEnabled = true; ctx.allAccountsData = { 'account-a': current }; ctx.allAccountsEnabled = { 'account-a': true };
        }, legacy);
        assert.equal(edited.ctx.storedData.globalName, 'New edit', 'late local restore cannot overwrite a newer edit');
        assert.equal(edited.saves, 0, 'stale restore must not persist its old data');
        const switched = await scenario(ctx => { ctx.owner = 'account-b'; ctx.storedData = { globalName: 'Account B' }; }, legacy);
        assert.equal(switched.ctx.storedData.globalName, 'Account B', 'account switch discards a previous account restore');
        assert.equal(switched.ctx.allAccountsData['account-b'], undefined, 'legacy account A data cannot migrate into B');
        assert.equal(switched.saves, 0);
    }
    for (const change of [ctx => { ctx.profileRuntimeActive = false; }, ctx => { ctx.profileRuntimeGeneration++; }]) {
        const stale = await scenario(change);
        assert.equal(Object.keys(stale.ctx.allAccountsData).length, 0, 'disabled or restarted runtime discards pending restores');
        assert.equal(stale.saves, 0);
    }
    console.log('PASS desktop persisted-profile restore, concurrent edits, legacy migration, account switches and runtime lifecycle isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
