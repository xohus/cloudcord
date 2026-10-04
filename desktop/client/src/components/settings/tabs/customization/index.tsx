/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { settings } from "@plugins/_core/settings";
import { Margins } from "@utils/margins";

export function CloudCordDeveloperControls() {
    const values = settings.use([
        "showCloudCordSection",
        "showSectionHeading",
        "showBotCordTab",
        "showFakeProfileTab",
        "showCloudSyncTab",
        "showPluginsTab",
        "showThemesTab",
        "showBackupTab",
        "diagnosticsMode"
    ]);

    const toggle = (key: keyof typeof values, value: boolean) => {
        settings.store[key] = value;
    };

    return (
        <>
            <Heading className={Margins.top16}>Sidebar Visibility</Heading>
            <Paragraph className={Margins.bottom16}>
                choose what shows in settings. close and reopen settings after changing this.
            </Paragraph>

            <FormSwitch
                title="Show the CloudCord section"
                description="turn this on to bring the cloudcord section back. leave it off to keep everything hidden here."
                value={values.showCloudCordSection}
                onChange={value => toggle("showCloudCordSection", value)}
                hideBorder
            />
            <FormSwitch title="Show section heading" value={values.showSectionHeading} onChange={value => toggle("showSectionHeading", value)} hideBorder />
            <FormSwitch title="Show Botcord" value={values.showBotCordTab} onChange={value => toggle("showBotCordTab", value)} hideBorder />
            <FormSwitch title="Show Profile" value={values.showFakeProfileTab} onChange={value => toggle("showFakeProfileTab", value)} hideBorder />
            <FormSwitch title="Show Cloudsync in Add-ons" value={values.showCloudSyncTab} onChange={value => toggle("showCloudSyncTab", value)} hideBorder />
            <FormSwitch title="Show Plugins" value={values.showPluginsTab} onChange={value => toggle("showPluginsTab", value)} hideBorder />
            <FormSwitch title="Show Themes" value={values.showThemesTab} onChange={value => toggle("showThemesTab", value)} hideBorder />
            <FormSwitch title="Show Backup & Restore" value={values.showBackupTab} onChange={value => toggle("showBackupTab", value)} hideBorder />
            <FormSwitch title="Advanced diagnostics" value={values.diagnosticsMode} onChange={value => toggle("diagnosticsMode", value)} hideBorder />
        </>
    );
}

function CloudCordCustomization() {
    return <SettingsTab><CloudCordDeveloperControls /></SettingsTab>;
}

export default wrapTab(CloudCordCustomization, "Client Customization · CloudCord");
