// Good luck reading this!
import { lazy } from "react";
import type { ImageURISource } from "react-native";

import { patchPanelUI } from "./patches/panel";
import { patchTabsUI } from "./patches/tabs";

export interface RowConfig {
    key: string;
    title: () => string;
    onPress?: () => any;
    render?: Parameters<typeof lazy>[0];
    icon?: ImageURISource | number;
    IconComponent?: React.ReactNode,
    usePredicate?: () => boolean,
    useTrailing?: () => string | JSX.Element
}

export const registeredSections = {} as {
    [key: string]: RowConfig[];
};

export function registerSection(section: { name: string; items: RowConfig[]; }) {
    registeredSections[section.name] = section.items;
    return () => delete registeredSections[section.name];
}

/**
 * @internal
 */
export function patchSettings() {
    const unpatches = new Array<() => boolean>;

    patchTabsUI(unpatches);
    // panel.tsx targets Discord 331's class-based settings tree. Applying it
    // to 344's SettingsOverviewScreen can invalidate the whole navigation
    // render, which presents as a blank account. tabs.tsx owns 344 settings.
    if (!(globalThis as any).__CLOUDCORD_BRIDGELESS__) patchPanelUI(unpatches);

    return () => unpatches.forEach(u => u());
}
