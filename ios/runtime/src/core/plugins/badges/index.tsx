import { after } from "@lib/api/patcher";
import { onJsxCreate } from "@lib/api/react/jsx";
import { findByName, findByNameLazy } from "@metro";
import { useEffect, useState } from "react";
import { defineCorePlugin } from "..";
import { FluxDispatcher } from "@metro/common";

interface Badge {
    label: string;
    url: string;
    id?: string;
}

interface SharedProfile {
    nitro?: boolean;
    nitroLevel?: number;
    nitroSince?: string;
    createdAt?: string;
    signupDate?: string;
    joinedSince?: string;
    giftLevel?: number;
}

interface CustomBadge {
    label: string;
    url: string;
}

interface UserBadgeData {
    roles?: string[];
    custom?: CustomBadge[];
}

interface BadgeData {
    [userId: string]: UserBadgeData;
}

interface RoleData {
    label: string;
    url: string;
}

interface RolesData {
    [roleName: string]: RoleData;
}

const useBadgesModule = findByNameLazy("useBadges", false);

const badgesCache = new Map<string, Badge[]>();
const badgeProps = new Map<string, Record<string, any>>();
const pendingRequests = new Set<string>();

const SHARED_PROFILE_API = "https://cloudcord-profiles.ggxohus.workers.dev";
const NITRO_MONTHS = [0, 1, 2, 3, 6, 12, 24, 36, 72];
const NITRO_BADGES = [
    ["Nitro", "2ba85e8026a8614b640c2837bcdfe21b.png"],
    ["Nitro Bronze", "4f33c4a9c64ce221936bd256c356f91f.png"],
    ["Nitro Silver", "4514fab914bdbfb4ad2fa23df76121a6.png"],
    ["Nitro Gold", "2895086c18d5531d499862e41d1155a6.png"],
    ["Nitro Platinum", "0334688279c8359120922938dcb1d6f8.png"],
    ["Nitro Diamond", "0d61871f72bb9a33a7ae568c1fb4f20a.png"],
    ["Nitro Emerald", "11e2d339068b55d3a506cff34d3780f3.png"],
    ["Nitro Ruby", "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png"],
    ["Nitro Opal", "5b154df19c53dce2af92c9b61e6be5e2.png"],
] as const;
const GIFTING_BADGES = [
    ["Patron", 1, "ac305d1b9481f312ce4419e7f8296558.png"],
    ["Champion", 2, "8b7792c4f65953d3ff564f23429cb79e.png"],
    ["Luminary", 3, "3119f5504b2cd09576a323908c7c3517.png"],
    ["Icon", 6, "64f2413c9b9803661322aaad25826b62.png"],
    ["Hero", 10, "77d65b1f210014a11eb1582ee06ab684.png"],
    ["Legend", 20, "7fe346cfc5da1340087d8759a9e7a395.png"],
] as const;

const discordBadgeUrl = (asset: string) => `https://cdn.discordapp.com/badge-icons/${asset}`;

function formattedNitroSince(profile: SharedProfile, level: number) {
    const explicit = profile.nitroSince || profile.createdAt || profile.signupDate || profile.joinedSince;
    let date = explicit ? new Date(explicit.length === 10 ? `${explicit}T12:00:00Z` : explicit) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    if (!explicit) date.setMonth(date.getMonth() - NITRO_MONTHS[level]);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function cloudBadges(profile: SharedProfile): Badge[] {
    const badges: Badge[] = [];
    const nitroLevel = Number.isInteger(profile.nitroLevel) ? Math.max(0, Math.min(NITRO_BADGES.length - 1, profile.nitroLevel!)) : 0;
    if (profile.nitro === true || Number.isInteger(profile.nitroLevel)) {
        const [name, asset] = NITRO_BADGES[nitroLevel];
        badges.push({ id: "nitro", label: `${name} — Nitro since ${formattedNitroSince(profile, nitroLevel)}`, url: discordBadgeUrl(asset) });
    }

    if (Number.isInteger(profile.giftLevel) && profile.giftLevel! >= 0 && profile.giftLevel! < GIFTING_BADGES.length) {
        const [name, count, asset] = GIFTING_BADGES[profile.giftLevel!];
        badges.push({ id: "gifting", label: `${name} — Gifting Badge · Gifted ${count}x`, url: discordBadgeUrl(asset) });
    }
    return badges;
}

export default defineCorePlugin({
    manifest: {
        id: "bunny.badges",
        version: "1.1.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "Badges",
            description: "Adds badges to user's profile",
            authors: [{ name: "cocobo1"}, { name: "pylixonly" }]
        }
    },
    
    start() {
        onJsxCreate("ProfileBadge", (component, ret) => {
            if (ret.props.id?.startsWith("rain-") || ret.props.id?.startsWith("cloudcord-")) {
                const cachedProps = badgeProps.get(ret.props.id);
                if (cachedProps) {
                    ret.props.source = cachedProps.source;
                    ret.props.label = cachedProps.label;
                    ret.props.id = cachedProps.id;
                }
            }
        });

        onJsxCreate("RenderedBadge", (component, ret) => {
            if (ret.props.id?.startsWith("rain-") || ret.props.id?.startsWith("cloudcord-")) {
                const cachedProps = badgeProps.get(ret.props.id);
                if (cachedProps) {
                    Object.assign(ret.props, cachedProps);
                }
            }
        });

        const fetchAndProcessBadges = async (userId: string) => {
            if (pendingRequests.has(userId)) return;
            pendingRequests.add(userId);

            try {
                const [badgesData, rolesData, profilePayload] = await Promise.all([
                    fetch("https://codeberg.org/raincord/badges/raw/branch/main/badges.json").then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<BadgeData>,
                    fetch("https://codeberg.org/raincord/badges/raw/branch/main/assets/roles/roles.json").then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<RolesData>,
                    fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(userId)}`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
                ]);

                const userBadgeData = badgesData[userId] || { roles: [], custom: [] };

                const profile: SharedProfile = profilePayload?.profile ?? profilePayload ?? {};
                const allBadges: Badge[] = [];

                // process role badges
                if (userBadgeData.roles) {
                    userBadgeData.roles.forEach(roleName => {
                        const roleData = rolesData[roleName];
                        if (roleData) {
                            allBadges.push({
                                label: roleData.label,
                                url: roleData.url,
                            });
                        }
                    });
                }

                // process custom badges
                if (userBadgeData.custom) {
                    allBadges.push(...userBadgeData.custom);
                }

                allBadges.unshift(...cloudBadges(profile));

                badgesCache.set(userId, allBadges);

                allBadges.forEach((badge, i) => {
                    const badgeId = badge.id ? `cloudcord-${badge.id}-${userId}` : `rain-${userId}-${i}`;
                    badgeProps.set(badgeId, {
                        id: badgeId,
                        source: { uri: badge.url },
                        label: badge.label,
                        userId,
                    });
                });

                FluxDispatcher.dispatch({ type: "USER_UPDATE", user: { id: userId } });
            } finally {
                pendingRequests.delete(userId);
            }
        };

        after("default", useBadgesModule, ([user], result) => {
            if (!user) return;

            const userId = user.userId ?? user.id;
            if (!userId) return;
            const cached = badgesCache.get(userId);

            if (!cached) {
                if (!pendingRequests.has(userId)) {
                    fetchAndProcessBadges(userId);
                }
                return;
            }

            cached.forEach((badge, i) => {
                const badgeId = badge.id ? `cloudcord-${badge.id}-${userId}` : `rain-${userId}-${i}`;

                result.unshift({
                    id: badgeId,
                    description: badge.label,
                    icon: " _",
                });
            });
        });
    }
});
