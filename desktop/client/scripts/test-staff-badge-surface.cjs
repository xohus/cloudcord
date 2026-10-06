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
    assert.equal(image.style.filter, expected === 'none' ? 'brightness(0)' : 'brightness(0) invert(1)');
    assert.equal(result.props.text, 'CloudCord Founder');
}
check('rgb(245, 245, 245)', [0, 0], 'none');
check('rgb(245 245 245)', [0, 0], 'none');
check('rgb(30, 30, 30)', [0xffffff, 0xffffff], 'invert(1)');
check('rgb(170, 170, 170)', [0xffffff], 'none');
check('rgb(170, 170, 170)', [0], 'none', 'rgb(20, 20, 20)');
check('rgb(245, 245, 245)', [0xffffff], 'none', 'rgb(240, 240, 240)');
check('rgb(30, 30, 30)', [0], 'invert(1)', 'color(srgb 0.9 0.9 0.9)');
check('rgb(245, 245, 245)', [0xffffff], 'none', 'color(srgb 0.08 0.08 0.08)');
check('rgb(30, 30, 30)', [0], 'invert(1)', 'oklab(0.93 0 0)');
check('rgb(30, 30, 30)', [0], 'invert(1)', 'rgb(90% 90% 90%)');
check('rgb(245, 245, 245)', [0xffffff], 'invert(1)', 'rgb(20, 20, 20)', [0x202024, 0x101014]);
check('rgb(30, 30, 30)', [0], 'none', 'rgb(240, 240, 240)', [0xffffff, 0xf5f5f5]);
check('rgb(245, 245, 245)', [0xffffff], 'none', 'rgb(20, 20, 20)', [0x202024], false);
console.log('mounted profile foreground controls badge contrast; detached portals and surface fallback tested; Founder tooltip preserved');
let count = 0;
for (const hue of [[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255],[0,255,255],[255,128,0],[128,0,255],[255,255,255]]) {
    for (const level of [0, .15, .3, .45, .6, .75, .9, 1]) {
        const rgb = hue.map(channel => Math.round(channel * level));
        const linear = rgb.map(channel => { const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
        const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
        const black = (luminance + .05) / .05 >= 1.05 / (luminance + .05);
        check(`rgb(${rgb.join(',')})`, [0xffffff], black ? 'none' : 'invert(1)');
        count++;
    }
}
console.log(`${count} hue/brightness combinations choose the higher-contrast badge`);
const contrastSource = helper.slice(helper.indexOf('const useBlack ='), helper.indexOf('const parseColor ='));
const contrastContext = vm.createContext({});
vm.runInContext(esbuild.transformSync(contrastSource + '\nthis.selectBlack = useBlack;', { loader: 'ts' }).code, contrastContext);
let ranges = 0;
for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    const rgb = [r, g, b];
    const linear = rgb.map(channel => { const c = channel / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    const blackRatio = (luminance + .05) / .05;
    const whiteRatio = 1.05 / (luminance + .05);
    const chosenBlack = contrastContext.selectBlack([rgb]);
    assert.equal(chosenBlack, blackRatio >= whiteRatio, `wrong contrast at ${rgb}`);
    assert.ok((chosenBlack ? blackRatio : whiteRatio) >= 4.5, `insufficient contrast at ${rgb}`);
    ranges++;
}
console.log(`${ranges} RGB range samples satisfy higher contrast and minimum 4.5:1`);
