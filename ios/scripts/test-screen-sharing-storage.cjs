// Source regression guard only; a signed-device broadcast test is still required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../native-ios/Sources/Sideloading.x"), "utf8");
const legacy = source.split("%group Sideloading344")[0];
const hook = legacy.slice(legacy.indexOf("- (NSURL *)containerURLForSecurityApplicationGroupIdentifier:"));
const nativeReturn = hook.indexOf("if (nativeContainer)\n        return nativeContainer;");
assert(nativeReturn >= 0, "must preserve a provisioned shared app-group container");
assert(nativeReturn < hook.indexOf("NSDocumentDirectory"), "native shared container must take precedence over private fallback");
const packager = fs.readFileSync(path.join(__dirname, "package-cloudcord-ipa.py"), "utf8");
assert(packager.includes('broadcast = discord_app / "PlugIns" / "BroadcastUpload.appex"'));
assert(packager.includes("extension_entitlements[broadcast] = add_discord_app_group"));
console.log("Screen-sharing shared-container source guards passed (not a device test).");
