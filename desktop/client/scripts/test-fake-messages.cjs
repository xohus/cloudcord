const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const load = file => {
    const context = { module: { exports: {} }, setTimeout, BigInt, Date, Math, URLSearchParams, Promise };
    vm.runInNewContext(esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
    return context.module.exports;
};
const fake = load('src/utils/fakeMessages.ts');
const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
const CH = '111111111111111111', DM = fake.newLocalChannelId();

// Limits and cleanup.
const people = Array.from({ length: 12 }, (_, i) => ({ key: 'p' + i, name: 'Person ' + i }));
const clean = fake.normalizeConversation({ id: 'c1', channelId: CH, people, lines: [{ key: 'l1', person: 'p0', text: 'hi', minutesAgo: 2 }, { key: 'l2', person: 'missing', text: 'gone' }, { key: 'l3', person: 'p1', text: '  ' }], dm: { person: 'nobody' } });
assert.equal(clean.people.length, fake.MAX_FAKE_PEOPLE, 'at most 10 people');
same(clean.lines.map(line => line.key), ['l1'], 'lines from unknown people or empty text are dropped');
assert.equal(clean.dm, undefined, 'a DM must point at someone in the conversation');
assert.equal(fake.normalizeConversation({ channelId: 'not-an-id' }), null);
assert.match(fake.newPersonId(), /^\d{15,22}$/);

const savedAt = Date.now() - 3 * 3600_000; // saved 3 hours ago
const conversations = [
    { id: 'c1', name: 'Test', channelId: CH, savedAt,
        people: [{ key: 'a', userId: '222222222222222222' }, { key: 'b', name: 'Made Up', avatarUrl: 'https://example.test/a.png' }],
        lines: [{ key: 'l2', person: 'b', text: 'second', minutesAgo: 1 }, { key: 'l1', person: 'a', text: 'first', minutesAgo: 5 }] },
    { id: 'c2', name: 'DM', channelId: DM, savedAt, dm: { person: 'x', local: true },
        people: [{ key: 'x', userId: '333333333333333333' }, { key: 'me', userId: '444444444444444444' }],
        lines: [{ key: 'd1', person: 'x', text: 'hey in dm', minutesAgo: 2 }] },
];
const events = [], handlers = {};
const dispatcher = { dispatch: event => events.push(event), subscribe: (type, cb) => { handlers[type] = cb; }, unsubscribe: type => { delete handlers[type]; } };
let restCalls = 0, removed = null, explained = 0, own = null;
const snow = time => String((BigInt(time) - 1420070400000n) << 22n);
const realNewest = snow(Date.now() - 60_000), realOld = snow(savedAt - 3600_000);
const rest = {
    get: async ({ url }) => { restCalls++; return { body: url.includes('before=') ? [{ id: realOld, content: 'very old real' }] : [{ id: realNewest, content: 'my real message' }, { id: realOld, content: 'very old real' }] }; },
    del: async () => { restCalls++; return { ok: true }; }, patch: async () => { restCalls++; }, put: async () => { restCalls++; }, post: async () => { restCalls++; },
};
const icons = { getUserAvatarURL: user => 'real:' + user.id };
const runtime = fake.installFakeMessages({ dispatcher, rest, iconUtils: icons,
    getConversations: () => conversations, getUser: id => ({ id, username: 'friend' + id.slice(0, 2), globalName: 'Friend', avatar: 'abc' }),
    getGuildId: () => null, removeLine: (c, l) => { removed = [c, l]; }, explain: () => explained++,
    addOwnLine: (c, text) => { own = [c, text]; } });

(async () => {
    // Local DMs are created at startup so they show in the DM list.
    const dmCreate = events.find(event => event.type === 'CHANNEL_CREATE');
    assert.equal(dmCreate.channel.id, DM); assert.equal(dmCreate.channel.type, 1);
    assert.equal(dmCreate.channel.recipients[0].id, '333333333333333333');
    assert.ok(dmCreate.channel.last_message_id, 'the DM list shows the fake last message');

    // Showing after a save adds the messages right away, oldest first, with fixed times.
    runtime.show(CH);
    const created = events.filter(event => event.type === 'MESSAGE_CREATE');
    same(created.map(event => event.message.content), ['first', 'second']);
    assert.equal(new Date(created[1].message.timestamp).getTime(), savedAt - 60_000, 'times count back from when it was saved');
    assert.equal(created[0].message.author.global_name, 'Friend');
    assert.equal(icons.getUserAvatarURL({ id: created[1].message.author.id }), 'https://example.test/a.png');

    // Loading the chat merges fakes in time order; your real latest message stays on top.
    events.length = 0;
    const page = (await rest.get({ url: `/channels/${CH}/messages?limit=50` })).body;
    same(page.map(message => message.content), ['my real message', 'second', 'first', 'very old real']);
    assert.equal(events.length, 0, 'loading never re-sends fake messages as new (that is what moved DMs down the list)');
    const older = (await rest.get({ url: `/channels/${CH}/messages?limit=50&before=${realOld}` })).body;
    same(older.map(message => message.content), ['very old real'], 'fakes are not repeated on older pages');

    // The local DM is served entirely on this device.
    restCalls = 0;
    const dmPage = (await rest.get({ url: `/channels/${DM}/messages?limit=50` })).body;
    same(dmPage.map(message => message.content), ['hey in dm']);
    await rest.post({ url: `/channels/${DM}/messages`, body: { content: 'my reply' } });
    same(own, ['c2', 'my reply'], 'typing in a local DM adds your own line');
    await rest.post({ url: `/channels/${DM}/typing` });
    await rest.post({ url: `/channels/${DM}/messages/${dmPage[0].id}/ack`, body: {} });
    await rest.del({ url: `/channels/${DM}` });
    assert.equal(restCalls, 0, 'nothing about a local DM reaches Discord');

    // Actions on fake messages in real chats stay local.
    const fakeId = created[0].message.id;
    await assert.rejects(rest.patch({ url: `/channels/${CH}/messages/${fakeId}`, body: { content: 'x' } }), /fake message/);
    await assert.rejects(rest.put({ url: `/channels/${CH}/messages/${fakeId}/reactions/%F0%9F%91%8D/@me` }), /fake message/);
    assert.equal(explained, 2);
    await rest.del({ url: `/channels/${CH}/messages/${fakeId}` });
    same(removed, ['c1', 'l1'], 'deleting a fake message removes its line');
    assert.equal(restCalls, 0);
    await rest.del({ url: `/channels/${CH}/messages/123456789012345678` });
    assert.equal(restCalls, 1, 'real messages still use Discord');

    // New sessions add the local DMs back; stop removes everything.
    events.length = 0;
    handlers.CONNECTION_OPEN();
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(events.some(event => event.type === 'CHANNEL_CREATE'));
    runtime.stop();
    assert.ok(events.some(event => event.type === 'CHANNEL_DELETE' && event.channel.id === DM));
    assert.equal(handlers.CONNECTION_OPEN, undefined);
    assert.equal(icons.getUserAvatarURL({ id: '9' }), 'real:9');
    console.log('PASS fake messages: limits, fixed times, merged loads, latest message kept, local DMs, local-only writes and cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
