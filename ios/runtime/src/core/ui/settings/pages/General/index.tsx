import { isSafeMode, toggleSafeMode } from "@core/debug/safeMode";
import { Strings } from "@core/i18n";
import { PupuIcon } from "@core/ui/settings";
import About from "@core/ui/settings/pages/General/About";
import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { getDebugInfo } from "@lib/api/debug";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { settings } from "@lib/api/settings";
import { openAlert } from "@lib/ui/alerts";
import { GITHUB } from "@lib/utils/constants";
import { NavigationNative } from "@metro/common";
import { AlertActionButton, AlertActions, AlertModal, Stack, TableRow, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { Linking, ScrollView } from "react-native";

export default function General() {
    useProxy(settings);

    const debugInfo = getDebugInfo();
    const navigation = NavigationNative.useNavigation();

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title={Strings.INFO}>
                    <TableRow
                        label={Strings.PUPU}
                        icon={<TableRow.Icon source={{ uri: PupuIcon }} />}
                        trailing={<TableRow.TrailingText text={debugInfo.bunny.version} />}
                    />
                    <TableRow
                        label={"Discord"}
                        icon={<TableRow.Icon source={findAssetId("Discord")!} />}
                        trailing={<TableRow.TrailingText text={`${debugInfo.discord.version} (${debugInfo.discord.build})`} />}
                    />
                    <TableRow
                        arrow
                        label={Strings.ABOUT}
                        icon={<TableRow.Icon source={findAssetId("CircleInformationIcon-primary")!} />}
                        onPress={() => navigation.push("PUPU_CUSTOM_PAGE", {
                            title: Strings.ABOUT,
                            render: () => <About />,
                        })}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.LINKS}>
                    <TableRow
                        arrow={true}
                        label={Strings.DISCORD_SERVER}
                        icon={<TableRow.Icon source={findAssetId("Discord")!} />}
                        onPress={() => Linking.openURL("https://discord.gg/EBEZJ84zBT")}
                    />
                    <TableRow
                        arrow={true}
                        label="Website"
                        icon={<TableRow.Icon source={findAssetId("GlobeIcon") || findAssetId("CircleInformationIcon-primary")} />}
                        onPress={() => Linking.openURL("https://getcloudcord.com")}
                    />
                    <TableRow
                        arrow={true}
                        label={Strings.GITHUB}
                        icon={<TableRow.Icon source={findAssetId("img_account_sync_github_white")!} />}
                        onPress={() => Linking.openURL(GITHUB)}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.ACTIONS}>
                    <TableSwitchRow
                        label="Auto-update"
                        subLabel="Check every five minutes. Saved updates apply after Discord restarts."
                        value={(settings as any).cloudcordAutoUpdate !== false}
                        onValueChange={(value: boolean) => (settings as any).cloudcordAutoUpdate = value}
                    />
                    <TableRow label="Update status" subLabel={(settings as any).cloudcordUpdateStatus || "Waiting for the next update check"} />
                    <TableRow arrow label="Diagnostics" subLabel="Updates, safe mode, troubleshooting, and local resets"
                        onPress={() => navigation.push("PUPU_CUSTOM_PAGE", { title: "Diagnostics", render: () => {
                            const Diagnostics = require("@core/ui/settings/pages/Diagnostics").default;
                            return <Diagnostics />;
                        } })} />
                    <TableSwitchRow
                        label="Capture diagnostic events"
                        subLabel="Keep troubleshooting details while you use CloudCord"
                        icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                        value={settings.cloudcordDiagnosticsEnabled === true}
                        onValueChange={(value: boolean) => settings.cloudcordDiagnosticsEnabled = value}
                    />
                    <TableRow
                        label={(globalThis as any).__CLOUDCORD_ORIGINAL_RAIN__ ? "Update runtime & restart" : Strings.RELOAD_DISCORD}
                        icon={<TableRow.Icon source={findAssetId("RetryIcon")!} />}
                        onPress={() => {
                            Promise.resolve(BundleUpdaterManager.reload()).catch((error: any) => {
                                require("react-native").Alert.alert("Update failed", error?.message ?? "Try again later.");
                            });
                        }}
                    />
                    <TableSwitchRow
                        label={"Safe Mode"}
                        subLabel={"Load CloudCord without loading add-ons"}
                        icon={<TableRow.Icon source={findAssetId("ShieldIcon")!} />}
                        value={isSafeMode()}
                        onValueChange={(to: boolean) => {
                            toggleSafeMode({ to, reload: false });
                            openAlert(
                                "bunny-reload-safe-mode",
                                <AlertModal
                                    title="Reload now?"
                                    content={!to ? "All add-ons will load normally." : "All add-ons will be temporarily disabled upon reload."}
                                    actions={<AlertActions>
                                        <AlertActionButton
                                            text="Reload Now"
                                            variant="destructive"
                                            onPress={() => BundleUpdaterManager.reload()}
                                        />
                                        <AlertActionButton text="Later" variant="secondary" />
                                    </AlertActions>}
                                />
                            );
                        }}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.MISCELLANEOUS}>
                    <TableSwitchRow
                        label="Hide CloudCord in settings"
                        subLabel="moves the controls into discord's developer options after a reload"
                        icon={<TableRow.Icon source={findAssetId("SettingsIcon") || findAssetId("WrenchIcon")} />}
                        value={settings.cloudcordSectionHidden ?? false}
                        onValueChange={(value: boolean) => settings.cloudcordSectionHidden = value}
                    />
                    <TableSwitchRow
                        label={Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS}
                        subLabel={Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS_DESC}
                        icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                        value={settings.enableDiscordDeveloperSettings}
                        onValueChange={(v: boolean) => {
                            settings.enableDiscordDeveloperSettings = v;
                        }}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
