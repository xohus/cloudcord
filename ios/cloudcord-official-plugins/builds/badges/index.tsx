import { after, before } from "@lib/api/patcher";
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
const sharedProfiles = new Map<string, SharedProfile>();

const SHARED_PROFILE_API = "https://getcloudcord.com";
const NITRO_MONTHS = [0, 1, 3, 6, 12, 24, 36, 60, 72];
const GIFT_COUNTS = [1, 2, 3, 6, 10, 20] as const;
function nativeProfileInput(input: any, profile: SharedProfile) {
    const nitroLevel = Number.isInteger(profile.nitroLevel) ? Math.max(0, Math.min(NITRO_MONTHS.length - 1, profile.nitroLevel!)) : 0;
    const sinceText = profile.nitroSince || profile.createdAt || profile.signupDate || profile.joinedSince;
    const premiumSince = sinceText ? new Date(sinceText.length === 10 ? `${sinceText}T12:00:00Z` : sinceText) : new Date();
    if (!sinceText) premiumSince.setMonth(premiumSince.getMonth() - NITRO_MONTHS[nitroLevel]);
    const giftLevel = Number.isInteger(profile.giftLevel) ? Math.max(0, Math.min(GIFT_COUNTS.length - 1, profile.giftLevel!)) : -1;
    const giftCount = giftLevel >= 0 ? GIFT_COUNTS[giftLevel] : undefined;
    const nativeFields = {
        premiumType: profile.nitro === true || Number.isInteger(profile.nitroLevel) ? 2 : input?.premiumType,
        premiumSince: profile.nitro === true || Number.isInteger(profile.nitroLevel) ? premiumSince : input?.premiumSince,
        premium_type: profile.nitro === true || Number.isInteger(profile.nitroLevel) ? 2 : input?.premium_type,
        premium_since: profile.nitro === true || Number.isInteger(profile.nitroLevel) ? premiumSince.toISOString() : input?.premium_since,
        giftCount: giftCount ?? input?.giftCount,
        giftingBadgeTier: giftLevel >= 0 ? giftLevel + 1 : input?.giftingBadgeTier,
        gift_count: giftCount ?? input?.gift_count,
        gifting_badge_tier: giftLevel >= 0 ? giftLevel + 1 : input?.gifting_badge_tier,
    };
    return { ...input, ...nativeFields, user: input?.user ? { ...input.user, ...nativeFields } : input?.user, profile: input?.profile ? { ...input.profile, ...nativeFields } : { ...nativeFields }, userProfile: input?.userProfile ? { ...input.userProfile, ...nativeFields } : { ...nativeFields } };
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
        before("default", useBadgesModule, args => {
            const input = args[0];
            const userId = input?.userId ?? input?.id ?? input?.user?.id;
            const profile = userId && sharedProfiles.get(userId);
            if (profile) args[0] = nativeProfileInput(input, profile);
            return args;
        });

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
                sharedProfiles.set(userId, profile);
                const allBadges: Badge[] = [];

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

                if (userBadgeData.custom) {
                    allBadges.push(...userBadgeData.custom);
                }

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

            [...cached].reverse().forEach((badge, reverseIndex) => {
                const i = cached.length - reverseIndex - 1;
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
