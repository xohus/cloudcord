const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const source = fs.readFileSync('src/api/Badges.ts', 'utf8');
const helper = source.slice(source.indexOf('function OfficialCloudBadge('), source.indexOf('function showStaffRole('));
function check(surface, stored, expected) {
    const context = {
        UserProfileStore: { getUserProfile: () => ({ themeColors: stored }) },
        React: { createElement: (type, props) => ({ type, props }) },
        TooltipContainer: 'tooltip', CLOUDCORD_BADGE_ICON: 'logo.png', showStaffRole() {},
        getComputedStyle: node => node.style
    };
    vm.createContext(context);
    vm.runInContext(esbuild.transformSync(helper + '\nthis.makeBadge = OfficialCloudBadge;', { loader: 'ts' }).code, context);
    const result = context.makeBadge({ userId: 'founder', description: 'CloudCord Founder' });
    const image = { style: {}, parentElement: { style: { backgroundColor: surface, backgroundImage: 'none' }, parentElement: null } };
    result.props.children.props.ref(image);
    assert.equal(image.style.filter, expected);
    assert.equal(result.props.text, 'CloudCord Founder');
}
check('rgb(245, 245, 245)', [0, 0], 'none');
check('rgb(245 245 245)', [0, 0], 'none');
check('rgb(30, 30, 30)', [0xffffff, 0xffffff], 'invert(1)');
check('rgb(170, 170, 170)', [0xffffff], 'invert(1)');
console.log('visible light/dark/gray surfaces override stale store colors; Founder tooltip preserved');
