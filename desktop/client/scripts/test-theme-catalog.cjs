const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), vm = require("node:vm");
const assert = require("node:assert/strict"), esbuild = require("esbuild");
function compile(file, imports, globals = {}) {
    const mod = { exports: {} };
    vm.runInNewContext(esbuild.transformSync(fs.readFileSync(file, "utf8"), { loader: "ts", format: "cjs" }).code,
        { module: mod, exports: mod.exports, URL, Buffer, AbortSignal, console, ...globals, require: name => {
            if (name in imports) return imports[name];
            throw new Error("Unexpected dependency: " + name);
        } });
    return mod.exports;
}
const parser = compile("src/utils/themeCatalog.ts", {});
const item = { id: 1, name: "Example", file_name: "Example.theme.css", latest_source_url: "https://raw.githubusercontent.com/example/theme/main/Example.theme.css", description: "Test theme", thumbnail_url: "/image/123", author: { display_name: "Author" } };
assert.equal(parser.parseThemeCatalog([item, item]).length, 1);
assert.throws(() => parser.parseThemeCatalog({}), /invalid response/);
for (const bad of [
    { file_name: "../outside.theme.css" }, { file_name: "C:\\outside.theme.css" },
    { latest_source_url: "https://raw.githubusercontent.com.evil.test/theme.css" },
    { latest_source_url: "https://user:password@raw.githubusercontent.com/theme.css" },
    { latest_source_url: "http://raw.githubusercontent.com/theme.css" }
]) assert.equal(parser.parseThemeCatalog([{ ...item, ...bad }]).length, 0);
assert.equal(parser.parseThemeCatalog([{ ...item, thumbnail_url: "//evil.test/image" }])[0].thumbnail, null);

(async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cloudcord-theme-test-"));
    try {
        let catalogCalls = 0, downloads = 0, createDuringDownload = false, css = "/* @name Example */\nbody { color: white; }";
        const api = compile("src/sincordplugins/themeLibrary/catalogNative.ts", {
            "@main/utils/constants": { THEMES_DIR: directory },
            "@main/ipcMain": { ensureSafePath: (base, name) => path.join(base, name) },
            "@utils/themeCatalog": parser, fs
        }, { fetch: async (url, options) => {
            assert.equal(options.redirect, "error");
            assert.ok(options.signal);
            if (url.includes("/v3/store/themes")) { catalogCalls++; return new Response(JSON.stringify([item])); }
            downloads++;
            assert.equal(url, item.latest_source_url);
            if (createDuringDownload) fs.writeFileSync(path.join(directory, item.file_name), "concurrent user edits");
            return new Response(css);
        } });
        await Promise.all([api.loadCatalog(), api.loadCatalog()]);
        assert.equal(catalogCalls, 1, "Concurrent catalogue requests are coalesced");
        await assert.rejects(api.installCatalogEntry(999), /no longer/);
        assert.equal(downloads, 0, "Unknown IDs must not initiate arbitrary downloads");
        assert.equal((await api.installCatalogEntry(1)).installed, true);
        const installedPath = path.join(directory, item.file_name);
        assert.equal(fs.readFileSync(installedPath, "utf8"), css);
        fs.writeFileSync(installedPath, "user edits");
        assert.equal((await api.installCatalogEntry(1)).installed, false);
        assert.equal(fs.readFileSync(installedPath, "utf8"), "user edits");
        assert.equal(downloads, 1, "Existing themes are not downloaded or overwritten");
        fs.unlinkSync(installedPath);
        css = "<html>upstream error</html>";
        await assert.rejects(api.installCatalogEntry(1), /not a CSS/);
        assert.equal(fs.existsSync(installedPath), false);
        css = "x".repeat(4 * 1024 * 1024 + 1);
        await assert.rejects(api.installCatalogEntry(1), /too large/);
        assert.equal(fs.existsSync(installedPath), false);
        css = "/* complete CSS */";
        createDuringDownload = true;
        assert.equal((await api.installCatalogEntry(1)).installed, false);
        assert.equal(fs.readFileSync(installedPath, "utf8"), "concurrent user edits");
        console.log("PASS theme catalogue validation, request coalescing, ID lookup, install, existing-file preservation and failed downloads");
    } finally {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert.ok(path.basename(directory).startsWith("cloudcord-theme-test-"));
        fs.rmSync(directory, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
