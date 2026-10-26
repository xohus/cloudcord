// BotCord tokens are stored encrypted in the main process and never returned to the renderer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'botcord-vault-'));
const source = fs.readFileSync('src/main/botTokens.ts', 'utf8');
const sealed = text => Buffer.from('sealed:' + Buffer.from(text).toString('base64'));
const modules = {
    crypto: require('node:crypto'), fs, path,
    electron: { safeStorage: { isEncryptionAvailable: () => true, encryptString: sealed, decryptString: buffer => Buffer.from(String(buffer).slice(7), 'base64').toString() } },
    './utils/constants': { DATA_DIR: dir }
};
const load = () => {
    const context = { module: { exports: {} }, exports: {}, console, Buffer, require: name => modules[name] };
    vm.createContext(context);
    vm.runInContext(esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code, context);
    return context.module.exports;
};

// A made-up token built at runtime so secret scanners don't mistake it for a real one.
const token = ['fake', 'bot', 'token', 'x'.repeat(30)].join('-');
const vault = load();
const id = vault.saveBot('Test Bot', 'Bot ' + token);
assert.deepEqual(JSON.parse(JSON.stringify(vault.listBots())), [{ id, name: 'Test Bot' }], 'list never includes tokens');
assert.equal(vault.tokenFor(id), token);
assert.equal(vault.saveBot('Renamed', token), id, 'saving the same token keeps its id');
const onDisk = fs.readFileSync(path.join(dir, 'botcord', 'tokens.bin'), 'utf8');
assert.ok(!onDisk.includes(token), 'token is not stored in plain text');
assert.equal(load().tokenFor(id), token, 'a fresh process can read it back');
assert.throws(() => vault.saveBot('Bad', 'not a token'), /Invalid bot token/);
vault.removeBot(id);
assert.equal(vault.tokenFor(id), null);

modules.electron.safeStorage.isEncryptionAvailable = () => false;
assert.throws(() => load().saveBot('X', token), /Secure storage isn't available/, 'never falls back to plain text');
fs.rmSync(dir, { recursive: true, force: true });
console.log('BotCord token vault tests passed');
