/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPaletteIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { wrapTab } from "@components/settings/tabs/BaseTab";
import SettingsPlugin from "@plugins/_core/settings";
import { SincordDevs } from "@utils/constants";
import { removeFromArray } from "@utils/misc";
import definePlugin from "@utils/types";
import { React, SettingsRouter } from "@webpack/common";

const ThemeLibraryPage = wrapTab(() => {
    if (IS_WEB) return <Paragraph>Browse <Link href="https://betterdiscord.app/themes">BetterDiscord themes</Link>, or use CloudCord Desktop to install from the catalogue.</Paragraph>;
    const Browser = require("@components/ThemeSettings/ThemeBrowser").default;
    return <Browser />;
}, "Theme Library");

export default definePlugin({
    name: "ThemeLibrary",
    description: "Browse and install themes from the BetterDiscord catalogue.",
    tags: ["Appearance", "Customisation"],
    authors: [SincordDevs.Fafa],
    toolboxActions: {
        "Open Theme Library": () => {
            SettingsRouter.openUserSettings("sincord_theme_library_panel");
        },
    },

    start() {
        SettingsPlugin.customEntries.push({
            key: "sincord_theme_library",
            title: "Theme Library",
            Component: ThemeLibraryPage,
            Icon: ColorPaletteIcon
        });
    },

    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "sincord_theme_library");
    },
});
