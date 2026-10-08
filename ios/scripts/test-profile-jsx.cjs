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
console.log('PASS: named, displayName and memoized profile hooks match; unrelated elements are untouched.');
