const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
const source = fs.readFileSync('src/components/settings/SettingsModal.tsx', 'utf8');
const effects = [];
const ref = { current: null };
const React = {
    useRef: () => ref,
    useEffect: effect => effects.push(effect),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } })
};
const FocusLock = () => {};
const ErrorBoundary = () => {};
const context = vm.createContext({ React, FocusLock, ErrorBoundary });
const code = esbuild.transformSync(source.replace(/^import .*;\r?\n/gm, '').replace('export function SettingsModal', 'function SettingsModal'), { loader: 'tsx', jsxFactory: 'React.createElement' }).code;
vm.runInContext(code, context);
const tree = context.SettingsModal({ title: 'Plugins', children: 'input', onClose() {} });
assert.equal(tree.type, ErrorBoundary);
const scope = tree.props.children[0];
assert.equal(scope.type, FocusLock);
assert.equal(scope.props.containerRef, ref);
assert.equal(tree.props.fallback(), scope.props.children[0], 'missing native focus scope must fall back to the same dialog');
const commonComponents = fs.readFileSync('src/webpack/common/components.ts', 'utf8');
assert.match(commonComponents, /waitForComponent<t\.FocusLock>\("FocusLock"[^\n]+\(\{ children \}\) => children\)/, 'production native lookup fallback must preserve dialog children instead of rendering nothing');
const dialog = scope.props.children[0].props.children[0];
assert.equal(dialog.props.ref, ref);
let prevented = false;
dialog.props.onKeyDown({ key: 'a', preventDefault() { prevented = true; } });
assert.equal(prevented, false, 'typing must not be prevented');
dialog.props.onKeyDown({ key: 'Process', isComposing: true, preventDefault() { prevented = true; } });
assert.equal(prevented, false, 'IME input must not be prevented');
const botcord = fs.readFileSync('src/components/settings/tabs/botcord/index.tsx', 'utf8');
assert.ok(botcord.includes('typeof DiscordNative === "undefined"'));
console.log('PASS: modal focus-scope wiring and ordinary/IME key handling; live Discord typing still requires verification');
