import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { settings } from "@lib/api/settings";
import { Button, Stack, TableRow, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { ScrollView } from "react-native";

const tabs = [
    ["BOTCORD", "Botcord"],
    ["FAKE_PROFILE", "Profile"],
    ["STORE_CLOUD", "Cloudsync"],
    ["BUNNY_PLUGINS", "Plugins"],
    ["BUNNY_THEMES", "Themes"],
    ["BUNNY_FONTS", "Fonts"],
    ["CLOUDCORD_PLUGIN_BROWSER", "Discover plugins"],
] as const;

export default function Customization() {
    const state = useProxy(settings);
    const hidden = state.cloudcordHiddenTabs ?? [];
    const setVisible = (key: string, visible: boolean) => {
        settings.cloudcordHiddenTabs = visible
            ? hidden.filter(item => item !== key)
            : [...new Set([...hidden, key])];
    };

    return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
            <TableRowGroup title="Settings visibility">
                <TableSwitchRow
                    label="Show the CloudCord section"
                    subLabel="turn this off to keep cloudcord hidden in developer options"
                    icon={<TableRow.Icon source={findAssetId("SettingsIcon") || findAssetId("WrenchIcon")} />}
                    value={!(state.cloudcordSectionHidden ?? false)}
                    onValueChange={(value: boolean) => settings.cloudcordSectionHidden = !value}
                />
                {tabs.map(([key, label]) => <TableSwitchRow
                    key={key}
                    label={`Show ${label}`}
                    value={!hidden.includes(key)}
                    onValueChange={(value: boolean) => setVisible(key, value)}
                />)}
                <TableRow
                    label="Apply changes"
                    subLabel="reload cloudcord to update the settings list"
                    trailing={<Button size="sm" text="Reload" onPress={() => BundleUpdaterManager.reload()} />}
                />
            </TableRowGroup>
        </Stack>
    </ScrollView>;
}
