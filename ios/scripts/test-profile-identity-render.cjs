const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const page = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const user = Object.freeze({ id: '123456789012345', username: 'original' });
let synced = { username: 'first' };
const context = vm.createContext({
    identityRenderers: new WeakMap(), identityRefreshers: new Set(),
    useReducer: () => [0, () => {}], useEffect: fn => fn(),
    renderedUserId: props => props.user.id, isCurrentUser: () => false,
    requestSharedProfile: () => {}, safeStore: () => ({ getUser: () => user }),
    getProfileOverride: () => synced,
    cloneSharedUser: (original, data) => ({ ...original, username: data.username || original.username }),
    decorateSharedProfile: (original, id, data) => ({ ...original, username: data.username }),
    replaceIdentityText: tree => tree,
});
vm.runInContext(esbuild.transformSync(page.slice(page.indexOf('function identityRenderer('), page.indexOf('function connectIdentityRenderer(')), { loader: 'ts' }).code, context);
const render = context.identityRenderer(props => props.user.username);
const props = Object.freeze({ user });
assert.equal(render(props), 'first');
synced = { username: 'second' };
assert.equal(render(props), 'second');
synced = {};
assert.equal(render(props), 'original');
assert.equal(user.username, 'original');
console.log('PASS: mounted identity renders latest synced name and restores original after removal without mutating user records.');
