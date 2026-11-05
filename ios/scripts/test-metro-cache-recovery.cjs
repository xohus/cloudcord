const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require(process.env.CLOUDCORD_ESBUILD || "esbuild");
const source = fs.readFileSync(path.join(__dirname, "../runtime/src/metro/internals/caches.ts"), "utf8");
const code = esbuild.transformSync(source, { loader: "ts", format: "cjs" }).code;

(async () => {
    for (const mode of ["bridgeless", "disk-error", "missing-client-info", "corrupt-cache"]) {
        const module = { exports: {} };
        let diskReads = 0;
        const nativeInfo = mode === "missing-client-info" ? undefined : { getConstants: () => ({ Build: "344" }) };
        vm.runInNewContext(code, {
            module,
            __CLOUDCORD_BRIDGELESS__: mode === "bridgeless",
            window: { modules: { 1: {} } },
            setTimeout() {},
            require(name) {
                if (name === "@lib/api/native/modules") return { NativeClientInfoModule: nativeInfo };
                if (name === "es-toolkit") return { debounce: fn => fn };
                if (name === "./enums") return { ModuleFlags: { EXISTS: 1 }, ModulesMapInternal: { FULL_LOOKUP: 0, NOT_FOUND: 1 } };
                if (name === "@lib/api/native/fs") return {
                    async fileExists() {
                        diskReads++;
                        if (mode === "disk-error") throw new Error("Native file module unavailable");
                        return true;
                    },
                    async readFile() { return '{"_v":103,"_buildNumber":"344","_modulesCount":1,"findIndex":null}'; },
                    async writeFile() { throw new Error("Storage unavailable"); },
                };
                throw new Error(name);
            },
        });
        const cache = module.exports;
        await cache.initMetroCache();
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
    console.log("PASS Metro starts with missing, unreadable or invalid cache, and bridgeless misses stay retryable");
})().catch(error => { console.error(error); process.exitCode = 1; });
