const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const source = fs.readFileSync('ios/runtime/src/lib/api/react/jsx.ts', 'utf8');
const patches = {};
const context = vm.createContext({
    exports: {}, module: { exports: {} },
    require: name => name === '@lib/api/patcher' ? { after: (method, parent, callback) => { patches[method] = callback; return () => {}; } } : { findByPropsLazy: () => ({}) },
});
vm.runInContext(esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code, context);
const api = context.module.exports;
let seen = 0;
api.onJsxCreate('ProfileHeader', (component, element) => { seen++; return { ...element, matched: component }; });
api.patchJsx();
function ProfileHeader() {}
function shortened() {}
shortened.displayName = 'ProfileHeader';
for (const component of [ProfileHeader, shortened, { $$typeof: Symbol.for('react.memo'), type: shortened }]) {
    const result = patches.jsx([component], { type: component, props: {} });
    assert.equal(typeof result.matched, 'function');
}
assert.equal(seen, 3);
assert.equal(patches.jsx(['RCTText'], { type: 'RCTText', props: {} }), undefined);
assert.equal(patches.jsx([{}], { type: {}, props: {} }), undefined);
function FrozenHeader() {}
const frozenProps = Object.freeze({ userId: '123', children: 'native' });
const frozenElement = Object.freeze({ type: FrozenHeader, props: frozenProps });
api.onJsxCreate('FrozenHeader', (_component, element) => { element.props.children = 'custom'; });
const cloned = patches.jsx([FrozenHeader], frozenElement);
assert.equal(cloned.props.children, 'custom', 'profile hooks can edit a presentation copy even when React freezes native props');
assert.equal(frozenProps.children, 'native');
assert.notEqual(cloned, frozenElement);
function BrokenHeader() {}
api.onJsxCreate('BrokenHeader', (_component, element) => { element.props.children = 'partial'; throw Error('hook failed'); });
api.onJsxCreate('BrokenHeader', (_component, element) => { element.props.after = 'working'; });
const recovered = patches.jsx([BrokenHeader], { type: BrokenHeader, props: { children: 'native' } });
assert.equal(recovered.props.children, 'native', 'a failed callback cannot publish partially modified props');
assert.equal(recovered.props.after, 'working', 'one failed callback does not block unrelated hooks');
function RemovedHeader() {}
let called = 0;
const registered = () => { called++; };
api.onJsxCreate('RemovedHeader', registered);
api.deleteJsxCreate('RemovedHeader', () => {});
patches.jsx([RemovedHeader], { type: RemovedHeader, props: {} });
assert.equal(called, 1, 'removing an unknown callback cannot remove the last registered hook');
api.deleteJsxCreate('RemovedHeader', registered);
patches.jsx([RemovedHeader], { type: RemovedHeader, props: {} });
assert.equal(called, 1);
const invalid = Object.freeze({ type: undefined, props: frozenProps });
assert.equal(patches.jsx([undefined], invalid).type, 'RCTView');
assert.equal(invalid.type, undefined);
console.log('PASS: named, displayName and memoized profile hooks match; unrelated elements are untouched.');
