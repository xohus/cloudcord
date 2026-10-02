const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../native-ios/Sources/Bridgeless.xm'), 'utf8');
const injection = source.slice(source.indexOf('static void injectCloudCordRuntime('), source.indexOf('static void scheduleCloudCordRuntime('));
assert.match(injection, /globalThis\.__CLOUDCORD_NATIVE_INJECTED__ === true/);
assert.match(injection, /globalThis\.__CLOUDCORD_NATIVE_INJECTED__=true/);
assert.doesNotMatch(injection, /runtime\.global\(\)/);
assert.match(injection, /catch \(\.\.\.\)/);
assert.doesNotMatch(injection, /compare_exchange|expected == current/);
assert.ok(injection.indexOf('globalThis.__CLOUDCORD_NATIVE_INJECTED__=true') > injection.indexOf('if (!loaded)'));

// Exercise the realm-local guard across reused simulated native addresses.
// This verifies guard semantics, not an on-device Hermes/Discord launch.
const code = `if (!globalThis.__CLOUDCORD_NATIVE_INJECTED__) {
    if (loadSucceeds) {
        loads++;
        globalThis.__CLOUDCORD_NATIVE_INJECTED__ = true;
    }
}`;
for (let launch = 0; launch < 20; launch++) {
    const realm = vm.createContext({ nativeAddress: 1234, loads: 0, loadSucceeds: false });
    vm.runInContext(code, realm);
    assert.equal(realm.__CLOUDCORD_NATIVE_INJECTED__, undefined);
    realm.loadSucceeds = true;
    vm.runInContext(code, realm);
    vm.runInContext(code, realm);
    assert.equal(realm.loads, 1, `launch ${launch} must load once, including reused addresses`);
}
console.log('reload guard source checks and 20 realm lifecycle simulations passed');

const scheduler = source.slice(source.indexOf('static void scheduleCloudCordRuntime('), source.indexOf('typedef void (*CloudCordLoadBundleIMP)'));
assert.match(scheduler, /__weak id weakInstance = instance/);
assert.match(scheduler, /generation != cloudCordRuntimeGeneration\.load\(\)/);
assert.match(scheduler, /scheduleCloudCordRuntime\(liveInstance, attempt \+ 1, generation\)/);
assert.match(source, /cloudCordRuntimeGeneration\.fetch_add\(1\)/);
let generation = 1;
let calls = 0;
const queued = [];
for (let reload = 0; reload < 20; reload++) {
    const scheduledGeneration = generation;
    queued.push(() => { if (scheduledGeneration === generation) calls++; });
    generation++;
}
queued.forEach(callback => callback());
assert.equal(calls, 0, 'all pre-reload retries must be discarded');
const activeGeneration = generation;
if (activeGeneration === generation) calls++;
assert.equal(calls, 1, 'current launch can still initialize');
console.log('stale retry source checks and 20 generation simulations passed');
