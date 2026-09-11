import PupuIcon from "@assets/icons/cloudcord.png";
import { Strings } from "@core/i18n";
import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { isFontSupported, isThemeSupported } from "@lib/api/native/loader";
import { settings } from "@lib/api/settings";
import { registerSection } from "@ui/settings";
import type { RowConfig } from "@ui/settings";
import { version } from "bunny-build-info";

export { PupuIcon };

export default function initSettings() {
    // Install the opt-in capture hooks at startup so actions performed before
    // opening the Diagnostics page can be included in the copied snapshot.
    void import("@core/ui/settings/pages/Diagnostics").then(module => module.initializeDiagnosticsCapture()).catch(() => {});
    const baseItems: RowConfig[] = [
            {
                key: "CLOUDCORD",
                title: () => Strings.PUPU,
                icon: { uri: PupuIcon },
                render: () => import("@core/ui/settings/pages/General"),
                useTrailing: () => `(${version})`
            },
            {
                key: "STORE_CLOUD",
                title: () => "CloudSync",
                icon: { uri: PupuIcon },
                render: () => import("@core/ui/settings/pages/StoreCloud")
            },
            {
                key: "BOTCORD",
                title: () => "BotCord",
                icon: findAssetId("RobotIcon") || findAssetId("AppsIcon"),
                render: () => import("@core/ui/settings/pages/BotCord")
            },
            {
                key: "BUNNY_PLUGINS",
                title: () => Strings.PLUGINS,
                icon: findAssetId("AppsIcon"),
                render: () => import("@core/ui/settings/pages/Plugins")
            },
            {
                key: "BUNNY_THEMES",
                title: () => Strings.THEMES,
                icon: findAssetId("PaintPaletteIcon"),
                render: () => import("@core/ui/settings/pages/Themes"),
                usePredicate: () => isThemeSupported()
            },
            {
                key: "BUNNY_FONTS",
                title: () => Strings.FONTS,
                icon: findAssetId("LettersIcon"),
                render: () => import("@core/ui/settings/pages/Fonts"),
                usePredicate: () => isFontSupported()
            },
            {
                key: "BUNNY_DEVELOPER",
                title: () => "Diagnostics",
                icon: findAssetId("WrenchIcon"),
                render: () => import("@core/ui/settings/pages/Diagnostics"),
                usePredicate: () => settings.cloudcordDiagnosticsEnabled ?? false
            }
        ];

    const configurableKeys = new Set(["BOTCORD", "STORE_CLOUD", "BUNNY_PLUGINS", "BUNNY_THEMES", "BUNNY_FONTS"]);
    const configuredOrder = settings.cloudcordTabOrder ?? [];
    const orderIndex = new Map(configuredOrder.map((key, index) => [key, index]));
    const items = baseItems
        .map(row => {
            if (!configurableKeys.has(row.key)) return row;
            const originalPredicate = row.usePredicate;
            return {
                ...row,
                usePredicate: () => {
                    const state = useProxy(settings);
                    return !(state.cloudcordHiddenTabs ?? []).includes(row.key) && (originalPredicate?.() ?? true);
                },
            };
        })
        .sort((a, b) => {
            const rank = (key: string) => key === "CLOUDCORD" ? -1 : key === "BUNNY_DEVELOPER" ? Number.MAX_SAFE_INTEGER : (orderIndex.get(key) ?? baseItems.findIndex(item => item.key === key));
            return rank(a.key) - rank(b.key);
        });

    registerSection({ name: "CloudCord", items });

    registerSection({
        name: "Bunny",
        items: []
    });

    registerSection({
        name: "Revenge",
        items: []
    });

    registerSection({
        name: "Vendetta",
        items: []
    });
}
