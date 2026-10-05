const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const helper = source.slice(source.indexOf('          function addOfficialBadge('), source.indexOf('          function showGiftingBadgeOverlay('));
const rows = new Map();
const context = { badgeRenderProps: rows, CLOUDCORD_BADGE_ICON: 'logo.png', safeStore: () => ({ theme: 'dark' }), addRenderedBadge: (result, id) => { result.push({ id }); rows.set(id, {}); } };
vm.createContext(context);
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
vm.runInContext(esbuild.transformSync(helper, { loader: 'ts' }).code, context);
for (const [color, expected] of [[0xffffff, '#000000'], [0, '#ffffff'], [0xeeeeee, '#000000'], [0x222222, '#ffffff'], [0xaaaaaa, '#ffffff'], [0xcccccc, '#ffffff'], [0xdcdcdc, '#ffffff']]) {
    const result = [];
    context.addOfficialBadge(result, { id: 'official', label: 'CloudCord' }, {}, { profileColorsEnabled: true, primaryColor: color, accentColor: color });
    assert.equal(result[0].tintColor, expected);
    assert.equal(rows.get('official').style.tintColor, expected);
}
const native = [];
context.addOfficialBadge(native, { id: 'official' }, { profile: { themeColors: [0xffffff, 0xffffff] } }, null);
assert.equal(native[0].tintColor, '#000000');
console.log('official badge contrast: light, dark, zero-valued colors and native profile fallback passed');
