const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const source = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const compile = text => esbuild.transformSync(text, { loader: 'tsx' }).code;
const badgeHelper = source.slice(source.indexOf('function badgeLayoutKey('), source.indexOf('function applyBadgeLayout'));
const renderer = source.slice(source.indexOf('after("default", useBadgesModule'), source.indexOf('diagnostics.patches += 1;', source.indexOf('function connectBadgeRenderer')));
let callback;
let remote = false;
let enabled = true;
const context = vm.createContext({
    after: (_name, _module, fn) => { callback = fn; }, useBadgesModule: {},
    nativeBadgeRows: new Map(), refreshPublishedBadges() {},
    isRealProfileView: () => false,
    isCurrentUser: () => !remote, requestSharedProfile() {},
    getProfileOverride: () => ({ nitro: enabled, nitroLevel: 1, giftLevel: -1 }),
    cloudCordStaffBadge: () => null, shouldReplaceSharedBadges: () => false,
    shouldReplaceLocalBadges: () => false, remoteNitroEnabled: data => data?.nitro,
    localBadgesHidden: () => false,
    preview: { enabled: true, nitroEnabled: true, nitroMonths: 12, giftLevel: -1 },
    NITRO_DURATIONS: [0, 12], NITRO_ICONS: [], BADGES: [], GIFT_LEVELS: [],
    nitroBadgeId: months => `premium_tenure_${months}_month_v2`,
    nitroSubscriberLabel: () => 'Nitro', milestoneIcon: () => 'icon',
    addRenderedBadge: (rows, id) => { if (id.startsWith('premium_tenure_')) rows.push({ id }); },
    serverBoostingLabel: () => '', boosterIcon: () => null,
    appendPublishedBadges: rows => rows
});
vm.runInContext(compile(badgeHelper + renderer), context);
const native = [{ id: 'premium' }, { id: 'premium_tenure_1_month_v2' }, { id: 'premium_early_supporter' }, { id: 'active_developer' }];
for (remote of [false, true]) {
    const result = callback([{ id: '123456789012345' }], native);
    assert.deepEqual(Array.from(result, row => row.id), ['premium_tenure_12_month_v2', 'premium_early_supporter', 'active_developer']);
}
enabled = false;
context.preview.nitroEnabled = false;
for (remote of [false, true]) {
    assert.deepEqual(Array.from(callback([{ id: '123456789012345' }], native), row => row.id), native.map(row => row.id));
}
assert.equal(native.length, 4, 'Discord source badge arrays stay unchanged');
remote = false;
context.preview.nitroEnabled = true;
context.localBadgesHidden = () => true;
assert.deepEqual(Array.from(callback([{ id: '123456789012345' }], native), row => row.id), native.map(row => row.id), 'hiding device-only cosmetics must retain the real badge list');

let emits = 0;
let fetches = 0;
let payload = { badges: [] };
const app = { currentState: 'active' };
const refreshContext = vm.createContext({ AppState: app, Date, JSON,
    fetch: async () => { fetches++; return { ok: true, json: async () => payload }; },
    safeStore: () => ({ emitChange: () => emits++ }) });
const publishedSource = source.slice(source.indexOf('let publishedBadges:'), source.indexOf('const nativeBadgeRows'));
vm.runInContext(compile(publishedSource), refreshContext);
(async () => {
    app.currentState = 'background';
    await refreshContext.refreshPublishedBadges(true);
    assert.equal(fetches, 0);
    app.currentState = 'active';
    payload = { badges: [{ id: 'test', userId: '123', name: 'Test', icon: 'https://getcloudcord.com/v1/custom-badges/test.png' }] };
    await refreshContext.refreshPublishedBadges(true);
    assert.equal(emits, 2);
    await refreshContext.refreshPublishedBadges();
    assert.equal(fetches, 1);
    await refreshContext.refreshPublishedBadges(true);
    assert.equal(emits, 2, 'unchanged badges must not trigger store refreshes');
    let clears = 0;
    let profile = { bio: 'saved', nitro: false };
    const own = vm.createContext({
        rootSettings: {}, preview: { primaryColor: '#000000', accentColor: '#ffffff' },
        fakeProfileEditorOpen: false, suppressOwnPullUntil: 0,
        customSocialValidationErrors: () => [], currentUserId: '123456789012345',
        Date, JSON, SHARED_PROFILE_API: 'https://example.test', BADGES: [],
        fetch: async () => ({ ok: true, json: async () => ({ profile }) }),
        normalizeProfileAppearance: () => ({}), mediaClearPending: () => false,
        remoteNitroEnabled: data => data.nitro === true, remoteReplaceBadges: () => false,
        colorHex: (value, fallback) => value ?? fallback, diagnostics: {},
        clearCache: () => clears++
    });
    vm.runInContext(compile(source.slice(source.indexOf('async function pullOwnSharedProfile('), source.indexOf('const sharedProfileSeenAt'))), own);
    await own.pullOwnSharedProfile();
    assert.equal(clears, 1);
    own.pullOwnSharedProfile.lastAttempt = 0;
    await own.pullOwnSharedProfile();
    assert.equal(clears, 1, 'identical own profile must not replace observed settings or clear caches');
    profile = { bio: 'updated', nitro: false };
    own.pullOwnSharedProfile.lastAttempt = 0;
    await own.pullOwnSharedProfile();
    assert.equal(clears, 2, 'actual own profile changes must still apply');
    assert.equal(own.preview.bio, 'updated');
    let finish;
    own.fetch = () => new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => ({ profile: { bio: 'late response', syncRevision: 10 } }) }); });
    own.pullOwnSharedProfile.lastAttempt = 0;
    const pending = own.pullOwnSharedProfile();
    own.preview = { ...own.preview, bio: 'new local edit', syncRevision: 11 };
    finish(); await pending;
    assert.equal(own.preview.bio, 'new local edit', 'mobile in-flight polls cannot overwrite edits made after the request');
    assert.equal(clears, 2);
    console.log('PASS real Nitro replaced locally/remotely, real badges preserved when disabled, background refresh suppressed and unchanged badge snapshots do not rerender');
})().catch(error => { console.error(error); process.exitCode = 1; });
