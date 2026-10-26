const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), esbuild = require('esbuild');
let donorFails = false, globalFails = false, warnings = 0, wraps = 0;
const apiPlugin = { getDonorBadges() { if (donorFails) throw Error('donor unavailable'); return [{ id: 'donor' }]; }, getSincordDonorBadges: () => [] };
const globalPlugin = { name: 'globalBadges', getGlobalBadges() { if (globalFails) throw Error('global unavailable'); return [{ id: 'global' }]; } };
const context = { module: { exports: {} }, require: name => {
    if (name === '@components/ErrorBoundary') return { wrap: component => { wraps++; return function WrappedBadge() { return component; }; } };
    if (name === '@sincordplugins/globalBadges') return globalPlugin;
    if (name === '@plugins/_api/badges') return apiPlugin;
    if (name === '@utils/realProfileView') return { isRealProfileView: () => false };
    if (name === './PluginManager') return { isPluginEnabled: () => true };
    if (name === '@utils/Logger') return { Logger: class { warn() { warnings++; } } };
    if (name === '@webpack/common') return { React: { createElement: (type, props) => ({ type, props }) } };
    return {};
} };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync(path.join(__dirname, '../src/api/Badges.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
const api = context.module.exports, args = { userId: '1465007041390317579', guildId: 'guild' };
const roster = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../config/staff-roster.json'), 'utf8'));
for (const rank of roster.roles) for (const userId of rank.userIds) {
    const official = api._getBadges({ ...args, userId }).filter(b => b.id.startsWith('cloudcord-official-'));
    assert.equal(official.length, 1, `${userId} receives exactly one staff badge`);
    assert.equal(official[0].description, `CloudCord ${rank.name}`);
}
for (const userId of ['318501167741272066', '1121228881425354832', '1169999011642605628', '1312331817818394665', '1453130879537905734', '1541881462914023501']) {
    assert(!api._getBadges({ ...args, userId }).some(b => b.id.startsWith('cloudcord-official-')), `removed staff ${userId} has no official badge`);
}
api.addProfileBadge({ id: 'broken', getBadges() { throw Error('profile unavailable'); } });
api.addProfileBadge({ id: 'broken-predicate', shouldShow() { throw Error('bad predicate'); } });
api.addProfileBadge({ id: 'invalid', getBadges: () => ({ id: 'not-an-array' }) });
const BadgeComponent = () => null;
let description = 'Before sync';
api.addProfileBadge({ id: 'mixed', getBadges: () => [null, {}, { id: 'valid-custom', description, component: BadgeComponent }] });
api.addProfileBadge({ id: 'static', component: BadgeComponent });
const first = api._getBadges(args);
for (const id of ['valid-custom', 'static', 'donor', 'global', 'cloudcord-official-admin']) assert(first.some(b => b.id === id), `${id} survives a failed badge source`);
assert(first.every(b => b.userId === args.userId && typeof b.id === 'string'));
const firstWarnings = warnings;
assert.equal(firstWarnings, 3, 'each failing registered source is reported once');
const initialWraps = wraps;
description = 'After sync';
const repeated = api._getBadges(args);
assert.equal(warnings, firstWarnings, 'repeated profile renders do not spam provider errors');
for (const id of ['valid-custom', 'static']) assert.equal(first.find(b => b.id === id).component, repeated.find(b => b.id === id).component, `${id} keeps its React component identity across profile refreshes`);
assert.equal(wraps, initialWraps, 'profile refreshes must not recreate error-boundary components');
assert.equal(repeated.find(b => b.id === 'valid-custom').description, 'After sync', 'stable components still receive fresh synchronized badge data');
const other = api._getBadges({ ...args, userId: 'other-user' }).find(b => b.id === 'valid-custom');
assert.equal(other.userId, 'other-user', 'the component cache never retains the previous profile owner');
donorFails = true; globalFails = true;
const next = api._getBadges(args);
for (const id of ['valid-custom', 'static', 'cloudcord-official-admin']) assert(next.some(b => b.id === id), `${id} survives failed donor/global sources`);
assert(!next.some(b => b.id === 'donor' || b.id === 'global'));
console.log('PASS real badge API provider, predicate, invalid-row and donor/global failure isolation; staff badges preserved');
