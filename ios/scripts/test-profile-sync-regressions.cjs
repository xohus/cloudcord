const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || require.resolve('esbuild', { paths: [require('node:path').resolve('desktop/client')] }));
const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const mobile = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const compile = text => esbuild.transformSync(text, { loader: 'ts' }).code;
const block = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));
const ctx = vm.createContext({ normalizeProfileAppearance: () => ({}), sharedDecorationAsset: value => value || '',
    REPLACE_BADGES_SYNC_ID: '__cc_replace_real_badges', getDecorationUrl: value => value, ALL_DECORATIONS: [] });
vm.runInContext(compile(block(desktop, 'function fromSharedProfile(', 'const NITRO_LEVEL_MONTHS') + block(desktop, 'function toSharedProfile(', 'async function publishSharedProfile(')), ctx);
assert.equal(ctx.fromSharedProfile({ nitro: false, nitroLevel: 0 }).nitro, false);
assert.equal(ctx.fromSharedProfile({ nitroLevel: 0 }).nitro, true);
assert.equal(ctx.fromSharedProfile({}).nitro, false);
const shared = { replaceRealBadges: true, ...ctx.toSharedProfile({ replaceRealBadges: false, customBadgeIds: [] }) };
assert.equal(shared.replaceRealBadges, false, 'an old true flag cannot override an explicit false save');
assert.equal(ctx.fromSharedProfile(shared).replaceRealBadges, false);
const marked = ctx.toSharedProfile({ replaceRealBadges: true, customBadgeIds: [] });
assert.equal(ctx.fromSharedProfile(marked).replaceRealBadges, true);

const layout = fs.readFileSync('desktop/client/src/api/BadgeLayout.ts', 'utf8').replace(/export /g, '');
vm.runInContext(compile(layout), ctx);
vm.runInContext(compile('const plugin = {' + block(desktop, '    filterNativeBadges(', '    fakeGiftCode(') + '}; this.filter = plugin.filterNativeBadges;'), ctx);
const badges = Object.freeze([{ id: 'premium_tenure_12_month_v2', cloudcordProfileBadge: true }, { id: 'premium' }, { id: 'partner' }, { id: 'cloudcord-official-moderator' }].map(Object.freeze));
let data = { nitro: true, nitroLevel: 4, replaceRealBadges: true };
const plugin = { getBadgeLayout: () => data };
assert.deepEqual(Array.from(ctx.filter.call(plugin, 'user', badges), b => b.id), ['premium_tenure_12_month_v2', 'cloudcord-official-moderator']);
data.replaceRealBadges = false;
assert.deepEqual(Array.from(ctx.filter.call(plugin, 'user', badges), b => b.id), ['premium_tenure_12_month_v2', 'partner', 'cloudcord-official-moderator']);
assert.equal(badges.length, 4, 'native badge lists are never mutated');

// Exercise both native profile-decoration paths, not just the final badge renderer.
const nativeRows = Object.freeze([Object.freeze({ id: 'partner' })]);
const nativeProfile = Object.freeze({ badges: nativeRows, bio: 'real' });
const profiles = vm.createContext({ nativeSocialProfile: profile => ({ ...profile }),
    applyNativeProfileMetadata() {}, isEnabled: true, storedData: {}, Object, Date });
vm.runInContext(compile(block(desktop, 'function hasFakeBadges(', 'const NITRO_LEVEL_MONTHS')
    + block(desktop, 'function decorateSharedProfile(', 'function resolveProfileUserId(')
    + 'const plugin = {' + block(desktop, '    hookUserProfile(', 'fakeObfuscatedEmail(') + '}; this.ownProfile = plugin.hookUserProfile;'), profiles);
for (const replaceRealBadges of [false, true]) {
    profiles.storedData = { replaceRealBadges, nitro: true, nitroLevel: 0 };
    const sharedProfile = profiles.decorateSharedProfile(nativeProfile, profiles.storedData);
    const ownProfile = profiles.ownProfile(nativeProfile);
    assert.equal(sharedProfile.badges.length, replaceRealBadges ? 0 : 1, 'shared profiles respect the native badge toggle');
    assert.equal(ownProfile.badges.length, replaceRealBadges ? 0 : 1, 'own profiles respect the native badge toggle');
}
assert.equal(nativeProfile.badges, nativeRows);
assert.equal(nativeRows.length, 1, 'decorating profiles must not erase Discord cached badges');

const accountFlags = Object.freeze({ has: bit => bit === 1 });
const nativeUser = Object.create({ isProvisional() { return this.flags.has(1); } });
Object.assign(nativeUser, { id: '123456789012345', username: 'real', globalName: 'Real' });
Object.defineProperty(nativeUser, 'flags', { value: accountFlags });
const identity = vm.createContext({ nativeProfileAppearance: () => ({}), nativeCollectibles: value => value,
    isEnabled: true, storedData: { username: 'custom', badgeFlags: 8, replaceRealBadges: true },
    viewedSharedProfile: () => ({ username: 'shared', badgeFlags: 8, replaceRealBadges: true }),
    isRealProfileView: () => false, isMe: () => false,
    cachedOriginalUser: null, cachedFakeUser: null, cachedDataHash: -1, _dataVersion: 0, _trueOriginalUser: null,
    GIFT_LEVELS: [], Date, Object, Reflect });
vm.runInContext(compile(block(desktop, 'function hasFakeBadges(', '// Last profile pulled')
    + block(desktop, 'function decorateSharedIdentity(', 'function decorateSharedProfile(')
    + 'const plugin = {' + block(desktop, '    fakeCurrentUser(', '    getActiveProfileColors(') + '}; this.ownUser = plugin.fakeCurrentUser; this.otherUser = plugin.fakeOtherUser;'), identity);
for (const [decorate, mine] of [[identity.ownUser, true], [identity.otherUser, false], [value => identity.decorateSharedIdentity(value, { username: 'shared' }), false]]) {
    identity.isMe = () => mine;
    const cloned = decorate(nativeUser);
    assert.equal(cloned.flags, accountFlags, 'cosmetic badges cannot replace Discord account-status flags');
    assert.equal(cloned.isProvisional(), true, 'native account-status methods remain callable');
    assert.notEqual(cloned.username, 'real');
}
assert.equal(nativeUser.flags, accountFlags);
assert.equal(nativeUser.username, 'real');
identity.isMe = () => true;
identity.storedData = { username: 'custom', badgeFlags: 8, replaceRealBadges: true, nitro: true, nitroLevel: 1, localOnly: true, hideBadgesWhenSyncOff: true };
identity._dataVersion++;
const hiddenIdentity = identity.ownUser(nativeUser);
assert.equal(hiddenIdentity.flags, accountFlags);
assert.equal(hiddenIdentity.publicFlags, nativeUser.publicFlags);
assert.equal(hiddenIdentity.premiumType, nativeUser.premiumType, 'hidden cosmetic badges cannot generate a fake native Nitro badge');

const pull = block(desktop, 'async function pullOwnSharedProfile(', 'function requestSharedProfile(');
let resolveResponse;
let activeId = '123456789012345';
let payload = { bio: 'remote', syncRevision: 3 };
let writes = 0;
const host = vm.createContext({ storedData: { bio: 'local', syncRevision: 2, hideOtherProfiles: true }, isEnabled: true,
    activeUserId: () => activeId, profileEditorOpen: false, suppressOwnPullUntil: 0, Date, JSON,
    SHARED_PROFILE_API: 'https://example.test', LOCAL_ONLY_FIELDS: ['hideOtherProfiles', 'nativeEditorImages'],
    fetch: () => new Promise(resolve => { resolveResponse = () => resolve({ ok: true, json: async () => ({ profile: payload }) }); }),
    fromSharedProfile: value => ({ ...value }), allAccountsData: {}, allAccountsEnabled: {},
    saveDataSync: () => writes++, saveAllDataSync() {}, DataStore: { set: async () => {} },
    DS_ALL_DATA: 'allData', DS_ALL_ENABLED: 'allEnabled',
    cachedFakeUser: null, cachedOriginalUser: null, _dataVersion: 0, forceAccountPanelRerender() {}
});
vm.runInContext(compile(pull), host);
(async () => {
    let responseStatus = 503;
    let refreshes = 0;
    const otherId = '987654321098765';
    const viewer = vm.createContext({ Date, JSON, isMe: () => false,
        sharedRequests: new Set(), sharedQueued: new Set(), sharedMissingUntil: new Map(),
        sharedProfiles: new Map([[otherId, { badgeFlags: 8 }]]), sharedProfileFetchedAt: new Map(),
        sharedBackoffUntil: 0, SHARED_MAX_IN_FLIGHT: 4, SHARED_MISSING_TTL_MS: 900000, SHARED_PROFILE_TTL_MS: 120000,
        SHARED_PROFILE_API: 'https://example.test', fromSharedProfile: value => value,
        fetch: async () => ({ status: responseStatus, ok: responseStatus === 200, headers: { get: () => null }, json: async () => ({ profile: { badgeFlags: 2 } }) }),
        Vencord: { Webpack: { findByStoreName: () => ({ emitChange: () => refreshes++ }) } }, refreshPresence() {} });
    vm.runInContext(compile(block(desktop, 'function requestSharedProfile(', 'function refreshVisibleSharedProfiles(')), viewer);
    const settle = async () => { for (let turn = 0; turn < 8; turn++) await Promise.resolve(); };
    viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.get(otherId).badgeFlags, 8, 'server outages keep the last valid shared badges');
    viewer.sharedBackoffUntil = 0; responseStatus = 404;
    viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.has(otherId), false, 'confirmed deletion restores the real profile');
    assert.equal(refreshes, 2, 'mounted profile and user surfaces refresh after deletion');
    viewer.sharedMissingUntil.clear(); responseStatus = 200;
    viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.get(otherId).badgeFlags, 2, 'republished profiles load again');
    let pending = host.pullOwnSharedProfile();
    host.storedData = { bio: 'edited during request', syncRevision: 4 };
    resolveResponse(); await pending;
    assert.equal(host.storedData.bio, 'edited during request');
    assert.equal(writes, 0);
    host.storedData = { bio: 'local', syncRevision: 2, hideOtherProfiles: true };
    pending = host.pullOwnSharedProfile(); resolveResponse(); await pending;
    assert.equal(host.storedData.bio, 'remote');
    assert.equal(host.storedData.hideOtherProfiles, true);
    pending = host.pullOwnSharedProfile(); resolveResponse(); await pending;
    assert.equal(writes, 1, 'identical remote state must not rerender every poll');
    payload = { bio: 'old', syncRevision: 1 };
    pending = host.pullOwnSharedProfile(); resolveResponse(); await pending;
    assert.equal(host.storedData.bio, 'remote');
    pending = host.pullOwnSharedProfile(); activeId = '999999999999999'; resolveResponse(); await pending;
    assert.equal(writes, 1, 'account switches discard in-flight responses');
    assert(mobile.includes('replaceRealBadges: preview.replaceBadges === true'));
    let published;
    const publisher = vm.createContext({ activeUserId: () => 'owner', isEnabled: true,
        storedData: { replaceRealBadges: false, customBadgeIds: [], hideBadgesWhenSyncOff: true },
        allAccountsData: {}, lastRemoteProfile: { mobileOnly: 'stale', replaceRealBadges: true },
        SHARED_PROFILE_API: 'https://example.test', LS_SHARE: 'share', Date, JSON,
        REPLACE_BADGES_SYNC_ID: '__cc_replace_real_badges', ALL_DECORATIONS: [], getDecorationUrl: value => value,
        saveDataSync() {}, saveAllDataSync() {}, DataStore: { get: async () => ({}), set: async () => {} },
        localStorage: { getItem: () => null },
        fetch: async (_url, options) => options?.method ? (published = JSON.parse(options.body), { ok: true, json: async () => ({ id: 'saved', editToken: 'test' }) })
            : ({ ok: true, json: async () => ({ profile: { mobileOnly: 'latest', replaceRealBadges: true, syncRevision: 5 } }) })
    });
    vm.runInContext(compile(block(desktop, 'const LOCAL_ONLY_FIELDS', 'async function publishSharedProfile(') + block(desktop, 'async function publishSharedProfile(', '// Save edits made outside the modal')), publisher);
    await publisher.publishSharedProfile();
    assert.equal(published.profile.mobileOnly, 'latest', 'preserve fresh remote-only fields, not an old cached snapshot');
    assert.equal(published.profile.replaceRealBadges, false);
    assert.equal(published.profile.hideBadgesWhenSyncOff, undefined, 'local badge visibility must not leak into shared settings');
    publisher.activeUserId = () => 'switched';
    publisher.fetch = async () => { publisher.activeUserId = () => 'another'; return { ok: true }; };
    published = null;
    await publisher.publishSharedProfile();
    assert.equal(published, null, 'account switches cannot upload the previous account profile');
    publisher.activeUserId = () => 'owner';
    publisher.storedData = { bio: 'new account edits', syncRevision: 42 };
    publisher.fetch = async () => ({ ok: true, json: async () => {
        publisher.activeUserId = () => 'another';
        return { profile: { bio: 'previous account', syncRevision: 100 } };
    } });
    await publisher.publishSharedProfile();
    assert.equal(publisher.storedData.syncRevision, 42, 'switching while decoding cannot alter the new account revision');
    assert.equal(published, null);
    publisher.activeUserId = () => 'owner';
    publisher.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(publisher.publishSharedProfile(), /latest shared profile \(503\)/);
    assert.equal(published, null, 'a failed latest-profile read must not publish a stale or cross-account snapshot');
    const phone = vm.createContext({ rootSettings: { fakeProfile: {} }, preview: { enabled: true, syncRevision: 42 },
        currentUserId: 'owner', customSocialValidationErrors: () => [], ownSharedProfile: async () => ({ syncRevision: 42 }),
        SHARED_PROFILE_API: 'https://example.test', Date, JSON,
        fetch: async () => ({ ok: true, json: async () => {
            phone.currentUserId = 'another';
            return { profile: { syncRevision: 100 } };
        } }) });
    vm.runInContext(compile(block(mobile, 'async function publishSharedProfile(', 'function queueSharedPublish(')), phone);
    await phone.publishSharedProfile();
    assert.equal(phone.preview.syncRevision, 42, 'mobile must also discard account switches during decoding');
    phone.currentUserId = 'owner';
    phone.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(phone.publishSharedProfile(), /latest shared profile \(503\)/);
    console.log('PASS explicit badge and Nitro off values, immutable replacement/deduplication, stale and concurrent sync responses, account isolation, local preferences and unchanged polling');
})().catch(error => { console.error(error); process.exitCode = 1; });
