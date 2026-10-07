const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('../../desktop/client/node_modules/esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const mobile = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const api = fs.readFileSync('desktop/client/src/plugins/_api/badges/index.tsx', 'utf8');
const desktopHelper = fs.readFileSync('desktop/client/src/api/BadgeLayout.ts', 'utf8').replace(/export /g, '');
const mobileHelper = mobile.slice(mobile.indexOf('function badgeLayoutKey('), mobile.indexOf('const CLOUDCORD_BADGE_ICON'));
const result = value => JSON.parse(JSON.stringify(value));
function host(helper) {
    const context = vm.createContext({});
    vm.runInContext(esbuild.transformSync(helper, { loader: 'ts' }).code, context);
    return context;
}
const contexts = [host(desktopHelper), host(mobileHelper)];
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
esbuild.transformSync(mobile, { loader: 'tsx' });
console.log('PASS: native/custom/staff hiding, restoration, ordering, cross-client keys, native getter patch, sync and mobile selection saving');
