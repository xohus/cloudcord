/*
 * CloudCord startup membership verification
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SincordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ConfirmModal, GuildStore, openModal, Text } from "@webpack/common";

const CONFIG_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/config";
const VERIFY_URL = "https://cloudcord.xohus.lol/join";
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let shown = false;

function showVerification() {
    if (shown) return;
    shown = true;
    openModal(props => (
        <ConfirmModal
            {...props}
            header="Verify with Discord"
            confirmText="Continue"
            cancelText="Not now"
            onConfirm={() => VencordNative.native.openExternal(VERIFY_URL)}
        >
            <Text>Join the official CloudCord server to finish setup. Discord will ask you to approve access before anything happens.</Text>
        </ConfirmModal>
    ));
}

async function checkMembership() {
    try {
        const response = await fetch(CONFIG_URL, { cache: "no-store" });
        if (!response.ok) return;
        const config = await response.json();
        if (!config?.enabled || !config.guildId) return;

        // Discord's guild store is authoritative for the currently logged-in
        // account. Existing server members never see the verification screen.
        if (GuildStore.getGuild(String(config.guildId))) return;
        showVerification();
    } catch {
        // Do not block Discord startup when the website is temporarily offline.
    }
}

export default definePlugin({
    name: "CloudCordVerification",
    description: "Shows Discord verification at startup only when you are not in the CloudCord server.",
    authors: [SincordDevs.nobody],
    enabledByDefault: true,

    start() {
        startupTimer = setTimeout(checkMembership, 6000);
    },

    stop() {
        if (startupTimer) clearTimeout(startupTimer);
        startupTimer = undefined;
        shown = false;
    }
});
