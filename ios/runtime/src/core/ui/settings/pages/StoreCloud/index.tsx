import { VdPluginManager } from "@core/vendetta/plugins";
import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { showToast } from "@lib/ui/toasts";
import { Card, Stack, TableRow, TableRowGroup, Text } from "@metro/common/components";
import { useState } from "react";
import { ScrollView, View } from "react-native";

const PLUGIN_URL = "https://revenge.nexpid.xyz/cloud-sync/";
const STORECLOUD_ICON = "https://raw.githubusercontent.com/xohus/cloudcord/main/cloudcord-favicon.png";

export default function StoreCloud() {
    useProxy(VdPluginManager.plugins);

    const [busy, setBusy] = useState(false);
    const plugin = VdPluginManager.plugins[PLUGIN_URL];
    const SettingsComponent = plugin?.enabled ? VdPluginManager.getSettings(PLUGIN_URL) : null;

    async function enableStoreCloud() {
        if (busy) return;
        setBusy(true);
        try {
            if (!plugin) await VdPluginManager.installPlugin(PLUGIN_URL, true);
            else if (!plugin.enabled) await VdPluginManager.startPlugin(PLUGIN_URL);
            showToast("StoreCloud is ready", findAssetId("Check"));
        } catch (error: any) {
            console.error("[CloudCord] StoreCloud failed", error);
            showToast(error?.message ?? "StoreCloud failed");
        } finally {
            setBusy(false);
        }
    }

    if (SettingsComponent) return <SettingsComponent />;

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="CloudSync">
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                        <Text variant="heading-md/semibold" color="text-normal">CloudSync</Text>
                        <Text variant="text-sm/medium" color="text-muted">
                            Sync supported CloudCord settings and manage backups across mobile devices.
                        </Text>
                    </View>
                    <TableRow
                        arrow
                        label={plugin ? "Start StoreCloud" : "Enable StoreCloud"}
                        subLabel={busy ? "Please wait..." : "Open the StoreCloud sync interface"}
                        icon={<TableRow.Icon source={{ uri: STORECLOUD_ICON }} />}
                        onPress={enableStoreCloud}
                    />
                </TableRowGroup>
                <Card border="strong">
                    <View style={{ padding: 12 }}>
                        <Text variant="text-sm/medium" color="text-muted">
                            StoreCloud uses the existing mobile sync engine for OAuth, synchronization, backups, and files.
                        </Text>
                    </View>
                </Card>
            </Stack>
        </ScrollView>
    );
}
