import { after, before } from "@lib/api/patcher";
import { TableRow } from "@metro/common/components";
import { findByFilePathLazy, findByNameAll, findByNameLazy, findByPropsAll, findByPropsLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";

import { CustomPageRenderer, wrapOnPress } from "./shared";
import { findInReactTree } from "@lib/utils";

const settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
const settingConstants344 = findByFilePathLazy("modules/user_settings/core/native/SettingsRendererConfig.tsx");
const createListModule = findByPropsLazy("createList");
const SettingsOverviewScreen = findByNameLazy("SettingsOverviewScreen", false);
const SettingsOverviewScreen344 = findByFilePathLazy("modules/user_settings/overview/native/SettingsOverviewScreen.tsx");

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

    // Discord 331 uses one root createList settings model. The recursive 344
    // fallbacks must never run here: they can discover the Account tab's
    // internal sections first and incorrectly nest CloudCord inside Account.
    if (!(globalThis as any).__CLOUDCORD_BRIDGELESS__) {
        const customRoutes = {
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
        };

        const originalConfig = settingConstants.SETTING_RENDERER_CONFIG;
        let liveConfig = originalConfig;
        Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
            enumerable: true,
            configurable: true,
            get: () => ({ ...liveConfig, ...customRoutes, ...getRows() }),
            set: value => liveConfig = value
        });
        unpatches.push(() => {
            Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
                configurable: true,
                writable: true,
                value: originalConfig
            });
        });

        const insertRootSections = (config: any) => {
            const sections = config?.sections;
            if (!Array.isArray(sections)) return;
            const accountIndex = sections.findIndex((section: any) => section?.settings?.includes?.("ACCOUNT"));
            if (accountIndex < 0) return;
            let index = accountIndex + 1;
            for (const sectionName of Object.keys(registeredSections)) {
                const rows = registeredSections[sectionName];
                if (!rows.length || sections.some((section: any) => section?.label === sectionName)) continue;
                sections.splice(index++, 0, {
                    label: sectionName,
                    title: sectionName,
                    settings: rows.map(row => row.key)
                });
            }
        };

        unpatches.push(after("createList", createListModule, (args, result) => {
            insertRootSections(args?.[0]);
            return result;
        }));
        return;
    }

    const insertCloudCordSections = (sections: any[]) => {
        if (!Array.isArray(sections)) return;

        // Never insert CloudCord into the middle of Discord's native settings list.
        // SettingHookHarness can retain hook state by position; shifting native rows can
        // make an existing harness run a different usePredicate/useConfig hook chain.
        // Appending keeps every existing Discord setting at its current position.
        Object.keys(registeredSections).forEach(sectionName => {
            const rows = registeredSections[sectionName];
            if (!rows.length) return;
            const rowKeys = new Set(rows.map(row => row.key));
            const alreadyExists = sections.some((section: any) =>
                section?.label === sectionName || section?.title === sectionName ||
                section?.settings?.some?.((key: string) => rowKeys.has(key))
            );
            if (!alreadyExists) {
                sections.push({
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
    const patchRendererConfig = (rendererModule: any) => {
        const origRendererConfig = rendererModule.SETTING_RENDERER_CONFIG;
        let rendererConfigValue = rendererModule.SETTING_RENDERER_CONFIG;

        // Fallback 1: mutate the live renderer table in-place. This survives
        // Metro namespace objects whose export property cannot be redefined.
        if (rendererConfigValue && typeof rendererConfigValue === "object") {
            Object.assign(rendererConfigValue, getCustomRoutes(), getRows());
        }

        Object.defineProperty(rendererModule, "SETTING_RENDERER_CONFIG", {
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
            Object.defineProperty(rendererModule, "SETTING_RENDERER_CONFIG", {
                value: origRendererConfig,
                writable: true,
                configurable: true
            });
        });
    };

    try {
        // 344.1 exposes the renderer through a stable Metro file path even when
        // its export shape/name changes. Patch that exact module as well as the
        // generic property match used by 331 and older builds.
        [...new Set([settingConstants344, settingConstants])].forEach(module => {
            try { patchRendererConfig(module); } catch {}
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
            SettingsOverviewScreen344,
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
