const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const base = path.join(__dirname, '../runtime/src/lib/addons/themes/colors');
function load(file, dependencies) {
  const code = esbuild.transformSync(fs.readFileSync(path.join(base, file), 'utf8'), {loader: 'ts', format: 'cjs'}).code;
  const module = {exports: {}};
  vm.runInNewContext(code, {module, exports: module.exports, require: name => {
    if (!(name in dependencies)) throw new Error(`unexpected dependency ${name}`);
    return dependencies[name];
  }});
  return module.exports;
}
const calls = [];
const ref = {key: 'bn-theme-1', current: {reference: 'darker', semantic: {TEST: {value: '#123456', opacity: 1}}, raw: {}}, lastSetDiscordTheme: 'darker', origRaw: {WHITE: '#fff'}};
const token = {RawColor: Object.freeze({WHITE: '#fff'}), Theme: Object.freeze({DARKER: 'darker'}), SemanticColor: Object.freeze({}), default: {meta: {resolveSemanticColor: () => '#original'}}};
const native = {updateTheme: theme => { assert.ok(['darker', 'light'].includes(theme)); calls.push(theme); }};
const patcher = {
  before(name, object, callback) { const original = object[name]; object[name] = (...args) => original(...(callback(args) || args)); return () => object[name] = original; },
  instead(name, object, callback) { const original = object[name]; object[name] = (...args) => callback(args, original); return () => object[name] = original; }
};
const resolver = load('patches/resolver.ts', {
  '@lib/addons/themes/colors/updater': {_colorRef: ref}, '@lib/api/native/modules': {NativeThemeModule: native},
  '@lib/api/patcher': patcher, '@metro': {findByProps: () => token}, 'chroma-js': () => {throw new Error('unexpected opacity conversion');}
});
const undo = resolver.default();
native.updateTheme('bn-theme-1');
assert.deepEqual(calls, ['darker']);
const symbol = Symbol('color');
assert.equal(token.default.meta.resolveSemanticColor('darker', {[symbol]: 'TEST'}), '#123456');
assert.equal(token.default.meta.resolveSemanticColor('darker', {}), '#original');
assert.equal(token.RawColor.WHITE, '#fff');
undo();
const appearance = {updateTheme: native.updateTheme};
const updater = load('updater.ts', {
  '@lib/api/settings': {settings: {}}, '@metro': {findByProps: () => token, findByPropsLazy: () => appearance, findByStoreNameLazy: () => ({theme: 'darker'})},
  './parser': {parseColorManifest: () => ref.current}
});
updater.updateBunnyColor({});
assert.equal(calls.at(-1), 'darker');
assert.equal(Object.keys(token.Theme).length, 1);
console.log('frozen color tables supported; native manager only receives real Discord theme names; semantic override and fallback passed');
