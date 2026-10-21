const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('src/sincordplugins/fakeProfile/editorUi.tsx', 'utf8');
const editor = fs.readFileSync('src/sincordplugins/fakeProfile/index.tsx', 'utf8');
assert.ok(editor.includes('key={`avatar-${selectedAccountId}`}'), 'account switches remount the avatar field even when both image values match');
assert.ok(editor.includes('key={`banner-${selectedAccountId}`}'), 'account switches remount the banner field too');
const component = source.slice(source.indexOf('export function ImageField('), source.indexOf('export function Grid2(')).replace('export function', 'function');
const readers = [], refs = [], effects = [], changes = [];
let cursor = 0;
const React = {
    useRef(value) { const index = cursor++; return refs[index] ??= { current: value }; },
    useState: () => ['', () => {}],
    useEffect(fn, deps) { const index = cursor++; const old = effects[index]; if (!old || deps.some((v, i) => v !== old.deps[i])) { old?.cleanup?.(); effects[index] = { deps, cleanup: fn() }; } },
    createElement: (type, props, ...children) => ({ type, props: props || {}, children })
};
const context = vm.createContext({ React, useId: () => 'image', FileReader: class {
    constructor() { readers.push(this); }
    readAsDataURL() {}
} });
vm.runInContext(esbuild.transformSync(component, { loader: 'tsx', jsx: 'transform' }).code, context);
function render(value = 'old') { cursor = 0; return context.ImageField({ label: 'Avatar', value, onChange: value => changes.push(value) }); }
function find(tree, predicate) { if (!tree || typeof tree !== 'object') return; if (predicate(tree)) return tree; for (const child of tree.children || []) { const found = find(child, predicate); if (found) return found; } }
const file = { type: 'image/png', size: 12 };
function pick(tree) { find(tree, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [file], value: 'file' } }); return readers.at(-1); }
function finish(reader, value) { reader.result = value; reader.onload(); }
let tree = render();
const first = pick(tree), second = pick(tree);
finish(second, 'newer'); finish(first, 'stale');
assert.deepEqual(changes.splice(0), ['newer'], 'late old image cannot replace a newer selection');
const removed = pick(tree);
find(tree, node => node.type === 'button' && node.children.includes('Remove')).props.onClick();
finish(removed, 'removed');
assert.deepEqual(changes.splice(0), [''], 'late read cannot undo removal');
const pasted = pick(tree);
find(tree, node => node.type === 'input' && node.props.placeholder).props.onChange({ target: { value: ' https://example.com/new.png ' } });
finish(pasted, 'old-upload');
assert.deepEqual(changes.splice(0), ['https://example.com/new.png'], 'pasted URL takes precedence over an older upload');
const switched = pick(tree);
tree = render('other-account');
finish(switched, 'wrong-account');
assert.deepEqual(changes.splice(0), [], 'external profile changes invalidate pending reads');
const closed = pick(tree);
effects.forEach(effect => effect?.cleanup?.());
finish(closed, 'closed');
assert.deepEqual(changes, [], 'closed editor cannot receive a delayed image');
console.log('PASS desktop image ordering, removal, pasted links, external profile changes and unmount isolation');
