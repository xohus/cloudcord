import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

const source = fs.readFileSync(new URL("../src/entry.ts", import.meta.url), "utf8");
const entry = transformSync(source, { loader: "ts", format: "cjs" }).code;

for (const failCore of [false, true, 'hang']) {
    const events = [];
    const context = vm.createContext({
        __CLOUDCORD_BRIDGELESS__: true,
        __CLOUDCORD_EARLY_INJECTION__: true,
        setTimeout: (callback, delay) => setTimeout(callback, delay === 5000 ? 20 : delay), clearTimeout,
        console: { log() {} },
        alert: () => events.push("reported-error"),
        require(name) {
            if (name === "bunny-build-info") return { version: "test" };
            if (name === "spitroast") return { instead(key, object, hook) {
                const original = object[key];
                object[key] = function (...args) { return hook.call(this, args, original); };
                return () => { object[key] = original; };
            } };
            if (name === "@metro/internals/caches") return { async initMetroCache() {
                assert.equal(vm.runInContext("__CLOUDCORD_MODULE_VIEW__[0].isInitialized", context), false);
                events.push("cache");
            } };
            if (name === "@lib/api/native/modules") return { ClientInfoManager: { getConstants: () => ({ Build: "344.1" }) } };
            if (name === ".") return { async default() {
                if (failCore === 'hang') await new Promise(() => {});
                await new Promise(resolve => setTimeout(resolve, 10));
                if (failCore) throw new Error("test core failure");
                events.push("cloudcord");
            } };
            throw new Error(`Unexpected require: ${name}`);
        },
        exports: {},
        record: event => events.push(event)
    });
    vm.runInContext(entry, context);
    vm.runInContext(`
        var registry = new Map([[0, {isInitialized: false}]]);
        __c = () => registry;
        __d = function define() {};
        __d();
        RN$AppRegistry = {runApplication() {record('app');}};
        __r = function(id) {if (id === 0) record('discord'); return id;};
        __r(0);
        RN$AppRegistry.runApplication();
    `, context);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(vm.runInContext("modules === registry", context), true, "Discord keeps its Metro Map");
    assert.deepEqual(events, failCore === 'hang' ? ["cache", "discord", "app"] : failCore
        ? ["cache", "reported-error", "discord", "app"]
        : ["cache", "cloudcord", "discord", "app"]);
}
console.log("early injection: startup ordering, Metro ownership, and error handoff passed");
