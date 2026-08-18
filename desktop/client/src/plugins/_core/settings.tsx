/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import {
    AppsIcon,
    BackupRestoreIcon,
    CloudIcon,
    LogIcon,
    MainSettingsIcon,
    PaintbrushIcon,
    PatchHelperIcon,
    PluginsIcon,
    RobotIcon,
    UpdaterIcon,
    UserIcon
} from "@components/Icons";
import {
    BackupAndRestoreTab,
    BotCordTab,
    ChangelogTab,
    CloudTab,
    FakeProfileTab,
    OutsidePluginsTab,
    PatchHelperTab,
    PluginsTab,
    ThemesTab,
    UpdaterTab,
    VencordTab,
} from "@components/settings";
import { gitHashShort } from "@shared/vencordUserAgent";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import definePlugin, { IconProps, OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { React } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

const enum LayoutType {
    ROOT = 0,
    SECTION = 1,
    SIDEBAR_ITEM = 2,
    PANEL = 3,
    SPLIT = 4,
    CATEGORY = 5,
    ACCORDION = 6,
    LIST = 7,
    RELATED = 8,
    FIELD_SET = 9,
    TAB_ITEM = 10,
    STATIC = 11,
    BUTTON = 12,
    TOGGLE = 13,
    SLIDER = 14,
    SELECT = 15,
    RADIO = 16,
    NAVIGATOR = 17,
    CUSTOM = 18
}

let RawLayoutTypes: any = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    CATEGORY: 5,
    CUSTOM: 18,
};
waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL"], v => {
    if (v) RawLayoutTypes = v;
});

function getLayoutType(key: "SECTION" | "SIDEBAR_ITEM" | "PANEL" | "CATEGORY" | "CUSTOM", fallback: number): number {
    if (typeof RawLayoutTypes?.[key] === "number") return RawLayoutTypes[key];
    if (typeof RawLayoutTypes?.LayoutType?.[key] === "number") return RawLayoutTypes.LayoutType[key];
    if (typeof RawLayoutTypes?.default?.[key] === "number") return RawLayoutTypes.default[key];
    return fallback;
}

const enum SectionType {
    HEADER = "HEADER",
    DIVIDER = "DIVIDER",
    CUSTOM = "CUSTOM"
}

type SettingsLocation =
    | "top"
    | "aboveNitro"
    | "belowNitro"
    | "aboveActivity"
    | "belowActivity"
    | "bottom";

interface SettingsLayoutNode {
    type: LayoutType;
    key?: string;
    legacySearchKey?: string;
    getLegacySearchKey?(): string;
    useLabel?(): string;
    useTitle?(): string;
    buildLayout?(): SettingsLayoutNode[];
    icon?(): ReactNode;
    render?(): ReactNode;
    StronglyDiscouragedCustomComponent?(): ReactNode;
}

interface EntryOptions {
    key: string;
    title: string;
    panelTitle?: string;
    Component: ComponentType<{}>;
    Icon: ComponentType<IconProps>;
}

interface SettingsLayoutBuilder {
    key?: string;
    buildLayout(): SettingsLayoutNode[];
}

const settings = definePluginSettings({
    settingsLocation: {
        type: OptionType.SELECT,
        description: "Where to put the CloudCord settings section",
        options: [
            { label: "At the very top", value: "top" },
            { label: "Above the Nitro section", value: "aboveNitro", default: true },
            { label: "Below the Nitro section", value: "belowNitro" },
            { label: "Above Activity Settings", value: "aboveActivity" },
            { label: "Below Activity Settings", value: "belowActivity" },
            { label: "At the very bottom", value: "bottom" },
        ] as { label: string; value: SettingsLocation; default?: boolean; }[]
    },
    includeVencordInfoWhenCopying: {
        type: OptionType.BOOLEAN,
        description: "Also copy Vencord info (Vencord, Electron, Chromium) when clicking the version info in the bottom left area of the Settings page",
        default: true
    }
});

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    settings,

    patches: [
        {
            find: "#{intl::COPY_VERSION}",
            replacement: [
                {
                    match: /\.RELEASE_CHANNEL/,
                    replace: "$&.replace(/^./, c => c.toUpperCase())"
                },
                {
                    match: /"text-xxs\/normal".{0,300}?(?=null!=(\i)&&(.{0,20}\i\.\i.{0,200}?,children:).{0,15}?("span"),({className:\i\.\i,children:\["Build Override: ",\1\.id\]\})\)\}\))/,
                    replace: (m, _buildOverride, makeRow, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component},${props}).map(e=>${makeRow}e})),`;
                    }
                },
                {
                    match: /copyValue:\i\.join\(" "\)/g,
                    replace: "$& + $self.getInfoString()"
                }
            ]
        },
        {
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    buildEntry(options: EntryOptions): SettingsLayoutNode {
        const { key, title, panelTitle = title, Component, Icon } = options;

        const panel: SettingsLayoutNode = {
            key: key + "_panel",
            type: getLayoutType("PANEL", 3),
            useTitle: () => panelTitle,
            useLabel: () => panelTitle,
            buildLayout: () => [{
                type: getLayoutType("CATEGORY", 5),
                key: key + "_category",
                buildLayout: () => [{
                    type: getLayoutType("CUSTOM", 18),
                    key: key + "_custom",
                    Component: Component,
                    render: () => <Component />,
                    StronglyDiscouragedCustomComponent: () => <Component />,
                    useSearchTerms: () => [title]
                }]
            }]
        };

        return ({
            key,
            type: getLayoutType("SIDEBAR_ITEM", 2),
            useTitle: () => title,
            useLabel: () => title,
            icon: () => <Icon width={20} height={20} />,
            buildLayout: () => [panel]
        });
    },

    buildLayout(originalLayoutBuilder: SettingsLayoutBuilder) {
        const layout = originalLayoutBuilder.buildLayout();
        if (!Array.isArray(layout)) return layout;
        if (layout.some(s => s?.key === "cloudcord_section")) return layout;

        const isRoot = !originalLayoutBuilder.key ||
                       originalLayoutBuilder.key === "$Root" ||
                       originalLayoutBuilder.key === "root" ||
                       layout.some(s => s?.key === "user_section" || s?.key === "billing_section" || s?.key === "utility_section");

        if (!isRoot) return layout;

        const { buildEntry } = this;

        const cloudcordEntries: SettingsLayoutNode[] = [
            buildEntry({
                key: "cloudcord_main",
                title: "CloudCord",
                panelTitle: "CloudCord Settings",
                Component: VencordTab,
                Icon: MainSettingsIcon
            }),
            buildEntry({
                key: "cloudcord_botcord",
                title: "BotCord",
                panelTitle: "BotCord",
                Component: BotCordTab,
                Icon: RobotIcon
            }),
            buildEntry({
                key: "cloudcord_fake_profile",
                title: "Fake Profile",
                panelTitle: "Fake Profile",
                Component: FakeProfileTab,
                Icon: UserIcon
            }),
            buildEntry({
                key: "cloudcord_cloud_sync",
                title: "Cloud Sync",
                panelTitle: "Cloud Sync",
                Component: CloudTab,
                Icon: CloudIcon
            }),
            buildEntry({
                key: "cloudcord_plugins",
                title: "Plugins",
                panelTitle: "CloudCord Plugins",
                Component: PluginsTab,
                Icon: PluginsIcon
            }),
            buildEntry({
                key: "cloudcord_themes",
                title: "Themes",
                panelTitle: "CloudCord Themes",
                Component: ThemesTab,
                Icon: PaintbrushIcon
            }),
            buildEntry({
                key: "cloudcord_backup_restore",
                title: "Backup & Restore",
                panelTitle: "Backup & Restore",
                Component: BackupAndRestoreTab,
                Icon: BackupRestoreIcon
            }),
            buildEntry({
                key: "cloudcord_outside_plugins",
                title: "Outside Plugins",
                panelTitle: "Outside Plugins",
                Component: OutsidePluginsTab,
                Icon: AppsIcon
            }),
            ...this.customEntries.map(buildEntry)
        ].filter(isTruthy);

        const cloudcordSection: SettingsLayoutNode = {
            key: "cloudcord_section",
            type: getLayoutType("SECTION", 1),
            useTitle: () => "CloudCord Settings",
            useLabel: () => "CloudCord Settings",
            buildLayout: () => cloudcordEntries
        };

        const { settingsLocation } = settings.store;

        const places: Record<SettingsLocation, string> = {
            top: "user_section",
            aboveNitro: "billing_section",
            belowNitro: "billing_section",
            aboveActivity: "activity_section",
            belowActivity: "activity_section",
            bottom: "utility_section"
        };

        const key = places[settingsLocation] ?? places.top;
        let idx = layout.findIndex(s => typeof s?.key === "string" && s.key === key);

        if (idx === -1) {
            idx = 2;
        } else if (settingsLocation.startsWith("below")) {
            idx += 1;
        }

        layout.splice(idx, 0, cloudcordSection);

        return layout;
    },

    customSections: [] as ((SectionTypes: Record<string, string>) => { section: string; element: ComponentType; label: string; id?: string; })[],
    customEntries: [] as EntryOptions[],

    get electronVersion() {
        return VencordNative.native.getVersions().electron ?? window.legcord?.electron ?? null;
    },

    get chromiumVersion() {
        try {
            return (
                VencordNative.native.getVersions().chrome ??
                // @ts-expect-error userAgentData types
                navigator.userAgentData?.brands?.find(
                    (b: { brand: string; }) => b.brand === "Chromium" || b.brand === "Google Chrome",
                )?.version ??
                null
            );
        } catch {
            return null;
        }
    },

    getVersionInfo(support = true) {
        let version = "";

        if (IS_DEV) version = "Dev Build";
        if (IS_WEB) version = "Web";
        if (IS_VESKTOP) version = `Vesktop v${VesktopNative.app.getVersion()}`;
        if (IS_EQUIBOP) version = `Sinbop v${VesktopNative.app.getVersion()}`;
        if (IS_STANDALONE) version = "Standalone";

        return support && version ? ` (${version})` : version;
    },

    getInfoRows() {
        const { electronVersion, chromiumVersion, getVersionInfo } = this;

        const rows = [`CloudCord ${gitHashShort}${getVersionInfo()}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        if (!settings.store.includeVencordInfoWhenCopying) return "";
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(
        Component: ComponentType<React.PropsWithChildren>,
        props: PropsWithChildren,
    ) {
        return this.getInfoRows().map((text, i) => (
            <Component key={i} {...props}>
                {text}
            </Component>
        ));
    },
});
