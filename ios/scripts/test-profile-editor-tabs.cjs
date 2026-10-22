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
// A website refresh changes defaultValue without remounting the input. Simulate
// that prop update as well as a normal native typing event and controlled mode.
let draft, previousDefault = Symbol('initial');
const effects = [], typed = [];
const inputContext = vm.createContext({ View: 'View', TextInput: 'TextInput',
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    useState: initial => { if (draft === undefined) draft = initial; return [draft, value => { draft = value; }]; },
    useEffect: (fn, deps) => { if (deps[0] !== previousDefault) { previousDefault = deps[0]; effects.push(fn); } } });
const inputSource = ui.slice(ui.indexOf('export function DiscordInput('), ui.indexOf('// Compatibility names')).replace('export ', '');
vm.runInContext(esbuild.transformSync(inputSource, { loader: 'tsx', jsx: 'transform' }).code, inputContext);
const renderInput = props => inputContext.DiscordInput({ onChangeText: value => typed.push(value), ...props }).children[0];
assert.equal(renderInput({ defaultValue: 'old' }).props.value, 'old');
effects.splice(0).forEach(fn => fn());
renderInput({ defaultValue: 'synced' });
effects.splice(0).forEach(fn => fn());
let input = renderInput({ defaultValue: 'synced' });
assert.equal(input.props.value, 'synced', 'a forced profile refresh must update visible input text');
input.props.onChangeText('typed');
assert.equal(renderInput({ defaultValue: 'synced' }).props.value, 'typed');
assert.deepEqual(typed, ['typed']);
assert.equal(renderInput({ value: 'controlled', defaultValue: 'ignored' }).props.value, 'controlled');
(async () => {
    vm.runInContext(code, ctx);
    assert.equal(decorationLoads, 0, 'opening the Profile tab does not download the cosmetics catalog');
    ctx.activeTab = 'cosmetics';
    vm.runInContext(code, ctx);
    await Promise.resolve();
    assert.equal(catalogLoads, 1);
    assert.equal(decorationLoads, 1, 'the visible Cosmetics tab loads decorations');
    assert.equal(result, rows);
    console.log('PASS every mobile editor branch uses a real tab; Cosmetics loads the catalog and decoration picker');
})().catch(error => { console.error(error); process.exitCode = 1; });
