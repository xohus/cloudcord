const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require(process.env.CLOUDCORD_ESBUILD || 'esbuild');
const root = path.join(__dirname, '../runtime');
const code = esbuild.transformSync(fs.readFileSync(path.join(root,'src/entry.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
(async () => {
    for (const early of [true, false]) for (const map of [true, false]) {
        let started = 0;
        const errors = [];
        const realm = vm.createContext({exports:{}, setTimeout, clearTimeout,
            console:{log: e => errors.push(String(e)),error: e => errors.push(String(e))},
            alert: e => errors.push(String(e)),
            require(name) {
                if (name === 'bunny-build-info') return {version:'test'};
                if (name === 'spitroast') return {instead(){throw new Error('unexpected native call');}};
                if (name === '@metro/internals/caches') return {async initMetroCache(){
                    assert.equal(vm.runInContext('__CLOUDCORD_MODULE_VIEW__[7].publicModule.exports.hello',realm),'world');
                }};
                if (name === '.') return {default(){started++;}};
                throw new Error(name);
            },
        });
        vm.runInContext(`var record={isInitialized:true,publicModule:{exports:{hello:'world'}}};
            var registry=${map ? 'new Map([[7,record]])' : '{7:record}'};
            modules=registry; __c=()=>{ throw Error("must not clear Metro"); };
            ${early ? '' : '__r=()=>{};'}
        `,realm);
        const rain = { loaderName: "RainTweak" };
        const independentLoader = { loaderName: "CloudCord", cloudcordAutoUpdateVersion: 3 };
        realm.__RAIN_LOADER__ = rain;
        // The iOS bootstrap can alias Rain's exact object under CloudCord.
        if (map) realm.__CLOUDCORD_LOADER__ = early ? rain : independentLoader;
        vm.runInContext(code,realm);
        assert.equal(Boolean(realm.__CLOUDCORD_ORIGINAL_RAIN__), !map || early);
        if (map) assert.equal(realm.__CLOUDCORD_LOADER__, early ? rain : independentLoader);
        if (early) vm.runInContext('__r=()=>{}; __r(0);',realm);
        await new Promise(resolve=>setTimeout(resolve,5));
        assert.equal(started,1,`early=${early} map=${map} ${errors}`);
        assert.equal(errors.length,0);
        assert.equal(vm.runInContext('modules === registry',realm),true);
        assert.equal(vm.runInContext('__CLOUDCORD_MODULE_VIEW__ !== registry',realm),true);
    }
    const module={exports:{}};
    const nativeCode=esbuild.transformSync(fs.readFileSync(path.join(root,'src/lib/api/native/modules/index.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
    vm.runInNewContext(nativeCode,{module,window:{nativeModuleProxy:new Proxy({}, {get(_,name){
        if (name === 'InfoDictionaryManager') return {getConstants:()=>({Build:'344'})};
        throw new Error('Native module missing');
    }})}});
    assert.equal(module.exports.NativeClientInfoModule.getConstants().Build,'344');
    console.log('PASS early/late Metro registries, Map preservation, and iOS native alias fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
