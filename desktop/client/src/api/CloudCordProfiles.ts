/*
 * CloudCord complete shared profiles
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.CloudCordProfiles as PluginNative<typeof import("@plugins/cloudCordProfiles/native")>;

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

export interface CloudCordProfileKey {
    id: string;
    editToken: string;
}

function decodeLegacyInvisible(text: string) {
    return Array.from(text).map(character => String.fromCodePoint(character.codePointAt(0)! - 0xe0000)).join("");
}

export function removeLegacyProfileMarkers(bio?: string | null) {
    let clean = bio || "";
    for (const match of clean.matchAll(/[\u{e0020}-\u{e007e}]+/gu)) {
        try {
            if (/^\[CCP1:[A-Za-z0-9_-]{16,64}\]$/.test(decodeLegacyInvisible(match[0]))) clean = clean.replace(match[0], "");
        } catch { }
    }
    return clean.trimEnd();
}

function message(text: string, status: number) {
    try { return JSON.parse(text)?.error || JSON.parse(text)?.message || `Profile service failed (${status}).`; }
    catch { return text || `Profile service failed (${status}).`; }
}

export async function publishCloudCordProfile(ownerId: string, profile: CloudCordSharedProfile, key?: CloudCordProfileKey) {
    const result = key ? await Native.update(key.id, key.editToken, ownerId, profile) : await Native.publish(ownerId, profile);
    if (!result.ok) throw new Error(message(result.text, result.status));
    const body = JSON.parse(result.text);
    const id = body?.id || key?.id;
    const editToken = body?.editToken || key?.editToken;
    if (!id) throw new Error("Profile service returned no profile ID.");
    if (!editToken) throw new Error("Profile service returned no private edit key.");
    return { id: String(id), editToken: String(editToken) };
}

export async function fetchCloudCordProfile(ownerId: string): Promise<CloudCordSharedProfile> {
    const result = await Native.getByUser(ownerId);
    if (!result.ok) throw new Error(message(result.text, result.status));
    return JSON.parse(result.text) as CloudCordSharedProfile;
}
