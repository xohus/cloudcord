const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const source = fs.readFileSync('src/main/settings.ts', 'utf8');
const reader = source.slice(source.indexOf('function readSettings'), source.indexOf('export const RendererSettings'));
const backups = [];
let contents;
const context = vm.createContext({ readFileSync: () => contents, copyFileSync: (...args) => backups.push(args), console: { error() {} }, Date });
vm.runInContext(esbuild.transformSync(reader, { loader: 'ts' }).code, context);
for (const bad of ['null', '42', 'true', '"string"', '[]', '{invalid']) {
    contents = bad;
    assert.equal(Object.keys(context.readSettings('renderer', 'settings.json')).length, 0);
}
assert.equal(backups.length, 6);
assert.ok(backups.every(([from, to]) => from === 'settings.json' && to.startsWith('settings.json.invalid-')));
contents = '{"plugins":{"Example":{"enabled":true}}}';
assert.equal(context.readSettings('renderer', 'settings.json').plugins.Example.enabled, true);
assert.equal(backups.length, 6, 'valid files must not be marked invalid');
console.log('PASS: actual settings loader rejects malformed/non-object JSON and preserves originals');
