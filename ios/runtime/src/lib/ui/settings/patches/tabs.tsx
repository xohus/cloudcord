import { after, before } from "@lib/api/patcher";
import { TableRow } from "@metro/common/components";
import { findByNameAll, findByNameLazy, findByPropsAll, findByPropsLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";

import { CustomPageRenderer, wrapOnPress } from "./shared";
import { findInReactTree } from "@lib/utils";

const settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
const createListModule = findByPropsLazy("createList");
const SettingsOverviewScreen = findByNameLazy("SettingsOverviewScreen", false);

export function patchTabsUI(unpatches: (() => void | boolean)[]) {
    const fallbackNames = [
        "renderer-live-table",
        "renderer-export-accessor",
        "create-list-lazy-before",
        "create-list-lazy-after-input",
        "create-list-lazy-after-output",
        "create-list-all-before",
        "create-list-all-after-input",
        "create-list-all-after-output",
        "settings-overview-before",
        "settings-overview-after-direct",
        "settings-overview-after-tree",
        "legacy-settings-panel",
        "legacy-screen-route"
    ] as const;
    (globalThis as any).__CLOUDCORD_SETTINGS_FALLBACKS__ = fallbackNames;

    const getCustomRoutes = () => ({
        VendettaCustomPage: {
            type: "route",
            title: () => "CloudCord",
            useTitle: () => "CloudCord",
            screen: { route: "VendettaCustomPage", getComponent: () => CustomPageRenderer }
        },
        PUPU_CUSTOM_PAGE: {
            type: "route",
            title: () => "CloudCord",
            useTitle: () => "CloudCord",
            screen: { route: "PUPU_CUSTOM_PAGE", getComponent: () => CustomPageRenderer }
        },
        BUNNY_CUSTOM_PAGE: {
            type: "route",
            title: () => "CloudCord",
            useTitle: () => "CloudCord",
            screen: { route: "BUNNY_CUSTOM_PAGE", getComponent: () => CustomPageRenderer }
        }
    });

    const getRows = () => Object.values(registeredSections)
        .flatMap(sect => sect.map(row => ({
            [row.key]: {
                type: "pressable",
                // title was renamed to useTitle, both are here for compatibility (thanks kmiioo) https://codeberg.org/cloudcord/CloudCord/pulls/52
                title: row.title,
                useTitle: row.title,
                icon: row.icon,
                IconComponent: () => <TableRow.Icon source={row.icon} />,
                usePredicate: row.usePredicate,
                useTrailing: row.useTrailing,
                onPress: wrapOnPress(row.onPress, null, row.render, row.title()),
                withArrow: true
            }
        })))
        .reduce((a, c) => Object.assign(a, c));

    const insertCloudCordSections = (sections: any[]) => {
        if (!Array.isArray(sections)) return;
        const accountSectionIndex = sections.findIndex((item: any) =>
            Array.isArray(item?.settings) && item.settings.some((key: unknown) =>
                String(key).toUpperCase().includes("ACCOUNT")
            )
        );
        let index = accountSectionIndex >= 0 ? accountSectionIndex + 1 : Math.min(1, sections.length);
        Object.keys(registeredSections).forEach(sectionName => {
            const rows = registeredSections[sectionName];
            if (!rows.length) return;
            const rowKeys = new Set(rows.map(row => row.key));
            const alreadyExists = sections.some((section: any) =>
                section?.label === sectionName || section?.title === sectionName ||
                section?.settings?.some?.((key: string) => rowKeys.has(key))
            );
            if (!alreadyExists) {
                sections.splice(index++, 0, {
                    label: sectionName,
                    title: sectionName,
                    settings: rows.map(row => row.key)
                });
            }
        });
    };

    const insertCloudCordSectionsInTree = (root: any) => {
        const seen = new WeakSet<object>();
        const visit = (value: any, depth: number) => {
            if (depth > 10 || value == null || typeof value !== "object") return;
            if (seen.has(value)) return;
            seen.add(value);

            if (Array.isArray(value)) {
                if (value.some(item => Array.isArray(item?.settings))) {
                    insertCloudCordSections(value);
                    return;
                }
                value.forEach(item => visit(item, depth + 1));
                return;
            }

            // Discord has moved the settings collection through each of these
            // containers across its tabs, search, tablet and legacy layouts.
            // Keeping these explicit avoids walking arbitrary module/store data.
            for (const key of [
                "sections", "sectionGroups", "groups", "data", "props",
                "children", "items", "content", "list", "config", "result"
            ]) visit(value[key], depth + 1);
        };
        visit(root, 0);
    };

    // Discord 344 can expose this export through a frozen/lazy Metro namespace.
    // A rejected property override must not prevent the independent section hooks below.
    try {
        const origRendererConfig = settingConstants.SETTING_RENDERER_CONFIG;
        let rendererConfigValue = settingConstants.SETTING_RENDERER_CONFIG;

        // Fallback 1: mutate the live renderer table in-place. This survives
        // Metro namespace objects whose export property cannot be redefined.
        if (rendererConfigValue && typeof rendererConfigValue === "object") {
            Object.assign(rendererConfigValue, getCustomRoutes(), getRows());
        }

        Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
        enumerable: true,
        configurable: true,
        get: () => ({
            ...rendererConfigValue,
            ...getCustomRoutes(),
            ...getRows()
        }),
        set: v => rendererConfigValue = v,
        });

        unpatches.push(() => {
            Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
                value: origRendererConfig,
                writable: true,
                configurable: true
            });
        });
    } catch (error) {
        console.error("CloudCord renderer config patch failed", error);
    }

    const patchCreateListModule = (module: any) => {
        // Discord 344 materializes a new list from this config. Insert our rows
        // before that copy is created; the after-hook below remains a fallback
        // for builds that expose their sections only in the returned tree.
        unpatches.push(before("createList", module, function(args) {
            const [config] = args;
            insertCloudCordSectionsInTree(config);
            return args;
        }));

        unpatches.push(after("createList", module, function(args, ret) {
            const [config] = args;

            insertCloudCordSectionsInTree(config);
            insertCloudCordSectionsInTree(ret);
            return ret;
        },));
    };

    try {
        // Fallbacks 3-6: patch the lazy match plus every initialized 344 module
        // exporting createList (the IPA currently contains two such symbols).
        const modules = [createListModule, ...findByPropsAll("createList")].filter(Boolean);
        [...new Set(modules)].forEach(module => {
            try { patchCreateListModule(module); } catch {}
        });
    } catch {}

    try {
        const modules = [
            SettingsOverviewScreen,
            ...findByNameAll("SettingsOverviewScreen", false)
        ].filter(Boolean);
        [...new Set(modules)].forEach(module => {
            try {
                unpatches.push(before("default", module, args => {
                    args.forEach(insertCloudCordSectionsInTree);
                    return args;
                }));
                unpatches.push(after("default", module, (_, ret) => {
                    const tree = findInReactTree(ret, item => Array.isArray(item?.props?.sections));
                    insertCloudCordSections(tree?.props?.sections);
                    insertCloudCordSectionsInTree(ret);
                    return ret;
                }));
            } catch {}
        });
    } catch {}
};
