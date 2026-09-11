import { after, before } from "@lib/api/patcher";
import { onJsxCreate } from "@lib/api/react/jsx";
import { findByName, findByNameLazy } from "@metro";
import { findByProps } from "@metro/wrappers";
import { lazyDestructure } from "@lib/utils/lazy";
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

const SHARED_PROFILE_API = "https://cloudcord-profiles.ggxohus.workers.dev";
const NITRO_MONTHS = [0, 1, 3, 6, 12, 24, 36, 60, 72];
const GIFT_COUNTS = [1, 2, 3, 6, 10, 20] as const;
const GIFT_NAMES = ["Patron", "Champion", "Luminary", "Icon", "Hero", "Legend"] as const;
const GIFT_ASSETS = GIFT_NAMES.map(name => `https://raw.githubusercontent.com/dev-hoehle/discord-badges/main/png/gifting_${name.toLowerCase()}.png`);
const { showSimpleActionSheet } = lazyDestructure(() => findByProps("showSimpleActionSheet"));

function showGiftingMilestones(selected: number) {
    showSimpleActionSheet({
        key: "CloudCordGiftingMilestones",
        header: { title: "Gifting Badges" },
        options: GIFT_NAMES.map((name, index) => ({
            label: `${name} · Gifted ${GIFT_COUNTS[index]}×${index === selected ? " · Current" : ""}`,
            icon: { uri: GIFT_ASSETS[index] },
            onPress: () => {},
        })),
    });
}

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
        giftingProfileBadgeTier: giftLevel >= 0 ? giftLevel + 1 : input?.giftingProfileBadgeTier,
        giftBadgeTier: giftLevel >= 0 ? giftLevel + 1 : input?.giftBadgeTier,
        gift_count: giftCount ?? input?.gift_count,
        gifting_badge_tier: giftLevel >= 0 ? giftLevel + 1 : input?.gifting_badge_tier,
        gifting_profile_badge_tier: giftLevel >= 0 ? giftLevel + 1 : input?.gifting_profile_badge_tier,
        gift_badge_tier: giftLevel >= 0 ? giftLevel + 1 : input?.gift_badge_tier,
    };
    return {
        ...input,
        ...nativeFields,
        user: input?.user ? { ...input.user, ...nativeFields } : input?.user,
        profile: input?.profile ? { ...input.profile, ...nativeFields } : { ...nativeFields },
        userProfile: input?.userProfile ? { ...input.userProfile, ...nativeFields } : { ...nativeFields },
    };
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

                const giftLevel = Number.isInteger(profile.giftLevel) ? Math.max(0, Math.min(GIFT_COUNTS.length - 1, profile.giftLevel!)) : -1;
                if (giftLevel >= 0) allBadges.push({
                    id: `gifting-${giftLevel + 1}`,
                    label: `Gifting ${GIFT_NAMES[giftLevel]} · Gifted ${GIFT_COUNTS[giftLevel]}×`,
                    url: GIFT_ASSETS[giftLevel],
                });

                badgesCache.set(userId, allBadges);

                allBadges.forEach((badge, i) => {
                    const badgeId = badge.id ? `cloudcord-${badge.id}-${userId}` : `rain-${userId}-${i}`;
                    badgeProps.set(badgeId, {
                        id: badgeId,
                        source: { uri: badge.url },
                        label: badge.label,
                        userId,
                        ...(badge.id?.startsWith("gifting-") ? { onPress: () => showGiftingMilestones(Number(badge.id!.split("-")[1]) - 1) } : {}),
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
            const profile = sharedProfiles.get(userId);

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

            if (profile?.nitro === true && Number.isInteger(profile.nitroLevel)) {
                const level = Math.max(0, Math.min(NITRO_MONTHS.length - 1, profile.nitroLevel!));
                const months = NITRO_MONTHS[level];
                const id = months > 0 ? `premium_tenure_${months}_month_v2` : "premium";
                if (!result.some((badge: any) => badge?.id === id || badge?.id?.startsWith("premium_tenure_"))) {
                    result.unshift({ id, description: `Subscriber since ${nativeProfileInput({}, profile).premium_since}`, icon: " _" });
                }
            }
        });
    }
});
