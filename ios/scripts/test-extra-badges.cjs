const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || '../../desktop/client/node_modules/esbuild');
const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const mobile = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
function catalog(source) {
    const start = source.indexOf('// Discord artwork archived');
    const end = source.indexOf('\nconst ', source.indexOf('\n];', source.indexOf('const EXTRA_BADGES', start)));
    const context = vm.createContext({});
    vm.runInContext(source.slice(start, end) + '\nglobalThis.catalog = { groups: EXPERIMENTAL_BADGE_GROUPS, events: EVENT_BADGES, badges: EXTRA_BADGES };', context);
    return JSON.parse(JSON.stringify(context.catalog));
}
const expected = catalog(desktop);
assert.deepEqual(catalog(mobile), expected, 'All clients must use identical IDs, labels and artwork');
assert.equal(expected.groups.length, 4);
assert.equal(expected.events.length, 2);
assert.equal(expected.badges.length, 42);
assert.equal(new Set(expected.badges.map(b => b.id)).size, 42);
for (const group of expected.groups) assert.equal(group.tiers.length, 10);
esbuild.transformSync(mobile, { loader: 'tsx' });
esbuild.transformSync(desktop, { loader: 'tsx' });
assert.match(desktop, /profileData\.customBadgeIds\?\.includes\(badge\.id\)/);
assert.match(mobile, /badge\.id, badge\.label, 0, badge\.icon, badge\.id/);
// Exercise the actual mobile selection handler: one tier per group, None removes,
// unrelated badges preserved, and changes use the existing sync-enabled update.
const handler = mobile.slice(mobile.indexOf('const chooseExperimentalBadge ='), mobile.indexOf('const chooseGiftBadge ='));
let options;
let saved;
const context = vm.createContext({
    preview: { selectedBadges: { staff: true, account_age_1: true, streaming_1: true } },
    update: (key, value, sync) => { saved = { key, value, sync }; context.preview.selectedBadges = value; },
    simpleSheets: { showSimpleActionSheet: sheet => { options = sheet.options; }, hideActionSheet() {} },
    Alert: { alert: () => assert.fail('Badge picker failed') }
});
vm.runInContext(esbuild.transformSync(handler, { loader: 'ts' }).code + '\nglobalThis.choose = chooseExperimentalBadge;', context);
context.choose(expected.groups[0]);
options[10].onPress();
assert.equal(saved.sync, true);
assert.equal(saved.value.account_age_10, true);
assert.equal(saved.value.account_age_1, undefined);
assert.equal(saved.value.staff, true);
assert.equal(saved.value.streaming_1, true);
options[0].onPress();
assert.equal(saved.value.account_age_10, undefined);
assert.equal(saved.value.staff, true);
// Execute the desktop/browser picker with a minimal JSX host and exercise its
// real Select callback, including None and preservation of other badge families.
const pickerSource = desktop.slice(desktop.indexOf('function BadgePicker('), desktop.indexOf('\nfunction ', desktop.indexOf('function BadgePicker(') + 1));
const desktopContext = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    Select: 'Select', BadgeBtn: 'BadgeBtn', BADGES: [], NITRO_LEVELS: [],
    GIFT_LEVELS: [], BOOST_LABELS: [], BOOST_ICONS: [], OLD_NAME_BADGE_ICON: '',
    EXPERIMENTAL_BADGE_GROUPS: expected.groups, EVENT_BADGES: expected.events
});
vm.runInContext(esbuild.transformSync(pickerSource, { loader: 'tsx' }).code, desktopContext);
let selectedIds;
const renderPicker = ids => desktopContext.BadgePicker({
    selected: 0, customIds: ids, onCustomIds: value => { selectedIds = Array.from(value); },
    oldName: '', replaceRealBadges: false
});
function findSelect(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'Select') return node;
    for (const child of (Array.isArray(node) ? node : node.children || [])) {
        const found = findSelect(child);
        if (found) return found;
    }
    return null;
}
findSelect(renderPicker(['quest', 'account_age_1', 'streaming_1'])).props.select('account_age_10');
assert.deepEqual(selectedIds, ['quest', 'streaming_1', 'account_age_10']);
findSelect(renderPicker(selectedIds)).props.select('');
assert.deepEqual(selectedIds, ['quest', 'streaming_1']);
const serializer = desktop.slice(desktop.indexOf('function toSharedProfile('), desktop.indexOf('async function publishSharedProfile('));
desktopContext.REPLACE_BADGES_SYNC_ID = 'replace';
desktopContext.ALL_DECORATIONS = [];
desktopContext.getDecorationUrl = () => '';
vm.runInContext(esbuild.transformSync(serializer, { loader: 'ts' }).code, desktopContext);
const ids = expected.badges.map(b => b.id);
assert.deepEqual(Array.from(desktopContext.toSharedProfile({ customBadgeIds: ids }).customBadgeIds), ids);
console.log('PASS: 42 badges, cross-client parity, TSX syntax, both pickers, removal and shared serialization');
