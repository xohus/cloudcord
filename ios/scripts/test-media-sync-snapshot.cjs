const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const esbuild = require('esbuild');
const workflow = fs.readFileSync('.github/workflows/cloudcord.yml', 'utf8');
const source = workflow.split("cat > src/core/ui/settings/pages/FakeProfile/index.tsx <<'TSX'")[1].split('\n          TSX')[0].replace(/^          /gm, '');
const block = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const compile = code => esbuild.transformSync(code, { loader: 'ts' }).code;
const original = { username: 'first', displayName: 'First', bio: 'first bio', nitroEnabled: false,
    nitroMonths: 0, boostMonths: 0, giftLevel: -1, hiddenBadgeIds: [], badgeOrder: [], selectedBadges: {},
    avatarMedia: { uri: 'file://first-avatar' }, bannerMedia: { uri: 'file://first-banner' }, syncRevision: 1 };
let finish;
const snapshot = vm.createContext({ preview: original, JSON, NITRO_DURATIONS: [0, 1], BOOST_DURATIONS: [0, 1], BADGES: [],
    normalizeProfileAppearance: data => ({ usernameStyle: data.username }), REPLACE_BADGES_SYNC_ID: 'replace',
    shareableMedia: async (key, data) => { if (key === 'avatarMedia') await new Promise(resolve => { finish = resolve; }); return data[key]?.uri; } });
vm.runInContext(compile(block('async function ownSharedProfile(', 'async function publishSharedProfile(')), snapshot);
(async () => {
    const pending = snapshot.ownSharedProfile();
    snapshot.preview = { ...original, username: 'second', bio: 'second bio', bannerMedia: { uri: 'file://second-banner' } };
    original.selectedBadges.staff = true; // Snapshot must deep-copy nested settings too.
    finish(); const result = await pending;
    assert.equal(result.username, 'first'); assert.equal(result.bio, 'first bio');
    assert.equal(result.banner, 'file://first-banner');
    assert.equal(result.usernameStyle, 'first');
    let release, serializations = 0, writes = [];
    const publisher = vm.createContext({ JSON, Date, rootSettings: {}, preview: { enabled: true, bio: 'old' }, currentUserId: 'a',
        customSocialValidationErrors: () => [], SHARED_PROFILE_API: 'https://example.test', diagnostics: {},
        ownSharedProfile: async () => { const value = { bio: publisher.preview.bio }; if (++serializations === 1) await new Promise(resolve => { release = resolve; }); return value; },
        fetchProfileResponse: async (_url, options) => {
            if (!options?.method) return { ok: false, status: 404 };
            writes.push(JSON.parse(options.body).profile); return { ok: true, json: async () => ({ id: 'a', editToken: 'test' }) };
        } });
    vm.runInContext(compile(block('async function publishSharedProfile(', 'function queueSharedPublish(')), publisher);
    const upload = publisher.publishSharedProfile();
    publisher.preview = { enabled: true, bio: 'new' };
    release(); await upload;
    assert.equal(writes.length, 1, 'obsolete snapshots are rebuilt instead of briefly publishing the wrong edit');
    assert.equal(writes[0].bio, 'new');
    const timers = new Map(); let timerId = 0;
    const media = vm.createContext({ preview: { avatarMedia: { uri: 'file://stuck' } },
        fetch: async () => ({ blob: () => new Promise(() => {}) }),
        setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id) });
    vm.runInContext(compile(fs.readFileSync('ios/runtime/src/lib/utils/asyncTimeout.ts', 'utf8').replace('export ', '')
        + block('async function shareableMedia(', 'async function ownSharedProfile(')), media);
    const localFile = media.shareableMedia('avatarMedia');
    for (const fn of [...timers.values()]) fn();
    assert.equal(await localFile, null, 'stalled native file reads cannot block profile saves indefinitely');
    assert.equal(timers.size, 0);
    console.log('PASS consistent media/profile snapshots, stale serialization rebuilding and bounded native file reads');
})().catch(error => { console.error(error); process.exitCode = 1; });
