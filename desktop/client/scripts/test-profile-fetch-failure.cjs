const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('src/utils/discord.tsx', 'utf8');
const start = source.indexOf('export async function fetchUserProfile(');
const end = source.indexOf('\n/**', start);
assert(start >= 0 && end > start, 'profile fetch implementation is available');
const events = [];
let cached, response, failure, requests = 0;
const context = vm.createContext({
    UserProfileStore: { getUserProfile: () => cached },
    FluxDispatcher: { dispatch: event => { events.push(event); } },
    Constants: { Endpoints: { USER_PROFILE: id => `/users/${id}/profile` } },
    RestAPI: { get: async () => { requests++; if (failure) throw failure; return response; } }
});
vm.runInContext(esbuild.transformSync(source.slice(start, end).replace('export ', ''), { loader: 'ts' }).code, context);
(async () => {
    const id = '1169999011642605628';
    failure = new Error('Profile service unavailable');
    await assert.rejects(context.fetchUserProfile(id), error => error === failure);
    assert.deepEqual(events.map(event => event.type), ['USER_PROFILE_FETCH_START', 'USER_PROFILE_FETCH_FAILURE']);
    assert(events.every(event => event.userId === id), 'failure clears loading for the requested user');
    events.length = 0;
    failure = null;
    response = { body: { user: { id }, guild_member: { bio: 'server profile' } } };
    await context.fetchUserProfile(id, { guild_id: '1517960356180529162' });
    assert.deepEqual(events.map(event => event.type), ['USER_PROFILE_FETCH_START', 'USER_UPDATE', 'USER_PROFILE_FETCH_SUCCESS', 'GUILD_MEMBER_PROFILE_UPDATE']);
    events.length = 0;
    cached = { userId: id };
    assert.equal(await context.fetchUserProfile(id), cached);
    assert.equal(requests, 2, 'cached profiles do not make another request');
    assert.equal(events.length, 0);
    console.log('PASS profile failure clears loading, retry succeeds, guild profiles update and cache avoids requests');
})().catch(error => { console.error(error); process.exitCode = 1; });
