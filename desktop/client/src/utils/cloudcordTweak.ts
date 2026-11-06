/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

const CLOUDCORD = { name: "xohus (CloudCord)", id: 0n };

/**
 * A CloudCord tweak: a small plugin that adds one stylesheet while it is on
 * and removes it again when it is turned off. No restart needed.
 */
export function defineTweak(name: string, description: string, css: string, tags: string[] = ["Appearance"]) {
    const id = `cloudcord-tweak-${name}`;
    return definePlugin({
        name,
        description,
        authors: [CLOUDCORD],
        tags: tags as any,
        start() {
            if (document.getElementById(id)) return;
            const style = document.createElement("style");
            style.id = id;
            style.textContent = css;
            document.head.append(style);
        },
        stop() {
            document.getElementById(id)?.remove();
        },
    });
}
