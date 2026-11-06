/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Add-ons > Tweaks: every CloudCord tweak as an instant switch, grouped by category.
 * Tweaks are plain stylesheets, so they turn on and off without a restart.
 */

import { isPluginEnabled, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { SearchIcon } from "@components/Icons";
import { Switch } from "@components/Switch";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import { classNameFactory } from "@utils/css";
import { useState } from "@webpack/common";

import { PluginMeta } from "~plugins";

const cl = classNameFactory("cc-tweaks-");

const GROUPS: [string, string][] = [
    ["Chat", "Chat"],
    ["Media", "Images and video"],
    ["Voice", "Voice"],
    ["Utility", "Clean up the sidebar"],
    ["Appearance", "Look and feel"],
];

export const tweakPlugins = () =>
    Object.values(plugins).filter(p => PluginMeta[p.name]?.folderName.startsWith("src/cloudcordplugins/") && !p.required && !p.hidden);

function setTweak(name: string, on: boolean) {
    const plugin = plugins[name];
    Settings.plugins[name].enabled = on;
    try { on ? startPlugin(plugin) : stopPlugin(plugin); } catch { }
}

export function TweaksPage() {
    useSettings(["plugins.*"]);
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const all = tweakPlugins().filter(p => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    const onCount = tweakPlugins().filter(p => isPluginEnabled(p.name)).length;

    return (
        <SettingsTab>
            <div className="cc-store-header">
                <h2 className="cc-store-title">Tweaks<span className="cc-store-count">{onCount}/{tweakPlugins().length}</span></h2>
                <label className="cc-store-search">
                    <SearchIcon width={16} height={16} />
                    <input value={query} onChange={e => setQuery(e.currentTarget.value)} placeholder="Search tweaks..." />
                </label>
            </div>
            <p className={cl("hint")}>Small CloudCord changes that apply instantly, no restart needed.</p>

            {GROUPS.map(([tag, title]) => {
                const items = all.filter(p => (p.tags?.[0] ?? "Appearance") === tag);
                if (!items.length) return null;
                return (
                    <section key={tag} className={cl("group")}>
                        <h3 className={cl("group-title")}>{title}</h3>
                        <div className={cl("grid")}>
                            {items.map(p => {
                                const on = isPluginEnabled(p.name);
                                return (
                                    <label key={p.name} className={cl("item", { "item-on": on })}>
                                        <span className={cl("text")}>
                                            <span className={cl("name")}>{p.name.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
                                            <span className={cl("desc")}>{p.description}</span>
                                        </span>
                                        <Switch checked={on} onChange={v => setTweak(p.name, v)} />
                                    </label>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
            {all.length === 0 && <div className="cc-store-empty">No tweaks match “{query}”.</div>}
        </SettingsTab>
    );
}
