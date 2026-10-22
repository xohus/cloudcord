const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const roster = JSON.parse(fs.readFileSync('config/staff-roster.json', 'utf8'));
assert.deepEqual(roster.roles.map(role => role.userIds.length), [1, 2, 3, 1, 4, 6, 2, 4]);
const entries = roster.roles.flatMap(role => role.userIds.map(id => [id, role.name]));
assert.equal(new Set(entries.map(([id]) => id)).size, 23, 'each staff account has exactly one rank');
assert(!entries.some(([id]) => id === roster.owner), 'owner is outside the 23 staff slots');
const expected = { [roster.owner]: 'Founder', ...Object.fromEntries(entries) };
for (const path of ['desktop/client/src/api/Badges.ts', '.github/workflows/cloudcord.yml']) {
    const source = fs.readFileSync(path, 'utf8');
    const object = source.match(/const CLOUDCORD_STAFF_ROLES: Record<string, string> = (\{[\s\S]*?\});/)[1];
    const actual = JSON.parse(JSON.stringify(vm.runInNewContext(`(${object})`)));
    assert.deepEqual(actual, expected);
    assert.equal(actual['unknown-user'], undefined);
}
console.log('PASS exact 23-slot staff roster, unique assignments and matching desktop/browser/mobile badges; owner preserved');
