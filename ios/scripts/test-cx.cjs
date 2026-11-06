const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("esbuild");

const root = path.join(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const moduleBox = { exports: {} };
const code = transformSync(read("desktop/client/src/utils/cx.ts"), { loader: "ts", format: "cjs" }).code;
vm.runInNewContext(code, { module: moduleBox });
const { activateCx, createCxSession, parseCx, reviewCx } = moduleBox.exports;
const plugin = read("examples/cx/hello.cx").trimEnd();
const theme = read("examples/cx/midnight.cx").trimEnd();
const grants = ["commands.register", "ui.toast"];
const callbacks = new Map();
const messages = [];
let background;
const host = {
    registerCommand(name, callback) {
        if (callbacks.has(name)) throw new Error("Duplicate command");
        callbacks.set(name, callback);
        return () => callbacks.delete(name);
    },
    toast: message => messages.push(message),
    applyTheme(value) {
        background = value;
        return () => { background = undefined; };
    },
};
assert.equal(reviewCx(plugin).commands.join(), "/hello");
assert.throws(() => activateCx(plugin, host, ["commands.register"]), /approval/);
assert.equal(callbacks.size, 0);

const session = createCxSession();
session.enable(plugin, host, grants);
const command = callbacks.get("hello");
command({ token: "untrusted callback argument" });
session.enable(theme, host, []);
assert.equal(background.background, "#101018");
assert.throws(() => session.enable(theme, host, []), /active CX theme/);
session.disable("plugin:Hello");
command();
assert.deepEqual(messages, ["Hey!"]);
assert.equal(callbacks.size, 0);
session.clear();
assert.equal(background, undefined);

callbacks.set("other", () => {});
assert.throws(() => activateCx(plugin + '\n  on command "other":\n    toast "Hi"', host, grants), /Duplicate/);
assert.equal(callbacks.has("hello"), false);
for (const unsafe of ['    eval "code"', '    toast token', '    fetch "https://example.com"', '    native.read "token"'])
    assert.throws(() => parseCx(plugin + "\n" + unsafe));
assert.throws(() => parseCx(plugin.replace("ui.toast", "tokens.read")), /permission/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "https://example.com/image.png"'), /embedded/);
assert.throws(() => parseCx(theme + '\n  wallpaper: "data:image/svg+xml;base64,AAAA"'), /embedded/);
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPZ0AAAAASUVORK5CYII=";
assert.equal(parseCx(theme + '\n  wallpaper: "' + png + '"').wallpaper, png);
console.log("PASS CX permission review, denial, revocation, rollback, plugin and theme coexistence, and safe wallpaper");
