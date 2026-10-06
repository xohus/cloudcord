const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const source = fs.readFileSync('src/api/Badges.ts', 'utf8');
const helper = source.slice(source.indexOf('function createOfficialCloudBadgeIcon('), source.indexOf('function showStaffRole('));
function check(surface, stored, expected, foreground = '', edited = null, active = true) {
    const frames = [];
    const context = {
        UserProfileStore: { getUserProfile: () => ({ themeColors: stored }) },
        Plugins: { ProfileSpoofer: { started: active, getActiveProfileColors: () => edited } },
        React: { createElement: (type, props) => ({ type, props }) },
        TooltipContainer: 'tooltip', CLOUDCORD_BADGE_ICON: 'logo.png', showStaffRole() {},
        getComputedStyle: node => node.probe ? { color: foreground } : node.style,
        CSS: { supports: () => true },
        document: { createElement: tag => tag === 'canvas' ? {
            getContext: () => {
                const canvas = { fillStyle: '', fillRect() {}, getImageData() {
                    const colors = { 'color(srgb 0.9 0.9 0.9)': [230, 230, 230, 255], 'color(srgb 0.08 0.08 0.08)': [20, 20, 20, 255], 'oklab(0.93 0 0)': [231, 231, 231, 255] };
                    assert.ok(colors[canvas.fillStyle], 'unexpected CSS color');
                    return { data: colors[canvas.fillStyle] };
                } };
                return canvas;
            }
        } : ({ probe: true, style: {}, remove() {} }) },
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
check('rgb(30, 30, 30)', [0], 'invert(1)', 'color(srgb 0.9 0.9 0.9)');
check('rgb(245, 245, 245)', [0xffffff], 'none', 'color(srgb 0.08 0.08 0.08)');
check('rgb(30, 30, 30)', [0], 'invert(1)', 'oklab(0.93 0 0)');
check('rgb(30, 30, 30)', [0], 'invert(1)', 'rgb(90% 90% 90%)');
check('rgb(245, 245, 245)', [0xffffff], 'invert(1)', 'rgb(20, 20, 20)', [0x202024, 0x101014]);
check('rgb(30, 30, 30)', [0], 'none', 'rgb(240, 240, 240)', [0xffffff, 0xf5f5f5]);
check('rgb(245, 245, 245)', [0xffffff], 'none', 'rgb(20, 20, 20)', [0x202024], false);
console.log('mounted profile foreground controls badge contrast; detached portals and surface fallback tested; Founder tooltip preserved');
