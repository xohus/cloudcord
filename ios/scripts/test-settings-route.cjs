const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('ios/runtime/src/lib/ui/settings/patches/shared.tsx', 'utf8');
let route;
const effects = [];
const React = { memo: x => x, createElement: (type, props, ...children) => ({ type, props, children }), useEffect: f => effects.push(f) };
const nav = { setOptions() {} };
const context = { React, module: { exports: {} }, exports: {}, require: name => {
    if (name === '@metro/common') return { NavigationNative: { useNavigation: () => nav, useRoute: () => route }, ReactNative: { View: 'View', Text: 'Text' } };
    if (name === '@metro/wrappers') return { findByPropsLazy: () => ({}) };
    if (name === '@ui/components') return { ErrorBoundary: 'Boundary' };
    return {};
}};
vm.runInNewContext(esbuild.transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code, context);
const render = context.module.exports.CustomPageRenderer;
for (const value of [undefined, {}, { params: undefined }, { params: {} }]) {
    route = value;
    assert.equal(render().type, 'View');
}
const Page = () => null;
route = { params: { render: Page, title: 'Profile' } };
assert.equal(render().children[0].type, Page);
effects.forEach(f => f());
console.log('PASS missing route/params/render fallback and normal custom-page rendering');
