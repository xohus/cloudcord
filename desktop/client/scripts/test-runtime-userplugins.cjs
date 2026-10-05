const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto, createHash } = require('node:crypto');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const source = fs.readFileSync('src/sincordplugins/userpluginInstaller/runtime.ts', 'utf8');
const registry = {};
const meta = {};
const settings = { plugins: new Proxy({}, { get(target, key) { if (!(key in registry)) return undefined; return target[key] ??= { enabled: false }; } }) };
let saved = [];
let starts = 0;
let stops = 0;
const code = 'module.exports={name:"TestPlugin",description:"A test",authors:[],start(){}};';
const hash = createHash('sha256').update(code).digest('hex');
let manifest = { name: 'TestPlugin', browser: { entry: 'browser.js', sha256: hash } };
const modules = {
    '@api/DataStore': { get: async () => saved, set: async (_, value) => { saved = value; } },
    '@api/PluginManager': { startDependenciesRecursive: () => ({ failures: [], restartNeeded: false }), startPlugin: () => { starts++; return true; }, stopPlugin: () => { stops++; } },
    '@api/Settings': { Settings: settings, SettingsStore: { addChangeListener() {}, removeChangeListener() {} } },
    '@utils/constants': {}, '@utils/types': {}, '@webpack': {}, '@webpack/common': {},
    '~plugins': { default: registry, PluginMeta: meta, __esModule: true }
};
const context = { module: { exports: {} }, exports: {}, IS_WEB: true, crypto: webcrypto, URL, AbortSignal, TextDecoder, confirm: () => true, console,
    require: name => modules[name],
    fetch: async url => String(url).endsWith('manifest.json') ? { ok: true, json: async () => manifest } : { ok: true, arrayBuffer: async () => new TextEncoder().encode(code).buffer }
};
vm.createContext(context);
vm.runInContext(esbuild.transformSync(source, { loader: 'ts', format: 'cjs' }).code, context);
(async () => {
    const api = context.module.exports;
    assert.equal(await api.installRuntimePlugin('https://example.com/plugin/'), true);
    assert.ok(registry.TestPlugin);
    assert.equal(settings.plugins.TestPlugin.enabled, true);
    assert.equal(starts, 1);
    assert.equal(saved.length, 1);
    delete registry.TestPlugin;
    await api.loadRuntimePlugins();
    assert.equal(starts, 2, 'reload restores enabled plugin');
    await api.removeRuntimePlugin('TestPlugin');
    assert.equal(saved.length, 0);
    assert.equal(registry.TestPlugin, undefined);
    assert.ok(stops);
    manifest.browser.sha256 = '0'.repeat(64);
    await assert.rejects(api.installRuntimePlugin('https://example.com/plugin/'), /match its manifest/);
    manifest = { name: 'TestPlugin' };
    await assert.rejects(api.installRuntimePlugin('https://example.com/plugin/'), /source code only/);
    const native = fs.readFileSync('src/sincordplugins/userpluginInstaller/native.ts', 'utf8');
    const calls = [];
    const buildContext = { __dirname: 'installed/cloudcord.asar', customClientRoot: 'checkout', join: (...paths) => paths.join('/'), copyArchive: async () => {},
        run: async (command, args) => { calls.push([command, args]); if (command === 'pnpm') throw new Error('pnpm missing'); } };
    vm.createContext(buildContext);
    const build = native.slice(native.indexOf('async function build()'), native.indexOf('async function getPluginMeta('));
    vm.runInContext(esbuild.transformSync(build + '\nthis.buildPlugin = build;', { loader: 'ts' }).code, buildContext);
    await buildContext.buildPlugin();
    const npmCommands = calls.filter(([command, args]) => command === 'npm' && args[0] === 'exec');
    assert.equal(npmCommands.length, 3);
    assert.ok(npmCommands.every(([, args]) => args.includes('--package=pnpm@11.0.9')));
    console.log('Runtime user plugins: install, start, persist, restore, remove, integrity and source-only rejection passed; pinned desktop pnpm fallback present.');
})().catch(error => { console.error(error); process.exitCode = 1; });
