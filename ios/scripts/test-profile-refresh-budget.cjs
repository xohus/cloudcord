const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const w = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const source = w.slice(w.indexOf('          const sharedProfileSeenAt ='), w.indexOf('          function getProfileOverride('));
let calls = 0;
const state = { currentState: 'active' };
const ctx = { AppState: state, currentUserId: '999999999999999', sharedProfileFetchedAt: new Map(), sharedProfiles: new Map(), sharedRequests: new Set(),
    SHARED_PROFILE_API: 'https://example.test', fetch: () => { calls++; return new Promise(() => {}); }, setTimeout, clearTimeout, Date };
ctx.fetchProfileResponse = (...args) => ctx.fetch(...args);
vm.runInNewContext(esbuild.transformSync(source, { loader: 'ts' }).code, ctx);
const id = '123456789012345';
state.currentState = 'background';
ctx.requestSharedProfile(id);
assert.equal(calls, 0);
state.currentState = 'active';
ctx.requestSharedProfile(id);
ctx.requestSharedProfile(id);
assert.equal(calls, 1);
for (let n = 1; n <= 20; n++) ctx.requestSharedProfile(String(BigInt(id) + BigInt(n)));
assert.equal(calls, 4);
ctx.sharedRequests.clear();
ctx.requestSharedProfile(id, true);
assert.equal(calls, 4, 'forced background polling must respect TTL');
console.log('PASS background suppression, request deduplication, 30-second TTL and four-request cap');

let now = 1000000, lookups = 0, missing = true;
const recentlyViewed = { AppState: { currentState: 'active' }, currentUserId: '999999999999999',
    sharedProfileFetchedAt: new Map(), sharedProfiles: new Map(), sharedRequests: new Set(),
    SHARED_PROFILE_API: 'https://example.test', Date: { now: () => now }, JSON,
    setTimeout: () => 1, clearTimeout() {},
    fetch: async () => { lookups++; return { ok: !missing, status: missing ? 404 : 200,
        json: async () => ({ profile: { badgeFlags: 8 } }) }; } };
recentlyViewed.fetchProfileResponse = (...args) => recentlyViewed.fetch(...args);
vm.runInNewContext(esbuild.transformSync(source, { loader: 'ts' }).code, recentlyViewed);
(async () => {
    const settle = async () => { for (let turn = 0; turn < 8; turn++) await Promise.resolve(); };
    recentlyViewed.requestSharedProfile(id); await settle();
    assert.equal(lookups, 1);
    now += 30000;
    recentlyViewed.requestSharedProfile(id, true); await settle();
    assert.equal(lookups, 1, 'missing profiles must not generate a tight polling loop');
    missing = false; now += 30000;
    recentlyViewed.requestSharedProfile(id, true); await settle();
    assert.equal(lookups, 2, 'actively viewed missing profiles must be checked again within a minute');
    assert.equal(recentlyViewed.sharedProfiles.get(id).badgeFlags, 8, 'newly published shared badges replace the cached miss');
    console.log('PASS newly published badges replace an actively viewed missing profile within one minute');
})().catch(error => { console.error(error); process.exitCode = 1; });
