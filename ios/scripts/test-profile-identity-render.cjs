const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const page = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const user = Object.freeze({ id: '123456789012345', username: 'original' });
let synced = { username: 'first' };
const context = vm.createContext({
    diagnostics: {},
    identityRenderers: new WeakMap(), identityRefreshers: new Set(),
    useReducer: () => [0, () => {}], useEffect: fn => fn(),
    renderedUserId: props => props.user.id, isCurrentUser: () => false,
    requestSharedProfile: () => {}, safeStore: () => ({ getUser: () => user }),
    getProfileOverride: () => synced,
    setOwnValue: (object, key, value) => { object[key] = value; },
    shouldReplaceSharedBadges: () => false, remoteNitroEnabled: () => false,
    decorateSharedProfile: (original, id, data) => ({ ...original, username: data.username }),
    replaceIdentityText: tree => tree,
});
Object.assign(context, require('./load-profile-appearance.cjs'));
vm.runInContext(esbuild.transformSync(page.slice(page.indexOf('function cloneSharedUser('), page.indexOf('function decorateSharedProfile(')), { loader: 'ts' }).code, context);
vm.runInContext(esbuild.transformSync(page.slice(page.indexOf('function identityRenderer('), page.indexOf('function connectIdentityRenderer(')), { loader: 'ts' }).code, context);
const render = context.identityRenderer(props => props.user.username);
const props = Object.freeze({ user });
assert.equal(render(props), 'first');
assert.equal(context.diagnostics.identityUser, user.id);
assert.equal(context.diagnostics.identityData, true);
synced = { username: 'second' };
assert.equal(render(props), 'second');
synced = {};
assert.equal(render(props), 'original');
assert.equal(context.diagnostics.identityData, false);
assert.equal(user.username, 'original');
synced = { username: 'third', globalName: 'Synced Display' };
const renderFields = context.identityRenderer(props => [props.user.username, props.user.global_name, props.global_name]);
assert.deepEqual(Array.from(renderFields(props)), ['third', 'Synced Display', 'Synced Display']);
console.log('PASS: mounted identity renders latest synced name and restores original after removal without mutating user records.');
