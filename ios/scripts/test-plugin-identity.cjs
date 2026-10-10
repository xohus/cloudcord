const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const nativeUser = Object.freeze({ id: '123', username: 'real', flags: { has: () => true } });
const nativeStore = Object.freeze({ getUser: () => nativeUser, getCurrentUser: () => nativeUser, getUsers: () => ({ 123: nativeUser }), addUser: () => {} });
const context = { module: { exports: {} } };
let username = 'custom';
context.__CLOUDCORD_PRESENTATION_USER__ = user => user && username ? { ...user, username } : user;
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('ios/runtime/src/lib/api/profileIdentity.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, context);
const api = context.module.exports;
const metro = { findByProps: () => nativeStore, findByStoreName: () => nativeStore, findAll: () => [nativeStore], common: { UserStore: nativeStore } };
const pluginMetro = api.pluginIdentityMetro(metro);
assert.equal(pluginMetro.findByProps('getUser').getUser('123').username, 'custom');
assert.equal(pluginMetro.findByStoreName('UserStore').getUser('123').username, 'custom');
assert.equal(pluginMetro.common.UserStore.getUsers()['123'].username, 'custom');
assert.equal(pluginMetro.findAll()[0].getCurrentUser().username, 'custom');
assert.equal(metro.findByProps().getUser().username, 'real');
assert.equal(nativeUser.flags.has(), true);
class PrivateStore {
    #user = nativeUser;
    getUser() { return this.#user; }
    getCurrentUser() { return this.#user; }
    getNativeId() { return this.#user.id; }
}
assert.equal(api.pluginIdentityModule(new PrivateStore()).getNativeId(), '123');
assert.equal(pluginMetro.findByProps(), pluginMetro.findByStoreName());
username = 'new_custom';
assert.equal(pluginMetro.common.UserStore.getUser().username, 'new_custom');
username = '';
assert.equal(pluginMetro.common.UserStore.getUser(), nativeUser);
username = 'custom';
const message = Object.freeze({ id: 'message', author: nativeUser, content: '<@123> real', mentions: [nativeUser] });
const row = Object.freeze({ rowType: 1, message });
const projected = api.presentationIdentity(row);
const previewData = Object.freeze({ latestMessage: message });
assert.equal(api.presentationIdentity(previewData).latestMessage.author.username, 'custom');
assert.equal(previewData.latestMessage.author.username, 'real');
assert.equal(projected.message.author.username, 'custom');
assert.equal(projected.message.mentions[0].username, 'custom');
assert.equal(projected.message.content, message.content);
assert.equal(message.author.username, 'real');
let registered;
const nativePatcher = { after(method, target, callback) { registered = callback; return () => true; } };
const compatiblePatcher = api.pluginIdentityPatcher(nativePatcher);
compatiblePatcher.after('generate', {}, function(args, result) {
    // ShowTag reads this directly rather than asking UserStore.
    result.message.username = `${result.message.username} (@${args[0].message.author.username})`;
});
const output = { message: { username: 'Display Name' } };
registered([row], output);
assert.equal(output.message.username, 'Display Name (@custom)');
for (const kind of ['before', 'after', 'instead']) {
    let installed;
    const patcher = api.pluginIdentityPatcher({ [kind](method, target, callback) { installed = callback; } });
    const outgoing = { author: nativeUser, content: 'hello' };
    const args = ['channel', outgoing, undefined, {}, 'extra-native-argument'];
    patcher[kind]('sendMessage', {}, received => {
        assert.equal(received, args);
        assert.equal(received[1], outgoing);
        assert.equal(received[1].author, nativeUser);
        received[1].content = 'changed by send plugin';
        received.push('preserved mutation');
    });
    installed(args);
    assert.equal(outgoing.content, 'changed by send plugin');
    assert.equal(args[5], 'preserved mutation');
}
const retiredSource = fs.readFileSync('ios/runtime/src/core/plugins/messagefix/index.ts', 'utf8')
    .replace(/^import .*;\r?\n/gm, '');
const retiredContext = { module: { exports: {} }, defineCorePlugin: plugin => plugin, logger: { log() {} } };
vm.runInNewContext(esbuild.transformSync(retiredSource, { loader: 'ts', format: 'cjs' }).code, retiredContext);
retiredContext.module.exports.default.start();
retiredContext.module.exports.default.stop();
assert.ok(fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8').includes('cp "../ios/runtime/src/core/plugins/messagefix/index.ts" "src/core/plugins/messagefix/index.ts"'));
username = 'changed';
assert.equal(api.presentationName('real', nativeUser), 'changed');
assert.equal(api.presentationName('@real', nativeUser), '@changed');
assert.equal(api.presentationName('real: message content', nativeUser), 'real: message content');
assert.equal(api.presentationName('other', nativeUser), 'other');
assert.equal(api.presentationName('real', null), 'real');
const reply = api.presentationIdentity({ referencedMessage: { message: { author: nativeUser } } });
assert.equal(reply.referencedMessage.message.author.username, 'changed');
username = '';
assert.equal(api.presentationIdentity(row), row);
const appearance = require('./load-profile-appearance.cjs');
const tag = { tag: 'CC', guildId: '1540350369232850995', badge: 'a'.repeat(32) };
assert.equal(appearance.serverTagIconURL(tag), `https://cdn.discordapp.com/guild-tag-badges/${tag.guildId}/${tag.badge}.png?size=64`);
assert.equal(appearance.parseServerTagIcon(appearance.serverTagIconURL(tag)).badge, tag.badge);
assert.equal(appearance.parseServerTagIcon('https://evil.test/guild-tag-badges/1540350369232850995/' + tag.badge + '.png'), null);
assert.equal(appearance.availableServerTags({ one: { primaryGuild: { tag: 'CC', identityGuildId: tag.guildId, badge: tag.badge } }, two: { primary_guild: { tag: 'CC', identity_guild_id: tag.guildId, badge: tag.badge } } }).length, 1);
console.log('PASS: plugin reads use current custom usernames while native user cache stays untouched; Discord tag icons validate and deduplicate.');
