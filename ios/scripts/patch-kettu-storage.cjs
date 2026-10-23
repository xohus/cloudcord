// Kettu's plugin storage wraps every object value in a Proxy, but typeof null is
// "object" too, so saving null (e.g. clearing a setting on logout) threw
// "new Proxy target must be an Object". Patch the cloned source in place.
const fs = require("fs");
const file = process.argv[2] || "src/core/vendetta/storage.ts";
let source = fs.readFileSync(file, "utf8");
const before = source;
source = source.replace(/(set\(target[^,]*, prop[^,]*, value\)\s*\{\s*)if \(typeof value === "object"\)/, '$1if (value !== null && typeof value === "object")');
source = source.replace(/(deleteProperty\(target[^,]*, prop[^)]*\)\s*\{\s*const value = )typeof target\[prop\] === "object" \? childrens\.get\(target\[prop\]\)!? : target\[prop\];/, '$1target[prop] !== null && typeof target[prop] === "object" ? childrens.get(target[prop]) ?? target[prop] : target[prop];');
source = source.replace(/(export function createProxy\(target: any = \{\}\)[^{]*\{\n)/, '$1    if (!target || typeof target !== "object") target = {};\n');
source = source.replace(/const data = await backend\.get\(\);\n(\s*)const \{ proxy, emitter \} = createProxy\(data\);/, 'let data: any = await backend.get();\n$1if (!data || typeof data !== "object") data = {};\n$1const { proxy, emitter } = createProxy(data);');
if (!source.includes('value !== null && typeof value === "object"')) { console.error("patch-kettu-storage: set() guard not applied"); process.exit(1); }
fs.writeFileSync(file, source);
console.log("patch-kettu-storage: patched " + file + (source === before ? " (no change)" : ""));
