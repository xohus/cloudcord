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

function safeAsset(...names: string[]) {
    for (const name of names) {
        try {
            const asset = findAssetId(name);
            if (asset) return asset;
        } catch {}
    }
    return PupuIcon;
}

export default function initSettings() {
    // Install the opt-in capture hooks at startup so actions performed before
    // opening the Diagnostics page can be included in the copied snapshot.
    // Discord 344 may still be restoring its account and navigation requests
    // when CloudCord registers settings. Diagnostics can be enabled explicitly
    // after startup; never wrap global fetch/JSX during bridgeless restoration.
    if (settings.cloudcordDiagnosticsEnabled === true)
        void import("@core/ui/settings/pages/Diagnostics").then(module => module.initializeDiagnosticsCapture()).catch(() => {});
    const coreItem: RowConfig = {
                key: "CLOUDCORD",
                title: () => "Overview",
                icon: safeAsset("CircleInformationIcon-primary", "CircleInformationIcon", "InfoIcon"),
                render: () => import("@core/ui/settings/pages/General"),
                useTrailing: () => `(${version})`
            };

    const hiddenControlsItem: RowConfig = {
        key: "CLOUDCORD_HIDDEN_CONTROLS",
        title: () => "Developer options",
        icon: safeAsset("WrenchIcon", "SettingsIcon"),
        render: () => import("@core/ui/settings/pages/Customization"),
        usePredicate: () => useProxy(settings).cloudcordSectionHidden ?? false,
        useTrailing: () => "·",
        nativeSection: "developer"
    };

    const baseItems: RowConfig[] = [
            coreItem,
            {
                key: "STORE_CLOUD",
                title: () => "Cloudsync",
                icon: { uri: PupuIcon },
                render: () => import("@core/ui/settings/pages/StoreCloud")
            },
            {
                key: "BOTCORD",
                title: () => "Botcord",
                icon: safeAsset("RobotIcon", "AppsIcon"),
                render: () => import("@core/ui/settings/pages/BotCord")
            },
            {
                key: "BUNNY_PLUGINS",
                title: () => "Add-ons",
                icon: safeAsset("AppsIcon"),
                render: () => import("@core/ui/settings/pages/Addons")
            },
            {
                key: "CLOUDCORD_PLUGIN_BROWSER",
                title: () => "Discover plugins",
                icon: safeAsset("ChannelListMagnifyingGlassIcon", "SearchIcon", "AppsIcon"),
                render: () => import("@core/ui/settings/pages/PluginBrowser")
            },
            {
                key: "BUNNY_THEMES",
                title: () => Strings.THEMES,
                icon: safeAsset("PaintPaletteIcon", "ThemeIcon"),
                render: () => import("@core/ui/settings/pages/Themes"),
                usePredicate: () => isThemeSupported()
            },
            {
                key: "BUNNY_FONTS",
                title: () => Strings.FONTS,
                icon: safeAsset("LettersIcon", "TextIcon"),
                render: () => import("@core/ui/settings/pages/Fonts"),
                usePredicate: () => isFontSupported()
            },
            {
                key: "CLOUDCORD_DIAGNOSTICS",
                title: () => "Diagnostics",
                icon: safeAsset("WrenchIcon", "SettingsIcon"),
                render: () => import("@core/ui/settings/pages/Diagnostics"),
                usePredicate: () => true
            }
        ];

    const defaultOrder = ["CLOUDCORD", "BOTCORD", "FAKE_PROFILE", "BUNNY_PLUGINS", "CLOUDCORD_DIAGNOSTICS"];
    const configurableKeys = new Set(defaultOrder.filter(key => key !== "CLOUDCORD"));
    const configuredOrder = settings.cloudcordTabOrder ?? [];
    const orderIndex = new Map(configuredOrder.map((key, index) => [key, index]));
    const items = [...baseItems, hiddenControlsItem]
        .filter(row => !["STORE_CLOUD", "CLOUDCORD_PLUGIN_BROWSER", "BUNNY_THEMES", "BUNNY_FONTS", "CLOUDCORD_RECOVERY"].includes(row.key))
        .map(row => {
            if (row.nativeSection) return row;
            const originalPredicate = row.usePredicate;
            return {
                ...row,
                usePredicate: () => {
                    const state = useProxy(settings);
                    if (state.cloudcordSectionHidden ?? false) return false;
                    if (configurableKeys.has(row.key) && (state.cloudcordHiddenTabs ?? []).includes(row.key)) return false;
                    return originalPredicate?.() ?? true;
                },
            };
        })
        .sort((a, b) => {
            const rank = (key: string) => key === "CLOUDCORD" ? -1 : key === "BUNNY_DEVELOPER" ? Number.MAX_SAFE_INTEGER : (orderIndex.get(key) ?? (defaultOrder.includes(key) ? defaultOrder.indexOf(key) : defaultOrder.length));
            return rank(a.key) - rank(b.key);
        });

    registerSection({ name: "CloudCord", items });
    (globalThis as any).__CLOUDCORD_SETTINGS_CORE_REGISTERED__ = true;

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
