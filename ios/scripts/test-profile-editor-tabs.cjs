const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const page = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const ui = fs.readFileSync('ios/runtime/src/core/ui/settings/components/FakeProfileGlass.tsx', 'utf8');
const tabType = ui.match(/export type ProfileTab = ([^;]+);/)[1];
const tabs = new Set([...tabType.matchAll(/"([^"]+)"/g)].map(match => match[1]));
for (const match of page.matchAll(/activeTab\s*[!=]==\s*"([^"]+)"/g)) {
    assert(tabs.has(match[1]), `Editor branch uses a retired/nonexistent tab: ${match[1]}`);
}
const effectStart = page.lastIndexOf('useEffect(() => {', page.indexOf('if (activeTab !=='));
const effectEnd = page.indexOf('}, [activeTab]);', effectStart) + '}, [activeTab]);'.length;
assert(effectStart >= 0 && effectEnd > effectStart);
const effect = page.slice(effectStart, effectEnd);
let catalogLoads = 0, decorationLoads = 0, result;
const rows = [{ asset: 'a_test', skuId: '123', label: 'Test', uri: 'https://cdn.discordapp.com/test.png' }];
const ctx = vm.createContext({ activeTab: 'profile', catalog: null,
    useEffect: fn => fn(), loadCatalog: () => catalogLoads++,
    findDecorationCatalog: async () => { decorationLoads++; return rows; },
    setDecorations: value => { result = value; }, setDecorationsLoading() {} });
const code = esbuild.transformSync(effect, { loader: 'ts' }).code;
(async () => {
    vm.runInContext(code, ctx);
    assert.equal(decorationLoads, 0, 'opening the Profile tab does not download the cosmetics catalog');
    ctx.activeTab = 'style';
    vm.runInContext(code, ctx);
    await Promise.resolve();
    assert.equal(catalogLoads, 1);
    assert.equal(decorationLoads, 1, 'the visible Style tab loads decorations');
    assert.equal(result, rows);
    console.log('PASS every mobile editor branch uses a real tab; Style loads the catalog and decoration picker');
})().catch(error => { console.error(error); process.exitCode = 1; });
