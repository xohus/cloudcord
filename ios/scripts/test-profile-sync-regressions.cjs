const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || require.resolve('esbuild', { paths: [require('node:path').resolve('desktop/client')] }));
const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const mobile = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const compile = text => esbuild.transformSync(text, { loader: 'ts' }).code;
const runtime = { profileRuntimeActive: true, profileRuntimeGeneration: 1 };
function testContext(values) {
    const context = vm.createContext(values);
    context.fetchProfileResponse = (...args) => context.fetch(...args);
    return context;
}
const block = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start)));
const accountLookup = testContext({ AuthenticationStore: { getId: () => null },
    UserStore: { getCurrentUser: () => { throw Error('recursive wrapped lookup'); } },
    realGetCurrentUser: () => ({ id: 'native-account' }), _cachedMyId: 'previous-account' });
vm.runInContext(compile(block(desktop, 'function activeUserId(', 'function fromSharedProfile(')), accountLookup);
assert.equal(accountLookup.activeUserId(), 'native-account');
accountLookup.realGetCurrentUser = () => null;
assert.equal(accountLookup.activeUserId(), null, 'logout cannot reuse a cached account ID for profile publishing');
const ctx = testContext({ normalizeProfileAppearance: () => ({}), sharedDecorationAsset: value => value || '',
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
const profiles = testContext({ nativeSocialProfile: profile => ({ ...profile }),
    applyNativeProfileMetadata() {}, isEnabled: true, storedData: {}, Object, Date });
vm.runInContext(compile(block(desktop, 'function hasFakeBadges(', 'const NITRO_LEVEL_MONTHS')
    + block(desktop, 'function decorateSharedProfile(', 'function resolveProfileUserId(')
    + 'const plugin = {' + block(desktop, '    hookUserProfile(', 'fakeObfuscatedEmail(') + '}; this.ownProfile = plugin.hookUserProfile;'), profiles);
for (const replaceRealBadges of [false, true]) {
    profiles.storedData = { replaceRealBadges, nitro: true, nitroLevel: 0 };
    const sharedProfile = profiles.decorateSharedProfile(nativeProfile, profiles.storedData);
    const ownProfile = profiles.ownProfile(nativeProfile);
    // Fake badges arrive in Discord's own fetched profile data (rewriteFetchedProfile),
    // so reading a profile leaves Discord's badge list as it is.
    assert.equal(sharedProfile.badges.length, 1, 'shared profile reads keep Discord badge data');
    assert.equal(ownProfile.badges.length, 1, 'own profile reads keep Discord badge data');
}
assert.equal(nativeProfile.badges, nativeRows);
assert.equal(nativeRows.length, 1, 'decorating profiles must not erase Discord cached badges');

const accountFlags = Object.freeze({ has: bit => bit === 1 });
const nativeUser = Object.create({ isProvisional() { return this.flags.has(1); } });
Object.assign(nativeUser, { id: '123456789012345', username: 'real', globalName: 'Real' });
Object.defineProperty(nativeUser, 'flags', { value: accountFlags });
const sharedIdentity = { username: 'shared', badgeFlags: 8, replaceRealBadges: true };
const identity = testContext({ ...runtime, otherUserCache: new WeakMap(), nativeProfileAppearance: () => ({}), nativeCollectibles: value => value,
    isEnabled: true, storedData: { username: 'custom', badgeFlags: 8, replaceRealBadges: true },
    viewedSharedProfile: () => sharedIdentity,
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
identity.isMe = () => false;
const stableOther = identity.otherUser(nativeUser);
assert.equal(identity.otherUser(nativeUser), stableOther, 'unchanged native/shared user reads retain object identity');
identity.otherUserCache = new WeakMap();
assert.notEqual(identity.otherUser(nativeUser), stableOther, 'native store changes can invalidate cached presentation users');
for (const invalid of ['bad-date', '2026-02-31', '2026-13-01', '999999999999999']) {
    const value = {};
    identity.applyNativeProfileMetadata(value, { nitro: true, nitroLevel: 0, nitroSince: invalid });
    assert(Number.isFinite(value.premiumSince.getTime()), 'malformed Nitro dates must fall back without crashing profile rendering');
}
const paidProfile = { premiumType: 2, premium_type: 2, premiumSince: 'paid-since', premium_since: 'paid-since',
    premiumGuildSince: 'boost-since', premium_guild_since: 'boost-since', giftCount: 12, gift_count: 12, giftingBadgeTier: 2 };
const biographyOnly = { ...paidProfile };
identity.applyNativeProfileMetadata(biographyOnly, { bio: 'changed', nitro: false, nitroLevel: -1, boostMonths: -1, giftLevel: -1 });
assert.deepEqual(biographyOnly, paidProfile, 'editing a bio without replacing badges preserves paid Nitro, boost and gifting metadata');
const malformedTiers = { ...paidProfile };
identity.applyNativeProfileMetadata(malformedTiers, { nitro: true, nitroLevel: 99, boostMonths: 99, giftLevel: 0.5 });
assert.deepEqual(malformedTiers, paidProfile, 'invalid shared tier values cannot crash or replace real metadata');
for (const tier of [0, 1, 2]) {
    const account = Object.create(Object.getPrototypeOf(nativeUser));
    Object.assign(account, { id: nativeUser.id, username: 'real', globalName: 'Real', premiumType: tier, premium_type: tier,
        premiumSince: 'real-since', premium_since: 'real-since', premiumGuildSince: 'real-boost', premium_guild_since: 'real-boost' });
    Object.defineProperty(account, 'flags', { value: accountFlags });
    identity.storedData = { username: 'custom', nitro: true, nitroLevel: 4, boostMonths: 3, badgeFlags: 8, replaceRealBadges: true };
    identity._dataVersion++;
    identity.isMe = () => true;
    const own = identity.ownUser(account);
    identity.isMe = () => false;
    const other = identity.otherUser(account);
    for (const field of ['premiumType', 'premium_type', 'premiumSince', 'premium_since', 'premiumGuildSince', 'premium_guild_since']) {
        assert.equal(own[field], account[field], `own UserStore ${field} must keep real subscription state for tier ${tier}`);
        assert.equal(other[field], account[field], `other UserStore ${field} must keep real subscription state for tier ${tier}`);
    }
    const profile = { premiumType: tier, user: { ...account } };
    identity.applyNativeProfileMetadata(profile, identity.storedData);
    assert.equal(profile.premiumType, 2, 'the native profile snapshot still shows selected cosmetic Nitro');
    assert.equal(profile.user.premiumType, tier, 'nested account identities never inherit cosmetic entitlement state');
}
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
const host = testContext({ ...runtime, storedData: { bio: 'local', syncRevision: 2, hideOtherProfiles: true }, isEnabled: true,
    activeUserId: () => activeId, profileEditorOpen: false, suppressOwnPullUntil: 0, Date, JSON,
    SHARED_PROFILE_API: 'https://example.test', LOCAL_ONLY_FIELDS: ['hideOtherProfiles', 'nativeEditorImages'],
    fetch: () => new Promise(resolve => { resolveResponse = () => resolve({ ok: true, json: async () => ({ profile: payload }) }); }),
    fromSharedProfile: value => ({ ...value }), allAccountsData: {}, allAccountsEnabled: {},
    saveDataSync: () => writes++, saveAllDataSync() {}, DataStore: { set: async () => {} },
    DS_ALL_DATA: 'allData', DS_ALL_ENABLED: 'allEnabled',
    cachedFakeUser: null, cachedOriginalUser: null, _dataVersion: 0, forceAccountPanelRerender() {}
});
vm.runInContext(compile(pull), host);
const nativeSave = testContext({ storedData: { syncRevision: Date.now() + 600000 }, isEnabled: true,
    Date, activeUserId: () => 'owner', allAccountsData: {}, allAccountsEnabled: {},
    saveDataSync() {}, saveAllDataSync() {}, DataStore: { set: async () => {} },
    DS_KEY: 'profile', DS_ALL_DATA: 'accounts', DS_ALL_ENABLED: 'enabled',
    cachedFakeUser: null, cachedOriginalUser: null, _dataVersion: 0, forceAccountPanelRerender() {} });
vm.runInContext(compile(block(desktop, 'function saveOwnData(', 'function resetProfileAccount(')), nativeSave);
const previousRevision = nativeSave.storedData.syncRevision;
const imageEdit = { avatar: 'https://example.test/avatar.png' };
nativeSave.saveOwnData(imageEdit);
assert(nativeSave.storedData.syncRevision > previousRevision, 'native-editor saves remain newer than the previous server revision, even with clock skew');
assert.equal(imageEdit.syncRevision, undefined, 'revision stamping does not mutate the editor input');
assert.equal(nativeSave.allAccountsData.owner, nativeSave.storedData);
nativeSave.saveOwnData({ bio: 'private', localOnly: true });
assert.equal(nativeSave.storedData.syncRevision, undefined, 'device-only saves need no public sync revision');
(async () => {
    let modalError = '', modalWrites = 0;
    const modal = testContext({ myId: 'old-account', activeUserId: () => 'new-account',
        setSaveError: message => { modalError = message; }, setSaving: () => modalWrites++,
        resetProfileAccount: () => modalWrites++ });
    vm.runInContext(compile(block(desktop, '    async function save(useEverywhere', '    const [tab, setTab]')), modal);
    await modal.save(true);
    assert.equal(modalWrites, 0, 'an editor opened on another account cannot save into the current account');
    assert(modalError.includes('account changed'));
    modalError = ''; await modal.reset();
    assert.equal(modalWrites, 0);
    assert(modalError.includes('account changed'));
    let resetFetches = 0, canceledTimers = 0;
    const resetStorage = new Map();
    const untouched = { bio: 'other account' };
    const resetHost = testContext({ ...runtime, activeUserId: () => 'owner', storedData: { nitro: true, bio: 'old' }, isEnabled: true,
        allAccountsData: { owner: { nitro: true }, other: untouched }, allAccountsEnabled: { owner: true, other: true },
        publishTimer: 123, clearTimeout: () => canceledTimers++, saveDataSync() {}, saveAllDataSync() {},
        DataStore: { set: async (key, value) => resetStorage.set(key, value) }, DS_KEY: 'profile', DS_ENABLED: 'enabled', DS_ALL_DATA: 'accounts', DS_ALL_ENABLED: 'accountEnabled',
        cachedFakeUser: {}, cachedOriginalUser: {}, _trueOriginalUser: {}, _dataVersion: 0, forceAccountPanelRerender() {},
        fetch: async () => { resetFetches++; return { ok: true }; } });
    vm.runInContext(compile(block(desktop, 'function resetProfileAccount(', 'const isImageUri')
        + block(desktop, 'async function pullOwnSharedProfile(', 'function requestSharedProfile(')), resetHost);
    resetHost.resetProfileAccount('owner');
    assert.equal(resetHost.isEnabled, false);
    assert.equal(resetHost.storedData.localOnly, true);
    assert.equal(resetHost.storedData.nitro, undefined);
    assert.equal(resetHost.allAccountsData.other, untouched);
    assert.equal(canceledTimers, 1);
    assert.equal(resetStorage.get('profile').localOnly, true, 'the reset opt-out is saved durably');
    await resetHost.pullOwnSharedProfile();
    assert.equal(resetFetches, 0, 'polling must not resurrect a reset local profile from the server');
    let responseStatus = 503;
    let refreshes = 0;
    const otherId = '987654321098765';
    const viewer = testContext({ ...runtime, Date, JSON, isMe: () => false,
        sharedRequests: new Set(), sharedQueued: new Set(), sharedMissingUntil: new Map(),
        sharedViewedAt: new Map(), SHARED_VIEWED_WINDOW_MS: 120000, SHARED_REFRESH_PER_TICK: 5,
        sharedProfiles: new Map([[otherId, { badgeFlags: 8 }]]), sharedProfileFetchedAt: new Map(),
        sharedBackoffUntil: 0, SHARED_MAX_IN_FLIGHT: 4, SHARED_MISSING_TTL_MS: 900000, SHARED_PROFILE_TTL_MS: 120000,
        SHARED_PROFILE_API: 'https://example.test', fromSharedProfile: value => value,
        fetch: async () => ({ status: responseStatus, ok: responseStatus === 200, headers: { get: () => null }, json: async () => ({ profile: { badgeFlags: 2 } }) }),
        Vencord: { Webpack: { findByStoreName: () => ({ emitChange: () => refreshes++ }) } }, refreshPresence() {} });
    vm.runInContext(compile(block(desktop, 'function requestSharedProfile(', 'const socialLookupAt')), viewer);
    const settle = async () => { for (let turn = 0; turn < 8; turn++) await Promise.resolve(); };
    viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.get(otherId).badgeFlags, 8, 'server outages keep the last valid shared badges');
    assert(viewer.sharedQueued.has(otherId), 'outage requests remain queued rather than silently disappearing');
    viewer.sharedBackoffUntil = 0; responseStatus = 404;
    viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.has(otherId), false, 'confirmed deletion restores the real profile');
    assert.equal(refreshes, 2, 'mounted profile and user surfaces refresh after deletion');
    viewer.sharedMissingUntil.clear(); responseStatus = 200;
    viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.get(otherId).badgeFlags, 2, 'republished profiles load again');
    const unchangedProfile = viewer.sharedProfiles.get(otherId);
    viewer.sharedProfileFetchedAt.clear(); viewer.requestSharedProfile(otherId); await settle();
    assert.equal(viewer.sharedProfiles.get(otherId), unchangedProfile, 'unchanged server responses preserve shared snapshot identity');
    responseStatus = 503; viewer.sharedProfileFetchedAt.clear();
    viewer.requestSharedProfile(otherId); await settle();
    assert(viewer.sharedQueued.has(otherId));
    responseStatus = 200; viewer.sharedBackoffUntil = 0;
    viewer.refreshVisibleSharedProfiles(); await settle();
    assert.equal(viewer.sharedQueued.size, 0, 'the background refresh drains retry requests after backoff expires');
    assert.equal(viewer.sharedProfiles.get(otherId), unchangedProfile);
    const finishes = [];
    viewer.fetch = () => new Promise(resolve => finishes.push(resolve));
    viewer.sharedProfileFetchedAt.clear(); viewer.requestSharedProfile(otherId);
    viewer.profileRuntimeGeneration++; viewer.sharedRequests.clear();
    viewer.requestSharedProfile(otherId);
    finishes[0]({ ok: false, status: 404 }); await settle();
    assert(viewer.sharedRequests.has(otherId), 'a stale runtime finalizer cannot release a newer request slot');
    finishes[1]({ ok: true, status: 200, json: async () => ({ profile: { badgeFlags: 4 } }) }); await settle();
    assert.equal(viewer.sharedRequests.size, 0);
    assert.equal(viewer.sharedProfiles.get(otherId).badgeFlags, 4);
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
    activeId = '123456789012345';
    pending = host.pullOwnSharedProfile();
    host.profileRuntimeGeneration += 2;
    resolveResponse(); await pending;
    assert.equal(writes, 1, 'a quick disable/re-enable rejects responses from the previous runtime');
    assert(mobile.includes('replaceRealBadges: snapshot.replaceBadges === true'));
    let published;
    const publisher = testContext({ ...runtime, activeUserId: () => 'owner', isEnabled: true,
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
    publisher.fetch = async () => ({ ok: true, json: async () => {
        publisher.profileRuntimeGeneration += 2;
        return { profile: { syncRevision: 5 } };
    } });
    await publisher.publishSharedProfile();
    assert.equal(published, null, 'stopped/restarted runtimes cannot resume an old upload');

    const credentials = new Map(), uploads = [];
    let serverProfile = { mobileOnly: 'keep', syncRevision: 100 };
    const concurrent = testContext({ ...runtime, activeUserId: () => 'owner', isEnabled: true,
        storedData: { bio: 'first', customBadgeIds: [] }, allAccountsData: {}, lastRemoteProfile: null,
        SHARED_PROFILE_API: 'https://example.test', LS_SHARE: 'share', Date, JSON,
        REPLACE_BADGES_SYNC_ID: '__cc_replace_real_badges', ALL_DECORATIONS: [], getDecorationUrl: value => value,
        saveDataSync() {}, saveAllDataSync() {}, DataStore: { get: async key => credentials.get(key), set: async (key, value) => credentials.set(key, value) },
        localStorage: { getItem: () => null }, fetch: async (_url, options) => {
            if (!options?.method) return { ok: true, json: async () => ({ profile: serverProfile }) };
            const body = JSON.parse(options.body);
            return new Promise(resolve => uploads.push({ body, method: options.method, finish() {
                serverProfile = body.profile;
                resolve({ ok: true, json: async () => ({ id: 'saved', editToken: 'test' }) });
            } }));
        } });
    vm.runInContext(compile(block(desktop, 'const LOCAL_ONLY_FIELDS', 'async function publishSharedProfile(')
        + block(desktop, 'async function publishSharedProfile(', '// Save edits made outside the modal')), concurrent);
    const firstSave = concurrent.publishSharedProfile();
    for (let turn = 0; turn < 50 && uploads.length < 1; turn++) await settle();
    assert.equal(uploads.length, 1);
    concurrent.storedData = { ...concurrent.storedData, bio: 'second' };
    const secondSave = concurrent.publishSharedProfile();
    concurrent.storedData = { ...concurrent.storedData, bio: 'latest' };
    const thirdSave = concurrent.publishSharedProfile();
    assert.equal(uploads.length, 1, 'only one upload may run at a time');
    uploads[0].finish();
    for (let turn = 0; turn < 50 && uploads.length < 2; turn++) await settle();
    assert.equal(uploads.length, 2, 'overlapping saves coalesce into one fresh snapshot');
    assert.equal(uploads[1].body.profile.bio, 'latest');
    assert.equal(uploads[1].body.profile.mobileOnly, 'keep');
    assert.equal(uploads[1].method, 'PUT', 'the queued upload reuses credentials created by the first upload');
    assert(uploads[1].body.profile.syncRevision > uploads[0].body.profile.syncRevision);
    uploads[1].finish(); await Promise.all([firstSave, secondSave, thirdSave]);
    let attempts = 0;
    concurrent.fetch = async (_url, options) => {
        if (!options?.method) return { ok: true, json: async () => ({ profile: serverProfile }) };
        attempts++;
        if (attempts === 1) { serverProfile = { ...serverProfile, syncRevision: Date.now() + 100000 }; return { ok: false, status: 409 }; }
        const body = JSON.parse(options.body);
        assert(body.profile.syncRevision > serverProfile.syncRevision);
        return { ok: true, json: async () => ({ id: 'saved' }) };
    };
    await concurrent.publishSharedProfile();
    assert.equal(attempts, 2, 'a single cross-device revision conflict is retried with a fresh server revision');
    attempts = 0;
    concurrent.fetch = async (_url, options) => {
        if (!options?.method) return { ok: true, json: async () => ({ profile: serverProfile }) };
        attempts++;
        return attempts === 1 ? { ok: false, status: 401 } : { ok: true, json: async () => ({ id: 'renewed', editToken: 'new-test' }) };
    };
    await concurrent.publishSharedProfile();
    assert.equal(attempts, 2, 'credential renewal must not deadlock behind its own upload queue');
    const originalCredentials = credentials.get('share:owner');
    assert.equal(originalCredentials.id, 'renewed');
    concurrent.activeUserId = () => 'second-owner';
    concurrent.storedData = { bio: 'second account' };
    let method, auth, target;
    concurrent.fetch = async (url, options) => {
        if (!options?.method) return { ok: false, status: 404 };
        ({ method, headers: { Authorization: auth } } = options); target = url;
        return { ok: true, json: async () => ({ id: 'second-profile', editToken: 'second-test' }) };
    };
    await concurrent.publishSharedProfile();
    assert.equal(method, 'POST');
    assert.equal(auth, undefined, 'a new Discord account cannot reuse the other account edit token');
    assert.equal(credentials.get('share:owner'), originalCredentials);
    assert.equal(credentials.get('share:second-owner').id, 'second-profile');
    concurrent.activeUserId = () => 'owner';
    concurrent.storedData = { bio: 'first account again' };
    await concurrent.publishSharedProfile();
    assert.equal(method, 'PUT');
    assert(target.endsWith('/renewed'));
    assert.equal(auth, 'Bearer new-test');
    const phone = testContext({ rootSettings: { fakeProfile: {} }, preview: { enabled: true, syncRevision: 42 },
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
    console.log('PASS Nitro billing isolation, badge replacement, serialized/coalesced saves, bounded conflict/credential retries, per-account credentials, stale response rejection and local preferences');
})().catch(error => { console.error(error); process.exitCode = 1; });
