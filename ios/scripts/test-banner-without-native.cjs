const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const start = workflow.indexOf('              addAfterPatch("getBanner", bannerComposer');
const end = workflow.indexOf('\n              });', start) + '\n              });'.length;
assert(start >= 0 && end > start);
let patch;
const context = { bannerComposer: {}, preview: { enabled: true }, mediaUri: () => 'file:///local-banner.gif',
    isCurrentUser: id => id === 'own', getProfileOverride: id => id === 'shared' ? { banner: 'https://example.com/shared.png' } : undefined,
    addAfterPatch: (_name, _target, handler) => patch = handler };
vm.runInNewContext(esbuild.transformSync(workflow.slice(start, end), { loader: 'ts' }).code, context);
const own = patch([{ userId: 'own' }], null);
assert.equal(own.bannerSrc, 'file:///local-banner.gif');
assert.equal(own.source.uri, 'file:///local-banner.gif');
const native = Object.freeze({ bannerSrc: 'original', color: '#123456' });
assert.equal(patch([{ displayProfile: { userId: 'own' } }], native).color, native.color);
assert.equal(native.bannerSrc, 'original');
assert.equal(patch([{ userId: 'shared' }], undefined).bannerSrc, 'https://example.com/shared.png');
assert.equal(patch([{ userId: 'unshared' }], null), undefined);
context.preview.enabled = false;
assert.equal(patch([{ userId: 'own' }], null), undefined);
assert.equal(patch([{}], null), undefined);
console.log('PASS local/shared banners without native banners, native metadata, privacy and immutable input');
