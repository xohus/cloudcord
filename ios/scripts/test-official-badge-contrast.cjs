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
for (const [color, expected] of [[0xffffff, '#000000'], [0, '#ffffff'], [0xeeeeee, '#000000'], [0x222222, '#ffffff'], [0xaaaaaa, '#000000'], [0xcccccc, '#000000'], [0xdcdcdc, '#000000']]) {
    const result = [];
    context.addOfficialBadge(result, { id: 'official', label: 'CloudCord' }, {}, { profileColorsEnabled: true, primaryColor: color, accentColor: color });
    assert.equal(result[0].tintColor, expected);
    assert.equal(rows.get(result[0].id).style.tintColor, expected);
}
const native = [];
context.addOfficialBadge(native, { id: 'official' }, { profile: { themeColors: [0xffffff, 0xffffff] } }, null);
assert.equal(native[0].tintColor, '#000000');
for (const user of [
    { displayProfile: {}, profile: { themeColors: [0xffffff, 0xffffff] } },
    { userProfile: { theme_colors: [0xffffff, 0xffffff] } },
    { primaryColor: 0xffffff },
    { guildMemberProfile: { primary_color: 0xffffff } }
]) {
    const result = [];
    context.addOfficialBadge(result, { id: 'official' }, user, null);
    assert.equal(result[0].tintColor, '#000000');
}
const darkUser = [];
context.addOfficialBadge(darkUser, { id: 'official' }, { id: 'dark-user' }, { profileColorsEnabled: true, primaryColor: '#222222', accentColor: '#222222' });
const lightUser = [];
context.addOfficialBadge(lightUser, { id: 'official' }, { id: 'light-user' }, { profileColorsEnabled: true, primaryColor: '#ffffff', accentColor: '#ffffff' });
assert.notEqual(darkUser[0].id, lightUser[0].id);
assert.equal(rows.get(darkUser[0].id).tintColor, '#ffffff');
assert.equal(rows.get(lightUser[0].id).tintColor, '#000000');
const changedUser = [];
context.addOfficialBadge(changedUser, { id: 'official' }, { id: 'light-user' }, { profileColorsEnabled: true, primaryColor: '#111111', accentColor: '#111111' });
assert.notEqual(changedUser[0].id, lightUser[0].id);
assert.equal(rows.get(changedUser[0].id).tintColor, '#ffffff');
console.log('official badge contrast: light, dark, zero-valued colors and native profile fallback passed');
for (const pair of [[0xffffff, 0], [0xff0000, 0x0000ff], [0x111111, 0x333333], [0xdddddd, 0xffffff]]) {
    const result = [];
    context.addOfficialBadge(result, { id: 'official' }, {}, { profileColorsEnabled: true, primaryColor: pair[0], accentColor: pair[1] });
    const l = pair.map(color => {
        const c = [(color >> 16) & 255, (color >> 8) & 255, color & 255].map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
        return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
    }).reduce((a,b) => a+b) / 2;
    assert.equal(result[0].tintColor, (l+.05)/.05 >= 1.05/(l+.05) ? '#000000' : '#ffffff');
}
assert.match(source, /<Image source=\{props.source\} resizeMode="contain" style=\{\{ width: 20, height: 20, tintColor: props.tintColor \}\}/);
let samples = 0;
for (let r=0;r<=255;r+=17) for (let g=0;g<=255;g+=17) for (let b=0;b<=255;b+=17) {
    const color=(r<<16)|(g<<8)|b;
    const channels=[r,g,b].map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
    const l=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
    const result=[];
    context.addOfficialBadge(result,{id:'official'}, {}, {profileColorsEnabled:true,primaryColor:color,accentColor:color});
    assert.equal(result[0].tintColor,(l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff');
    samples++;
}
console.log(`${samples} mobile RGB samples and mixed gradients passed`);
