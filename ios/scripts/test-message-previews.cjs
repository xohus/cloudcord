const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const page = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const registrations = new Map();
const previewModule = {};
const latestModule = {};
const nativeUser = Object.freeze({ id: '123', username: 'real' });
const message = Object.freeze({ id: 'message', author: nativeUser, content: 'real is unchanged' });
let custom = 'custom';
let refreshes = 0;
const cleanup = [];
const context = vm.createContext({ module: { exports: {} },
    __CLOUDCORD_PRESENTATION_USER__: user => user && custom ? { ...user, username: custom } : user,
    findByProps: () => previewModule,
    metroModules: { 1: { isInitialized: true, __filePath: 'modules/message_previews/useLatestChannelMessage.tsx', publicModule: { exports: latestModule } } },
    addPatch: (method, parent, callback) => registrations.set(`${parent === latestModule ? 'latest' : 'preview'}:${method}`, callback),
    useReducer: () => [0, () => refreshes++],
    useEffect: effect => cleanup.push(effect()),
    identityRefreshers: new Set(),
});
vm.runInContext(esbuild.transformSync(fs.readFileSync('ios/runtime/src/lib/api/profileIdentity.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
context.presentationIdentity = context.module.exports.presentationIdentity;
vm.runInContext(esbuild.transformSync(page.slice(page.indexOf('const messagePreviews ='), page.indexOf('const rowManager =')), { loader: 'ts' }).code, context);
assert.equal(registrations.get('preview:formatMessagePreview')([message], item => `${item.author.username}: ${item.content}`), 'custom: real is unchanged');
assert.equal(registrations.get('latest:default')(['channel'], () => message).author.username, 'custom');
assert.equal(registrations.get('preview:useFormattedMessagePreview')([message], item => item.author.username), 'custom');
custom = 'updated';
for (const refresh of context.identityRefreshers) refresh();
assert.equal(refreshes, 1);
assert.equal(registrations.get('preview:formatMessagePreview')([message], item => item.author.username), 'updated');
custom = '';
assert.equal(registrations.get('latest:default')([], () => message), message);
assert.equal(message.author.username, 'real');
for (const dispose of cleanup) dispose?.();
assert.equal(context.identityRefreshers.size, 0);
console.log('PASS: native DM preview formatter/latest-message hooks project names, refresh, reset, and preserve cached content.');
