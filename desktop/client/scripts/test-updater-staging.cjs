const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), esbuild = require('esbuild');
const header = Buffer.from(JSON.stringify({ files: { 'package.json': {}, 'patcher.js': {} } }));
const update = Buffer.alloc(2048);
update.writeUInt32LE(4, 0); update.writeUInt32LE(header.length, 12); header.copy(update, 16);
const checksum = crypto.createHash('sha256').update(update).digest('hex');
const archive = 'C:\\runtime\\cloudcord.asar', installed = Buffer.from('old runtime');
const writes = new Map(), handlers = new Map(), events = [];
const stubs = {
    '@main/utils/http': { fetchBuffer: async url => url.endsWith('.sha256') ? Buffer.from(checksum) : update },
    '@shared/IpcEvents': { IpcEvents: { GET_REPO: 'repo', GET_UPDATES: 'updates', UPDATE: 'update', BUILD: 'build', RESTART_UPDATE: 'restart' } },
    '@shared/vencordUserAgent': { VENCORD_USER_AGENT: 'test' },
    electron: { app: { on() {}, getPath: () => 'C:\\Discord.exe', quit: () => events.push('quit'), relaunch: () => events.push('relaunch') }, ipcMain: { handle: (name, fn) => handlers.set(name, fn) } },
    'original-fs': { readFileSync: file => writes.get(file) || installed, writeFileSync: (file, data) => writes.set(file, data), unlinkSync: () => { throw Error('must not unlink loaded runtime'); } },
    '~git-hash': 'test', '~git-remote': 'cloudcord-mod/hub',
    './common': { ASAR_FILE: 'cloudcord.asar', serializeErrors: fn => fn },
    './windows': { launchWindowsUpdate: async (file, hash, exe) => { assert.equal(file, archive); assert.equal(hash, checksum); assert.equal(exe, 'C:\\Discord.exe'); events.push('handoff'); } }
};
const context = vm.createContext({ module: { exports: {} }, require: name => name in stubs ? stubs[name] : require(name),
    process: { platform: 'win32' }, __dirname: archive, Buffer, console });
vm.runInContext(esbuild.transformSync(fs.readFileSync('src/main/updater/http.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
(async () => {
    assert.equal(await handlers.get('update')(), true);
    assert.equal(await handlers.get('build')(), true);
    assert.equal(writes.get(archive + '.new'), update, 'verified runtime is staged beside installed ASAR');
    assert.equal(writes.has(archive), false, 'loaded archive is never overwritten');
    assert.deepEqual(events, [], 'staging does not restart before user confirmation');
    writes.set(archive + '.new', Buffer.from('damaged'));
    await assert.rejects(handlers.get('restart')(), /Staged CloudCord update changed/);
    assert.deepEqual(events, [], 'damaged staging leaves Discord running');
    writes.set(archive + '.new', update);
    await handlers.get('restart')();
    assert.deepEqual(events, ['handoff', 'quit'], 'helper must be spawned before quitting, without a competing relaunch');
    console.log('PASS Windows updater stages safely and hands restart to the replacement helper');
})().catch(error => { console.error(error); process.exitCode = 1; });
