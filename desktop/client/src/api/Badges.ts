/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
import { TooltipContainer } from "@components/TooltipContainer";
import globalBadges from "@sincordplugins/globalBadges";
import BadgeAPIPlugin from "@plugins/_api/badges";
import { React, Toasts, UserProfileStore } from "@webpack/common";
import { ComponentType, HTMLProps } from "react";
import Plugins from "~plugins";

import { isPluginEnabled } from "./PluginManager";

export const enum BadgePosition {
    START,
    END
}

export interface ProfileBadge {
    /**
     * Badge id, unused by vencord, required by discord
     */
    id: string,
    /** The tooltip to show on hover. Required for image badges */
    description?: string;
    /** Custom component for the badge (tooltip not included) */
    component?: ComponentType<ProfileBadge & BadgeUserArgs>;
    /** The custom image to use */
    iconSrc?: string;
    link?: string;
    /** Action to perform when you click the badge */
    onClick?(event: React.MouseEvent, props: ProfileBadge & BadgeUserArgs): void;
    /** Action to perform when you right click the badge */
    onContextMenu?(event: React.MouseEvent, props: BadgeUserArgs & BadgeUserArgs): void;
    /** Should the user display this badge? */
    shouldShow?(userInfo: BadgeUserArgs): boolean;
    /** Optional props (e.g. style) for the badge, ignored for component badges */
    props?: HTMLProps<HTMLImageElement>;
    /** Insert at start or end? */
    position?: BadgePosition;
    /** The badge name to display, Discord uses this. Required for component badges */
    key?: string;

    /**
     * Allows dynamically returning multiple badges.
     * Must not call hooks
     */
    getBadges?(userInfo: BadgeUserArgs): ProfileBadge[];
}

const Badges = new Set<ProfileBadge>();

const CLOUDCORD_STAFF_ROLES: Record<string, string> = {
    "1457121276748365989": "Administrator",
    "1497588725788442637": "Management",
    "1453130879537905734": "Management",
    "1191456523763859558": "Moderator",
    "1417880742502994042": "Management",
    "553936745058664458": "Moderator",
    "463515440606609419": "Founder",
    "1121228881425354832": "Management"
};
const CLOUDCORD_BADGE_ICON = "https://raw.githubusercontent.com/xohus/cloudcord/main/cloudcord-favicon.png";

function createOfficialCloudBadgeIcon(badge: ProfileBadge & BadgeUserArgs) {
    const parseColor = (value: string): number[] | null => {
        if (!value || value === "transparent") return null;
        // CSS Color 4 uses normalized channels (color(srgb ...)) or Lab
        // coordinates, not 0..255 RGB. Let Chromium convert those spaces.
        if (!/^rgba?\(/i.test(value)) {
            if (!CSS.supports("color", value)) return null;
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (!context) return null;
            context.fillStyle = value;
            context.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
            return a > 127 ? [r, g, b, a / 255] : null;
        }
        const channels = value.match(/[\d.]+%?/g);
        if (!channels || channels.length < 3) return null;
        const rgb = channels.map((channel, index) => parseFloat(channel) * (channel.endsWith("%") ? (index < 3 ? 2.55 : 0.01) : 1));
        return rgb.length < 4 || rgb[3] > 0.5 ? rgb : null;
    };
    const label = badge.description || "CloudCord Staff";
    const profile: any = UserProfileStore?.getUserProfile(badge.userId);
    const profileColors: number[] = (profile?.themeColors ?? profile?.theme_colors ?? []).filter((color: unknown) => typeof color === "number");
    const brightness = profileColors.length ? profileColors.reduce((sum, color) => sum + ((color >> 16) & 255) * 0.299 + ((color >> 8) & 255) * 0.587 + (color & 255) * 0.114, 0) / profileColors.length : null;
    const icon = React.createElement("img", {
        src: CLOUDCORD_BADGE_ICON + "?v=staff3", alt: label, width: 20, height: 20,
        role: "button", tabIndex: 0,
        onClick: () => showStaffRole(label),
        onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showStaffRole(label); } },
        style: { objectFit: "contain", filter: "invert(1)", background: "transparent", border: "none", boxShadow: "none", cursor: "pointer" },
        ref: (image: HTMLImageElement | null) => {
            if (!image) return;
            const update = () => {
            if (!image.isConnected) return;
            // An active custom profile overrides Discord's original text/theme.
            // Read the same per-user data that FakeProfile actually renders.
            const profilePlugin = Plugins.ProfileSpoofer as { started?: boolean; getActiveProfileColors?(userId: string): number[] | null; } | undefined;
            const editedColors: number[] | null = profilePlugin?.started ? (profilePlugin.getActiveProfileColors?.(badge.userId) ?? null) : null;
            if (editedColors?.length) {
                const editedBrightness = editedColors.reduce((sum, color) => sum + ((color >> 16) & 255) * 0.299 + ((color >> 8) & 255) * 0.587 + (color & 255) * 0.114, 0) / editedColors.length;
                image.style.filter = editedBrightness > 220 ? "none" : "invert(1)";
                return;
            }
            // Use Discord's own readable profile foreground. A gradient's
            // average is not the color behind the badge, and account popouts
            // can inherit stale colors while their portal is being mounted.
            let foregroundNode = image.parentElement;
            while (foregroundNode) {
                const style = getComputedStyle(foregroundNode);
                const username = foregroundNode.querySelector<HTMLElement>('[class*="userTagUsername"], [class*="username"]');
                if (username) {
                    const rgb = parseColor(getComputedStyle(username).color);
                    if (rgb && rgb.length >= 3 && (rgb.length < 4 || rgb[3] > 0.5)) {
                        image.style.filter = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 180 ? "invert(1)" : "none";
                        return;
                    }
                }
                const text = style.getPropertyValue("--text-normal").trim();
                if (text) {
                    const probe = document.createElement("span");
                    probe.style.color = "var(--text-normal)";
                    probe.style.display = "none";
                    foregroundNode.appendChild(probe);
                    const rgb = parseColor(getComputedStyle(probe).color);
                    probe.remove();
                    if (rgb && rgb.length >= 3 && (rgb.length < 4 || rgb[3] > 0.5)) {
                        const lightText = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 180;
                        image.style.filter = lightText ? "invert(1)" : "none";
                        return;
                    }
                }
                foregroundNode = foregroundNode.parentElement;
            }
            // The visible surface wins over cached profile theme colors.
            // Discord can render a light profile while the store still holds
            // its previous/dark colors (especially in the account popout).
            let node = image.parentElement;
            while (node) {
                const style = getComputedStyle(node);
                // Discord uses space-separated rgb() and transparent gradient
                // overlays; neither should be mistaken for a dark surface.
                const stops = [...style.backgroundImage.matchAll(/(?:rgba?|color|oklab|oklch|lab|lch)\([^)]*\)/g)].map(match => parseColor(match[0])).filter((color): color is number[] => color !== null);
                if (stops.length) {
                    const brightness = stops.reduce((sum, rgb) => sum + rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114, 0) / stops.length;
                    image.style.filter = brightness > 220 ? "none" : "invert(1)";
                    return;
                }
                const color = parseColor(style.backgroundColor);
                if (color) {
                    const light = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114 > 220;
                    image.style.filter = light ? "none" : "invert(1)";
                    return;
                }
                node = node.parentElement;
            }
            if (brightness !== null) image.style.filter = brightness > 220 ? "none" : "invert(1)";
            };
            update();
            // Refs may fire before a portal's final inherited theme is applied.
            requestAnimationFrame(() => { update(); requestAnimationFrame(update); });
            image.onload = update;
        }
    });
    return icon;
}

function OfficialCloudBadge(badge: ProfileBadge & BadgeUserArgs) {
    return React.createElement(TooltipContainer, { text: badge.description || "CloudCord Staff", children: createOfficialCloudBadgeIcon(badge) });
}

function showStaffRole(label: string) {
    Toasts.show({ id: Toasts.genId(), message: label, type: Toasts.Type.MESSAGE });
}

/**
 * Register a new badge with the Badges API
 * @param badge The badge to register
 */
export function addProfileBadge(badge: ProfileBadge) {
    badge.component &&= ErrorBoundary.wrap(badge.component, { noop: true });
    Badges.add(badge);
}

/**
 * Unregister a badge from the Badges API
 * @param badge The badge to remove
 */
export function removeProfileBadge(badge: ProfileBadge) {
    return Badges.delete(badge);
}

/**
 * Inject badges into the profile badges array.
 * You probably don't need to use this.
 */
export function _getBadges(args: BadgeUserArgs) {
    const badges = [] as ProfileBadge[];
    for (const badge of Badges) {
        if (badge.shouldShow && !badge.shouldShow(args)) {
            continue;
        }

        const b = badge.getBadges
            ? badge.getBadges(args).map(badge => ({
                ...args,
                ...badge,
                component: badge.component && ErrorBoundary.wrap(badge.component, { noop: true })
            }))
            : [{ ...args, ...badge }];

        if (badge.position === BadgePosition.START) {
            badges.unshift(...b);
        } else {
            badges.push(...b);
        }
    }

    const staffRole = CLOUDCORD_STAFF_ROLES[args.userId];
    if (staffRole) {
        badges.unshift({
            ...args,
            id: `cloudcord-official-${staffRole.toLowerCase()}`,
            description: `CloudCord ${staffRole}`,
            // Keep Discord's native image path usable if its component renderer changes.
            iconSrc: CLOUDCORD_BADGE_ICON,
            props: createOfficialCloudBadgeIcon({ ...args, id: `cloudcord-official-${staffRole.toLowerCase()}`, description: `CloudCord ${staffRole}` }).props,
            onClick: () => showStaffRole(`CloudCord ${staffRole}`),
            component: OfficialCloudBadge,
            key: `CloudCord ${staffRole}`,
            position: BadgePosition.START
        });
    }

    const donorBadges = BadgeAPIPlugin.getDonorBadges(args.userId);
    const sincordDonorBadges = BadgeAPIPlugin.getSincordDonorBadges(args.userId);
    const GlobalBadges = isPluginEnabled(globalBadges.name) ? globalBadges.getGlobalBadges(args.userId) : false;

    // do globalbadges first so it shows before the contrib badges but after donor badges
    if (GlobalBadges) {
        badges.unshift(
            ...GlobalBadges.map(badge => ({
                ...args,
                ...badge,
            }))
        );
    }

    if (donorBadges) {
        badges.unshift(
            ...donorBadges.map(badge => ({
                ...args,
                ...badge,
            }))
        );
    }

    if (sincordDonorBadges) {
        badges.unshift(
            ...sincordDonorBadges.map(badge => ({
                ...args,
                ...badge,
            }))
        );
    }

    return badges;
}

export interface BadgeUserArgs {
    userId: string;
    guildId: string;
}
