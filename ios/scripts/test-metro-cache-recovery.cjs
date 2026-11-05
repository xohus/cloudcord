const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require(process.env.CLOUDCORD_ESBUILD || "esbuild");
const source = fs.readFileSync(path.join(__dirname, "../runtime/src/metro/internals/caches.ts"), "utf8");
const code = esbuild.transformSync(source, { loader: "ts", format: "cjs" }).code;
const timeoutModule = { exports: {} };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync(path.join(__dirname, '../runtime/src/lib/utils/asyncTimeout.ts'), 'utf8'), {loader:'ts',format:'cjs'}).code, {
    module: timeoutModule, setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 10)), clearTimeout,
});

(async () => {
    for (const mode of ["bridgeless", "modern-bridged", "legacy-bridged", "disk-error", "missing-client-info", "corrupt-cache", "stalled-exists", "stalled-read"]) {
        const module = { exports: {} };
        let diskReads = 0;
        const version = mode === "legacy-bridged" ? "331.0" : "352.17 - Stable";
        const nativeInfo = mode === "missing-client-info" ? undefined : { getConstants: () => ({ Build: "344", Version: version }) };
        const scheduled = [];
        const loaded = [];
        vm.runInNewContext(code, {
            module,
            __CLOUDCORD_BRIDGELESS__: mode === "bridgeless",
            window: { modules: { 1: {} } },
            setTimeout(fn) { scheduled.push(fn); },
            require(name) {
                if (name === "@lib/utils/asyncTimeout") return timeoutModule.exports;
                if (name === "@lib/api/native/modules") return { NativeClientInfoModule: nativeInfo };
                if (name === "es-toolkit") return { debounce: fn => fn };
                if (name === "./enums") return { ModuleFlags: { EXISTS: 1 }, ModulesMapInternal: { FULL_LOOKUP: 0, NOT_FOUND: 1 } };
                if (name === "./modules") return { requireModule(id) { loaded.push(id); } };
                if (name === "@lib/api/native/fs") return {
                    async fileExists() {
                        diskReads++;
                        if (mode === "stalled-exists") return new Promise(() => {});
                        if (mode === "disk-error") throw new Error("Native file module unavailable");
                        return true;
                    },
                    async readFile() { if (mode === "stalled-read") return new Promise(() => {}); return '{"_v":103,"_buildNumber":"344","_modulesCount":1,"findIndex":null}'; },
                    async writeFile() { throw new Error("Storage unavailable"); },
                };
                throw new Error(name);
            },
        });
        const cache = module.exports;
        await cache.initMetroCache();
        for (const task of scheduled) task();
        assert.deepEqual(loaded, mode === "legacy-bridged" ? ["1"] : [], mode);
        cache.getCacherForUniq("late module", true).finish(true);
        const saved = cache.getMetroCache();
        assert.equal(saved._modulesCount, 1);
        assert.equal(typeof saved.flagsIndex, "object");
        assert.equal(typeof saved.polyfillIndex, "object");
        if (mode === "bridgeless") {
            assert.equal(diskReads, 0);
            assert.deepEqual(Object.keys(saved.findIndex["late module"]), []);
        }
        if (mode === "missing-client-info") assert.equal(diskReads, 0);
    }
    console.log("PASS Metro cache recovery, modern startup without a module sweep, and retryable bridgeless misses");
})().catch(error => { console.error(error); process.exitCode = 1; });
