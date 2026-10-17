const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const helper = workflow.slice(workflow.indexOf('          function identityRenderer('), workflow.indexOf('          function connectIdentityRenderer('));
let childCalls = 0;
const Child = () => { childCalls++; throw Error('Child must be rendered by React, not called by the wrapper'); };
const ctx = { identityRenderers: new Map(), useReducer: () => [0, () => {}], useEffect() {}, renderedUserId: () => '',
    diagnostics: {}, getProfileOverride: () => null,
    createElement: (type, props) => ({ type, props }),
    React: { createElement: (type, props) => ({ type, props }) } };
vm.runInNewContext(esbuild.transformSync(helper, { loader: 'tsx', jsx: 'transform' }).code, ctx);
const Wrapped = ctx.identityRenderer(Child);
assert.equal(Wrapped({}).type, Child);
assert.equal(Wrapped({}).type, Child);
assert.equal(childCalls, 0);
assert(!workflow.includes('const tree = Component(currentProps)'));
assert(!workflow.includes('const tree = Component(detail ?'));
console.log('PASS identity child hooks remain in a separate React component; no direct social child invocation');

// Automatic JSX re-enters the interceptor; the old classic-mode test missed it.
let intercepted = 0;
const nativeElement = (type, props) => ({ type, props });
const automatic = { ...ctx, identityRenderers: new Map(),
    require: () => ({ jsx(type, props) {
        intercepted++;
        return nativeElement(automatic.identityRenderer(type), props);
    } }) };
vm.runInNewContext(esbuild.transformSync(helper, { loader: 'tsx', jsx: 'automatic', format: 'cjs' }).code, automatic);
assert.equal(automatic.identityRenderer(Child)({}).type, Child, 'identity child must not get wrapped again');
assert.equal(intercepted, 0);
const socialSource = workflow.slice(workflow.indexOf('          const identityRefreshers ='), workflow.indexOf('          function replaceIdentityText('));
const hooks = [];
const runtime = { jsx: nativeElement, jsxs: nativeElement };
const social = { createElement: nativeElement, findByProps: () => runtime,
    after: (_method, _target, callback) => hooks.push(callback),
    NavigationNative: { useNavigation: () => ({ push() {} }) },
    require: () => ({ jsx(type, props) {
        intercepted++;
        let element = nativeElement(type, props);
        for (const hook of hooks) element = hook([type], element);
        return element;
    } }) };
vm.runInNewContext(esbuild.transformSync(socialSource, { loader: 'tsx', jsx: 'automatic', format: 'cjs' }).code, social);
social.connectNativeSocialRenderer();
for (const hook of hooks) {
    const props = { connection: { cloudcordPreview: { service: 'steam' } } };
    const wrapped = hook([Child], nativeElement(Child, props));
    assert.notEqual(wrapped.type, Child);
    assert.equal(wrapped.type(props).type, Child, 'social child must not get wrapped again');
}
assert.equal(intercepted, 0, 'both wrappers bypass automatic JSX recursion');
assert.equal(childCalls, 0, 'React still owns original child hooks');
console.log('PASS automatic JSX cannot recursively nest identity or social wrappers');
