import { after, before } from "@lib/api/patcher";
import { TableRow } from "@metro/common/components";
import { findByPropsLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";
import { settings } from "@lib/api/settings";
import { NativeClientInfoModule } from "@lib/api/native/modules";
import { observeSettingsModules } from "../observeModules";
import { onJsxCreate, deleteJsxCreate } from "@lib/api/react/jsx";

import { CustomPageRenderer, wrapOnPress } from "./shared";
import { findInReactTree } from "@lib/utils";

const settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
const createListModule = findByPropsLazy("createList");

// Discord 344 moved the settings list (new renderer config, no root ACCOUNT section).
// No loader sets __CLOUDCORD_BRIDGELESS__ reliably (Android never does), so check the
// Discord version too; otherwise the 331 path finds nothing and CloudCord vanishes.
export function usesModernSettings() {
    if ((globalThis as any).__CLOUDCORD_BRIDGELESS__) return true;
    try {
        const version = parseInt(String(NativeClientInfoModule?.getConstants?.()?.Version ?? ""), 10);
        return !Number.isFinite(version) || version >= 344;
    } catch { return true; }
}

function usesCachedSettingsList() {
    try {
        const version = parseInt(String(NativeClientInfoModule?.getConstants?.()?.Version ?? ""), 10);
        return Number.isFinite(version) && version >= 352;
    } catch { return false; }
}

export function patchTabsUI(unpatches: (() => void | boolean)[]) {
    const fallbackNames = [
        "renderer-live-table",
        "renderer-export-accessor",
        "deferred-module-observer",
        "create-list-before",
        "create-list-after-input",
        "create-list-after-output",
        "settings-overview-before",
        "settings-overview-after-direct",
        "settings-overview-after-tree",
        "searchable-settings-list-direct",
        "legacy-settings-panel",
        "legacy-screen-route"
    ] as const;
    (globalThis as any).__CLOUDCORD_SETTINGS_FALLBACKS__ = fallbackNames;

    // These routes are destinations for code that supplies page params. Native
    // Settings search indexes the renderer table, so keep the routes out of it.
    const getCustomRoutes = () => ({
        VendettaCustomPage: {
            type: "route",
            unsearchable: true,
            title: () => "CloudCord",
            useTitle: () => "CloudCord",
            screen: { route: "VendettaCustomPage", getComponent: () => CustomPageRenderer }
        },
        PUPU_CUSTOM_PAGE: {
            type: "route",
            unsearchable: true,
            title: () => "CloudCord",
            useTitle: () => "CloudCord",
            screen: { route: "PUPU_CUSTOM_PAGE", getComponent: () => CustomPageRenderer }
        },
        BUNNY_CUSTOM_PAGE: {
            type: "route",
            unsearchable: true,
            title: () => "CloudCord",
            useTitle: () => "CloudCord",
            screen: { route: "BUNNY_CUSTOM_PAGE", getComponent: () => CustomPageRenderer }
        }
    });

    const getRows = () => Object.values(registeredSections)
        .flatMap(sect => sect.map(row => ({
            [row.key]: {
                type: "pressable",
                key: row.key,
                section: sect,
                parent: null,
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
        .reduce((a, c) => Object.assign(a, c), {});

    const isDeveloperSection = (section: any) => {
        const label = `${section?.label ?? ""} ${section?.title ?? ""}`.toLowerCase();
        return label.includes("developer") || section?.settings?.some?.((key: string) => /developer/i.test(key));
    };

    const insertNativeRows = (sections: any[]) => {
        const rows = Object.values(registeredSections).flat().filter(row => row.nativeSection === "developer");
        if (!rows.length) return;
        const target = sections.find(isDeveloperSection);
        if (!target || !Array.isArray(target.settings)) return;
        for (const row of rows) if (!target.settings.includes(row.key)) target.settings.push(row.key);
    };

    // Discord 331 uses one root createList settings model. The recursive 344
    // fallbacks must never run here: they can discover the Account tab's
    // internal sections first and incorrectly nest CloudCord inside Account.
    if (!usesModernSettings()) {
        (globalThis as any).__CLOUDCORD_331_ROOT_SETTINGS__ = true;
        const customRoutes = getCustomRoutes();

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
            insertNativeRows(sections);
            const accountIndex = sections.findIndex((section: any) => section?.settings?.includes?.("ACCOUNT"));
            if (accountIndex < 0) return;
            let index = accountIndex + 1;
            for (const sectionName of Object.keys(registeredSections)) {
                if (sectionName === "CloudCord" && settings.cloudcordSectionHidden) continue;
                const rows = registeredSections[sectionName].filter(row => !row.nativeSection);
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

        insertNativeRows(sections);

        // CloudCord goes right after Discord's first group (Account Settings) so it's easy
        // to find. SettingHookHarness keeps hook state by position, so the insert must be
        // identical every time: it always happens before Discord copies the list (see the
        // before-hooks below) and never moves once present, keeping positions stable.
        let insertAt = Math.min(1, sections.length);
        Object.keys(registeredSections).forEach(sectionName => {
            if (sectionName === "CloudCord" && settings.cloudcordSectionHidden) return;
            const rows = registeredSections[sectionName].filter(row => !row.nativeSection);
            if (!rows.length) return;
            const rowKeys = new Set(rows.map(row => row.key));
            const alreadyExists = sections.some((section: any) =>
                section?.label === sectionName || section?.title === sectionName ||
                section?.settings?.some?.((key: string) => rowKeys.has(key))
            );
            if (!alreadyExists) {
                sections.splice(insertAt++, 0, {
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
                "children", "items", "content", "list", "node", "config", "result"
            ]) visit(value[key], depth + 1);
        };
        visit(root, 0);
    };

    const patchedRenderers = new WeakSet<object>();
    const patchedLists = new WeakSet<object>();
    const patchedScreens = new WeakSet<object>();
    // Android 352 renders a cached createList node through this component.
    // Work on a copy: React Compiler can retain/freeze the original node, and
    // the overview function itself may already have been captured by navigation.
    const prepareListProps = (props: any) => {
        const node = props?.node;
        const sections = node?.sections;
        if (!Array.isArray(sections) || !sections.some(section => section?.settings?.includes?.("ACCOUNT"))) return props;
        if (sections.some(section => section?.label === "CloudCord")) return props;
        const copy = sections.map(section => ({ ...section,
            ...(Array.isArray(section?.settings) ? { settings: [...section.settings] } : {})
        }));
        insertCloudCordSections(copy);
        return { ...props, node: { ...node, sections: copy } };
    };
    const listJsx = (_component: any, element: any) => ({ ...element, props: prepareListProps(element.props) });
    onJsxCreate("SearchableSettingsList", listJsx);
    unpatches.push(() => deleteJsxCreate("SearchableSettingsList", listJsx));
    const patchedSearchLists = new WeakSet<object>();
    const patchSearchList = (module: any) => {
        if (patchedSearchLists.has(module)) return;
        const key = module.SearchableSettingsList ? "SearchableSettingsList" : "default";
        let parent = module, renderKey = key;
        if (typeof parent[renderKey] !== "function") {
            parent = parent[renderKey];
            renderKey = typeof parent?.type === "function" ? "type" : "render";
        }
        if (typeof parent?.[renderKey] !== "function") return;
        unpatches.push(before(renderKey, parent, args => {
            args[0] = prepareListProps(args[0]);
            return args;
        }));
        patchedSearchLists.add(module);
    };
    const patchRendererConfig = (rendererModule: any) => {
        if (patchedRenderers.has(rendererModule)) return;
        const descriptor = Object.getOwnPropertyDescriptor(rendererModule, "SETTING_RENDERER_CONFIG");
        let value = rendererModule.SETTING_RENDERER_CONFIG;
        if (!value || typeof value !== "object") return;
        const saved = new Map<any, Map<string, PropertyDescriptor | undefined>>();
        const merge = (table: any) => {
            const additions = { ...getCustomRoutes(), ...getRows() };
            if (!table || typeof table !== "object") return additions;
            // Preserve the live table: Discord can capture it before reading the
            // namespace again. A copied export alone leaves those readers stale.
            if (Object.isExtensible(table)) {
                let originals = saved.get(table);
                if (!originals) saved.set(table, originals = new Map());
                for (const [key, row] of Object.entries(additions)) {
                    if (!originals.has(key)) originals.set(key, Object.getOwnPropertyDescriptor(table, key));
                    table[key] = row;
                }
                for (const [key, original] of originals) {
                    if (key in additions) continue;
                    if (original) Object.defineProperty(table, key, original);
                    else delete table[key];
                    originals.delete(key);
                }
                return table;
            }
            return { ...table, ...additions };
        };
        merge(value);
        if (descriptor?.configurable !== false) {
            Object.defineProperty(rendererModule, "SETTING_RENDERER_CONFIG", {
                enumerable: descriptor?.enumerable ?? true,
                configurable: true,
                get: () => merge(descriptor?.get ? descriptor.get.call(rendererModule) : value),
                set: next => {
                    if (descriptor?.set) descriptor.set.call(rendererModule, next);
                    value = next;
                    merge(next);
                }
            });
        } else if (!Object.isExtensible(value)) {
            console.warn("CloudCord settings renderer is read-only");
            return;
        }
        patchedRenderers.add(rendererModule);
        unpatches.push(() => {
            for (const [table, originals] of saved) {
                for (const [key, original] of originals) {
                    if (original) Object.defineProperty(table, key, original);
                    else delete table[key];
                }
            }
            if (descriptor?.configurable !== false) {
                Object.defineProperty(rendererModule, "SETTING_RENDERER_CONFIG", descriptor ?? {
                    value, configurable: true, writable: true, enumerable: true
                });
            }
        });
    };

    const patchCreateListModule = (module: any) => {
        if (patchedLists.has(module)) return;
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
        patchedLists.add(module);
    };

    const patchOverview = (module: any) => {
        // Newer screens are React.memo/forwardRef objects rather than a default
        // function. Patch the render function without calling it outside React.
        let parent = module, key = module.SettingsOverviewScreen ? "SettingsOverviewScreen" : "default";
        if (typeof parent[key] !== "function") {
            parent = parent[key];
            key = typeof parent?.type === "function" ? "type" : "render";
        }
        if (!parent || typeof parent[key] !== "function" || patchedScreens.has(parent)) return;
        unpatches.push(before(key, parent, args => {
            args.forEach(insertCloudCordSectionsInTree);
            return args;
        }));
        unpatches.push(after(key, parent, (_, ret) => {
            const tree = findInReactTree(ret, item => Array.isArray(item?.props?.sections));
            insertCloudCordSections(tree?.props?.sections);
            insertCloudCordSectionsInTree(ret);
            return ret;
        }));
        patchedScreens.add(parent);
    };

    const cachedSettingsList = usesCachedSettingsList();
    unpatches.push(observeSettingsModules((exports, path) => {
        // Match exports only after their factory succeeded. Each hook is
        // independent, so a frozen namespace cannot disable the other hooks.
        for (const module of [exports, exports?.default]) {
            if (!module || (typeof module !== "object" && typeof module !== "function")) continue;
            try { if (Object.getOwnPropertyNames(module).includes("SETTING_RENDERER_CONFIG")) patchRendererConfig(module); }
            catch (error) { console.warn("CloudCord settings renderer patch failed", error); }
            if (!cachedSettingsList) {
                try {
                    if (Object.getOwnPropertyNames(module).includes("createList") && typeof module.createList === "function") patchCreateListModule(module);
                } catch (error) { console.warn("CloudCord settings list patch failed", error?.stack ?? error); }
            }
        }
        const list = exports?.SearchableSettingsList ?? exports?.default;
        if (exports?.SearchableSettingsList || path?.endsWith("/SearchableSettingsList.tsx") ||
            [list?.name, list?.displayName, list?.type?.name, list?.render?.name].includes("SearchableSettingsList")) {
            try { patchSearchList(exports); }
            catch (error) { console.warn("CloudCord direct settings list patch failed", error); }
        }
        // Android 352 passes a cached list node through SearchableSettingsList.
        // The JSX and direct list hooks cover cached component references;
        // recursive createList/overview tree hooks only repeat work on renders.
        if (cachedSettingsList) return;
        const screen = exports?.SettingsOverviewScreen ?? exports?.default;
        if (path?.endsWith("/SettingsOverviewScreen.tsx") ||
            [screen?.name, screen?.displayName, screen?.type?.name, screen?.render?.name].includes("SettingsOverviewScreen")) {
            patchOverview(exports);
        }
    }));
};
