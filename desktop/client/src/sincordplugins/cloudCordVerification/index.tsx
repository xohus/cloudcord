/*
 * CloudCord startup membership verification
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SincordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { closeModal, ConfirmModal, GuildStore, openModal, Text } from "@webpack/common";

const CONFIG_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/config";
const VERIFY_URL = "https://cloudcord.xohus.lol/join";
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let shown = false;
let modalKey: string | undefined;

function showVerification() {
    if (shown) return;
    shown = true;
    modalKey = openModal(props => (
        <ConfirmModal
            {...props}
            title="Join CloudCord"
            confirmText="Join Server"
            onConfirm={() => {
                VencordNative.native.openExternal(VERIFY_URL);
                startupTimer = setTimeout(checkMembership, 3000);
            }}
            onCancel={() => {}}
            onClose={() => {}}
        >
            <Text>Join the official CloudCord server to finish setup and unlock CloudCord.</Text>
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
        if (GuildStore.getGuild(String(config.guildId))) {
            if (modalKey) closeModal(modalKey);
            modalKey = undefined;
            shown = false;
            return;
        }
        if (shown) {
            startupTimer = setTimeout(checkMembership, 3000);
            return;
        }
        showVerification();
    } catch {
        // Do not block Discord startup when the website is temporarily offline.
    }
}

export default definePlugin({
    name: "CloudCordVerification",
    description: "Locks CloudCord until the current account joins the official CloudCord server.",
    authors: [SincordDevs.nobody],
    enabledByDefault: true,

    start() {
        startupTimer = setTimeout(checkMembership, 6000);
    },

    stop() {
        if (startupTimer) clearTimeout(startupTimer);
        if (modalKey) closeModal(modalKey);
        startupTimer = undefined;
        modalKey = undefined;
        shown = false;
    }
});
