const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const expected = {
    '1457121276748365989': 'Administrator',
    '1497588725788442637': 'Management',
    '1453130879537905734': 'Management',
    '1191456523763859558': 'Moderator',
    '1417880742502994042': 'Management',
    '553936745058664458': 'Moderator',
    '463515440606609419': 'Founder',
    '1121228881425354832': 'Management'
};
for (const path of ['desktop/client/src/api/Badges.ts', '.github/workflows/cloudcord.yml']) {
    const source = fs.readFileSync(path, 'utf8');
    const object = source.match(/const CLOUDCORD_STAFF_ROLES: Record<string, string> = (\{[\s\S]*?\});/)[1];
    const actual = JSON.parse(JSON.stringify(vm.runInNewContext(`(${object})`)));
    assert.deepEqual(actual, expected);
    assert.equal(actual['unknown-user'], undefined);
}
console.log('all eight staff roles match on desktop/browser and mobile; unlisted users have no staff badge');
