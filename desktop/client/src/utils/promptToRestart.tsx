/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Alerts } from "@webpack/common";

import { relaunch } from "./native";

/**
 * Ask to restart after a change that needs it.
 * @param type - "relaunch" restarts the whole app, "reload" only reloads Discord (Ctrl + R)
 */
export function promptToRestart(
    type: "relaunch" | "reload",
    {
        title = "Restart Required",
        subtitle = "A restart is required to apply this change",
        confirmText = "Restart now",
        cancelText = "Later!"
    }: { title?: string; subtitle?: string; confirmText?: string; cancelText?: string; } = {}
) {
    Alerts.show({
        title,
        body: subtitle,
        confirmText,
        cancelText,
        onConfirm: type === "relaunch" ? relaunch : () => location.reload()
    });
}
