/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BotCordCore",
    description: "Native networking bridge for the built-in CloudCord bot client",
    authors: [Devs.Xohus],
    required: true,
    hidden: true
});

