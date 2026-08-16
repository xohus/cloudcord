/*
 * CloudCord, a Discord desktop client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { authorizeCloud, deauthorizeCloud } from "@api/SettingsSync/cloudSetup";
import { deleteCloudSettings, getCloudSettings, putCloudSettings } from "@api/SettingsSync/cloudSync";
import { downloadSettingsBackup, uploadSettingsBackup } from "@api/SettingsSync/offline";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Alerts, useEffect, useState } from "@webpack/common";

const VENCLOUD_URL = "https://api.vencord.dev/";

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url", "cloud.settingsSync"]);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (settings.cloud.url !== VENCLOUD_URL) {
            settings.cloud.url = VENCLOUD_URL;
            settings.cloud.authenticated = false;
        }
    }, []);

    const run = async (label: string, action: () => Promise<unknown>, done: string) => {
        setBusy(true); setStatus(label);
        try { await action(); setStatus(done); }
        catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
    };

    return <SettingsTab>
        <Heading className={Margins.top16}>Cloud Sync</Heading>
        <Paragraph className={Margins.bottom16}>Sync CloudCord desktop through VenCloud. Installer updates still preserve your local data.</Paragraph>
        <Notice.Info className={Margins.bottom16}>Cloud backups include plugin settings, themes, QuickCSS, BotCord, Fake Profile and DataStore content.</Notice.Info>

        <FormSwitch
            title="Connect VenCloud"
            description={settings.cloud.authenticated ? "Connected to VenCloud." : "Authorize this Discord account with VenCloud."}
            value={settings.cloud.authenticated}
            onChange={value => value ? authorizeCloud() : run("Disconnecting...", async () => { await deauthorizeCloud(); settings.cloud.authenticated = false; }, "Disconnected.")}
            hideBorder
        />
        <FormSwitch
            title="Automatic settings sync"
            description="Keep this desktop synchronized after connecting."
            value={settings.cloud.settingsSync}
            disabled={!settings.cloud.authenticated}
            onChange={value => { settings.cloud.settingsSync = value; }}
            hideBorder
        />

        <Divider className={Margins.top20} />
        <Heading className={Margins.top20}>Sync now</Heading>
        <Flex gap="8px" className={Margins.top16} style={{ flexWrap: "wrap" }}>
            <Button disabled={!settings.cloud.authenticated || busy} onClick={() => run("Uploading...", () => putCloudSettings(true), "Cloud backup updated.")}>Upload Everything</Button>
            <Button variant="secondary" disabled={!settings.cloud.authenticated || busy} onClick={() => run("Restoring...", () => getCloudSettings(true, true), "Restored. Restart Discord to finish.")}>Restore Everything</Button>
            <Button variant="secondary" onClick={() => downloadSettingsBackup("all")}>Save Backup File</Button>
            <Button variant="secondary" onClick={() => uploadSettingsBackup("all")}>Load Backup File</Button>
        </Flex>

        <Divider className={Margins.top20} />
        <Button variant="dangerSecondary" disabled={!settings.cloud.authenticated || busy} onClick={() => Alerts.show({
            title: "Delete cloud backup?",
            body: "This permanently deletes the synchronized settings stored for this account.",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: () => run("Deleting...", deleteCloudSettings, "Cloud backup deleted.")
        })}>Delete Cloud Backup</Button>
        {status && <Paragraph className={Margins.top16}>{busy ? "Working: " : ""}{status}</Paragraph>}
    </SettingsTab>;
}

export default wrapTab(CloudTab, "Cloud Sync");

