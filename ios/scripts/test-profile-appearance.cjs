const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const context = { module: { exports: {} }, exports: {} };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('desktop/client/src/utils/profileAppearance.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
const api = context.module.exports;
const input = { displayNameStyles: { fontId: 2, effectId: 3, colors: [0, 0xffffff] }, serverTag: { tag: 'CC', guildId: '1540350369232850995', badge: 'a'.repeat(32) } };
const normalized = api.normalizeProfileAppearance(input);
const native = api.nativeProfileAppearance(JSON.parse(JSON.stringify(normalized)));
assert.equal(native.primaryGuild.identityGuildId, input.serverTag.guildId);
assert.equal(native.primary_guild.tag, 'CC');
assert.equal(native.displayNameStyles.font_id, 2);
assert.equal(native.display_name_styles.effect_id, 3);
assert.equal(native.displayNameStyles.colors[0], 0);
native.displayNameStyles.colors[0] = 123;
assert.equal(input.displayNameStyles.colors[0], 0);
assert.deepEqual(JSON.parse(JSON.stringify(api.nativeProfileAppearance({}))), {});
assert.equal(api.nativeProfileAppearance({ serverTag: null }).primaryGuild, null);
assert.equal(api.nativeProfileAppearance({ displayNameStyles: null }).displayNameStyles, null);
assert.equal(api.normalizeProfileAppearance({ serverTag: { ...input.serverTag, tag: 'TOOLONG' } }).serverTag, undefined);
assert.equal(api.normalizeProfileAppearance({ displayNameStyles: { fontId: -1, effectId: 0, colors: [] } }).displayNameStyles, undefined);
// One malformed server row must not prevent the remaining picker entries loading.
const validProduct = { sku_id: '1000000000000000001', name: 'Valid', items: [null, { type: 0, asset: 'valid-decoration' }] };
for (const effects of [{ profile_effect_configs: {} }, { profileEffectConfigs: 'invalid' }, null]) {
    const catalog = api.parseCatalog([null, { products: {} }, { products: [null, { items: {} }, validProduct] }], effects);
    assert.equal(catalog.decorations.length, 1);
    assert.equal(catalog.decorations[0].id, 'valid-decoration');
}
const effects = api.parseCatalog([], { profile_effect_configs: [null, { sku_id: 'invalid' }, { sku_id: '1000000000000000002', title: 'Valid effect' }] });
assert.equal(effects.effects.length, 1);
assert.equal(effects.effects[0].title, 'Valid effect');
console.log('PASS: shared appearance validation, native aliases, black colors, reset and immutable sync round-trip.');
