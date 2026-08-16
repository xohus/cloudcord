/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./misc/style.css";

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Notice } from "@components/Notice";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts } from "@webpack/common";

import UserpluginInstallButton from "./components/UserpluginInstallButton";
import { VariableWithCallbacks } from "./VariableWithCallbacks";

// @ts-ignore
export const Native = VencordNative.pluginHelpers.UserpluginInstaller as PluginNative<typeof import("./native")>;
export const OpenSettingsModule = findByPropsLazy("openUserSettings");

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

        const pls = await Native.getUserplugins();
        // @ts-ignore :trolley:
        this.plugins.value(pls);
        await this.checkPluginUpdates();
    },
    stop() {},
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
