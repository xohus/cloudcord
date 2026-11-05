const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const esbuild = require("esbuild");
let state, cleanup;
const timers = new Set();
const React = {
    useState(initial) { state ??= initial; return [state, value => { state = typeof value === "function" ? value(state) : value; }]; },
    useCallback(fn) { return fn; },
    useEffect(fn) { cleanup?.(); cleanup = fn(); }
};
const mod = { exports: {} };
vm.runInNewContext(esbuild.transformSync(fs.readFileSync("src/components/settings/tabs/plugins/usePluginPagination.ts", "utf8"), { loader: "ts", format: "cjs" }).code, {
    module: mod, exports: mod.exports, require: () => ({ React }),
    setTimeout(fn) { timers.add(fn); return fn; }, clearTimeout(fn) { timers.delete(fn); }
});
const paginate = mod.exports.usePluginPagination;
let page = paginate(500, "all", false);
assert.equal(page.visibleCount, 36);
for (let i = 0; i < 10; i++) { page.loadMore(); page = paginate(500, "all", false); }
assert.equal(page.visibleCount, 396);
assert.equal(paginate(2, "search", false).visibleCount, 2);
assert.equal(paginate(500, "all", false).visibleCount, 36, "Clearing search must not resurrect the old page limit");
assert.equal(paginate(0, "no-matches", true).visibleCount, 0);
assert.equal(timers.size, 0);
page = paginate(75, "tags", true);
assert.equal(timers.size, 1);
page = paginate(50, "enabled", false);
assert.equal(timers.size, 0, "Changing filters cancels pending scroll work");
page.loadMore();
page = paginate(50, "enabled", true);
assert.equal(page.visibleCount, 50, "Manual loading clamps to result count");
assert.equal(timers.size, 0, "Completed pages must not keep scheduling timers");
page = paginate(100, "all", true);
assert.equal(timers.size, 1);
cleanup();
assert.equal(timers.size, 0, "Unmount cancels pending work");
console.log("PASS plugin paging: search reset, empty results, filter changes, manual load, bounds and cleanup");
