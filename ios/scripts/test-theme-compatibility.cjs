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
  '@lib/addons/themes/colors/updater': {_colorRef: ref, getColorOverlay: () => undefined}, '@lib/api/native/modules': {NativeThemeModule: native},
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
const overlayResolver = load('patches/resolver.ts', {
  '@lib/addons/themes/colors/updater': updater, '@lib/api/native/modules': {NativeThemeModule: native},
  '@lib/api/patcher': patcher, '@metro': {findByProps: () => token}, 'chroma-js': () => {throw new Error('unexpected opacity conversion');}
}).default();
themeStore.theme = 'darker';
const removeDark = updater.registerColorOverlay({darkOnly: true, semantic: {TEST: '#000000'}});
assert.equal(token.default.meta.resolveSemanticColor('light', {[symbol]: 'TEST'}), '#original');
assert.equal(token.default.meta.resolveSemanticColor('darker', {[symbol]: 'TEST'}), '#000000');
updater.updateBunnyColor({...ref.current, background: {url: 'example'}}, {update: false});
const removeAccent = updater.registerColorOverlay({semantic: {TEST: '#7c5cff'}, raw: {BRAND_500: '#7c5cff'}});
assert.equal(token.default.meta.resolveSemanticColor('darker', {[symbol]: 'TEST'}), '#7c5cff');
assert.equal(updater.getColorOverlay().raw.BRAND_500, '#7c5cff');
assert.equal(updater.getThemeColors().background.url, 'example');
const composerTokens = ['MOBILE_CHATINPUT_BACKGROUND_DEFAULT', 'MOBILE_CHATINPUT_BACKGROUND_ACTIVE'];
const removeTranslucency = updater.registerColorOverlay({semantic: Object.fromEntries(composerTokens.map(key => [key, '#00000040']))});
for (const theme of ['light', 'darker']) {
  for (const key of composerTokens) assert.equal(token.default.meta.resolveSemanticColor(theme, {[symbol]: key}), '#00000040');
}
assert.equal(updater.getThemeColors().background.url, 'example');
removeTranslucency();
for (const key of composerTokens) assert.equal(token.default.meta.resolveSemanticColor('darker', {[symbol]: key}), '#original');
removeDark();
removeAccent();
assert.equal(updater.getColorOverlay(), undefined);
assert.equal(token.default.meta.resolveSemanticColor('darker', {[symbol]: 'TEST'}), '#123456');
overlayResolver();
updater.updateBunnyColor(null, {update: false});
console.log('frozen color tables supported; native manager only receives real Discord theme names; semantic override and fallback passed');

const jsx = (type, props) => ({type, props});
const preferences = {customBackground: null};
const nativeProps = Object.freeze({HACK_fixModalInteraction: false, onTapReaction() {}, style: Object.freeze({backgroundColor: '#202020'})});
const surface = Object.freeze(jsx('NativeMessages', nativeProps));
const root = Object.freeze(jsx('Fragment', Object.freeze({children: Object.freeze([null, surface])})));
let renderUpdates = 0;
const unsubscribe = updater.subscribeThemeColors(() => renderUpdates++);
const wallpaper = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZ0AAAAASUVORK5CYII=';
const render = element => element.type(element.props).props.children;

for (const route of ['legacy', 'default-export', 'display-name', 'missing-file', 'jsx', 'android-display-name', 'ios-renderer', 'ios-late-renderer']) {
  let renderNative = () => root;
  const component = {render: () => renderNative()};
  const iosRoute = route.startsWith('ios-');
  const jsxRoute = route === 'jsx' || route === 'android-display-name' || iosRoute;
  const forwarded = {$$typeof: Symbol.for('react.forward_ref'), displayName: 'Messages', render() {}};
  const renderer = {$$typeof: Symbol.for('react.memo'), type: forwarded};
  function MessagesRenderer() {}
  MessagesRenderer.displayName = 'Messages';
  const androidMemo = {$$typeof: Symbol.for('react.memo'), type: MessagesRenderer};
  const exported = route === 'legacy' || route === 'ios-late-renderer' ? component : route === 'default-export' ? {default: component} : {};
  const hooks = new Map();
  let memo, memoDeps, refState, state, layoutDeps, cleanupLayout;
  const sameDeps = (next, previous) => previous && next.every((value, index) => Object.is(value, previous[index]));
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
      onJsxCreate(name, callback) { hooks.set(name, callback); },
      deleteJsxCreate(name, callback) { assert.equal(callback, hooks.get(name)); hooks.delete(name); }
    },
    '@lib/api/storage': {useObservable() {}},
    '@lib/utils/logger': {logger: {warn: error => assert.fail(error)}},
    '@metro': {findByFilePathLazy: () => exported, findByDisplayName: () => ['display-name', 'missing-file'].includes(route) ? component : undefined},
    '@metro/common': {React: {
      isValidElement: value => Boolean(value?.type),
      cloneElement: (element, props) => jsx(element.type, {...element.props, ...props}),
      Fragment: 'Fragment',
      useSyncExternalStore: (_, snapshot) => snapshot(),
      useMemo(factory, deps) {
        if (!sameDeps(deps, memoDeps)) { memo = factory(); memoDeps = deps; }
        return memo;
      },
      useRef: initial => refState ??= {current: initial},
      useState: initial => [state === undefined ? initial : state, next => { state = next; }],
      useLayoutEffect(effect, deps) {
        if (!sameDeps(deps, layoutDeps)) {
          cleanupLayout?.();
          cleanupLayout = effect();
          layoutDeps = deps;
        }
      }
    }},
    '@metro/lazy': {getLazyContext: value => route === 'missing-file' ? undefined : ({getExports: callback => { callback(value); }})},
    'react-native': {View: 'View', Image: 'Image', StyleSheet: {absoluteFillObject: {}, create: value => value, flatten: value => value}},
    'chroma-js': Object.assign(() => ({alpha: opacity => ({hex: () => String(opacity)})}), {valid: () => true})
  }).default;
  const undo = patch();
  const ref = {};
  const forwardedElement = jsx(renderer, {style: surface.props.style, channelId: '123', ref});
  const androidElement = jsx(androidMemo, surface.props);
  const original = iosRoute ? forwardedElement : route === 'android-display-name' ? androidElement : route === 'jsx' ? surface : root;
  if (route === 'ios-late-renderer') assert.notEqual(component.render(), root);
  const unrelated = jsx(renderer, {style: surface.props.style});
  assert.equal(hooks.get('Messages')(null, unrelated), unrelated);
  const wrap = () => hooks.get(route === 'jsx' ? 'MessagesRenderer' : 'Messages')(null, original);
  if (route === 'ios-late-renderer') renderNative = wrap;
  const wrapped = jsxRoute && route !== 'ios-late-renderer' ? wrap() : component.render();
  renderNative = () => root;
  if (iosRoute) {
    assert.equal(component.render(), root, 'the actual renderer takes priority over the fallback');
  }
  assert.equal(render(wrapped)[0], undefined);
  updater.updateBunnyColor({...ref.current, background: {url: wallpaper, opacity: 0.75, blur: 0.6}}, {update: false});
  const [image, loading] = render(wrapped);
  assert.equal(loading.props.children, original);
  assert.equal(image.props.pointerEvents, 'none');
  assert.equal(image.props.children.props.source.uri, wallpaper);
  assert.equal(image.props.children.props.blurRadius, 0.6);
  assert.equal(image.props.children.props.style.width, '100%');
  assert.equal(image.props.children.props.style.height, '100%');
  image.props.children.props.onLoad();
  const [, content] = render(wrapped);
  const tinted = jsxRoute ? content.props.children : content.props.children.props.children[1];
  assert.equal(tinted.props.style[1].backgroundColor, '0.25');
  if (iosRoute) assert.equal(tinted.props.ref, ref);
  assert.equal(surface.props.style.backgroundColor, '#202020');
  image.props.children.props.onError();
  assert.equal(render(wrapped)[1].props.children, original);
  updater.updateBunnyColor({...ref.current, background: {url: wallpaper + 'other', opacity: 0.75}}, {update: false});
  const [replacement] = render(wrapped);
  image.props.children.props.onLoad();
  assert.equal(render(wrapped)[1].props.children, original);
  replacement.props.children.props.onLoad();
  image.props.children.props.onError();
  assert.notEqual(render(wrapped)[1].props.children, original);
  preferences.customBackground = 'hidden';
  assert.equal(render(wrapped)[0], undefined);
  preferences.customBackground = null;
  updater.updateBunnyColor(null, {update: false});
  assert.equal(render(wrapped)[0], undefined);
  undo();
  cleanupLayout?.();
  assert.equal(hooks.size, 0);
  assert.equal(component.render(), root);
}
unsubscribe();
assert.equal(renderUpdates, 24);
assert.match(fs.readFileSync(path.join(__dirname, '../../.github/workflows/cloudcord.yml'), 'utf8'),
  /cp "\.\.\/ios\/runtime\/src\/lib\/addons\/themes\/colors\/patches\/background\.tsx"/);
console.log('mobile wallpaper renders on both Discord message surfaces and restores frozen native styles');
