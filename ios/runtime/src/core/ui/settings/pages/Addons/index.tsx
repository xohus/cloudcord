import { ScrollView } from "react-native";
import { NavigationNative } from "@metro/common";
import { Stack, TableRow, TableRowGroup } from "@metro/common/components";
import { isFontSupported, isThemeSupported } from "@lib/api/native/loader";

export default function Addons() {
    const navigation = NavigationNative.useNavigation();
    const open = (title: string, load: () => any) => navigation.push("PUPU_CUSTOM_PAGE", {
        title, render: () => { const Page = load().default; return <Page />; }
    });
    return <ScrollView contentContainerStyle={{ paddingBottom: 38 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
            <TableRowGroup title="Add-ons">
                <TableRow arrow label="Installed plugins" onPress={() => open("Plugins", () => require("@core/ui/settings/pages/Plugins"))} />
                <TableRow arrow label="Discover plugins" onPress={() => open("Discover plugins", () => require("@core/ui/settings/pages/PluginBrowser"))} />
                {isThemeSupported() && <TableRow arrow label="Themes" onPress={() => open("Themes", () => require("@core/ui/settings/pages/Themes"))} />}
                {isFontSupported() && <TableRow arrow label="Fonts" onPress={() => open("Fonts", () => require("@core/ui/settings/pages/Fonts"))} />}
                <TableRow arrow label="Cloudsync" subLabel="Back up and sync" onPress={() => open("Cloudsync", () => require("@core/ui/settings/pages/StoreCloud"))} />
            </TableRowGroup>
        </Stack>
    </ScrollView>;
}
