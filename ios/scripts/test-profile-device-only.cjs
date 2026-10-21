const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const desktop = fs.readFileSync('desktop/client/src/sincordplugins/fakeProfile/index.tsx', 'utf8');
const mobile = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
for (const [source, flag] of [[desktop, 'storedData.localOnly'], [mobile, 'rootSettings.fakeProfileLocalOnly']]) {
    const publish = source.slice(source.indexOf('async function publishSharedProfile('));
    const guard = new RegExp(`if \\([^\\n]*${flag.replace(/\./g, '\\.')}[^\\n]*\\) return;`);
    const publishGuard = publish.match(guard);
    assert(publishGuard && publishGuard.index < publish.search(/fetch(?:ProfileResponse)?\(/));
    const pull = source.slice(source.indexOf('async function pullOwnSharedProfile('));
    const pullGuard = pull.match(guard);
    assert(pullGuard && pullGuard.index < pull.search(/fetch(?:ProfileResponse)?\(/));
    const queue = source.slice(source.indexOf('function queueSharedPublish()'), source.indexOf('async function pullOwnSharedProfile('));
    let scheduled = 0;
    vm.runInNewContext(queue.replace(/catch\(error => \{[\s\S]*?\}\)/, 'catch(() => {})') + '\nqueueSharedPublish();', {
        storedData: { localOnly: true }, rootSettings: { fakeProfileLocalOnly: true },
        profileRuntimeActive: true,
        publishTimer: null, preview: { enabled: true }, clearTimeout() {},
        setTimeout() { scheduled++; }, publishSharedProfile() {},
    });
    assert.equal(scheduled, 0);
}
assert(desktop.includes('localOnly: !useEverywhere'));
assert(mobile.includes('rootSettings.fakeProfileLocalOnly = false'));
assert(mobile.includes('A previously shared profile remains shared until replaced'));
assert(mobile.includes('"1465007041390317579": "Administrator"'));
console.log('PASS device-only upload/pull guards, saved mode and staff assignment');
