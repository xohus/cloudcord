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
let locked = false;
let authorizing = false;

function showVerification() {
    if (shown) return;
    shown = true;
    openModal(props => (
        <ConfirmModal
            {...props}
            header={locked ? "CloudCord access locked" : "Join CloudCord"}
            confirmText="Join Server"
            cancelText="Stay locked"
            onConfirm={() => {
                authorizing = true;
                VencordNative.native.openExternal(VERIFY_URL);
                shown = false;
                startupTimer = setTimeout(() => {
                    authorizing = false;
                    checkMembership();
                }, 8000);
            }}
            onCancel={() => {
                locked = true;
                shown = false;
                startupTimer = setTimeout(checkMembership, 0);
            }}
            onClose={() => {
                props.onClose();
                if (authorizing) return;
                locked = true;
                shown = false;
                startupTimer = setTimeout(checkMembership, 0);
            }}
        >
            <Text>{locked ? "This account is still not in the official CloudCord server. Use Join Server to unlock CloudCord." : "Join the official CloudCord server to finish setup and unlock CloudCord."}</Text>
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
            locked = false;
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
        startupTimer = undefined;
        shown = false;
        locked = false;
        authorizing = false;
    }
});
