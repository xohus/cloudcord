/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    CLOUDCORD_SYNC_HOST,
    connectCloudCordSync,
    deleteCloudCordSettings,
    disconnectCloudCordSync,
    restoreCloudCordSettings,
    uploadCloudCordSettings,
    useCloudCordSyncAuthorization
} from "@api/CloudCordSync";
import { downloadSettingsBackup, uploadSettingsBackup } from "@api/SettingsSync/offline";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Alerts, useState } from "@webpack/common";

function CloudTab() {
    const connected = useCloudCordSyncAuthorization();
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    const run = async (label: string, action: () => Promise<void>, done: string) => {
        setBusy(true); setStatus(label);
        try { await action(); setStatus(done); }
        catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
        finally { setBusy(false); }
    };

    return <SettingsTab>
        <Heading className={Margins.top16}>Cloud Sync</Heading>
        <Paragraph className={Margins.bottom16}>The same Cloud Sync account and service used by CloudCord mobile, adapted to preserve the complete desktop configuration.</Paragraph>
        <Notice.Info className={Margins.bottom16}>
            A desktop backup includes plugins and their data, settings, themes, fonts, QuickCSS, BotCord accounts and Fake Profile data. Restoring requires a Discord restart.
        </Notice.Info>

        <Flex gap="8px" alignItems="center">
            <Button disabled={busy} variant={connected ? "secondary" : "primary"} onClick={() => connected
                ? run("Disconnecting...", disconnectCloudCordSync, "Cloud Sync disconnected.")
                : connectCloudCordSync(setStatus)}>
                {connected ? "Disconnect" : "Connect Cloud Sync"}
            </Button>
            <Paragraph color="text-muted">{connected ? "Connected" : "Not connected"} Â· {CLOUDCORD_SYNC_HOST}</Paragraph>
        </Flex>

        <Divider className={Margins.top20} />
        <Heading className={Margins.top20}>Sync this desktop</Heading>
        <Paragraph className={Margins.bottom16}>Upload replaces the previous CloudCord desktop snapshot. Restore downloads it and applies everything locally.</Paragraph>
        <Flex gap="8px" style={{ flexWrap: "wrap" }}>
            <Button disabled={!connected || busy} onClick={() => run("Uploading everything...", uploadCloudCordSettings, "Cloud backup updated. All plugin data was included.")}>Upload Everything</Button>
            <Button disabled={!connected || busy} variant="secondary" onClick={() => Alerts.show({
                title: "Restore CloudCord desktop?",
                body: "This replaces your local CloudCord settings with the cloud copy. Restart Discord afterward.",
                confirmText: "Restore",
                cancelText: "Cancel",
                onConfirm: () => run("Restoring everything...", restoreCloudCordSettings, "Restored. Restart Discord to finish.")
            })}>Restore Everything</Button>
        </Flex>

        <Divider className={Margins.top20} />
        <Heading className={Margins.top20}>Local backup</Heading>
        <Paragraph className={Margins.bottom16}>Keep a separate file you control. This also includes all plugin and CloudCord feature data.</Paragraph>
        <Flex gap="8px">
            <Button variant="secondary" onClick={() => downloadSettingsBackup("all")}>Save Backup File</Button>
            <Button variant="secondary" onClick={() => uploadSettingsBackup("all")}>Load Backup File</Button>
        </Flex>

        <Divider className={Margins.top20} />
        <Button variant="dangerSecondary" disabled={!connected || busy} onClick={() => Alerts.show({
            title: "Delete desktop cloud backup?",
            body: "This removes only the CloudCord desktop snapshot. Your mobile Cloud Sync data stays untouched.",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: () => run("Deleting desktop backup...", deleteCloudCordSettings, "Desktop cloud backup deleted.")
        })}>Delete Desktop Cloud Backup</Button>

        {status && <Paragraph className={Margins.top16}>{busy ? "Working: " : ""}{status}</Paragraph>}
    </SettingsTab>;
}

export default wrapTab(CloudTab, "Cloud Sync");

