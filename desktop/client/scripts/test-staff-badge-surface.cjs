const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const source = fs.readFileSync('src/api/Badges.ts', 'utf8');
const helper = source.slice(source.indexOf('function createOfficialCloudBadgeIcon('), source.indexOf('function showStaffRole('));
function check(surface, stored, expected, foreground = '') {
    const frames = [];
    const context = {
        UserProfileStore: { getUserProfile: () => ({ themeColors: stored }) },
        React: { createElement: (type, props) => ({ type, props }) },
        TooltipContainer: 'tooltip', CLOUDCORD_BADGE_ICON: 'logo.png', showStaffRole() {},
        getComputedStyle: node => node.probe ? { color: foreground } : node.style,
        document: { createElement: () => ({ probe: true, style: {}, remove() {} }) },
        requestAnimationFrame: callback => frames.push(callback)
    };
    vm.createContext(context);
    vm.runInContext(esbuild.transformSync(helper + '\nthis.makeBadge = OfficialCloudBadge;', { loader: 'ts' }).code, context);
    const result = context.makeBadge({ userId: 'founder', description: 'CloudCord Founder' });
    const image = { isConnected: false, style: {}, parentElement: { querySelector: () => null, appendChild() {}, style: { getPropertyValue: () => foreground, backgroundColor: surface, backgroundImage: 'none' }, parentElement: null } };
    result.props.children.props.ref(image);
    assert.equal(image.style.filter, undefined, 'do not read a detached portal');
    image.isConnected = true;
    while (frames.length) frames.shift()();
    assert.equal(image.style.filter, expected);
    assert.equal(result.props.text, 'CloudCord Founder');
}
check('rgb(245, 245, 245)', [0, 0], 'none');
check('rgb(245 245 245)', [0, 0], 'none');
check('rgb(30, 30, 30)', [0xffffff, 0xffffff], 'invert(1)');
check('rgb(170, 170, 170)', [0xffffff], 'invert(1)');
check('rgb(170, 170, 170)', [0], 'none', 'rgb(20, 20, 20)');
check('rgb(245, 245, 245)', [0xffffff], 'invert(1)', 'rgb(240, 240, 240)');
console.log('mounted profile foreground controls badge contrast; detached portals and surface fallback tested; Founder tooltip preserved');
