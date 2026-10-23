// Build-time fixes for the cloned Kettu source. Each guards a `new Proxy(x)` that
// threw "new Proxy target must be an Object" on mobile:
//  - vendetta storage: typeof null is "object", so saving null (logout, account switch) crashed.
//  - settings storage: an empty/wiped settings file loaded as null.
//  - patcher: patching a method that this Discord build doesn't have (spitroast proxies it).
const fs = require("fs");
const path = require("path");
const root = process.argv[2] || ".";
let failed = false;
function patch(rel, steps) {
    const file = path.join(root, rel);
    let source = fs.readFileSync(file, "utf8");
    for (const [name, pattern, replacement, required] of steps) {
        const next = source.replace(pattern, replacement);
        if (next === source) { if (required) { console.error(`patch-kettu: ${rel}: ${name} not applied`); failed = true; } else console.log(`patch-kettu: ${rel}: ${name} skipped`); }
        source = next;
    }
    fs.writeFileSync(file, source);
    console.log("patch-kettu: patched " + rel);
}
patch("src/core/vendetta/storage.ts", [
    ["set guard", /(set\(target[^,]*, prop[^,]*, value\)\s*\{\s*)if \(typeof value === "object"\)/, '$1if (value !== null && typeof value === "object")', true],
    ["delete guard", /(deleteProperty\(target[^,]*, prop[^)]*\)\s*\{\s*const value = )typeof target\[prop\] === "object" \? childrens\.get\(target\[prop\]\)!? : target\[prop\];/, '$1target[prop] !== null && typeof target[prop] === "object" ? childrens.get(target[prop]) ?? target[prop] : target[prop];', false],
    ["load guard", /const data = await backend\.get\(\);\n(\s*)const \{ proxy, emitter \} = createProxy\(data\);/, 'let data: any = await backend.get();\n$1if (!data || typeof data !== "object") data = {};\n$1const { proxy, emitter } = createProxy(data);', false],
]);
patch("src/lib/api/storage/index.ts", [
    ["callback guard", /const proxy = new Proxy\(Observable\.from\(data\),/, 'const proxy = new Proxy(Observable.from(data && typeof data === "object" ? data : {}),', true],
]);
patch("src/lib/api/patcher.ts", [
    ["missing method guard", /function create\(fn: Function\) \{\n/, `// A method this Discord build doesn't have can't be patched; skip it instead of crashing.
function patchable(args: any[]) {
    const parent = args[1];
    if (!parent || (typeof parent !== "object" && typeof parent !== "function")) return false;
    const value = parent[args[0]];
    return typeof value === "function" || (value !== null && typeof value === "object");
}

function create(rawFn: Function) {
    const fn = function (this: any, ...args: any[]) {
        if (!patchable(args)) return () => false;
        return rawFn.apply(this, args);
    };
`, true],
]);
if (failed) process.exit(1);
