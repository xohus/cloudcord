/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The one place the profile editor keeps device-local data.
//
// Every key lives under the `cloudcord.profile.` prefix, one localStorage entry
// per key, so a quota error on a large entry (saved profiles with images) can't
// block the small ones. Values keep the exact string format they always had.
//
// Older builds wrote these under scattered names. Reads fall back to the old
// name until the value has been moved, and migrateLegacyStorage() moves them
// once at startup, so nobody loses data.
//
// Account profile data also lives in DataStore (IndexedDB) as the async source of
// truth; the profileData/allData keys here are its synchronous startup mirror.

import { localStorage } from "@utils/localStorage";

import { logger } from "./logger";

const LEGACY_KEYS = {
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

export type ProfileStorageKey = keyof typeof LEGACY_KEYS;

const PREFIX = "cloudcord.profile.";
const keyFor = (key: ProfileStorageKey) => PREFIX + key;

export const profileStorage = {
    get(key: ProfileStorageKey): string | null {
        return localStorage.getItem(keyFor(key)) ?? localStorage.getItem(LEGACY_KEYS[key]);
    },
    /** Throws like localStorage.setItem (e.g. on quota); callers decide how to report it. */
    set(key: ProfileStorageKey, value: string) {
        localStorage.setItem(keyFor(key), value);
        localStorage.removeItem(LEGACY_KEYS[key]);
    },
    remove(key: ProfileStorageKey) {
        localStorage.removeItem(keyFor(key));
        localStorage.removeItem(LEGACY_KEYS[key]);
    }
};

/** Moves values from the old key names. Safe to call on every start. */
export function migrateLegacyStorage() {
    for (const key of Object.keys(LEGACY_KEYS) as ProfileStorageKey[]) {
        try {
            const legacy = localStorage.getItem(LEGACY_KEYS[key]);
            if (legacy == null) continue;
            if (localStorage.getItem(keyFor(key)) == null) localStorage.setItem(keyFor(key), legacy);
            localStorage.removeItem(LEGACY_KEYS[key]);
        } catch (e) {
            // The old key stays readable through the fallback in get().
            logger.warn(`Moving ${LEGACY_KEYS[key]} to the profile store failed`, e);
        }
    }
}
