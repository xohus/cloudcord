/*
 * Foldcord
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// English-only stand-in for Endcord's i18n module, so its plugins in src/endcordplugins build in Foldcord.
export function t(key: string, vars?: Record<string, string | number>): string {
    if (!vars) return key;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\{${k}\}`, "g"), String(v)), key);
}

export const tPluginDesc = (_name: string, description: string) => description;

export function useI18n() {
    return { lang: "en", t, tPluginDesc, setLanguage: (_lang: string) => { } };
}
