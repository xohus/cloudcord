import * as DataStore from "@api/DataStore";
import { startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import * as SettingsApi from "@api/Settings";
import * as Constants from "@utils/constants";
import * as Types from "@utils/types";
import * as Webpack from "@webpack";
import * as Common from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

const storageKey = "cloudcord-runtime-userplugins-v1";
interface StoredPlugin { name: string; source: string; url: string; }

async function registerPlugin(entry: StoredPlugin, enable = false) {
    if (Plugins[entry.name]) throw new Error("A plugin with that name is already installed.");
    const modules: Record<string, unknown> = { "@api/Settings": SettingsApi, "@utils/types": { ...Types, __esModule: true }, "@utils/constants": Constants, "@webpack": Webpack, "@webpack/common": Common };
    const module = { exports: {} as any };
    const requireModule = (name: string) => {
        if (!(name in modules)) throw new Error(`Unsupported browser plugin import: ${name}`);
        return modules[name];
    };
    // User explicitly confirms running third-party code before installation.
    new Function("module", "exports", "require", entry.source)(module, module.exports, requireModule);
    const plugin = module.exports.default ?? module.exports;
    if (plugin.name !== entry.name || typeof plugin.description !== "string" || !Array.isArray(plugin.authors) || plugin.patches?.length || plugin.native)
        throw new Error("This plugin requires a source build or native desktop features. Use a browser-ready plugin instead.");
    Plugins[entry.name] = plugin;
    PluginMeta[entry.name] = { folderName: "runtime-userplugins", userPlugin: true };
    if (enable) SettingsApi.Settings.plugins[entry.name].enabled = true;
    if (plugin.settings) {
        plugin.settings.pluginName = plugin.name;
        for (const [key, def] of Object.entries(plugin.settings.def) as [string, any][])
            if (def.onChange) SettingsApi.SettingsStore.addChangeListener(`plugins.${plugin.name}.${key}`, def.onChange);
    }
    try {
        if (SettingsApi.Settings.plugins[entry.name].enabled) {
            const dependencies = startDependenciesRecursive(plugin);
            if (dependencies.failures.length || dependencies.restartNeeded || !startPlugin(plugin)) throw new Error("Could not start this plugin.");
        }
    } catch (error) {
        stopPlugin(plugin);
        SettingsApi.Settings.plugins[entry.name].enabled = false;
        delete Plugins[entry.name];
        delete PluginMeta[entry.name];
        throw error;
    }
}

export async function loadRuntimePlugins() {
    const entries = await DataStore.get<StoredPlugin[]>(storageKey) ?? [];
    for (const entry of entries) {
        if (Plugins[entry.name]) continue;
        try { await registerPlugin(entry); }
        catch (error) { console.error("CloudCord user plugin could not load", entry.name, error); }
    }
}

export async function installRuntimePlugin(link: string): Promise<boolean> {
    const base = new URL(link);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Use an HTTPS plugin folder link.");
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    const response = await fetch(new URL("manifest.json", base), { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Could not load the plugin manifest.");
    const manifest = await response.json();
    if (!manifest.browser) {
        if (!IS_WEB) return false;
        throw new Error("This link contains source code only. Ask its author for a browser-ready JavaScript entry in the manifest.");
    }
    if (typeof manifest.name !== "string" || typeof manifest.browser.entry !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(manifest.name) || !/^[a-f0-9]{64}$/.test(manifest.browser.sha256)) throw new Error("Invalid browser plugin manifest.");
    const url = new URL(manifest.browser.entry, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) throw new Error("Invalid browser plugin entry.");
    if (!confirm(`Install ${manifest.name} from ${base.host}?\nPlugins can access your Discord session. Only install code from developers you trust.`)) throw new Error("silentStop");
    const code = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!code.ok) throw new Error("Could not download the plugin.");
    const bytes = await code.arrayBuffer();
    if (bytes.byteLength > 256 * 1024) throw new Error("Plugin download is too large.");
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== manifest.browser.sha256) throw new Error("Plugin download did not match its manifest.");
    const entries = await DataStore.get<StoredPlugin[]>(storageKey) ?? [];
    const entry = { name: manifest.name, source: new TextDecoder().decode(bytes), url: base.href };
    await registerPlugin(entry, true);
    try { await DataStore.set(storageKey, [...entries, entry]); }
    catch (error) { stopPlugin(Plugins[entry.name]); delete Plugins[entry.name]; delete PluginMeta[entry.name]; throw error; }
    return true;
}

export async function getRuntimePlugins() {
    return await DataStore.get<StoredPlugin[]>(storageKey) ?? [];
}

export async function removeRuntimePlugin(name: string) {
    const entries = await getRuntimePlugins();
    if (!entries.some(entry => entry.name === name)) throw new Error("Plugin is not installed.");
    await DataStore.set(storageKey, entries.filter(entry => entry.name !== name));
    const plugin = Plugins[name];
    if (plugin) {
        stopPlugin(plugin);
        if (plugin.settings)
            for (const [key, def] of Object.entries(plugin.settings.def) as [string, any][])
                if (def.onChange) SettingsApi.SettingsStore.removeChangeListener(`plugins.${name}.${key}`, def.onChange);
        SettingsApi.Settings.plugins[name].enabled = false;
        delete Plugins[name];
        delete PluginMeta[name];
    }
}
