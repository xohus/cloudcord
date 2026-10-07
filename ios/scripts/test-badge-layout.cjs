const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('../../desktop/client/node_modules/esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const mobile = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const api = fs.readFileSync('desktop/client/src/plugins/_api/badges/index.tsx', 'utf8');
const desktopHelper = fs.readFileSync('desktop/client/src/api/BadgeLayout.ts', 'utf8').replace(/export /g, '');
const mobileHelper = mobile.slice(mobile.indexOf('function badgeLayoutKey('), mobile.indexOf('const CLOUDCORD_BADGE_ICON'))
    + mobile.slice(mobile.indexOf('function defaultBadgeOrder('), mobile.indexOf('const CLOUDCORD_STAFF_ROLES'));
const result = value => JSON.parse(JSON.stringify(value));
function host(helper) {
    const context = vm.createContext({});
    vm.runInContext(esbuild.transformSync(helper, { loader: 'ts' }).code, context);
    return context;
}
const contexts = [host(desktopHelper), host(mobileHelper)];
for (const context of contexts) {
    assert.equal(context.badgeLayoutKey({ id: 'cloudcord-official-founder:463515440606609419:light' }), 'cloudcord-official-founder');
    assert.equal(context.applyBadgeLayout([{ id: 'cloudcord-official-founder:owner:dark' }], { hiddenBadgeIds: ['cloudcord-official-founder'] }).length, 0);
}
const badgeSets = [
    ['sp_staff', 'premium_tenure_72_month_v2', 'sp_boost', 'sp_account_age_10', 'cloudcord-official-manager', 'cloudcord-custom-abc'],
    ['fakeprofile-staff', 'premium_tenure_72_month_v2', 'fakeprofile-boost', 'fakeprofile-account_age_10', 'cloudcord-official-manager', 'cloudcord-custom-abc'],
    ['cloudcord-shared-staff', 'premium_tenure_72_month_v2', 'cloudcord-shared-boost', 'cloudcord-shared-account_age_10', 'cloudcord-official-manager', 'cloudcord-custom-abc']
];
for (const context of contexts) {
    for (const ids of badgeSets) {
        const badges = Object.freeze(ids.map(id => Object.freeze({ id })));
        const layout = { badgeOrder: ['cloudcord-custom-abc', 'boost', 'staff', 'nitro'], hiddenBadgeIds: ['nitro', 'cloudcord-official-manager'] };
        const visible = context.applyBadgeLayout(badges, layout);
        assert.deepEqual(result(visible.map(context.badgeLayoutKey)), ['cloudcord-custom-abc', 'boost', 'staff', 'account_age_10']);
        assert.deepEqual(result(context.applyBadgeLayout(badges, null)), result(badges));
        assert.equal(context.applyBadgeLayout(badges, { hiddenBadgeIds: [] }).length, badges.length);
        assert.deepEqual(result(badges.map(b => b.id)), ids, 'Do not mutate Discord badge arrays');
    }
    assert.deepEqual(result(context.moveBadgeOrder(['staff', 'nitro', 'boost'], 'nitro', -1)), ['nitro', 'staff', 'boost']);
    assert.deepEqual(result(context.moveBadgeOrder(['staff', 'nitro', 'boost'], 'nitro', 1)), ['staff', 'boost', 'nitro']);
    assert.deepEqual(result(context.moveBadgeOrder(['staff', 'nitro'], 'staff', -1)), ['staff', 'nitro']);
    assert.deepEqual(result(context.moveBadgeOrder(['staff', 'nitro'], 'nitro', 1)), ['staff', 'nitro']);
    assert.deepEqual(result(context.moveBadgeOrder(['staff', 'nitro'], 'missing', 1)), ['staff', 'nitro']);
    const realOrder = context.defaultBadgeOrder([{ id: 'premium' }, { id: 'premium_guild_subscriber' }, { id: 'staff' }]);
    assert.deepEqual(result(realOrder.slice(0, 3)), ['nitro', 'boost', 'staff']);
    const discordStaffFirst = context.defaultBadgeOrder([{ id: 'staff' }, { id: 'premium' }]);
    assert.deepEqual(result(discordStaffFirst.slice(0, 2)), ['staff', 'nitro']);
    const defaultRows = context.applyBadgeLayout([{ id: 'cloudcord-official-founder' }, { id: 'sp_staff' }, { id: 'premium' }], { badgeOrder: context.defaultBadgeOrder([]) });
    assert.deepEqual(result(defaultRows.map(context.badgeLayoutKey)), ['nitro', 'staff', 'cloudcord-official-founder']);
}
// Verify the desktop patch transforms the whole native+custom badge list, not
// just badges returned by CloudCord. The original getter stays available.
const original = 'class Profile {constructor(){this.userId="123"}getBadges(){let flags=1;return[{id:"premium"},{id:"hypesquad_house_1"}]}getLegacyUsername(){return null}}';
const injection = api.match(/match: \/getBadges\\\(\\\)\\\{\.\{0,100\}\?return\\\[\/[\s\S]*?replace: "([^"]+)"/);
assert.ok(injection, 'Existing native badge injection patch is present');
const wrapper = api.match(/match: \/getBadges\\\(\\\)\\\{\/[\s\S]*?replace: "([^"]+)"/)[1];
const patched = original.replace(/getBadges\(\)\{.{0,100}?return\[/, injection[1].replace('$self', 'plugin'))
    .replace(/getBadges\(\)\{/, wrapper.replace('$self', 'plugin'));
const patchHost = vm.createContext({ plugin: {
    getBadges: () => [{ id: 'cloudcord-official-manager' }],
    applyBadgeLayout: (profile, badges) => contexts[0].applyBadgeLayout(badges, { hiddenBadgeIds: ['nitro'], badgeOrder: ['bravery', 'cloudcord-official-manager'] })
} });
vm.runInContext(patched + ';globalThis.profile=new Profile();', patchHost);
assert.deepEqual(result(patchHost.profile.getBadges().map(b => b.id)), ['hypesquad_house_1', 'cloudcord-official-manager']);
assert.equal(patchHost.profile.cloudcordUnorderedBadges().length, 3);
// Exercise the actual mobile update function; previously selectedBadges was
// overwritten by the old snapshot after assigning [key].
const updateSource = mobile.slice(mobile.indexOf('const update = (key:'), mobile.indexOf('const choose = async'));
const updateHost = vm.createContext({ rootSettings: {}, preview: { selectedBadges: { staff: true } }, queueSharedPublish() {}, clearCache() {}, refreshPreview() {}, redraw() {}, suppressOwnPullUntil: 0 });
vm.runInContext(esbuild.transformSync(updateSource, { loader: 'ts' }).code + ';globalThis.update=update;', updateHost);
updateHost.update('selectedBadges', { account_age_10: true }, true);
assert.deepEqual(result(updateHost.rootSettings.fakeProfile.selectedBadges), { account_age_10: true });
updateHost.update('hiddenBadgeIds', ['nitro'], true);
updateHost.update('badgeOrder', ['boost', 'staff'], true);
assert.deepEqual(result(updateHost.rootSettings.fakeProfile.hiddenBadgeIds), ['nitro']);
assert.deepEqual(result(updateHost.rootSettings.fakeProfile.badgeOrder), ['boost', 'staff']);
const serializer = desktop.slice(desktop.indexOf('function toSharedProfile('), desktop.indexOf('async function publishSharedProfile('));
const serializerHost = vm.createContext({ REPLACE_BADGES_SYNC_ID: 'replace', ALL_DECORATIONS: [], getDecorationUrl: () => '' });
vm.runInContext(esbuild.transformSync(serializer, { loader: 'ts' }).code, serializerHost);
const payload = serializerHost.toSharedProfile({ hiddenBadgeIds: ['nitro'], badgeOrder: ['boost', 'staff'] });
assert.deepEqual(result(payload.hiddenBadgeIds), ['nitro']);
assert.deepEqual(result(payload.badgeOrder), ['boost', 'staff']);
assert.match(mobile, /hiddenBadgeIds: \[\.\.\.preview\.hiddenBadgeIds\]/);
assert.match(mobile, /badgeOrder: \[\.\.\.preview\.badgeOrder\]/);
assert.match(mobile, /return applyBadgeLayout\(next,/);
const css = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/style.css', 'utf8');
assert.match(css, /\.cp-badge-layout-label\s*\{\s*color: var\(--text-normal/);
assert.match(css, /\.cp-badges\s*\{[^}]*margin-bottom: 10px;/);
assert.match(css, /\.cp-section-label\s*\{[^}]*margin-top: 14px;/);
for (const source of [desktop, mobile]) {
    assert.ok(source.includes('Golden Bug Hunter'));
    assert.ok(!source.includes('Bug Hunter Lvl 1'));
    assert.ok(!source.includes('Bug Hunter Level 2'));
    assert.ok(source.includes('label: tier.name'));
}
esbuild.transformSync(mobile, { loader: 'tsx' });
// The profile-store path must honor layout too, not only useBadges.
const profileHost = host(mobileHelper);
Object.assign(profileHost, {
    preview: { nitroEnabled: false, boostMonths: 0, selectedBadges: {}, hiddenBadgeIds: ['staff'], badgeOrder: ['boost', 'nitro'] },
    BADGES: [], shouldReplaceLocalBadges: () => false
});
vm.runInContext(esbuild.transformSync(mobile.slice(mobile.indexOf('function selectedBadgeObjects('), mobile.indexOf('function cloneObject(')), { loader: 'ts' }).code, profileHost);
const nativeRows = [{ id: 'premium' }, { id: 'staff' }, { id: 'premium_guild_subscriber' }];
assert.deepEqual(result(profileHost.selectedBadgeObjects(nativeRows)).map(row => row.id), ['premium_guild_subscriber', 'premium']);
assert.equal(profileHost.selectedBadgeObjects(nativeRows, true).length, 3);
assert.ok(!mobile.includes('label="Move Left"'));
assert.match(mobile, /accessibilityLabel=\{direction === -1 \? "Move badge up"/);
// Desktop publish must work in Discord's isolated renderer without localStorage.
(async () => {
    const saved = new Map();
    const publishHost = vm.createContext({
        activeUserId: () => 'owner', isEnabled: true, storedData: {}, allAccountsData: {},
        SHARED_PROFILE_API: 'https://example.test', LS_SHARE: 'share',
        saveDataSync() {}, saveAllDataSync() {}, toSharedProfile: data => data,
        DataStore: { get: async key => saved.get(key), set: async (key, value) => saved.set(key, value) },
        fetch: async (url, options) => options ? ({ ok: true, json: async () => ({ id: 'profile', editToken: 'test-token' }) }) : ({ ok: false })
    });
    vm.runInContext(esbuild.transformSync(desktop.slice(desktop.indexOf('async function publishSharedProfile('), desktop.indexOf('function queueSharedPublish(')), { loader: 'ts' }).code, publishHost);
    await publishHost.publishSharedProfile();
    assert.equal(saved.get('share').id, 'profile');
    await publishHost.publishSharedProfile();
    console.log('PASS: desktop cloud save without localStorage and persisted sync credentials');
})().catch(error => { console.error(error); process.exitCode = 1; });
console.log('PASS: native/custom/staff hiding, restoration, ordering, cross-client keys, native getter patch, sync and mobile selection saving');
