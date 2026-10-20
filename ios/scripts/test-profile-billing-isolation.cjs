const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const page = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
esbuild.transformSync(page, { loader: 'tsx' });
const source = page.slice(page.indexOf('function cloneObject('), page.indexOf('function decorateProfileResult('));
const premium = ['premiumType', 'premium_type', 'premiumSince', 'premium_since', 'premiumGuildSince', 'premium_guild_since'];
const context = vm.createContext({
    preview: { enabled: true, username: 'cosmetic', nitroEnabled: true, nitroMonths: 6, boostMonths: 6 },
    userCache: new WeakMap(), profileCache: new WeakMap(),
    overriddenKeys: new Set(['username', ...premium]),
    nativeProfileAppearance: () => ({}), nativeSocialProfile: () => ({}),
    mediaUri: () => null, colorNumber: () => 0, profileDate: () => null, BADGES: [],
    shouldReplaceLocalBadges: () => false, selectedBadgeObjects: value => value,
    localBadgesHidden: () => false,
    decorationAsset: value => value,
    applyCollectibles: () => {},
    monthsAgo: () => new Date('2026-01-01T00:00:00Z'),
    setOwnValue: (target, key, value) => Object.defineProperty(target, key, { value, writable: true, configurable: true, enumerable: true }),
});
vm.runInContext(esbuild.transformSync(source, { loader: 'ts' }).code, context);
for (const tier of [0, 1, 2]) {
    const original = Object.freeze({ id: '123', username: 'real', premiumType: tier, premium_type: tier,
        premiumSince: 'real-since', premium_since: 'real-since', premiumGuildSince: 'real-boost', premium_guild_since: 'real-boost' });
    const user = context.cloneObject(original, 'user');
    for (const key of premium) assert.equal(user[key], original[key], `${key} must retain real billing state`);
    assert.equal(user.username, 'cosmetic');
    assert.equal(original.username, 'real');
    const profile = context.cloneObject(original, 'profile');
    assert.equal(profile.premiumType, 2);
    assert.equal(profile.premium_type, 2);
    assert.notEqual(profile.premiumSince, original.premiumSince);
}
context.localBadgesHidden = () => true;
const hiddenOriginal = Object.freeze({ id: '456', username: 'real', premiumType: 1, premiumSince: 'real-since', premiumGuildSince: 'real-boost' });
const hiddenProfile = context.cloneObject(hiddenOriginal, 'profile');
assert.equal(hiddenProfile.premiumType, 1);
assert.equal(hiddenProfile.premiumSince, 'real-since');
assert.equal(hiddenProfile.premiumGuildSince, 'real-boost');
assert.equal(hiddenProfile.username, 'cosmetic', 'hiding badges does not disable the rest of the custom profile');
console.log('PASS: cosmetic profile Nitro cannot overwrite UserStore billing fields; device-only hidden badges retain real subscription metadata');
