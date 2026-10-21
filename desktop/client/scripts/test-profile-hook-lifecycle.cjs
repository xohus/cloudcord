const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const own = Object.freeze({ id: 'own', username: 'real-own' });
const other = Object.freeze({ id: 'other', username: 'real-other' });
const profile = Object.freeze({ userId: 'own', bio: 'real-bio' });
const listeners = new Set();
const users = { getCurrentUser() { assert.equal(this, users); return own; }, getUser(id) { assert.equal(this, users); return id === 'own' ? own : other; },
    addChangeListener: fn => listeners.add(fn), removeChangeListener: fn => listeners.delete(fn) };
const profiles = { getUserProfile(id) { assert.equal(this, profiles); return { ...profile, userId: id }; }, getGuildMemberProfile(id) { assert.equal(this, profiles); return { ...profile, userId: id }; } };
const originals = { current: users.getCurrentUser, user: users.getUser, profile: profiles.getUserProfile, guild: profiles.getGuildMemberProfile };
let transforms = 0;
const plugin = { fakeCurrentUser: user => { transforms++; return { ...user, username: 'custom-own' }; },
    fakeOtherUser: user => { transforms++; return { ...user, username: 'custom-other' }; },
    hookUserProfile: value => ({ ...value, bio: 'custom-bio' }) };
const ctx = vm.createContext({ profileRuntimeActive: true, profileRuntimeGeneration: 1, UserStore: users,
    otherUserCache: new WeakMap(), cachedFakeUser: null, cachedOriginalUser: null,
    Vencord: { Webpack: { findByProps: () => profiles } }, realGetUserProfile: null, realGetCurrentUser: null,
    isEnabled: true, _dataVersion: 1, _realUsername: '', _realGlobalName: '', isMe: id => id === 'own',
    resolveProfileUserId: id => id, requestSharedProfile() {}, viewedSharedProfile: () => ({ bio: 'shared-bio' }),
    decorateSharedProfile: (value, data) => ({ ...value, ...data }) });
vm.runInContext(esbuild.transformSync(source.slice(source.indexOf('const profileStoreCleanups:'), source.indexOf('const isImageUri')), { loader: 'ts' }).code, ctx);
ctx.installProfileStoreHooks(plugin);
assert.equal(listeners.size, 1);
const beforeInvalidation = ctx.otherUserCache;
for (const listener of listeners) listener();
assert.notEqual(ctx.otherUserCache, beforeInvalidation, 'native UserStore updates invalidate presentation caches');
assert.equal(users.getCurrentUser().username, 'custom-own');
assert.equal(users.getUser('other').username, 'custom-other');
assert.equal(profiles.getUserProfile('own').bio, 'custom-bio');
assert.equal(profiles.getGuildMemberProfile('other').bio, 'shared-bio');
const staleCurrent = users.getCurrentUser;
ctx.profileRuntimeActive = false; ctx.profileRuntimeGeneration++;
ctx.uninstallProfileStoreHooks();
assert.equal(listeners.size, 0, 'disabling removes native store listeners');
assert.equal(users.getCurrentUser, originals.current);
assert.equal(users.getUser, originals.user);
assert.equal(profiles.getUserProfile, originals.profile);
assert.equal(profiles.getGuildMemberProfile, originals.guild);
assert.equal(users._cp_hook, undefined);
assert.equal(profiles._cp_hook, undefined);
assert.equal(ctx.realGetUserProfile, null);
assert.equal(ctx.realGetCurrentUser, null);
ctx.profileRuntimeActive = true; ctx.profileRuntimeGeneration++;
ctx.installProfileStoreHooks(plugin);
assert.equal(staleCurrent.call(users).username, 'real-own', 'old wrappers cannot reactivate after restart');
const ourUser = users.getUser;
const external = function (id) { return { ...ourUser.call(this, id), external: true }; };
users.getUser = external;
ctx.profileRuntimeActive = false; ctx.profileRuntimeGeneration++;
ctx.uninstallProfileStoreHooks();
assert.equal(users.getUser, external, 'cleanup preserves wrappers installed later by another plugin');
assert.equal(users.getUser('other').username, 'real-other');
ctx.profileRuntimeActive = true; ctx.profileRuntimeGeneration++;
ctx.installProfileStoreHooks(plugin);
const before = transforms;
assert.equal(users.getUser('other').username, 'custom-other');
assert.equal(transforms, before + 1, 'restart does not stack active profile transformations');
assert.equal(own.username, 'real-own');
assert(source.slice(source.indexOf('    stop() {')).includes('uninstallProfileStoreHooks();'));
console.log('PASS reversible PC user/profile hooks, original method identity, third-party wrapper preservation and restart generation isolation');
