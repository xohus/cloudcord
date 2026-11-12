const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const context = { module: { exports: {} }, setTimeout, Blob, Uint8Array, Promise,
    fetch: async url => ({ ok: true, headers: { get: () => url.includes('.gif') ? 'image/gif' : 'image/png' }, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer }) };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('src/utils/serverClone.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
const { cloneServer, toBase64 } = context.module.exports;

assert.equal(toBase64(new Uint8Array([104, 105])), Buffer.from('hi').toString('base64'));
assert.equal(toBase64(new Uint8Array([1, 2, 3, 4])), Buffer.from([1, 2, 3, 4]).toString('base64'));

const SRC = '100000000000000000';
const source = {
    guild: { id: SRC, name: 'Source', icon: 'abc', banner: 'ban', verification_level: 1, system_channel_id: '300000000000000002', afk_channel_id: '300000000000000003',
        emojis: [{ id: '400000000000000001', name: 'wave', animated: false, roles: ['200000000000000002'] }],
        stickers: [{ id: '500000000000000001', name: 'cat', format_type: 1, tags: 'cat' }, { id: '500000000000000002', name: 'lottie', format_type: 3 }] },
    roles: [{ id: SRC, name: '@everyone', permissions: '1024', position: 0 },
        { id: '200000000000000001', name: 'Admin', permissions: '8', color: 1, position: 2 },
        { id: '200000000000000002', name: 'Member', permissions: '0', color: 2, position: 1 },
        { id: '200000000000000003', name: 'Bot role', managed: true, position: 3 }],
    channels: [{ id: '300000000000000002', name: 'general', type: 0, position: 0, parent_id: '300000000000000001', permission_overwrites: [{ id: '200000000000000002', type: 0, allow: '1024', deny: '0' }, { id: '200000000000000099', type: 0, allow: '0', deny: '0' }] },
        { id: '300000000000000001', name: 'Text', type: 4, position: 0 },
        { id: '300000000000000003', name: 'Voice', type: 2, position: 1, bitrate: 384000 },
        { id: '300000000000000004', name: 'news', type: 5, position: 2 }],
};
let next = 900, posts = [], patches = [], deletes = [];
const rest = {
    get: async ({ url }) => {
        if (url === `/guilds/${SRC}`) return { body: source.guild };
        if (url === `/guilds/${SRC}/roles`) return { body: source.roles };
        if (url === `/guilds/${SRC}/channels`) return { body: source.channels };
        if (url === '/guilds/NEW/channels') return { body: [{ id: 'default1' }, { id: 'default2' }] };
        throw new Error('unexpected GET ' + url);
    },
    post: async request => {
        posts.push(request);
        if (request.url === '/guilds') return { body: { id: 'NEW' } };
        if (request.url === '/guilds/NEW/channels' && request.body.type === 5) throw { status: 400, body: { message: 'needs community' } };
        if (request.url === '/guilds/NEW/roles' && posts.filter(p => p.url === '/guilds/NEW/roles').length === 1) throw { status: 429, body: { retry_after: 0.01 } };
        return { body: { id: 'n' + next++ } };
    },
    patch: async request => { patches.push(request); return { body: {} }; },
    del: async request => { deletes.push(request.url); },
};
(async () => {
    const steps = [];
    const result = await cloneServer({ rest, sourceGuildId: SRC, name: 'Copy', pace: 0, onProgress: (step, done, total) => steps.push([step, done, total]) });
    assert.equal(result.guildId, 'NEW');
    const created = posts.find(p => p.url === '/guilds');
    assert.equal(created.body.name, 'Copy');
    assert.match(created.body.icon, /^data:image\/png;base64,/);
    assert.deepEqual(deletes, ['/channels/default1', '/channels/default2'], 'default channels are cleared');
    const roles = posts.filter(p => p.url === '/guilds/NEW/roles').map(p => p.body.name);
    assert.deepEqual(roles, ['Member', 'Member', 'Admin'], 'roles lowest first, retried after a rate limit, managed roles skipped');
    assert.ok(patches.some(p => p.url === '/guilds/NEW/roles/NEW' && p.body.permissions === '1024'), '@everyone permissions copied');
    const channelPosts = posts.filter(p => p.url === '/guilds/NEW/channels');
    assert.equal(channelPosts[0].body.type, 4, 'categories first');
    const general = channelPosts.find(p => p.body.name === 'general');
    assert.ok(general.body.parent_id, 'channels go into the new category');
    assert.equal(general.body.permission_overwrites.length, 1, 'overwrites map to new roles; unknown roles are dropped');
    assert.notEqual(general.body.permission_overwrites[0].id, '200000000000000002');
    assert.equal(channelPosts.find(p => p.body.name === 'Voice').body.bitrate, 96000, 'bitrate capped for an unboosted server');
    assert.ok(channelPosts.some(p => p.body.name === 'news' && p.body.type === 0), 'announcement channel falls back to text');
    assert.ok(result.skipped.some(s => s.includes('#news')));
    const emoji = posts.find(p => p.url === '/guilds/NEW/emojis');
    assert.equal(emoji.body.name, 'wave'); assert.equal(emoji.body.roles.length, 1);
    assert.equal(posts.filter(p => p.url === '/guilds/NEW/stickers').length, 1, 'png sticker uploaded');
    assert.ok(result.skipped.includes('sticker "lottie"'), 'lottie stickers are reported as skipped');
    const settings = patches.find(p => p.url === '/guilds/NEW' && 'verification_level' in p.body);
    assert.ok(settings.body.system_channel_id && settings.body.system_channel_id !== '300000000000000002', 'system channel points at the copy');
    assert.ok(patches.some(p => p.url === '/guilds/NEW' && p.body.banner), 'banner attempted');
    assert.equal(steps[steps.length - 1][0], 'Done');

    const signal = { cancelled: true };
    await assert.rejects(cloneServer({ rest, sourceGuildId: SRC, pace: 0, signal }), /Cancelled/);
    console.log('PASS server clone: roles, order, channels, overwrites, fallbacks, emojis, stickers, settings, rate limits and cancel');
})().catch(error => { console.error(error); process.exitCode = 1; });
