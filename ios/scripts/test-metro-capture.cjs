const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../native-ios/modules344.js'), 'utf8');
for (let reload = 0; reload < 20; reload++) {
    const registry = new Map();
    const initial = () => 'initial';
    const replacement = () => 'replacement';
    const realm = vm.createContext({ __d: initial, __c: () => registry, value: 'unrelated' });
    for (let retry = 0; retry < 10; retry++) vm.runInContext(source, realm);
    assert.equal(realm.__d, initial);
    assert.equal(realm.modules, registry);
    realm.__d = replacement;
    vm.runInContext(source, realm);
    assert.equal(realm.__d, replacement);
    assert.equal(realm.value, 'unrelated');
}
const early = vm.createContext({});
vm.runInContext(source, early);
const define = () => {};
early.__d = define;
assert.equal(early.__d, define);
const locked = vm.createContext({});
Object.defineProperty(locked, '__d', { value: define, configurable: false });
vm.runInContext(source, locked);
assert.equal(locked.__d, define);
console.log('Metro capture: late startup, early startup, locked globals and 20 reloads passed');
