const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const source = fs.readFileSync(path.join(__dirname, "build-mac.sh"), "utf8");
const match = source.match(/<<'NODE'\r?\n([\s\S]*?)\r?\nNODE/);
assert(match, "missing Mac package generator");
const written = new Map();
const contents = "/Applications/Test Folder/CloudCord Setup.app/Contents";
vm.runInNewContext(match[1].replace(/^import .*;\r?\n/gm, ""), {
    writeFileSync: (filename, data, options) => written.set(filename, { data, options }),
    dirname: path.posix.dirname,
    join: path.posix.join,
    process: { argv: ["node", "-", contents + "/Info.plist"] }
});
const plist = written.get(contents + "/Info.plist");
assert(plist.data.includes("<key>CFBundleExecutable</key><string>CloudCordSetup</string>"));
assert(source.includes('cp "dist/CloudCordSetup-darwin-$ARCH" "$APP_DIR/Contents/MacOS/CloudCordSetup"'));
assert(source.includes('codesign --verify --strict'));
assert(source.includes('open -n "$APP_DIR"'));
assert(source.includes('-fs HFS+'));
assert(source.includes('hdiutil attach -readonly'));
assert(source.includes('open -n "$DMG_COPY/CloudCord Setup.app"'));
assert(source.includes('codesign --verify --strict --verbose=2 "$DMG_COPY/CloudCord Setup.app"'));
assert(plist.data.includes('<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>'));
assert(source.includes('"$APP_DIR/Contents/Resources/cloudcord.asar"'));
assert(source.includes("pnpm buildStandalone"));
assert(source.includes("go test -tags cli ./..."));
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
for (const script of [source]) {
    const result = spawnSync(bash, ["-n"], { input: script, encoding: "utf8" });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr);
}
console.log("Mac package generator and launcher syntax passed; not a native build or launch test.");
