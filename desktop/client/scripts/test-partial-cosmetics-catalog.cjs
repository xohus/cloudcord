const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), esbuild = require('esbuild');
const source = fs.readFileSync('src/sincordplugins/fakeProfile/cosmetics.tsx', 'utf8');
const code = esbuild.transformSync(source.slice(source.indexOf('let catalog:'), source.indexOf('/** Full effect config')), { loader: 'ts', format: 'cjs' }).code;
const empty = () => ({ decorations: [], nameplates: [], effects: [], frames: [] });
async function run(failRemote) {
    const partial = { ...empty(), decorations: [{ skuId: 'existing' }] };
    const remote = { decorations: [{ skuId: 'existing' }, { skuId: 'new' }], nameplates: [{ skuId: 'name' }], effects: [{ skuId: 'effect' }], frames: [{ skuId: 'frame' }] };
    let requests = 0;
    const context = vm.createContext({ Date, Set, Promise, Error, module: { exports: {} },
        logger: { warn() {} }, withTimeout: value => value,
        findStore: () => ({ products: new Map([['existing', {}]]) }),
        parseCatalog: value => Array.isArray(value) ? partial : remote,
        RestAPI: { async get({ url }) { if (url === '/user-profile-effects') return { body: {} }; requests++; if (failRemote) throw new Error('offline'); return { body: remote }; } }
    });
    vm.runInContext(code, context);
    const result = await context.module.exports.loadCatalog();
    assert.equal(result.decorations[0].skuId, 'existing');
    if (!failRemote) {
        assert.equal(result.decorations.length, 2, 'overlapping products are deduplicated');
        assert.equal(result.nameplates.length, 1, 'missing categories are fetched despite a nonempty store');
        assert.equal(result.frames.length, 1);
        assert.equal(result.effects.length, 1);
    } else assert.equal(result.decorations.length, 1, 'an offline fallback preserves available products');
    assert(requests > 0);
}
(async () => { await run(false); await run(true); console.log('PASS partial cosmetics recovery, deduplication and offline fallback'); })().catch(error => { console.error(error); process.exitCode = 1; });
