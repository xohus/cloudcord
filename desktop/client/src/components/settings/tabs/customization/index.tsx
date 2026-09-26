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

function CloudCordCustomization() {
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
        <SettingsTab>
            <Heading className={Margins.top16}>Sidebar Visibility</Heading>
            <Paragraph className={Margins.bottom16}>
                CloudCord is in compact mode beside Discord's account settings. The small dot on this tab is its subtle CloudCord indicator. Turn the full section back on here whenever you want it. Close and reopen Settings after changing the mode.
            </Paragraph>

            <FormSwitch
                title="Show the CloudCord section"
                description="Turn this on for the full CloudCord sidebar section, or leave it off to keep this compact Client Customization tab."
                value={values.showCloudCordSection}
                onChange={value => toggle("showCloudCordSection", value)}
                hideBorder
            />
            <FormSwitch title="Show section heading" value={values.showSectionHeading} onChange={value => toggle("showSectionHeading", value)} hideBorder />
            <FormSwitch title="Show BotCord" value={values.showBotCordTab} onChange={value => toggle("showBotCordTab", value)} hideBorder />
            <FormSwitch title="Show Fake Profile" value={values.showFakeProfileTab} onChange={value => toggle("showFakeProfileTab", value)} hideBorder />
            <FormSwitch title="Show CloudSync" value={values.showCloudSyncTab} onChange={value => toggle("showCloudSyncTab", value)} hideBorder />
            <FormSwitch title="Show Plugins" value={values.showPluginsTab} onChange={value => toggle("showPluginsTab", value)} hideBorder />
            <FormSwitch title="Show Themes" value={values.showThemesTab} onChange={value => toggle("showThemesTab", value)} hideBorder />
            <FormSwitch title="Show Backup & Restore" value={values.showBackupTab} onChange={value => toggle("showBackupTab", value)} hideBorder />
            <FormSwitch title="Show Diagnostics" value={values.diagnosticsMode} onChange={value => toggle("diagnosticsMode", value)} hideBorder />
        </SettingsTab>
    );
}

export default wrapTab(CloudCordCustomization, "Client Customization · CloudCord");
