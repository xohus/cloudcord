import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { transformSync } from 'esbuild';
const source = fs.readFileSync(new URL('../src/plugins/cloudCordPopupBlocker/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export default definePlugin(', 'globalThis.plugin = definePlugin(');
let dialogs = [];
let closed = 0;
const store = { nitro: true, quests: false, changelog: false, shop: false, tips: false, customTitles: '' };
const dialog = (title, protectedForm = false) => ({
    getClientRects: () => [1], getAttribute: () => null,
    querySelector: selector => selector === 'h1,h2,[role=heading]' ? { textContent: title } : selector.startsWith('input') ? protectedForm ? {} : null : { disabled: false, click: () => closed++ }
});
const context = vm.createContext({
    definePluginSettings: () => ({ store }), definePlugin: p => p, OptionType: { BOOLEAN: 1, STRING: 2 }, Devs: { Xohus: {} },
    document: { querySelectorAll: () => dialogs, body: {} }, queueMicrotask,
    MutationObserver: class { observe() {} disconnect() {} }
});
vm.runInContext(transformSync(source, { loader: 'ts' }).code, context);
dialogs = [dialog('Get Nitro'), dialog('Nitro payment verification'), dialog('Nitro', true), dialog('Quests')];
vm.runInContext('plugin.start()', context); assert.equal(closed, 1);
store.quests = true; vm.runInContext('inspectPopups()', context); assert.equal(closed, 2);
store.customTitles = 'My Annoying Popup'; dialogs.push(dialog('My Annoying Popup'), dialog('Security warning'));
vm.runInContext('inspectPopups()', context); assert.equal(closed, 3);
vm.runInContext('plugin.stop()', context);
console.log('popup categories, exact titles, security protection and duplicate-close tests passed');
