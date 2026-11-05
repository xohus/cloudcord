const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const esbuild = require(process.env.CLOUDCORD_ESBUILD || "esbuild");
const source = fs.readFileSync(path.join(__dirname, "../runtime/src/entry.ts"), "utf8");
const code = esbuild.transformSync(source, { loader: "ts", format: "cjs" }).code;

(async () => {
    for (const mode of ["early", "late", "native-marker", "require-installed"]) {
        const events = [];
        const realm = vm.createContext({
            "RN$Bridgeless": mode !== "native-marker",
            __CLOUDCORD_BRIDGELESS__: mode === "native-marker",
            exports: {},
            setTimeout,
            clearTimeout,
            record: event => events.push(event),
            require(name) {
                if (name === "bunny-build-info") return { version: "test" };
                if (name === "spitroast") return { instead() { throw new Error("Bridgeless launch must not patch AppRegistry"); } };
                if (name === "@metro/internals/caches") return {
                    initMetroCache() {
                        events.push("cache");
                        return new Promise(() => {});
                    },
                };
                throw new Error("Unexpected module " + name);
            },
        });
        vm.runInContext(`
            const originalFreeze = Object.freeze;
            const originalDefine = () => {};
            __d = originalDefine;
            const registry = new Map([[0, { isInitialized: false }]]);
            __c = () => registry;
            RN$AppRegistry = { runApplication() { record("app"); } };
            function requireDiscord(id) { registry.get(id).isInitialized = true; record("discord"); return id; }
            if ("${mode}" === "require-installed") __r = requireDiscord;
            if ("${mode}" === "late") {
                if ("${mode}" !== "require-installed") __r = requireDiscord;
                __r(0);
                RN$AppRegistry.runApplication();
            }
        `, realm);
        const injected = `(function () { ${code} })()`;
        vm.runInContext(injected, realm);
        vm.runInContext(injected, realm);
        if (mode !== "late") {
            assert.equal(vm.runInContext(`
                __r = requireDiscord;
                const result = __r(0);
                RN$AppRegistry.runApplication();
                result;
            `, realm), 0);
        }
        vm.runInContext(injected, realm);
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.deepEqual(events, ["discord", "app", "cache"], mode);
        assert.equal(vm.runInContext("Object.freeze === originalFreeze", realm), true);
        assert.equal(vm.runInContext("__d === originalDefine && !Object.getOwnPropertyDescriptor(globalThis, '__d').get", realm), true);
        assert.equal(vm.runInContext("__c() === registry && (!window.modules || window.modules === registry)", realm), true);
        assert.equal(vm.runInContext("__CLOUDCORD_MODULE_VIEW__[0] === registry.get(0)", realm), true);
        assert.equal(vm.runInContext("__CLOUDCORD_BRIDGELESS__", realm), true);
    }
    console.log("PASS bridgeless Discord starts before CloudCord even when cache initialization stalls");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
