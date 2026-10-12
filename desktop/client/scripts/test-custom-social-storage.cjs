const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {makeLocalProfiles}=require(process.argv[2] || 'C:/Users/ggxoh/OneDrive/Desktop/cloudcord-web/local-profiles.js');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cloudcord-custom-social-test-'));
const file=path.join(directory,'profiles.sqlite');
let store;
try {
    const owner='100000000000000001';
    const profile={syncRevision:1,customFriends:[{id:'one',username:'friend',displayName:'Friend',avatar:'https://example.com/a.png',banner:'https://example.com/b.png',bio:'Bio',badges:[{name:'Badge',icon:'https://example.com/badge.png'}]}],customConnections:[{id:'steam',service:'steam',username:'Steam user',accountId:'76561198000000000',details:[{label:'Games',value:'123'}]}]};
    store=makeLocalProfiles(file);
    assert.equal(store.create('test-social',owner,profile,'test-token-hash').id,'test-social');
    assert.deepEqual(store.latest(owner).profile,profile,'server storage preserves all social fields');
    const cleared={syncRevision:2,customFriends:[],customConnections:[]};
    assert.equal(store.update('test-social',owner,cleared,'wrong-token').unauthorized,true);
    assert.equal(store.update('test-social','100000000000000002',cleared,'test-token-hash').unauthorized,true);
    assert.deepEqual(store.latest(owner).profile,profile);
    assert.equal(store.update('test-social',owner,cleared,'test-token-hash').id,'test-social');
    store.close();store=makeLocalProfiles(file);
    assert.deepEqual(store.latest(owner).profile,cleared,'clears persist and do not restore old records');
    assert.ok(store.update('test-social',owner,profile,'test-token-hash').stale);
    console.log('Custom social backend storage: field round trip, owner/token checks, persistent deletion and stale revision rejection passed');
} finally {
    store?.close();
    // Only remove exact artifacts from the freshly allocated test directory.
    for(const name of ['profiles.sqlite','profiles.sqlite-shm','profiles.sqlite-wal']) {const target=path.join(directory,name);if(fs.existsSync(target))fs.unlinkSync(target);}
    fs.rmdirSync(directory);
}
