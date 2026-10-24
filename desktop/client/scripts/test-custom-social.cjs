const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const context = {module:{exports:{}}, URL};
vm.runInNewContext(esbuild.transformSync(fs.readFileSync('desktop/client/src/utils/profileAppearance.ts','utf8'), {loader:'ts',format:'cjs'}).code, context);
const api = context.module.exports;
const source = {customFriends:[{id:'friend',userId:'1540350369232850995',username:'name',displayName:'Display',avatar:'https://example.com/avatar.png',banner:'https://example.com/banner.png',bio:'Bio',badges:[{name:'Custom badge',icon:'https://example.com/badge.png'}],verified:true}],customConnections:[{id:'connection',service:'steam',accountId:'76561198000000000',username:'steam-user',displayName:'Steam User',avatar:'https://example.com/steam.png',bio:'About',url:'https://steamcommunity.com/profiles/76561198000000000',details:[{label:'Games',value:'123'}],verified:true}]};
const result = api.normalizeProfileAppearance(source);
const nativeProfile = {connectedAccounts:[{id:'real',type:'github',name:'Real account',verified:true}]};
const nativeSocial = api.nativeSocialProfile(nativeProfile, source);
assert.equal(nativeSocial.connectedAccounts.length,2);
assert.equal(nativeSocial.connectedAccounts[0].verified,true);
// The checkmark is an opt-in on the saved connection.
assert.equal(nativeSocial.connectedAccounts[1].verified,true);
assert.equal(api.nativeSocialProfile({}, {customConnections:[{...source.customConnections[0],verified:undefined}]}).connectedAccounts[0].verified,false);
assert.equal(nativeSocial.connectedAccounts[1].cloudcordPreview.id,'connection');
const otherLink = api.nativeSocialProfile({}, {customConnections:[{...source.customConnections[0],id:'manual-site',service:'other',accountId:'',url:'https://example.com/account/profile'}]}).connectedAccounts[0];
assert.equal(otherLink.type,'domain');
assert.equal(otherLink.id,'example.com','native domain links must use a hostname, not a cloudcord: synthetic ID');
assert.equal(otherLink.cloudcordPreview.url,'https://example.com/account/profile','the preview retains the complete external account link');
assert.equal(nativeProfile.connectedAccounts.length,1,'native account data stays untouched');
assert.equal(api.nativeSocialProfile({...nativeProfile,...nativeSocial},source).connectedAccounts.length,2,'repeated reads do not duplicate custom accounts');
assert.equal(Object.keys(api.nativeSocialProfile(nativeProfile,{customConnections:[]})).length,0,'clearing custom entries preserves the original profile');
assert.equal(api.customSocialValidationErrors(source).length,0);
assert.equal(api.customSocialValidationErrors({customFriends:[{...source.customFriends[0],username:'',displayName:'',userId:undefined}]}).length,0,'retired drafts cannot block saving connections');
assert.ok(api.customSocialValidationErrors({customConnections:[{...source.customConnections[0],items:[{id:'draft',title:'',image:'',url:'',subtitle:''}]}]}).some(error=>error.includes('title')));
assert.equal(result.customFriends.length,0,'local and shared friend previews are retired');
assert.equal(result.customConnections[0].details[0].value,'123');
assert.equal(result.customConnections[0].service,'steam');
assert.equal(result.customConnections[0].verified,true); // opt-in checkmark is kept
assert.equal(JSON.stringify(api.normalizeProfileAppearance(result)),JSON.stringify(result));
assert.equal(source.customFriends[0].verified,true,'normalizing does not mutate native/input data');
assert.equal(api.customPreviewURL('javascript:alert(1)'), '');
assert.equal(api.customPreviewURL('https://secret:password@example.com'), '');
assert.equal(api.customPreviewURL('data:text/html,evil'), '');
assert.equal(api.customPreviewUsername('@YouTube'),'@YouTube');
assert.equal(api.customPreviewUsername('username'),'@username');
assert.equal(api.customPreviewUsername(''),'');
assert.ok(api.customSocialValidationErrors({customConnections:[{...source.customConnections[0],bio:'x'.repeat(1001)}]}).some(error=>error.includes('1,000')));
assert.equal(api.normalizeCustomSocial({customConnections:[{...source.customConnections[0],items:[{id:'same',title:'One'},{id:'same',title:'Duplicate'}]}]}).customConnections[0].items.length,1);
assert.equal(api.customDiscordMediaURL('banners','1540350369232850995','a_'+'f'.repeat(32)),'https://cdn.discordapp.com/banners/1540350369232850995/a_'+'f'.repeat(32)+'.gif?size=512');
assert.equal(api.customDiscordMediaURL('avatars','1540350369232850995','../../secret'),'');
assert.equal(api.normalizeCustomSocial({customFriends:[null,{},source.customFriends[0],source.customFriends[0]]}).customFriends.length,0);
assert.equal(api.nativeSocialFriends('owner',source).length,0);
assert.equal(api.normalizeCustomSocial({customConnections:Array.from({length:100},(_,i)=>({...source.customConnections[0],id:String(i)}))}).customConnections.length,30);
assert.equal(api.normalizeCustomSocial({customFriends:[]}).customFriends.length,0,'empty list clears shared fields');
assert.equal(api.normalizeCustomSocial({}).customFriends,undefined,'legacy data does not invent new fields');
const before = source.customConnections[0];
const latest = {...before,bio:'User edited while fetching',items:[{id:'chosen',title:'Chosen game'}]};
const fetched = {...before,bio:'Fetched bio',displayName:'Fetched name',items:[],mode:'fetched',fetchedAt:'2026-10-11T00:00:00Z'};
const merged = api.mergeCustomSocialLookup(before,latest,fetched);
assert.equal(merged.bio,latest.bio);
assert.equal(merged.displayName,'Fetched name');
assert.equal(merged.items[0].id,'chosen');
assert.equal(merged.mode,'manual');
assert.equal(api.mergeCustomSocialLookup(before,undefined,fetched),null,'removed entries cannot be resurrected');
assert.equal(api.mergeCustomSocialLookup(before,{...before,service:'youtube'},fetched),null,'changed services discard stale results');
assert.equal(api.mergeCustomSocialLookup(before,before,{service:'youtube'}).service,'youtube','manual service selection works');
assert.equal(api.mergeCustomSocialLookup(source.customFriends[0],source.customFriends[0],{userId:'1457121276748365989'}).userId,'1457121276748365989','manual user IDs remain editable');
for (const malformed of [
    {customConnections:[{id:'bad',service:'steam',items:{}}]},
    {customConnections:[{id:'bad',service:'steam',details:[null]}]},
    {customConnections:[{id:'bad',username:'Missing service'}]}
]) assert.ok(api.customSocialValidationErrors(malformed).length,'malformed drafts produce warnings rather than editor crashes');
console.log('Custom social schema: round trips, safe links, limits, deduplication, legacy compatibility and stale lookup protection passed');
