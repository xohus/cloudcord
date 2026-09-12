import { after } from "@lib/api/patcher";
import { TableRow } from "@metro/common/components";
import { findByNameLazy, findByPropsLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";

import { CustomPageRenderer, wrapOnPress } from "./shared";
import { findInReactTree } from "@lib/utils";

const settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
const createListModule = findByPropsLazy("createList");
const SettingsOverviewScreen = findByNameLazy("SettingsOverviewScreen", false);

export function patchTabsUI(unpatches: (() => void | boolean)[]) {
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

    const origRendererConfig = settingConstants.SETTING_RENDERER_CONFIG;
    let rendererConfigValue = settingConstants.SETTING_RENDERER_CONFIG;

    Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
        enumerable: true,
        configurable: true,
        get: () => ({
            ...rendererConfigValue,
            VendettaCustomPage: {
                type: "route",
                title: () => "CloudCord",
                useTitle: () => "CloudCord",
                screen: {
                    route: "VendettaCustomPage",
                    getComponent: () => CustomPageRenderer
                }
            },
            PUPU_CUSTOM_PAGE: {
                type: "route",
                title: () => "CloudCord",
                useTitle: () => "CloudCord",
                screen: {
                    route: "PUPU_CUSTOM_PAGE",
                    getComponent: () => CustomPageRenderer
                }
            },
            BUNNY_CUSTOM_PAGE: {
                type: "route",
                title: () => "CloudCord",
                useTitle: () => "CloudCord",
                screen: {
                    route: "BUNNY_CUSTOM_PAGE",
                    getComponent: () => CustomPageRenderer
                }
            },
            ...getRows()
        }),
        set: v => rendererConfigValue = v,
    });

    unpatches.push(() => {
        Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
            value: origRendererConfig,
            writable: true,
            get: undefined,
            set: undefined
        });
    });

    try{
        unpatches.push(after("createList", createListModule, function(args, ret) {
            const [config] = args;
        
            insertCloudCordSections(config?.sections);
            return ret;
        },));
    } catch {}

    try {
        unpatches.push(after("default", SettingsOverviewScreen, (_, ret) => {
            const tree = findInReactTree(ret, item => Array.isArray(item?.props?.sections));
            insertCloudCordSections(tree?.props?.sections);
            return ret;
        }));
    } catch {}
};
