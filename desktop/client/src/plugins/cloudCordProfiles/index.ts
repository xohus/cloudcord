/*
 * CloudCord shared profile transport
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.CloudCordProfiles as PluginNative<typeof import("./native")>;
const INSTALL_ID_KEY = "CloudCord_anonymousInstallId";
const HEARTBEAT_MS = 15 * 60 * 1000;
let heartbeat: ReturnType<typeof setInterval> | undefined;

function getInstallId() {
    let id = localStorage.getItem(INSTALL_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id;
}

function ping() {
    void Native.pingUsage(getInstallId());
}

export default definePlugin({
    name: "CloudCordProfiles",
    description: "Publishes and loads complete opt-in CloudCord profiles.",
    authors: [Devs.Xohus],
    required: true,
    start() {
        ping();
        heartbeat = setInterval(ping, HEARTBEAT_MS);
    },
    stop() {
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = undefined;
    }
});
