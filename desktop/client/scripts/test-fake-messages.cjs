const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const load = file => {
    const context = { module: { exports: {} }, setTimeout, BigInt, Date, Math };
    vm.runInNewContext(esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
    return context.module.exports;
};
const fake = load('src/utils/fakeMessages.ts');

// Limits and cleanup.
const people = Array.from({ length: 12 }, (_, i) => ({ key: 'p' + i, name: 'Person ' + i }));
const clean = fake.normalizeConversation({ id: 'c1', channelId: '111111111111111111', people, lines: [{ key: 'l1', person: 'p0', text: 'hi', minutesAgo: 2 }, { key: 'l2', person: 'missing', text: 'gone' }, { key: 'l3', person: 'p1', text: '  ' }] });
assert.equal(clean.people.length, fake.MAX_FAKE_PEOPLE, 'at most 10 people');
assert.deepEqual(clean.lines.map(line => line.key), ['l1'], 'lines from unknown people or empty text are dropped');
assert.equal(fake.normalizeConversation({ channelId: 'not-an-id' }), null);
assert.match(fake.newPersonId(), /^\d{15,22}$/, 'made-up people get a numeric Discord-style id');

// Showing, re-showing on channel load, and catching writes.
const events = [], handlers = {};
const dispatcher = { dispatch: event => events.push(event), subscribe: (type, cb) => { handlers[type] = cb; }, unsubscribe: type => { delete handlers[type]; } };
let restCalls = 0, removed = null, explained = 0;
const rest = { del: async () => { restCalls++; return { ok: true }; }, patch: async () => { restCalls++; }, put: async () => { restCalls++; }, post: async () => { restCalls++; } };
const icons = { getUserAvatarURL: user => 'real:' + user.id };
const conversation = { id: 'c1', name: 'Test', channelId: '111111111111111111',
    people: [{ key: 'a', userId: '222222222222222222' }, { key: 'b', name: 'Made Up', avatarUrl: 'https://example.test/a.png' }],
    lines: [{ key: 'l2', person: 'b', text: 'second', minutesAgo: 1 }, { key: 'l1', person: 'a', text: 'first', minutesAgo: 5 }] };
const runtime = fake.installFakeMessages({ dispatcher, rest, iconUtils: icons,
    getConversations: () => [conversation], getUser: id => ({ id, username: 'friend', globalName: 'Friend', avatar: 'abc' }),
    getGuildId: () => null, removeLine: (c, l) => { removed = [c, l]; }, explain: () => explained++ });

runtime.show('111111111111111111');
const created = events.filter(event => event.type === 'MESSAGE_CREATE');
assert.equal(created.length, 2);
assert.deepEqual(created.map(event => event.message.content), ['first', 'second'], 'messages appear oldest first');
assert.ok(BigInt(created[0].message.id) < BigInt(created[1].message.id), 'ids increase with time, like real messages');
assert.equal(created[0].message.author.global_name, 'Friend', 'real people use their Discord name');
assert.equal(created[1].message.author.global_name, 'Made Up');
assert.match(created[1].message.author.id, /^\d+$/);
assert.equal(icons.getUserAvatarURL({ id: created[1].message.author.id }), 'https://example.test/a.png', 'made-up people get their picture');
assert.equal(icons.getUserAvatarURL({ id: '333' }), 'real:333', 'everyone else keeps their real picture');

events.length = 0;
runtime.show('999999999999999999');
assert.equal(events.length, 0, 'other channels are untouched');
handlers.LOAD_MESSAGES_SUCCESS({ channelId: '111111111111111111' });
(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(events.filter(event => event.type === 'MESSAGE_CREATE').length, 2, 'messages come back after Discord reloads the channel');

    const fakeId = created[0].message.id;
    await assert.rejects(rest.patch({ url: `/channels/111111111111111111/messages/${fakeId}`, body: { content: 'x' } }), /fake message/);
    await assert.rejects(rest.put({ url: `/channels/111111111111111111/messages/${fakeId}/reactions/%F0%9F%91%8D/@me` }), /fake message/);
    assert.equal(explained, 2);
    await rest.del({ url: `/channels/111111111111111111/messages/${fakeId}` });
    assert.deepEqual(removed, ['c1', 'l1'], 'deleting a fake message removes its line locally');
    assert.equal(restCalls, 0, 'nothing about fake messages reaches Discord');
    await rest.del({ url: '/channels/111111111111111111/messages/123456789012345678' });
    assert.equal(restCalls, 1, 'real messages still use Discord');

    runtime.hide('c1');
    assert.ok(events.some(event => event.type === 'MESSAGE_DELETE'));
    runtime.stop();
    assert.equal(handlers.LOAD_MESSAGES_SUCCESS, undefined, 'stop removes the listeners');
    assert.equal(icons.getUserAvatarURL({ id: created[1].message.author.id }), 'real:' + created[1].message.author.id, 'stop restores avatars');
    console.log('PASS fake messages: limits, order, real and made-up people, reload, local-only writes and cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
