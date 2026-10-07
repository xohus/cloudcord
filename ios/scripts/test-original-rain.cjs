const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const binary = Buffer.from(fs.readFileSync(path.join(root, 'rain-original/RainTweak.dylib.b64'), 'utf8'), 'base64');
assert.equal(crypto.createHash('sha256').update(binary).digest('hex'), 'e43cad3e64c2d518b1744a214d1ecb8fe89342e064976c5eed8e6b6f1d82b825');
const adapter = fs.readFileSync(path.join(root, 'rain-original/CloudCordBootstrap.m'), 'utf8');
assert.doesNotMatch(adapter, /%hook|jsi::|evaluateJavaScript|method_exchangeImplementations|RCTHost/);
assert.ok(adapter.indexOf('@"loader.json"') < adapter.indexOf('dlopen('));
const entry = fs.readFileSync(path.join(root, 'runtime/src/entry.ts'), 'utf8');
const bridge = entry.slice(entry.indexOf('const rain ='), entry.indexOf('const { instead }')).replaceAll('(globalThis as any)', 'globalThis');
for (let i = 0; i < 30; i++) {
  const context = vm.createContext({ __RAIN_LOADER__: { loaderName: 'RainTweak', loaderVersion: '1.2.0', hasThemeSupport: true, fontPatch: 2 } });
  vm.runInContext(bridge, context);
  assert.equal(context.__RAIN_LOADER__.loaderName, 'RainTweak');
  assert.equal(context.__CLOUDCORD_LOADER__.hasThemeSupport, true);
  assert.equal(context.__CLOUDCORD_LOADER__.fontPatch, 2);
  assert.equal(context.__PYON_LOADER__, context.__CLOUDCORD_LOADER__);
}
console.log('original Rain binary hash verified; adapter loading order and 30 runtime identity fixtures passed (not device launches)');
