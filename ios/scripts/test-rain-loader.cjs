const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../native-ios/Sources/Bridgeless.xm'), 'utf8');
assert.doesNotMatch(source, /scheduleCloudCordRuntime|_loadJSBundle:|_loadScriptFromSource:|compare_exchange|exit\(/);
assert.match(source, /dispatchPayload:/);
assert.match(source, /__RAIN_BRIDGE_CALL_SYNC__/);
assert.match(source, /__RAIN_BRIDGE_CALL_ASYNC__/);
const identity = source.match(/NSData \*identity = \[@"([^"\n]+)"/)[1];
for (let launch = 0; launch < 30; launch++) {
  const realm = vm.createContext({__RAIN_LOADER__: {loaderName: 'RainTweak'}});
  vm.runInContext(identity, realm);
  assert.equal(realm.__CLOUDCORD_LOADER__.loaderName, 'CloudCord');
  assert.equal(realm.__PYON_LOADER__, realm.__CLOUDCORD_LOADER__);
  assert.equal(realm.__CLOUDCORD_LOADER__.cloudcordAutoUpdateVersion, 3);
}
console.log('Rain callback structure and 30 fresh loader identities passed (not device launch testing)');
