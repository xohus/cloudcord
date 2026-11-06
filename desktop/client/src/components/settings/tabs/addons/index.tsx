/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { CloudIcon, PaintbrushIcon, PluginIcon, PluginsIcon } from "@components/Icons";
import { classNameFactory } from "@utils/css";
import { IconProps } from "@utils/types";
import { React } from "@webpack/common";
import type { ComponentType } from "react";

import { wrapTab } from "../BaseTab";
import { listablePlugins, PluginsPage, ThemesPage } from "./AddonPage";
import { tweakPlugins, TweaksPage } from "./TweaksPage";

const cl = classNameFactory("cc-addons-");

// Resolve these only when opened, so a failing optional page can't break Add-ons.
function CloudPage() { const Page = require("../sync/CloudTab").default; return <Page />; }
function ExtrasPage() { const Page = require("../extras").default; return <Page />; }
function CxPage() { const Page = require("@sincordplugins/cxExtensions").CxSettings; return <Page />; }

const TweakIcon = ({ width = 16, height = 16, className }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);

interface Page { name: string; Icon: ComponentType<IconProps>; Tab: ComponentType; count?(): number; show?(v: any): boolean; }

const PAGES: Page[] = [
    { name: "Plugins", Icon: PluginsIcon, Tab: PluginsPage, count: () => listablePlugins().length, show: v => v.showPluginsTab !== false },
    { name: "Tweaks", Icon: TweakIcon, Tab: TweaksPage, count: () => tweakPlugins().length },
    { name: "Themes", Icon: PaintbrushIcon, Tab: ThemesPage, show: v => v.showThemesTab !== false },
    { name: "CX Extensions", Icon: PluginIcon, Tab: CxPage },
    { name: "Sync", Icon: CloudIcon, Tab: CloudPage, show: v => v.showCloudSyncTab !== false },
    { name: "Extras", Icon: PluginIcon, Tab: ExtrasPage },
];

// Lets other pages (like Overview) open Add-ons on a specific tab.
let nextTab: string | null = null;
export const setNextAddonsTab = (name: string) => { nextTab = name; };

function Addons() {
    const visibility = (useSettings().plugins.Settings ?? {}) as any;
    const pages = PAGES.filter(p => p.show?.(visibility) ?? true);
    const [current, setCurrent] = React.useState(() => {
        const wanted = nextTab;
        nextTab = null;
        return pages.find(p => p.name === wanted)?.name ?? pages[0]?.name;
    });
    const active = pages.find(p => p.name === current) ?? pages[0];
    if (!active) return null;
    const Tab = active.Tab;

    return (
        <>
            <nav className={cl("seg")} role="tablist">
                {pages.map(({ name, Icon, count }) => (
                    <button
                        key={name}
                        role="tab"
                        aria-selected={name === active.name}
                        className={cl("seg-item", { "seg-active": name === active.name })}
                        onClick={() => setCurrent(name)}
                    >
                        <Icon width={16} height={16} className={cl("seg-icon")} />
                        <span>{name}</span>
                        {count && <span className={cl("seg-count")}>{count()}</span>}
                    </button>
                ))}
            </nav>
            <div className={cl("page")} key={active.name}>
                <ErrorBoundary message={`Couldn't open ${active.name}. Try another tab, then come back.`}>
                    <Tab />
                </ErrorBoundary>
            </div>
        </>
    );
}

export default wrapTab(Addons, "Add-ons");
