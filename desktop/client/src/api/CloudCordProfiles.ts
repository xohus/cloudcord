/*
 * CloudCord complete shared profiles
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.CloudCordProfiles as PluginNative<typeof import("@plugins/cloudCordProfiles/native")>;
const PREFIX = "CCP1:";

export interface CloudCordSharedProfile {
    username?: string;
    globalName?: string;
    avatar?: string;
    banner?: string;
    bio?: string;
    accentColor?: number;
    accentColor2?: number;
    pronouns?: string;
    badgeFlags?: number;
    createdAt?: string;
    signupDate?: string;
    nitro?: boolean;
    nitroLevel?: number;
    boostMonths?: number;
    customBadgeIds?: string[];
    oldName?: string;
    decorationAsset?: string;
}

function encodeInvisible(text: string) {
    return Array.from(text).map(character => String.fromCodePoint(character.codePointAt(0)! + 0xe0000)).join("");
}

function decodeInvisible(text: string) {
    return Array.from(text).map(character => String.fromCodePoint(character.codePointAt(0)! - 0xe0000)).join("");
}

export function createProfileMarker(id: string) {
    return ` ${encodeInvisible(`[${PREFIX}${id}]`)}`;
}

export function findProfileId(bio?: string | null) {
    if (!bio) return null;
    for (const match of bio.matchAll(/[\u{e0020}-\u{e007e}]+/gu)) {
        try {
            const decoded = decodeInvisible(match[0]);
            const id = decoded.match(/^\[CCP1:([A-Za-z0-9_-]{16,64})\]$/)?.[1];
            if (id) return id;
        } catch { }
    }
    return null;
}

function message(text: string, status: number) {
    try { return JSON.parse(text)?.error || JSON.parse(text)?.message || `Profile service failed (${status}).`; }
    catch { return text || `Profile service failed (${status}).`; }
}

export async function publishCloudCordProfile(profile: CloudCordSharedProfile) {
    const result = await Native.publish(profile);
    if (!result.ok) throw new Error(message(result.text, result.status));
    const id = JSON.parse(result.text)?.id;
    if (!id) throw new Error("Profile service returned no profile ID.");
    return { id: String(id), marker: createProfileMarker(String(id)) };
}

export async function fetchCloudCordProfile(id: string): Promise<CloudCordSharedProfile> {
    const result = await Native.get(id);
    if (!result.ok) throw new Error(message(result.text, result.status));
    return JSON.parse(result.text) as CloudCordSharedProfile;
}

