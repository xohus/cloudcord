const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const base = path.join(__dirname, '../runtime/src/lib/addons/themes/colors');
const themeSource = fs.readFileSync(path.join(base, '../index.ts'), 'utf8');
const validation = themeSource.slice(themeSource.indexOf('function validateTheme('), themeSource.indexOf('export async function fetchTheme'));
const validationRealm = {};
vm.createContext(validationRealm);
vm.runInContext(esbuild.transformSync(validation, {loader: 'ts'}).code, validationRealm);
for (const theme of [{spec: 2}, {semanticColors: {BACKGROUND_PRIMARY: ['#000']}}, {rawColors: {RED: '#f00'}}, {theme_color_map: {}}, {spec: 3, main: {}}]) {
  assert.equal(validationRealm.validateTheme(theme), true, 'supported theme shape must install');
}
for (const theme of [null, [], {}, {spec: 3}, {spec: 3, main: 'invalid'}, {spec: 99, rawColors: {}}, {semanticColors: []}]) {
  assert.equal(validationRealm.validateTheme(theme), false, 'invalid theme must not install');
}
function load(file, dependencies) {
  const code = esbuild.transformSync(fs.readFileSync(path.join(base, file), 'utf8'), {
    loader: file.endsWith('.tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic'
  }).code;
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
const themeStore = {theme: 'darker'};
const colorPreferences = {type: 'dark'};
const {parseColorManifest} = load('parser.ts', {
  '@metro': {findByProps: () => token}, 'chroma-js': {}, 'es-toolkit': {},
  'react-native': {Platform: {OS: 'android'}}, './preferences': {colorsPref: colorPreferences}
});
assert.equal(parseColorManifest({spec: 2}).reference, 'darker');
const updater = load('updater.ts', {
  '@lib/api/settings': {settings: {}}, '@metro': {findByProps: () => token, findByPropsLazy: () => appearance, findByStoreNameLazy: () => themeStore},
  './parser': {parseColorManifest: (manifest, mode) => manifest.spec === 2 ? parseColorManifest(manifest, mode) : manifest}
});
updater.updateBunnyColor({spec: 2}, {mode: 'light'});
assert.equal(calls.at(-1), 'light', 'CX light mode overrides the stored preference for this theme');
themeStore.theme = 'light';
updater.updateBunnyColor(null);
assert.equal(calls.at(-1), 'darker', 'disabling a CX light theme restores the original Discord mode');
themeStore.theme = 'darker';
updater.updateBunnyColor(ref.current);
assert.equal(calls.at(-1), 'darker');
assert.equal(Object.keys(token.Theme).length, 1);
updater.updateBunnyColor(null, {update: false});
themeStore.theme = 'light';
updater.updateBunnyColor(ref.current);
themeStore.theme = 'darker';
updater.updateBunnyColor(null);
assert.equal(calls.at(-1), 'light', 'disabling a custom theme must restore the original Discord mode');
console.log('frozen color tables supported; native manager only receives real Discord theme names; semantic override and fallback passed');

const jsx = (type, props) => ({type, props});
const preferences = {customBackground: null};
const nativeProps = Object.freeze({HACK_fixModalInteraction: false, onTapReaction() {}, style: Object.freeze({backgroundColor: '#202020'})});
const surface = Object.freeze(jsx('NativeMessages', nativeProps));
const root = Object.freeze(jsx('Fragment', Object.freeze({children: Object.freeze([null, surface])})));
let androidRenderer;
let renderUpdates = 0;
const unsubscribe = updater.subscribeThemeColors(() => renderUpdates++);
const wallpaper = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZ0AAAAASUVORK5CYII=';
const render = element => element.type(element.props).props.children;

for (const component of [{render: () => root}, function MessagesConnected() {}]) {
  const patch = load('patches/background.tsx', {
    'react/jsx-runtime': {jsx, jsxs: jsx},
    '@lib/addons/themes/colors/preferences': {colorsPref: preferences},
    '@lib/addons/themes/colors/updater': updater,
    '@lib/api/patcher': {after(name, object, callback) {
      const original = object[name];
      object[name] = () => callback([], original());
      return () => { object[name] = original; };
    }},
    '@lib/api/react/jsx': {
      onJsxCreate(name, callback) { assert.equal(name, 'MessagesRenderer'); androidRenderer = callback; },
      deleteJsxCreate(name, callback) { assert.equal(callback, androidRenderer); androidRenderer = undefined; }
    },
    '@lib/api/storage': {useObservable() {}},
    '@lib/utils/logger': {logger: {warn: error => assert.fail(error)}},
    '@metro': {findByFilePathLazy: () => component},
    '@metro/common': {React: {
      isValidElement: value => Boolean(value?.type),
      cloneElement: (element, props) => jsx(element.type, {...element.props, ...props}),
      Fragment: 'Fragment',
      useSyncExternalStore: (_, snapshot) => snapshot()
    }},
    '@metro/lazy': {getLazyContext: value => ({getExports: callback => { callback(value); }})},
    'react-native': {View: 'View', Image: 'Image', StyleSheet: {absoluteFillObject: {}, create: value => value, flatten: value => value}},
    'chroma-js': Object.assign(() => ({alpha: opacity => ({hex: () => String(opacity)})}), {valid: () => true})
  }).default;
  const undo = patch();
  const wrapped = component.render ? component.render() : androidRenderer(null, surface);
  assert.equal(render(wrapped)[0], undefined);
  updater.updateBunnyColor({...ref.current, background: {url: wallpaper, opacity: 0.75, blur: 0.6}}, {update: false});
  const [image, content] = render(wrapped);
  assert.equal(image.props.pointerEvents, 'none');
  assert.equal(image.props.children.props.source.uri, wallpaper);
  assert.equal(image.props.children.props.blurRadius, 0.6);
  const tinted = component.render ? content.props.children.props.children[1] : content.props.children;
  assert.equal(tinted.props.style[1].backgroundColor, '0.25');
  assert.equal(surface.props.style.backgroundColor, '#202020');
  preferences.customBackground = 'hidden';
  assert.equal(render(wrapped)[0], undefined);
  preferences.customBackground = null;
  updater.updateBunnyColor(null, {update: false});
  assert.equal(render(wrapped)[0], undefined);
  undo();
  assert.equal(androidRenderer, undefined);
  if (component.render) assert.equal(component.render(), root);
}
unsubscribe();
assert.equal(renderUpdates, 4);
assert.match(fs.readFileSync(path.join(__dirname, '../../.github/workflows/cloudcord.yml'), 'utf8'),
  /cp "\.\.\/ios\/runtime\/src\/lib\/addons\/themes\/colors\/patches\/background\.tsx"/);
console.log('mobile wallpaper renders on both Discord message surfaces and restores frozen native styles');
