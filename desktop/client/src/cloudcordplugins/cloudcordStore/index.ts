/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

// Main-process helpers for Add-ons > Themes > Browse (see native.ts).
export default definePlugin({
    name: "CloudCordStore",
    description: "Lets the Themes page browse and install themes",
    authors: [{ name: "xohus (CloudCord)", id: 0n }],
    required: true,
});
