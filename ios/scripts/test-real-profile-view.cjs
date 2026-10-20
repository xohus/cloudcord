const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || require.resolve('esbuild', { paths: [require('node:path').resolve('desktop/client'), require('node:path').resolve('ios/runtime')] }));
const id = '1394648991223779328';
const other = '1169999011642605628';
const compile = (source, loader = 'ts') => esbuild.transformSync(source, { loader, format: 'cjs' }).code;
const storage = new Map();
function desktop() {
    const ctx = vm.createContext({ module: { exports: {} }, exports: {}, require: () => ({ localStorage: {
        getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)
    } }) });
    vm.runInContext(compile(fs.readFileSync('desktop/client/src/utils/realProfileView.ts', 'utf8')), ctx);
    return ctx.module.exports;
}
let saved = desktop();
assert.equal(saved.isRealProfileView(id), false);
saved.setRealProfileView(id, true);
assert.equal(saved.isRealProfileView(id), true);
assert.equal(saved.isRealProfileView(other), false);
saved = desktop();
assert.equal(saved.isRealProfileView(id), true, 'viewer choice survives reload');
saved.setRealProfileView(id, false);
assert.equal(saved.isRealProfileView(id), false);
saved.setRealProfileView('bad id', true);
assert.equal(saved.isRealProfileView('bad id'), false);

const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const source = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const helpers = source.slice(source.indexOf('function isRealProfileView('), source.indexOf('function refreshSharedProfiles('));
const profile = Object.freeze({ username: 'custom-name', bio: 'custom bio' });
const root = { fakeProfile: profile };
const hooks = new Map();
let intercept;
let lastSheet;
const mobile = vm.createContext({ rootSettings: root, settings: {}, sharedProfiles: new Map([[id, profile]]),
    isCurrentUser: uid => uid === other, clearCache() {}, identityRefreshers: new Set(),
    safeStore: () => ({ emitChange() {} }), simpleSheets: { showSimpleActionSheet() {}, hideActionSheet() {} },
    findByName: () => () => {}, setTimeout: fn => fn(),
    instead: (_method, _parent, fn) => { intercept = fn; },
    onJsxCreate: (name, fn) => hooks.set(name, fn), TableRow: 'row',
    createElement: (type, props) => ({ type, props }),
    cloneElement: (node, props) => ({ ...node, props: { ...node.props, ...props } }) });
vm.runInContext(compile(helpers), mobile);
mobile.connectRealProfileMenu();
assert.equal(mobile.getProfileOverride(id), profile);
const original = { key: 'UserProfileOverflow', userId: id, options: [{ label: 'Block' }] };
intercept([original], sheet => { lastSheet = sheet; });
assert.equal(original.options.length, 1, 'native menu stays immutable');
assert.equal(lastSheet.options.at(-1).label, 'Show real profile');
lastSheet.options.at(-1).onPress();
assert.equal(mobile.getProfileOverride(id), undefined);
assert.equal(root.fakeProfile, profile, 'viewing real profiles cannot edit or publish the owner snapshot');
intercept([original], sheet => { lastSheet = sheet; });
assert.equal(lastSheet.options.at(-1).label, 'Show CloudCord profile');
lastSheet.options.at(-1).onPress();
assert.equal(mobile.getProfileOverride(id), profile, 'switching back restores the retained shared snapshot');
const unrelated = { key: 'ChannelMenu', userId: id, options: [] };
intercept([unrelated], sheet => { lastSheet = sheet; });
assert.equal(lastSheet, unrelated, 'unrelated menus stay untouched');
const own = { key: 'UserProfileOverflow', userId: other, options: [] };
intercept([own], sheet => { lastSheet = sheet; });
assert.equal(lastSheet, own, 'own profile publishing settings stay separate');
for (const hook of hooks.values()) {
    const menu = { props: { userId: id, options: [] } };
    const modified = hook(null, menu);
    assert.equal(modified.props.options.length, 1);
    assert.equal(hook(null, modified), modified, 'menu option must not duplicate');
    assert.equal(menu.props.options.length, 0);
}
mobile.safeStore = () => ({ getUserProfile: () => ({ private: true }) });
assert.equal(mobile.getProfileOverride(id), undefined, 'private Discord profile details remain untouched');
assert.equal(mobile.getProfileOverride(id, true), profile, 'public CloudCord badges do not depend on Discord friendship/privacy');
root.cloudcordRealProfileUsers = [id];
assert.equal(mobile.getProfileOverride(id, true), undefined, 'real-profile viewer choice also hides public cosmetic badges');

const desktopSource = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const badgeViewer = vm.createContext({ realGetUserProfile: () => ({ private: true }), storedData: {},
    isRealProfileView: () => false, sharedProfiles: new Map([[id, profile]]), sharedViewedAt: new Map(), Date });
vm.runInContext(compile(desktopSource.slice(desktopSource.indexOf('function isPrivateProfile('), desktopSource.indexOf('const sharedProfileFetchedAt'))), badgeViewer);
assert.equal(badgeViewer.viewedSharedProfile(id), undefined);
assert.equal(badgeViewer.viewedSharedProfile(id, true), profile);
badgeViewer.isRealProfileView = () => true;
assert.equal(badgeViewer.viewedSharedProfile(id, true), undefined);
badgeViewer.isRealProfileView = () => false;
badgeViewer.storedData.hideOtherProfiles = true;
assert.equal(badgeViewer.viewedSharedProfile(id, true), undefined);
assert.match(source, /const data = getProfileOverride\(id, true\)/);
assert.match(desktopSource, /profileData = viewedSharedProfile\(userId, true\)/);
console.log('PASS real-profile preference persistence, per-user isolation, reversible mobile menu actions, private Discord details separated from public CloudCord badges and native menu immutability');
