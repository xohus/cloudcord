const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('ios/runtime/src/lib/ui/components/wrappers/AlertModal.tsx', 'utf8');
const NativeModal = Object.freeze({ $$typeof: Symbol.for('react.memo'), type: () => null });
const NativeAction = Object.freeze({ $$typeof: Symbol.for('react.forward_ref'), render: () => null });
const lazy = { module: { exports: {} }, __DEV__: false };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('ios/runtime/src/lib/utils/lazy.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, lazy);
let modern = false;
const context = { module: { exports: {} }, React: { createElement: (type, props, ...children) => ({ type, props, children }) }, require: name => {
    if (name === '@lib/utils/lazy') return lazy.module.exports;
    if (name === '@metro') return { findByProps: () => ({ AlertModal: NativeModal, AlertActionButton: NativeAction }), findByPropsLazy: () => ({ AlertModal: NativeModal, AlertActionButton: NativeAction }), findByFilePath: () => modern ? {} : null };
    if (name === '@metro/common/components') return { Text: 'Text' };
    if (name === 'react-native') return { View: 'View' };
    return {};
} };
vm.runInNewContext(esbuild.transformSync(source, { loader: 'tsx', format: 'cjs' }).code, context);
const render = context.module.exports.default;
const extra = { type: 'Extra' }, node = { type: 'ExistingContent' };
for (const content of ['Message', node]) {
    const props = Object.freeze({ title: 'Test', content, extraContent: extra });
    const result = render(props);
    assert.equal(result.type, NativeModal);
    assert.equal(result.props.title, 'Test');
    assert.equal(result.props.extraContent, undefined, 'legacy-only prop is removed from the copy');
    assert.equal(props.extraContent, extra, 'caller props remain untouched');
    assert.equal(props.content, content);
    if (typeof content !== 'string') assert.equal(result.props.content.children[0], node, 'element content is not nested inside native Text');
}
modern = true;
const props = Object.freeze({ content: 'native', extraContent: extra });
assert.equal(render(props).props.extraContent, extra, 'modern Discord receives its own extraContent API unchanged');
assert.equal(context.module.exports.AlertActionButton({ text: 'Retry' }).type, NativeAction, 'React receives the native forwardRef object, not a callable lazy proxy');
console.log('PASS frozen modal props, legacy extraContent translation, native element content and modern modal passthrough');
