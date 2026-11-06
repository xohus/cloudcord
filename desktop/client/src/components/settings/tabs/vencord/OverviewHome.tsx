/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Overview > Home: what CloudCord is doing right now, and one click to everything else.
 */

import "./OverviewHome.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { isPluginEnabled, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { CloudIcon, FolderIcon, PluginsIcon, LogIcon, OpenExternalIcon, PaintbrushIcon, RestartIcon, RobotIcon, UserIcon } from "@components/Icons";
import { Switch } from "@components/Switch";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import { gitHashShort } from "@shared/vencordUserAgent";
import { CLOUDCORD_FAVICON } from "@utils/cloudCordAssets";
import { classNameFactory } from "@utils/css";
import type { IconProps } from "@utils/types";
import { relaunch } from "@utils/native";
import { checkForUpdates, isOutdated, update } from "@utils/updater";
import { SettingsRouter, useEffect, useState } from "@webpack/common";
import type { ComponentType } from "react";

import { setNextAddonsTab } from "../addons";
import { listablePlugins } from "../addons/AddonPage";
import { tweakPlugins } from "../addons/TweaksPage";

const cl = classNameFactory("cc-home-");

// Discord ignores openUserSettings while settings is already open, so click the
// matching sidebar entry instead; Add-ons pages can also preselect a tab.
const SIDEBAR: Record<string, string> = {
    cloudcord_fake_profile: "Profile",
    cloudcord_botcord: "Botcord",
    cloudcord_cloud_sync: "Add-ons",
};

function open(key: string, addonsTab?: string) {
    if (addonsTab) setNextAddonsTab(addonsTab);
    const label = SIDEBAR[key];
    const leaf = [...document.querySelectorAll("nav *, [class*=sidebar] *")]
        .find(e => e.childElementCount === 0 && e.textContent?.trim() === label);
    const link = leaf?.closest<HTMLElement>("[role=link], [role=tab], button, a");
    if (link) link.click();
    else SettingsRouter.openUserSettings(key);
}

const TweakIcon = ({ width = 22, height = 22 }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);

const QUICK_TWEAKS: [string, string][] = [
    ["AmoledMode", "AMOLED black"],
    ["FocusMode", "Focus mode"],
    ["CenteredChat", "Centered chat"],
    ["HideNitroTab", "Hide Nitro"],
    ["HideShopTab", "Hide Shop"],
    ["NoAnimations", "No animations"],
];

const FEATURES: { title: string; text: string; key: string; tab?: string; Icon: ComponentType<IconProps>; }[] = [
    { title: "Plugins", text: "592 plugins with search, sorting and one-click switches.", key: "cloudcord_cloud_sync", tab: "Plugins", Icon: PluginsIcon },
    { title: "Fake Profile", text: "Custom avatar, banner, badges and effects, shared with CloudCord users.", key: "cloudcord_fake_profile", Icon: UserIcon },
    { title: "BotCord", text: "Use bot accounts like a normal Discord client, right inside CloudCord.", key: "cloudcord_botcord", Icon: RobotIcon },
    { title: "Theme store", text: "Browse 100+ themes with previews and install one in a click.", key: "cloudcord_cloud_sync", tab: "Themes", Icon: PaintbrushIcon },
    { title: "Tweaks", text: "100 instant switches to hide clutter and restyle Discord.", key: "cloudcord_cloud_sync", tab: "Tweaks", Icon: TweakIcon },
    { title: "CloudSync", text: "Back up your settings and keep them in sync across devices.", key: "cloudcord_cloud_sync", tab: "Sync", Icon: CloudIcon },
];

type UpdateState = "checking" | "current" | "available" | "updating" | "done" | "error";

function UpdatePill() {
    const [state, setState] = useState<UpdateState>("checking");
    useEffect(() => {
        checkForUpdates().then(
            () => setState(isOutdated ? "available" : "current"),
            () => setState("error")
        );
    }, []);

    const run = async () => {
        setState("updating");
        try { setState(await update() ? "done" : "error"); } catch { setState("error"); }
    };

    const label: Record<UpdateState, string> = {
        checking: "Checking for updates…",
        current: "Up to date",
        available: "Update available",
        updating: "Updating…",
        done: "Updated, restart to finish",
        error: "Couldn't check for updates",
    };

    return (
        <div className={cl("update", `update-${state}`)}>
            <span className={cl("update-dot")} />
            <span>{label[state]}</span>
            {state === "available" && <button className={cl("update-btn")} onClick={run}>Update now</button>}
            {state === "done" && <button className={cl("update-btn")} onClick={relaunch}>Restart</button>}
        </div>
    );
}

function setPlugin(name: string, on: boolean) {
    const plugin = plugins[name];
    if (!plugin) return;
    Settings.plugins[name].enabled = on;
    try { on ? startPlugin(plugin) : stopPlugin(plugin); } catch { }
}

export function OverviewHome() {
    const { enabledThemes, themeLinks } = useSettings(["enabledThemes", "themeLinks", "plugins.*"] as any) as any;
    const all = listablePlugins();
    const tweaks = tweakPlugins();
    const pluginsOn = all.filter(p => isPluginEnabled(p.name)).length;
    const tweaksOn = tweaks.filter(p => isPluginEnabled(p.name)).length;
    const profileOn = isPluginEnabled("ProfileSpoofer");

    return (
        <SettingsTab>
            <header className={cl("hero")}>
                <img className={cl("logo")} src={CLOUDCORD_FAVICON} alt="" width={56} height={56} />
                <div className={cl("hero-text")}>
                    <h2 className={cl("title")}>CloudCord</h2>
                    <span className={cl("version")}>Build {gitHashShort}</span>
                </div>
                <UpdatePill />
            </header>

            <div className={cl("stats")}>
                <button className={cl("stat")} onClick={() => open("cloudcord_cloud_sync", "Plugins")}>
                    <b>{pluginsOn}</b><span>of {all.length} plugins on</span>
                </button>
                <button className={cl("stat")} onClick={() => open("cloudcord_cloud_sync", "Tweaks")}>
                    <b>{tweaksOn}</b><span>of {tweaks.length} tweaks on</span>
                </button>
                <button className={cl("stat")} onClick={() => open("cloudcord_cloud_sync", "Themes")}>
                    <b>{(enabledThemes?.length ?? 0) + (themeLinks?.length ?? 0)}</b><span>themes in use</span>
                </button>
                <button className={cl("stat")} onClick={() => open("cloudcord_fake_profile")}>
                    <b className={profileOn ? cl("on") : cl("off")}>{profileOn ? "On" : "Off"}</b><span>Fake Profile</span>
                </button>
            </div>

            <h3 className={cl("label")}>Quick tweaks</h3>
            <div className={cl("quick")}>
                {QUICK_TWEAKS.filter(([name]) => plugins[name]).map(([name, label]) => (
                    <label key={name} className={cl("chip", { "chip-on": isPluginEnabled(name) })}>
                        <span>{label}</span>
                        <Switch checked={isPluginEnabled(name)} onChange={v => setPlugin(name, v)} />
                    </label>
                ))}
            </div>

            <h3 className={cl("label")}>Features</h3>
            <div className={cl("features")}>
                {FEATURES.map(f => (
                    <button key={f.title} className={cl("feature")} onClick={() => open(f.key, f.tab)}>
                        <span className={cl("feature-icon")} aria-hidden="true"><f.Icon width={22} height={22} /></span>
                        <span className={cl("feature-title")}>{f.title}</span>
                        <span className={cl("feature-text")}>{f.text}</span>
                    </button>
                ))}
            </div>

            <h3 className={cl("label")}>Quick actions</h3>
            <div className={cl("actions")}>
                <button className={cl("action")} onClick={() => VencordNative.quickCss.openEditor()}><PaintbrushIcon width={18} height={18} />QuickCSS</button>
                <button className={cl("action")} onClick={openNotificationLogModal}><LogIcon width={18} height={18} />Notifications</button>
                {!IS_WEB && <button className={cl("action")} onClick={() => VencordNative.settings.openFolder()}><FolderIcon width={18} height={18} />Settings folder</button>}
                {!IS_WEB && <button className={cl("action")} onClick={() => VencordNative.themes.openFolder()}><PaintbrushIcon width={18} height={18} />Themes folder</button>}
                {!IS_WEB && <button className={cl("action")} onClick={relaunch}><RestartIcon width={18} height={18} />Relaunch</button>}
                <button className={cl("action")} onClick={() => VencordNative.native.openExternal("https://getcloudcord.com")}><OpenExternalIcon width={18} height={18} />Website</button>
            </div>
        </SettingsTab>
    );
}
