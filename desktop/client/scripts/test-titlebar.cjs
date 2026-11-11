const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Vencord.ts', 'utf8');
const listener = source.slice(source.lastIndexOf('document.addEventListener("DOMContentLoaded"'));
for (const desktop of [true, false]) for (const windows of [true, false]) {
    for (const native of [true, false]) for (const frameless of [true, false]) for (const main of [true, false]) {
        const styles = [];
        vm.runInNewContext(listener, {
            document: { addEventListener(name, cb) { assert.equal(name, 'DOMContentLoaded'); cb(); } },
            startAllPlugins() {}, StartAt: { DOMContentLoaded: 1 },
            IS_DISCORD_DESKTOP: desktop, IS_WINDOWS: windows,
            Settings: { winNativeTitleBar: native, frameless, mainWindowFrameless: main },
            coreStyleRootNode: {}, createAndAppendStyle() { const style = {}; styles.push(style); return style; }
        });
        assert.equal(styles.length, desktop && windows ? 1 : 0);
        if (!desktop || !windows) continue;
        const css = styles[0].textContent;
        if (native && !frameless && !main) assert.match(css, /display: none/);
        else {
            assert.match(css, /\[data-window-chrome="true"\]\s*\{\s*-webkit-app-region: drag/);
            assert.match(css, /:is\(button,[\s\S]*?-webkit-app-region: no-drag/);
        }
    }
}
console.log('PASS native/frameless title-bar combinations on desktop and web');
