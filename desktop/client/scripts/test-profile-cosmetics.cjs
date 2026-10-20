// Nameplates, profile effects, status/activity and custom tag icons:
// schema safety, Discord catalog parsing and presence overrides.
// Run from the repository root: node desktop/client/scripts/test-profile-cosmetics.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const presenceStore = {
    getActivities: userId => userId === 'real' ? [{ type: 0, name: 'Real game' }, { type: 4, name: 'Custom Status', state: 'real status' }] : [],
    getPrimaryActivity: () => ({ type: 0, name: 'Real game' }),
    findActivity: (userId, predicate) => [{ type: 0, name: 'Real game' }].find(predicate),
    getStatus: userId => userId === 'offline-user' ? 'offline' : 'online'
};
(async () => {
const bundle = await esbuild.build({
    entryPoints: [path.join(root, 'src/sincordplugins/fakeProfile/cosmetics.tsx')],
    bundle: true, write: false, format: 'cjs', platform: 'neutral', jsx: 'transform',
    plugins: [{
        name: 'stubs',
        setup(build) {
            build.onResolve({ filter: /^@utils\/profileAppearance$/ }, () => ({ path: path.join(root, 'src/utils/profileAppearance.ts') }));
            build.onResolve({ filter: /^@webpack$/ }, () => ({ path: 'webpack', namespace: 'stub' }));
            build.onResolve({ filter: /^@api\/Settings$|^@components\// }, () => ({ path: 'empty', namespace: 'stub' }));
            build.onResolve({ filter: /^@webpack\/common$/ }, () => ({ path: 'common', namespace: 'stub' }));
            build.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path === 'empty' ? 'module.exports = { Settings: { plugins: {} }, openPluginModal() {} };' : args.path === 'webpack' ? 'module.exports = globalThis.__webpack;' : 'module.exports = globalThis.__common;', loader: 'js' }));
        }
    }]
});
const selfPresence = { getActivities: () => [{ type: 0, name: 'Own real game' }], getStatus: () => 'online', getPrimaryActivity: () => null, findActivity: () => undefined };
const context = { module: { exports: {} }, URL, __webpack: { findStore: name => name === 'SelfPresenceStore' ? selfPresence : null, findByCode: () => null }, __common: { UserStore: { getCurrentUser: () => ({ id: 'real' }) }, PresenceStore: presenceStore, React: { createElement() { } }, RestAPI: {}, Select: null } };
context.globalThis = context;
vm.runInNewContext(bundle.outputFiles[0].text, context);
const cosmetics = context.module.exports;
const appearance = (() => { const ctx = { module: { exports: {} }, URL }; vm.runInNewContext(esbuild.transformSync(fs.readFileSync(path.join(root, 'src/utils/profileAppearance.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code, ctx); return ctx.module.exports; })();

// ---- schema ----
const good = {
    nameplate: { skuId: '1349849614353829990', asset: 'nameplates/nameplates_v3/bonsai/', label: 'Bonsai', palette: 'berry' },
    profileEffect: { skuId: '1139323098643333240' },
    customActivity: { type: 1, name: 'Fortnite', details: 'Ranked', url: 'https://www.twitch.tv/xohus' },
    customStatus: { text: 'spooky szn', emoji: '🎃' },
    presenceStatus: 'dnd',
    serverTag: { tag: 'CC', guildId: '1234567890123456789', badge: '', icon: 'data:image/png;base64,iVBORw0KGgo=' }
};
const normalized = appearance.normalizeProfileAppearance(good);
assert.deepEqual(JSON.parse(JSON.stringify(normalized.nameplate)), good.nameplate);
assert.equal(normalized.customActivity.url, 'https://www.twitch.tv/xohus');
assert.equal(normalized.serverTag.icon, good.serverTag.icon);
assert.equal(JSON.stringify(appearance.normalizeProfileAppearance(normalized)), JSON.stringify(normalized), 'normalizing is stable');

const bad = appearance.normalizeProfileAppearance({
    nameplate: { skuId: '1349849614353829990', asset: 'nameplates/../../evil/' },
    profileEffect: { skuId: 'javascript:1' },
    customActivity: { type: 1, name: 'x', url: 'https://evil.example/stream' },
    customStatus: { text: '', emoji: '<:custom:123>' },
    presenceStatus: 'streaming',
    serverTag: { tag: 'CC', guildId: '1234567890123456789', badge: '', icon: 'javascript:alert(1)' }
});
assert.equal(bad.nameplate, undefined, 'path traversal in nameplate asset is rejected');
assert.equal(bad.profileEffect, undefined);
assert.equal(bad.customActivity.url, undefined, 'only Twitch/YouTube stream links are kept');
for (const [input, expected] of [['https://youtube.com/', ''], ['https://youtube.com/@x/live', ''], ['https://twitch.tv/', ''], ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'], ['https://youtube.com/live/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'], ['https://twitch.tv/xohus', 'https://twitch.tv/xohus']]) assert.equal(appearance.streamURL(input), expected, `stream link ${input} follows Discord's rule`);
assert.equal(bad.customStatus, undefined, 'custom emoji markup is not accepted');
assert.equal(bad.presenceStatus, undefined);
assert.equal(bad.serverTag.icon, undefined, 'unsafe tag icons are dropped');
assert.equal(appearance.serverTagCustomIcon('https://example.com/a.png'), '', 'third-party hosts are not used for tag icons');
assert.equal(appearance.serverTagCustomIcon('data:image/svg+xml;base64,PHN2Zz4='), '', 'SVG tag icons are rejected');
assert.equal(appearance.serverTagCustomIcon('data:image/png;base64,' + 'A'.repeat(appearance.TAG_ICON_MAX_LENGTH)), '', 'oversized icons are rejected');
assert.equal(appearance.normalizeProfileAppearance({ customActivity: { type: 0, name: '  bidi‮text  ' } }).customActivity.name, 'biditext');
assert.equal(appearance.normalizeProfileAppearance({ customActivity: { type: 0, name: 'a'.repeat(500) } }).customActivity.name.length, 128);
assert.deepEqual(JSON.parse(JSON.stringify(appearance.normalizeProfileAppearance({ nameplate: null, profileEffect: null, customActivity: null, customStatus: null, presenceStatus: null }))),
    { nameplate: null, profileEffect: null, customActivity: null, customStatus: null, presenceStatus: null }, 'explicit null clears each field');

// ---- native mapping ----
const native = appearance.nativeProfileAppearance(good);
assert.match(native.primaryGuild.badge, /^cc[a-f0-9]{30}$/, 'custom icon travels as a 32-hex badge key');
assert.equal(appearance.customServerTagIcon(native.primaryGuild.badge), good.serverTag.icon);
assert.equal(appearance.serverTagIconKey('a'), appearance.serverTagIconKey('a'));
assert.notEqual(appearance.serverTagIconKey('a'), appearance.serverTagIconKey('b'));
const collectibles = appearance.nativeCollectibles({ avatarDecoration: 'keep' }, good);
assert.equal(collectibles.avatarDecoration, 'keep', 'existing collectibles are kept');
assert.equal(collectibles.nameplate.asset, good.nameplate.asset);
assert.equal(appearance.nativeCollectibles({ x: 1 }, {}).x, 1, 'no nameplate setting leaves collectibles untouched');
const activities = appearance.nativeActivities(good);
assert.deepEqual([...activities.map(item => item.type)], [4, 1]);
assert.equal(activities[0].emoji.name, '🎃');

// ---- catalog parsing ----
const catalog = cosmetics.parseCatalog([{
    products: [
        { sku_id: '1000000000000000001', name: 'Bonsai plate', items: [{ type: 2, sku_id: '1000000000000000001', asset: 'nameplates/nameplates_v3/bonsai/', label: 'Bonsai', palette: 'berry' }] },
        { sku_id: '1000000000000000002', name: 'Fire effect', items: [{ type: 1, sku_id: '1000000000000000002' }] },
        { sku_id: '1000000000000000003', name: 'Ghost', items: [{ type: 0, sku_id: '1000000000000000003', asset: 'a_' + 'f'.repeat(32) }] },
        { sku_id: '1000000000000000004', name: 'Coral frame', items: [{ type: 3, sku_id: '1000000000000000004', label: 'Coral', layers: [{ id: 'top' }], inner_width: 340 }], preview_image: 'https://cdn.discordapp.com/frame.png' },
        { sku_id: 'not-a-snowflake', name: 'Broken', items: [{ type: 2, asset: 'x/' }] }
    ]
}], { profile_effect_configs: [{ sku_id: '1000000000000000002', title: 'Fire', thumbnail_preview_src: 'https://cdn.discordapp.com/x.png', effects: [{ src: 'https://cdn.discordapp.com/e.png', loop_delay: 0 }] }] });
assert.equal(catalog.nameplates.length, 1);
assert.equal(catalog.nameplates[0].palette, 'berry');
assert.equal(catalog.effects[0].title, 'Fire');
assert.equal(catalog.effects[0].config.effects[0].loopDelay, 0, 'effect configs are camel-cased for Discord\'s renderer');
assert.equal(catalog.frames.length, 1);
assert.equal(catalog.frames[0].label, 'Coral frame', 'frames use the short product name');
assert.equal(catalog.frames[0].preview, 'https://cdn.discordapp.com/media/v1/collectibles-shop/1000000000000000004/top/static', 'frame thumbnails come from the top layer');
assert.equal(appearance.normalizeProfileAppearance({ profileFrame: { skuId: '1000000000000000004' } }).profileFrame.skuId, '1000000000000000004');
assert.equal(appearance.normalizeProfileAppearance({ profileFrame: { skuId: '../x' } }).profileFrame, undefined);
assert.equal(catalog.decorations[0].id, 'a_' + 'f'.repeat(32));
assert.equal(cosmetics.parseCatalog({ categories: [] }, null).nameplates.length, 0, 'empty or wrapped payloads are tolerated');
assert.equal(cosmetics.nameplateAssetURL('nameplates/x/'), 'https://cdn.discordapp.com/assets/collectibles/nameplates/x/static.png');

// ---- presence overrides ----
const profiles = { real: good, 'offline-user': { presenceStatus: 'dnd' } };
cosmetics.installPresenceHooks(userId => profiles[userId]);
const list = presenceStore.getActivities('real');
assert.deepEqual([...list.map(item => item.name)], ['Custom Status', 'Fortnite', 'Real game'], 'custom status replaces the real one; real activities stay after ours');
assert.equal(presenceStore.getPrimaryActivity('real').name, 'Fortnite');
assert.equal(presenceStore.findActivity('real', activity => activity.type === 1).url, 'https://www.twitch.tv/xohus');
assert.equal(presenceStore.getStatus('real'), 'dnd');
assert.equal(presenceStore.getStatus('offline-user'), 'offline', 'never makes an offline account look online');
assert.equal(presenceStore.getActivities('nobody').length, 0);
assert.deepEqual([...selfPresence.getActivities().map(item => item.name)], ['Custom Status', 'Fortnite', 'Own real game'], 'your own activity list (SelfPresenceStore) gets the custom status and streaming activity');
assert.equal(selfPresence.getStatus(), 'dnd', 'your own status dot uses the chosen status');
assert.equal(selfPresence.getPrimaryActivity().type, 1, 'your primary activity is the stream');
assert.equal(selfPresence.findActivity(activity => activity.type === 1).url, 'https://www.twitch.tv/xohus');
cosmetics.uninstallPresenceHooks();
assert.equal(presenceStore.getStatus('real'), 'online', 'uninstall restores the original store');
assert.equal(selfPresence.getStatus(), 'online', 'uninstall restores SelfPresenceStore too');

console.log('Profile cosmetics: schema safety, native mapping, catalog parsing and presence overrides passed');
})().catch(error => { console.error(error); process.exit(1); });
