const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const dateFunction = source.match(/function shortProfileDate\(date: Date\): string \{[\s\S]*?\n\}/)[0];
const dates = vm.createContext({ Date });
vm.runInContext(esbuild.transformSync(dateFunction, { loader: 'ts' }).code, dates);
assert.equal(dates.shortProfileDate(new Date(2024, 0, 6)), '1/6/24');
assert.equal(dates.shortProfileDate(new Date(2026, 10, 14)), '11/14/26');
const start = source.indexOf('const textRewriter = new class');
const end = source.indexOf('const startDomObserver', start);
const context = vm.createContext({ isEnabled: true, _realUsername: 'realuser', _realGlobalName: '', storedData: { username: 'customuser' } });
vm.runInContext(esbuild.transformSync(source.slice(start, end) + '\nglobalThis.rewriter = textRewriter;', { loader: 'ts' }).code, context);
for (const editor of ['contenteditable', 'textbox', 'textarea', 'input']) {
    const text = { nodeValue: 'realuser', parentElement: { closest: () => ({ editor }) } };
    context.rewriter.rewrite(text);
    assert.equal(text.nodeValue, 'realuser', editor + ' must remain owned by Discord');
    text.nodeValue = 'realuse';
    context.rewriter.rewrite(text);
    assert.equal(text.nodeValue, 'realuse', 'backspace must not restore cached editor text');
}
const label = { nodeValue: 'realuser', parentElement: { closest: () => null } };
context.rewriter.rewrite(label);
assert.equal(label.nodeValue, 'customuser', 'visible profile labels still get rewritten');
console.log('PASS editable text stays intact while profile labels are rewritten');
