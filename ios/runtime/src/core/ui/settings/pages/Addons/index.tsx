import { ScrollView } from "react-native";
import { NavigationNative } from "@metro/common";
import { Stack, TableRow, TableRowGroup } from "@metro/common/components";
import { isFontSupported, isThemeSupported } from "@lib/api/native/loader";
import { findAssetId } from "@lib/api/assets";

function icon(...names: string[]) {
    for (const name of names) {
        try { const id = findAssetId(name); if (id) return <TableRow.Icon source={id} />; } catch {}
    }
    return undefined;
}

export default function Addons() {
    const navigation = NavigationNative.useNavigation();
    const open = (title: string, load: () => any) => navigation.push("PUPU_CUSTOM_PAGE", {
        title, render: () => { const Page = load().default; return <Page />; }
    });
    return <ScrollView contentContainerStyle={{ paddingBottom: 38 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
            <TableRowGroup title="Add-ons">
                <TableRow arrow label="Installed plugins" subLabel="Manage and configure your plugins" icon={icon("PuzzlePieceIcon", "AppsIcon", "SettingsIcon")} onPress={() => open("Plugins", () => require("@core/ui/settings/pages/Plugins"))} />
                <TableRow arrow label="Discover plugins" subLabel="Browse and install new plugins" icon={icon("ChannelListMagnifyingGlassIcon", "SearchIcon", "SettingsIcon")} onPress={() => open("Discover plugins", () => require("@core/ui/settings/pages/PluginBrowser"))} />
                {isThemeSupported() && <TableRow arrow label="Themes" subLabel="Manage your Discord themes" icon={icon("PaintPaletteIcon", "ThemeIcon", "SettingsIcon")} onPress={() => open("Themes", () => require("@core/ui/settings/pages/Themes"))} />}
                {isFontSupported() && <TableRow arrow label="Fonts" subLabel="Choose and manage fonts" icon={icon("LettersIcon", "TextIcon", "SettingsIcon")} onPress={() => open("Fonts", () => require("@core/ui/settings/pages/Fonts"))} />}
                <TableRow arrow label="Cloudsync" subLabel="Back up and sync your settings" icon={icon("CloudIcon", "SyncIcon", "SettingsIcon")} onPress={() => open("Cloudsync", () => require("@core/ui/settings/pages/StoreCloud"))} />
            </TableRowGroup>
        </Stack>
    </ScrollView>;
}
