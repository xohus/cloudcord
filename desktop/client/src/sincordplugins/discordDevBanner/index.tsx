/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs, SincordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { makeDevBanner, settings } from "./components";

export default definePlugin({
    name: "DiscordDevBanner",
    description: "Enables the Discord developer banner, in which displays the build-ID",
    tags: ["Appearance", "Console", "Developers"],
    authors: [SincordDevs.KrystalSkull, Devs.thororen],
    settings,
    // CloudCord does not force Discord's internal developer banner to display.
    patches: [],
    makeDevBanner,
});
