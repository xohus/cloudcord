/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@utils/css";

import { settings } from "./settings";

export let GlobalBadges = {};
export const INVITE_LINK = "kwHCJPxp8t";
export const cl = classNameFactory("vc-global-badges-");
export const serviceMap: Record<string, string> = {
    badgevault: "BadgeVault",
    nekocord: "Nekocord",
    reviewdb: "ReviewDB",
    aero: "Aero",
    aliucord: "Aliucord",
    raincord: "Raincord",
    velocity: "Velocity",
    enmity: "Enmity",
    paicord: "Paicord",
};

const blockedMods = ["vencord", "sincord"];

export async function loadBadges() {
    if (!settings.store.apiUrl) {
        GlobalBadges = {};
        return;
    }

    const url = settings.store.apiUrl.endsWith("/") ? settings.store.apiUrl + "users" : settings.store.apiUrl + "/users";
    let globalBadges: { users?: Record<string, any[]>; };
    try {
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) throw new Error(`Badge API returned ${response.status}`);
        globalBadges = await response.json();
    } catch {
        GlobalBadges = {};
        return;
    }

    const users = globalBadges.users ?? {};
    const filteredUsers: Record<string, any[]> = {};

    for (const key in users) {
        filteredUsers[key] = users[key].filter(b => {
            const { mod } = b;
            if (!mod || blockedMods.includes(mod)) return false;

            const conditionalMods = {
                aero: settings.store.showAero,
                velocity: settings.store.showVelocity,
                badgevault: settings.store.showCustom,
                nekocord: settings.store.showNekocord,
                reviewdb: settings.store.showReviewDB,
                aliucord: settings.store.showAliucord,
                raincord: settings.store.showRaincord,
                enmity: settings.store.showEnmity
            };

            if (mod in conditionalMods && !conditionalMods[mod]) return false;

            return true;
        }).map(b => {
            const modFormatted = serviceMap[b.mod];
            const prefix = settings.store.showPrefix ? `${modFormatted} - ` : "";
            const suffix = settings.store.showSuffix ? ` - ${modFormatted}` : "";
            const tooltip = prefix + b.tooltip + suffix;
            return {
                ...b,
                key: b.tooltip,
                tooltip
            };
        });
    }

    GlobalBadges = filteredUsers;
}
