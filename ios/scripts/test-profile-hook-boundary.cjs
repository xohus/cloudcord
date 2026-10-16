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
    React: { createElement: (type, props) => ({ type, props }) } };
vm.runInNewContext(esbuild.transformSync(helper, { loader: 'tsx', jsx: 'transform' }).code, ctx);
const Wrapped = ctx.identityRenderer(Child);
assert.equal(Wrapped({}).type, Child);
assert.equal(Wrapped({}).type, Child);
assert.equal(childCalls, 0);
assert(!workflow.includes('const tree = Component(currentProps)'));
assert(!workflow.includes('const tree = Component(detail ?'));
console.log('PASS identity child hooks remain in a separate React component; no direct social child invocation');
