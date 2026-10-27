// Mobile versions of desktop plugins: each loads, transforms or filters what it should,
// cleans up on stop, and credits its original authors.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');

const root = 'ios/runtime/src/core/plugins';
const patches = [];
const patcher = {
    before: (name, object, fn) => { const original = object[name]; object[name] = (...args) => original(...fn(args)); return () => { object[name] = original; }; },
    instead: (name, object, fn) => { const original = object[name]; object[name] = (...args) => fn(args, original); return () => { object[name] = original; }; },
};
let intercepts = [];
const sent = [];
const messageUtil = { sendMessage: (...args) => sent.push(args), sendBotMessage: (channel, text) => sent.push(['bot', text]) };
const commands = [];
const stores = {
    RelationshipStore: { isBlocked: id => id === 'blocked', getPendingCount: () => 5 },
    ChannelStore: { getChannel: () => ({ guild_id: 'g' }) },
    GuildMemberStore: { getMemberIds: () => ['me', 'other'] },
    UserStore: { getCurrentUser: () => ({ id: 'me' }) },
};
const storageData = {};
const toasts = [];

function load(rel) {
    const module = { exports: {} };
    const file = fs.existsSync(`${root}/${rel}.ts`) ? `${root}/${rel}.ts` : `${root}/${rel}.tsx`;
    const code = esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: file.endsWith('x') ? 'tsx' : 'ts', format: 'cjs', jsx: 'transform' }).code;
    vm.runInNewContext(code, {
        module, exports: module.exports, URL, console, setTimeout, clearTimeout,
        require(name) {
            if (name === '..') return { defineCorePlugin: instance => instance };
            if (name === '../shared/sendMessage') return load('shared/sendMessage');
            if (name === '../shared/messageFilter') return load('shared/messageFilter');
            if (name === '../shared/settings') return load('shared/settings');
            if (name === '@lib/api/patcher') return patcher;
            if (name === '@lib/api/flux') return { intercept: cb => { intercepts.push(cb); return () => { intercepts = intercepts.filter(i => i !== cb); }; } };
            if (name === '@metro/common') return { messageUtil };
            if (name === '@metro') return { findByStoreName: n => stores[n], findByProps: () => ({ startTyping() { return 'typed'; }, stopTyping() {}, createFriendInvite: async () => ({ code: 'abc', expires_at: '2030-01-01', max_uses: 5 }), removeRelationship() {} }) };
            if (name === '@lib/api/commands') return { registerCommand: c => { commands.push(c); return () => commands.splice(commands.indexOf(c), 1); } };
            if (name === '@lib/api/commands/types') return { ApplicationCommandOptionType: { STRING: 3, INTEGER: 4 } };
            if (name === '@lib/ui/toasts') return { showToast: text => toasts.push(text) };
            if (name === '@lib/api/storage') return { createStorage: path => (storageData[path] ??= {}), awaitStorage: async () => {} };
            return {};
        }
    });
    return module.exports;
}
const plugin = name => load(`${name}/index`).default;
const send = content => { messageUtil.sendMessage('c', { content }, undefined, { messageReference: { message_id: '1' } }); return sent.at(-1); };
const dispatch = payload => intercepts.reduce((result, cb) => result === false ? false : (cb(payload) ?? result), undefined);

(async () => {
    // Every new plugin lists original authors and none of them is Endcord.
    const ids = fs.readFileSync(`${root}/index.ts`, 'utf8').match(/"cloudcord\.(\w+)"/g).map(id => id.slice(11, -1));
    assert.equal(ids.length, 23);
    for (const id of ids) {
        const { manifest } = plugin(id);
        assert(manifest.display.authors.length > 0, `${id} credits its authors`);
        assert(!JSON.stringify(manifest).toLowerCase().includes('endcord'), `${id} has no Endcord credit`);
    }

    const clear = plugin('clearurls'); clear.start();
    assert.equal(send('see https://example.com/a?utm_source=x&id=7&fbclid=1')[1].content, 'see https://example.com/a?id=7');
    clear.stop();
    assert.equal(send('https://example.com/a?utm_source=x')[1].content, 'https://example.com/a?utm_source=x', 'stop restores sending');

    const noReply = plugin('noreplymention'); noReply.start();
    assert.equal(send('hi')[3].allowedMentions.replied_user, false);
    noReply.stop();

    const unindent = plugin('unindent'); unindent.start();
    assert.equal(send('```js\n    a();\n      b();\n```')[1].content, '```js\na();\n  b();\n```');
    unindent.stop();

    const blocked = plugin('noblockedmessages'); blocked.start();
    assert.equal(dispatch({ type: 'MESSAGE_CREATE', message: { author: { id: 'blocked' } } }), false);
    assert.deepEqual(dispatch({ type: 'LOAD_MESSAGES_SUCCESS', messages: [{ author: { id: 'blocked' } }, { author: { id: 'ok' } }] }).messages, [{ author: { id: 'ok' } }]);
    blocked.stop();
    assert.equal(intercepts.length, 0, 'stop removes the filter');

    const keywords = plugin('blockkeywords');
    storageData['plugins/storage/cloudcord.blockkeywords.json'].keywords = 'spoiler, Secret';
    keywords.start(); await new Promise(r => setTimeout(r, 0));
    assert.equal(dispatch({ type: 'MESSAGE_CREATE', message: { content: 'big SPOILER here' } }), false);
    assert.equal(dispatch({ type: 'MESSAGE_CREATE', message: { content: 'fine' } }), undefined);
    keywords.stop();

    const replace = plugin('textreplace');
    storageData['plugins/storage/cloudcord.textreplace.json'].rules = [{ find: 'brb', replace: 'be right back' }, { find: 'a.b', replace: 'X' }];
    replace.start(); await new Promise(r => setTimeout(r, 0));
    assert.equal(send('brb, a.b acb')[1].content, 'be right back, X acb', 'finds plain text, not regex');
    replace.stop();

    const someone = plugin('atsomeone'); someone.start();
    assert.equal(commands[0].execute([{ name: 'message', value: 'hi' }], { channel: { id: 'c' } }).content, '<@other> hi');
    someone.stop(); assert.equal(commands.length, 0);

    const more = plugin('morecommands'); more.start();
    const run = (name, args = []) => commands.find(c => c.name === name).execute(args, { channel: { id: 'c' } });
    assert(['Heads', 'Tails'].includes(run('flipcoin').content));
    assert.equal(run('transform', [{ name: 'text', value: 'abc' }, { name: 'style', value: 'reverse' }]).content, 'cba');
    run('wordcount', [{ name: 'text', value: 'one two three' }]);
    assert.equal(sent.at(-1)[1], '3 words, 13 characters');
    more.stop(); assert.equal(commands.length, 0);

    const pending = plugin('nopendingcount'); pending.start();
    assert.equal(stores.RelationshipStore.getPendingCount(), 0);
    pending.stop();
    assert.equal(stores.RelationshipStore.getPendingCount(), 5);

    const ing = load('ingtoninator/index');
    assert.equal(ing.ingtonify('hello world', () => 0.99), 'hello worldington');
    assert.equal(ing.ingtonify('hit https://x.com/b', () => 0.99), 'hitington https://x.com/b', 'never edits links');
    assert.equal(load('writeuppercase/index').capitalise('hi there. ok cool. yes', 'ok'), 'Hi there. ok cool. Yes');
    assert.equal(JSON.stringify(load('splitlargemessages/index').splitMessage('aaa bbb ccc', 7)), JSON.stringify(['aaa bbb', 'ccc']));
    const pw = load('polishwording/index');
    assert.equal(pw.polish('i dont know `dont` Its fine', { fixApostrophes: true, fixCapitalization: true, fixPunctuation: true }), 'I don\x27t know `dont` Its fine.');
    const reverse = plugin('talkinreverse'); reverse.start(); assert.equal(send('abc')[1].content, 'cba'); reverse.stop();
    const silent = plugin('silentmessagetoggle'); silent.start(); assert.equal(send('hi')[1].content, '@silent hi'); silent.stop();
    const sig = plugin('signature'); sig.start(); await new Promise(r => setTimeout(r, 0)); assert.equal(send('hi')[1].content, 'hi\n> a chronic discord user'); sig.stop();
    const google = plugin('googlethat'); google.start(); assert.equal(commands[0].execute([{ name: 'input', value: 'a b' }]).content, 'https://www.google.com/search?q=a%20b'); google.stop();

    const ts = load('sendtimestamps/index');
    const noon = new Date('2030-06-01T08:00:00').getTime();
    assert.equal(ts.parseTime('`9:30 AM`', noon), `<t:${new Date('2030-06-01T09:30:00').getTime() / 1000}:t>`);
    assert.equal(ts.parseTime('`7:00`', noon), `<t:${new Date('2030-06-02T07:00:00').getTime() / 1000}:t>`, 'a past time means tomorrow');
    const invites = plugin('friendinvites'); invites.start();
    commands.find(c => c.name === 'create friend invite').execute([], { channel: { id: 'c' } }); await new Promise(r => setTimeout(r, 0));
    assert.match(sent.at(-1)[1], /^discord\.gg\/abc .*Max uses: `5`$/);
    invites.stop(); assert.equal(commands.length, 0);
    const custom = plugin('customcommands');
    storageData['plugins/storage/cloudcord.customcommands.json'].commands = [{ name: 'Hello There', response: 'hi all' }, { name: '', response: 'skip' }];
    custom.start(); await new Promise(r => setTimeout(r, 0));
    assert.equal(commands.length, 1); assert.equal(commands[0].name, 'hello-there'); assert.equal(commands[0].execute([], {}).content, 'hi all');
    custom.stop(); assert.equal(commands.length, 0);
    const notifier = plugin('relationshipnotifier'); notifier.start();
    stores.RelationshipStore.getRelationshipType = () => 1; stores.UserStore.getUser = () => ({ username: 'pal' });
    dispatch({ type: 'RELATIONSHIP_REMOVE', relationship: { id: 'u1', type: 1 } }); await new Promise(r => setTimeout(r, 0));
    assert.equal(toasts.at(-1), 'pal removed you as a friend');
    notifier.stop();
    const sched = plugin('scheduledmessages'); sched.start(); assert.equal(commands[0].name, 'schedule'); sched.stop(); assert.equal(commands.length, 0);

    console.log('PASS 23 ported mobile plugins: credits, transforms, filters, commands and clean stop');
})().catch(error => { console.error(error); process.exit(1); });
