const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const cloud = fs.readFileSync('src/api/SettingsSync/cloudSync.ts', 'utf8');
const values = new Map();
const context = vm.createContext({ localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } });
const helpers = cloud.slice(cloud.indexOf('const SYNC_DIRECTION_KEY'), cloud.indexOf('async function loadApiVersionMap')) + cloud.slice(cloud.indexOf('export function shouldCloudSync'), cloud.indexOf('export async function putCloudSettings'));
vm.runInContext(esbuild.transformSync(helpers.replace(/export /g, '') + '\nObject.assign(globalThis, { getCloudSyncDirection, setCloudSyncDirection, shouldCloudSync });', { loader: 'ts' }).code, context);
assert.equal(context.getCloudSyncDirection(), 'both');
assert.equal(context.shouldCloudSync('push'), true);
assert.equal(context.shouldCloudSync('pull'), true);
for (const mode of ['push', 'pull', 'manual', 'both']) {
    context.setCloudSyncDirection(mode);
    assert.equal(context.shouldCloudSync('push'), mode === 'push' || mode === 'both');
    assert.equal(context.shouldCloudSync('pull'), mode === 'pull' || mode === 'both');
}
const tab = fs.readFileSync('src/components/settings/tabs/sync/CloudTab.tsx', 'utf8');
assert.ok(!tab.includes('localStorage.'));
for (const file of ['src/components/settings/tabs/diagnostics/index.tsx', 'src/sincordplugins/fakeProfile/index.tsx']) {
    assert.ok(fs.readFileSync(file, 'utf8').includes('import { localStorage } from "@utils/localStorage"'));
}
console.log('PASS: actual CloudSync direction handling and settings storage wiring');
