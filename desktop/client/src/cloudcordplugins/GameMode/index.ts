/*
 * CloudCord Game Mode
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RunningGameStore } from "@webpack/common";

// Makes Discord lighter on slow PCs: no animations, blur or shadows, and no animated
// decorations, profile effects or nameplates. By default only while a game is running.
const CLASS = "cc-game-mode";

const settings = definePluginSettings({
    onlyWhileGaming: {
        type: OptionType.BOOLEAN,
        description: "Only while a game is running (turn off to keep Discord light all the time)",
        default: true,
        onChange: () => apply(),
    },
    hideCosmetics: {
        type: OptionType.BOOLEAN,
        description: "Also hide animated avatar decorations, profile effects and nameplates",
        default: true,
        onChange: () => apply(),
    },
});

let gaming = false;
function apply() {
    const on = !settings.store.onlyWhileGaming || gaming;
    document.documentElement.classList.toggle(CLASS, on);
    document.documentElement.classList.toggle(CLASS + "-cosmetics", on && settings.store.hideCosmetics);
}

export default definePlugin({
    name: "GameMode",
    description: "Makes Discord lighter while you play: turns off animations, blur, shadows and animated profile extras so your game gets more of your PC.",
    authors: [Devs.Xohus],
    tags: ["Appearance", "Utility"],
    settings,
    flux: {
        RUNNING_GAMES_CHANGE({ games }: { games: any[]; }) {
            gaming = Array.isArray(games) && games.length > 0;
            apply();
        },
    },
    start() {
        try { gaming = (RunningGameStore?.getRunningGames?.() ?? []).length > 0; } catch { gaming = false; }
        apply();
    },
    stop() {
        document.documentElement.classList.remove(CLASS, CLASS + "-cosmetics");
    },
});
