const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const source = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const block = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const compile = code => esbuild.transformSync(code, { loader: 'ts' }).code;
const pending = [];
let uploads = 0, clears = 0;
const context = vm.createContext({ Date, currentUserId: 'a', mediaSelections: new Map(),
    preview: { enabled: true, syncRevision: Date.now() + 600000, selectedBadges: {} }, rootSettings: {}, suppressOwnPullUntil: 0,
    normalizeMedia: (_key, asset) => new Promise(resolve => pending.push(() => resolve(asset))),
    unmarkMediaCleared: () => clears++, refreshPreview() {}, queueSharedPublish: () => uploads++ });
vm.runInContext(compile(block('function beginMediaSelection(', 'async function pickFile(')
    + block('function markMediaCleared(', 'function unmarkMediaCleared(')), context);
(async () => {
    const old = context.saveMedia('avatarMedia', { uri: 'old' });
    const latest = context.saveMedia('avatarMedia', { uri: 'latest' });
    pending[1](); assert.equal(await latest, true);
    const revision = context.preview.syncRevision;
    pending[0](); assert.equal(await old, false);
    assert.equal(context.preview.avatarMedia.uri, 'latest');
    assert.equal(uploads, 1, 'an older selection cannot upload after the latest one');
    const removed = context.saveMedia('avatarMedia', { uri: 'removed' });
    context.markMediaCleared('avatarMedia'); context.preview.avatarMedia = null;
    pending[2](); assert.equal(await removed, false);
    assert.equal(context.preview.avatarMedia, null, 'late crop results cannot resurrect removed images');
    const changedAccount = context.saveMedia('bannerMedia', { uri: 'account-a' });
    context.currentUserId = 'b'; pending[3]();
    assert.equal(await changedAccount, false);
    assert.equal(uploads, 1); assert.equal(clears, 1);
    context.currentUserId = 'a';
    const selected = context.saveMedia('bannerMedia', { uri: 'current' }); pending[4]();
    assert.equal(await selected, true);
    assert(context.preview.syncRevision > revision, 'image edits advance revisions even with clock skew');
    assert.equal(context.rootSettings.fakeProfile.bannerMedia.uri, 'current', 'media changes persist into saved settings');
    let callback;
    const photo = vm.createContext({ findByProps: () => ({ launchImageLibrary: (_options, done) => { callback = done; } }),
        beginMediaSelection: () => 'picker-token', saveMedia: async (_key, _asset, token) => { assert.equal(token, 'picker-token'); return false; } });
    vm.runInContext(compile(block('async function pickPhoto(', 'class NamePreviewBoundary')), photo);
    const result = photo.pickPhoto('avatarMedia'); callback({ assets: [{ uri: 'late-photo' }] });
    assert.equal(await result, false, 'picker returns the stale-result outcome instead of claiming success');
    console.log('PASS newer image selection wins, removal/account switches reject late crops, persistent revisions and picker result accuracy');
})().catch(error => { console.error(error); process.exitCode = 1; });
