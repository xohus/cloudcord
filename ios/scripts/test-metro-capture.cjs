const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../native-ios/modules344.js'), 'utf8');
for (const locked of [false, true]) {
    const realm = vm.createContext({});
    vm.runInContext(`var registry=new Map([[46,{exports:'existing'}]]); var clears=0;
        __c=()=>{clears++; registry=new Map(); return registry;};
        __d=()=>{}; __r=id=>registry.get(id).exports;`, realm);
    if (locked) Object.defineProperty(realm,'__d',{configurable:false});
    for(let i=0;i<20;i++) vm.runInContext(source,realm);
    assert.equal(vm.runInContext('__r(46)',realm),'existing');
    assert.equal(realm.clears,0,'late capture never clears existing modules');
}
const early=vm.createContext({});
vm.runInContext(source,early);
vm.runInContext(`var registry; var clears=0;
    __d=(factory,id)=>registry.set(id,factory);
    __c=()=>{clears++; registry=new Map(); return registry;};
    registry=__c();
    __d('existing',46); __d('later',47);`,early);
assert.equal(early.modules,early.registry);
assert.equal(early.registry.get(46),'existing');
assert.equal(early.registry.get(47),'later');
assert.equal(early.clears,2,'capture only clears before the first definition');
console.log('PASS Metro early capture and non-destructive late/repeated capture');
