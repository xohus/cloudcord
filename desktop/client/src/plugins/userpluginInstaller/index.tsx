/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./misc/style.css";

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Notice } from "@components/Notice";
import plSettings from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Alerts } from "@webpack/common";

import SettingsTab from "./components/SettingsTab";
import UserpluginInstallButton from "./components/UserpluginInstallButton";
import { VariableWithCallbacks } from "./VariableWithCallbacks";

// @ts-ignore
export const Native = VencordNative.pluginHelpers.UserpluginInstaller as PluginNative<typeof import("./native")>;
export const OpenSettingsModule = findByPropsLazy("openUserSettings");
const AppsIcon = findComponentByCodeLazy("2.95H20a2 2 0");

export const settings = definePluginSettings({
    allowlistedChannels: {
        type: OptionType.STRING,
        description: "Comma separated list of channels where the Install Plugin button should be displayed."
    },
    notifyIfUpdate: {
        type: OptionType.BOOLEAN,
        description: "Show a CloudCord notification if outside plugins need to be updated",
        default: true
    },
    neverNotifyForPlugins: {
        type: OptionType.STRING,
        description: "Never show update notifications for these plugins (you can still update them from the UserPlugins tab)",
        default: ""
    },
    setGitPath: {
        type: OptionType.COMPONENT,
        component: () => <Button onClick={() => {
            Native.openGitPathModal();
        }} variant="secondary">
            Set Git path
        </Button>
    }
});

export default definePlugin({
    name: "UserpluginInstaller",
    description: "Add and update outside plugins from trusted repository links.",
    settingsAboutComponent: () => (
        <Notice.Warning>
            CloudCord does not review outside plugins. They run code inside Discord, so only install links from developers you trust.
        </Notice.Warning>
    ),
    async checkPluginUpdates() {
        for (const p of this.plugins.value()) {
            if (await Native.isUpdateAvailableForPlugin(p.directory!)) {
                const t = this.pluginsWithUpdates.value().plugins;
                t.push(p.directory!);
                this.pluginsWithUpdates.value({
                    finished: false,
                    plugins: t
                });
            }
        }
        const t = this.pluginsWithUpdates.value().plugins;
        this.pluginsWithUpdates.value({
            finished: true,
            plugins: t
        });
    },
    section: {
        key: "cloudcord_userplugins",
        title: "Outside Plugins",
        panelTitle: "Outside Plugins",
        Component: SettingsTab,
        Icon: AppsIcon
    },
    async start() {
        if (!VencordNative.pluginHelpers.UserpluginInstaller) return void Alerts.show({
            title: "UserpluginInstaller not fully loaded",
            body: "You need to restart to allow the native to be loaded :)",
            confirmText: "Restart now",
            onConfirm() {
                relaunch();
            },
            cancelText: "Later"
        });

        await Native.ensurePluginsDirectory();

        plSettings.customEntries.push(this.section);

        this.pluginsWithUpdates.registerCallback((value, id) => {
            if (value.plugins.length === 0) return;
            if (settings.store.neverNotifyForPlugins.split(",").map(t => t.trim().toLowerCase()).includes(value.plugins[value.plugins.length - 1].toLowerCase()))
                return;
            this.pluginsWithUpdates.deregisterCallback(id);
            if (settings.store.notifyIfUpdate)
                showNotification({
                    title: "Some UserPlugins are out of date!",
                    body: "Click to open the UserPlugin Updater",
                    noPersist: true,
                    permanent: true,
                    onClick() {
                        OpenSettingsModule.openUserSettings("cloudcord_userplugins_panel");
                    },
                });
        });
        const pls = await Native.getUserplugins();
        // @ts-ignore :trolley:
        this.plugins.value(pls);
        await this.checkPluginUpdates();
    },
    stop() {
        // @ts-ignore
        plSettings.customEntries.splice(plSettings.customEntries.indexOf(this.section), 1);
    },
    plugins: new VariableWithCallbacks<{
        name: string;
        description: string;
        usesPreSend: boolean;
        usesNative: boolean;
        directory: string;
        remote: string;
    }[]>([]),
    pluginsWithUpdates: new VariableWithCallbacks<{
        finished: boolean;
        plugins: string[];
    }>({
        finished: false,
        plugins: []
    }),
    required: true,
    settings,
    authors: [Devs.nin0dev],
    renderMessageAccessory: props => {
        return <UserpluginInstallButton props={props} />;
    }
});
