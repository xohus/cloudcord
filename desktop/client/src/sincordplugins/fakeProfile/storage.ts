/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The one place the profile editor keeps device-local data. Every read and write
// goes through profileStorage, one localStorage entry per key, so a quota error on
// a large entry (saved profiles with images) cannot block the small ones.
//
// The on-disk key names are the ones older builds used, so going back to an older
// build still finds everything. Rename them only together with a migration that
// keeps the old keys.
//
// Account profile data also lives in DataStore (IndexedDB) as the async source of
// truth; the profileData/allData keys here are its synchronous startup mirror.

import { localStorage } from "@utils/localStorage";

const KEYS = {
    profileData: "SincordCP_data",
    profileEnabled: "SincordCP_enabled",
    allData: "SincordCP_allData",
    allEnabled: "SincordCP_allEnabled",
    badgeInfo: "cloudcord_badge_info",
    localProfiles: "cloudcord_local_profiles",
    savedProfiles: "cloudcord_saved_profiles",
    localTag: "cloudcord_local_tag",
    extras: "cloudcord_profile_extras",
    nitroTheme: "cloudcord_nitro_theme"
} as const;

export type ProfileStorageKey = keyof typeof KEYS;

export const profileStorage = {
    get(key: ProfileStorageKey): string | null {
        return localStorage.getItem(KEYS[key]);
    },
    /** Throws like localStorage.setItem (e.g. on quota); callers decide how to report it. */
    set(key: ProfileStorageKey, value: string) {
        localStorage.setItem(KEYS[key], value);
    },
    remove(key: ProfileStorageKey) {
        localStorage.removeItem(KEYS[key]);
    }
};
