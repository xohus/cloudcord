/* CloudCord startup membership verification. SPDX-License-Identifier: GPL-3.0-or-later */
import "./styles.css";
import { SincordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildStore } from "@webpack/common";

const CONFIG_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/config";
const VERIFY_URL = "https://cloudcord.xohus.lol/join";
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let overlay: HTMLDivElement | undefined;

function removeLockScreen() { overlay?.remove(); overlay = undefined; }

function showLockScreen() {
    if (overlay?.isConnected) return;
    overlay = document.createElement("div");
    overlay.className = "cloudcord-verification-lock";
    overlay.innerHTML = `<section class="cloudcord-verification-card" role="dialog" aria-modal="true" aria-labelledby="cloudcord-verification-title"><div class="cloudcord-verification-logo"><img src="https://cloudcord.xohus.lol/assets/cloudcord-favicon.png" alt="CloudCord"></div><h1 id="cloudcord-verification-title">Join CloudCord</h1><p>Join the official CloudCord server to finish setup and unlock CloudCord.</p><button class="cloudcord-verification-join">Join Server</button></section>`;
    const openVerification = () => { VencordNative.native.openExternal(VERIFY_URL); startupTimer = setTimeout(checkMembership, 3000); };
    overlay.querySelector<HTMLButtonElement>(".cloudcord-verification-join")!.onclick = openVerification;
    document.body.appendChild(overlay);
}

async function checkMembership() {
    try {
        const response = await fetch(CONFIG_URL, { cache: "no-store" });
        if (!response.ok) return;
        const config = await response.json();
        if (!config?.enabled || !config.guildId) return;
        if (GuildStore.getGuild(String(config.guildId))) { removeLockScreen(); return; }
        showLockScreen();
        startupTimer = setTimeout(checkMembership, 3000);
    } catch { startupTimer = setTimeout(checkMembership, 10000); }
}

export default definePlugin({
    name: "CloudCordVerification",
    description: "Locks CloudCord until the current account joins the official CloudCord server.",
    authors: [SincordDevs.nobody],
    enabledByDefault: true,
    start() { startupTimer = setTimeout(checkMembership, 6000); },
    stop() { if (startupTimer) clearTimeout(startupTimer); startupTimer = undefined; removeLockScreen(); }
});
