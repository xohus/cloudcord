const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const page = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const source = page.slice(page.indexOf('function requestSharedProfile('), page.indexOf('function getProfileOverride('));
const id = '123456789012345';
let response;
let refreshes = 0;
const profiles = new Map();
const fetched = new Map();
const requests = new Set();
const context = vm.createContext({
    sharedProfiles: profiles, sharedProfileFetchedAt: fetched, sharedRequests: requests,
    currentUserId: '999999999999999', SHARED_PROFILE_API: 'https://example.com',
    identityRefreshers: new Set([() => refreshes++]), safeStore: () => ({ emitChange() {} }),
    fetch: async () => response
});
vm.runInContext(esbuild.transformSync(source, { loader: 'ts' }).code, context);
async function request(status, profile) {
    response = { ok: status === 200, status, json: async () => ({ profile }) };
    context.requestSharedProfile(id, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.size, 0);
}
(async () => {
    await request(200, { username: 'synced' });
    assert.equal(profiles.get(id).username, 'synced');
    assert.equal(refreshes, 1);
    await request(503);
    assert.equal(profiles.get(id).username, 'synced', 'Transient failures must retain the last known identity');
    assert.equal(refreshes, 1);
    await request(404);
    assert.equal(Object.keys(profiles.get(id)).length, 0);
    assert.equal(refreshes, 2, 'Deleted profiles must refresh visible names');
    await request(404);
    assert.equal(refreshes, 2, 'Repeated missing profiles must not create a refresh loop');
    console.log('PASS: actual mobile profile request updates identities, clears removed profiles and preserves valid data during service failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
