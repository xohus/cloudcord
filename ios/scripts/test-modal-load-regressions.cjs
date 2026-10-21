const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const compile = code => esbuild.transformSync(code, { loader: 'ts' }).code;
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function timers() {
    let now = 0, next = 0;
    const tasks = new Map();
    return { tasks, setTimeout(fn, ms) { const id = ++next; tasks.set(id, { fn, at: now + ms }); return id; },
        clearTimeout(id) { tasks.delete(id); }, async tick() {
            const [id, task] = [...tasks].sort((a, b) => a[1].at - b[1].at)[0] || [];
            assert(task, 'a stalled load must have a deadline'); tasks.delete(id); now = task.at; task.fn(); await flush();
        } };
}
(async () => {
    for (const file of ['desktop/client/src/utils/asyncTimeout.ts', 'ios/runtime/src/lib/utils/asyncTimeout.ts']) {
        const clock = timers(), context = vm.createContext({ ...clock });
        vm.runInContext(compile(fs.readFileSync(file, 'utf8').replace('export ', '')), context);
        let finish;
        const task = context.withTimeout(new Promise(resolve => { finish = resolve; }));
        const rejection = assert.rejects(task, /too long/);
        await clock.tick(); await rejection;
        finish('late'); await flush();
        assert.equal(clock.tasks.size, 0);
        assert.equal(await context.withTimeout(Promise.resolve('ready')), 'ready');
        assert.equal(clock.tasks.size, 0, 'successful loads clear their timeout');
    }
    const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/cosmetics.tsx', 'utf8');
    const clock = timers(); let mode = 'hang', goodListeners = 0;
    const expected = { decorations: [{ skuId: 'one' }], effects: [], nameplates: [], frames: [] };
    const catalog = vm.createContext({ ...clock, Date,
        RestAPI: { get: () => mode === 'hang' ? new Promise(() => {}) : Promise.resolve({ body: {} }) },
        findStore: () => null, findByCode: () => null, parseCatalog: () => expected });
    vm.runInContext(compile(fs.readFileSync('desktop/client/src/utils/asyncTimeout.ts', 'utf8').replace('export ', '')
        + desktop.slice(desktop.indexOf('let catalog:'), desktop.indexOf('/** Full effect config')).replace('export ', '')
        + 'this.addListener = callback => listeners.add(callback);'), catalog);
    const stalled = assert.rejects(catalog.loadCatalog(), /too long/);
    await flush();
    for (let i = 0; i < 3; i++) await clock.tick();
    await stalled;
    mode = 'ready';
    catalog.addListener(() => { throw Error('closed editor'); });
    catalog.addListener(() => goodListeners++);
    assert.equal(await catalog.loadCatalog(true), expected, 'a timed-out catalog load releases the request and supports retry');
    assert.equal(goodListeners, 1, 'one stale listener cannot break catalog publication');
    assert.equal(clock.tasks.size, 0);
    const effects = []; let finishLoad, stateUpdates = 0;
    const hook = vm.createContext({ catalog: null,
        loadCatalog: () => new Promise(resolve => { finishLoad = resolve; }),
        React: { useRef: value => ({ current: value }), useCallback: fn => fn,
            useState: value => [value, () => stateUpdates++], useEffect: fn => effects.push(fn) } });
    vm.runInContext(compile(desktop.slice(desktop.indexOf('function useCatalog('), desktop.indexOf('function CatalogState('))), hook);
    hook.useCatalog(); const cleanup = effects[0]();
    assert.equal(stateUpdates, 1);
    cleanup(); finishLoad(expected); await flush();
    assert.equal(stateUpdates, 1, 'closing a modal prevents late load results from updating its state');
    const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
    assert(workflow.includes('generation !== collectiblesGeneration'), 'late mobile catalog results must be discarded');
    assert(workflow.includes('seen.size >= 2000'), 'decoration scans must be bounded');
    assert(workflow.includes('decorationRequest = readDecorationCatalog()'), 'duplicate decoration loads share a request');
    console.log('PASS cross-client deadlines, late completion, retry after stalled catalog, listener isolation and mobile loader guards');
})().catch(error => { console.error(error); process.exitCode = 1; });
