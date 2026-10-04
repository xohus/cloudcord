const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
for (const file of ['manifest.json', 'manifestv2.json']) {
    const manifest = JSON.parse(fs.readFileSync(`browser/${file}`));
    assert.equal(manifest.description, 'Your Discord, your way.');
    for (const [size, file] of Object.entries(manifest.icons)) {
        const png = fs.readFileSync(`browser/${file}`);
        assert.equal(png.readUInt32BE(16), Number(size));
        assert.equal(png.readUInt32BE(20), Number(size));
    }
    assert.ok(manifest.permissions.includes('alarms'));
}
let badge, stored, alarm;
const event = () => ({ addListener() {} });
const hash = 'a'.repeat(40);
const action = { setBadgeText(v) { badge = v.text; }, setBadgeBackgroundColor() {}, setTitle() {}, onClicked: event() };
let release = hash;
const context = vm.createContext({ chrome: { action, storage: { local: { async set(v) { stored = v; } } }, alarms: { create(name) { alarm = name; }, onAlarm: event() }, runtime: { onInstalled: event(), onStartup: event() }, tabs: { create() {} } }, fetch: async () => ({ ok: true, json: async () => ({ hash: release }) }) });
vm.runInContext(fs.readFileSync('browser/update-check.js', 'utf8').replace('__CLOUDCORD_BUILD_HASH__', hash), context);
(async () => {
    await context.checkCloudCordUpdate(); assert.equal(badge, ''); assert.equal(stored.cloudcordUpdateAvailable, false);
    release = 'b'.repeat(40); await context.checkCloudCordUpdate(); assert.equal(badge, '↑'); assert.equal(stored.cloudcordUpdateAvailable, true);
    console.log('browser branding, square icon sizes and update detection passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
