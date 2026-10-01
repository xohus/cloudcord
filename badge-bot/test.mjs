import assert from 'node:assert/strict';
import { isGuildOwner } from './authorization.mjs';
assert.equal(isGuildOwner('guild', 'guild', 'owner', 'owner'), true);
assert.equal(isGuildOwner('guild', 'other', 'owner', 'owner'), false);
assert.equal(isGuildOwner('guild', 'guild', 'owner', 'admin'), false);
assert.equal(isGuildOwner('guild', 'guild', 'new-owner', 'old-owner'), false);
assert.equal(isGuildOwner('', '', '', ''), false);
console.log('owner-only badge authorization tests passed');
