const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const esbuild = require(process.env.CLOUDCORD_ESBUILD || "esbuild");
const moduleObject = { exports: {} }, timers = [];
let saved, calls = 0;
const context = { module: moduleObject, exports: moduleObject.exports, Date, Promise,
    setTimeout: fn => { timers.push(fn); return fn; }, clearTimeout() {},
    setInterval: fn => { timers.push(fn); return fn; }, clearInterval() {},
    fetch: async () => { calls++; return { ok: true, text: async () => "CloudCord" + " ".repeat(11000) }; }
};
vm.runInNewContext(esbuild.transformSync(fs.readFileSync("ios/runtime/src/lib/api/native/runtimeUpdates.ts", "utf8"), { loader: "ts", format: "cjs" }).code, context);
(async () => {
    const api = moduleObject.exports;
    const updater = api.createRainUpdater({ writeFile: async (dir, path, code) => {
        assert.equal(dir, "documents"); assert.equal(path, "rain/bundle.js"); saved = code; return "/documents/rain/bundle.js";
    }, readFile: async () => saved });
    await Promise.all([updater.download(), updater.download()]);
    assert.equal(calls, 1);
    let checks = 0;
    const prefs = {};
    const stop = api.startAutoUpdates(prefs, { checkForUpdates: async () => { if (++checks === 1) throw Error("offline"); } });
    await new Promise(setImmediate);
    assert.match(prefs.cloudcordUpdateStatus, /offline/);
    timers.at(-1)();
    await new Promise(setImmediate);
    assert.equal(checks, 2);
    assert.match(prefs.cloudcordUpdateStatus, /Latest runtime saved/);
    prefs.cloudcordAutoUpdate = false;
    timers.at(-1)();
    await new Promise(setImmediate);
    assert.equal(checks, 2);
    stop();
    console.log("auto-update checks passed: deduplicated download, correct Rain cache, readback, retries, opt-out");
})().catch(error => { console.error(error); process.exitCode = 1; });
