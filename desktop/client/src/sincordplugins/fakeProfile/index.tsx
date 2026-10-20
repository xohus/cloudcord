/*
 * CloudCord Fake Profile
 * Originally created by xohus for CloudCord on iOS and Android.
 * Adapted and substantially expanded for CloudCord Desktop by xohus.
 * Copyright (c) 2026 xohus and CloudCord contributors
 * Portions copyright (c) 2026 Sincord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";
import "./editor.css";
import decorationCatalog from "./decorations.json";
import { CustomSocialEditor, openSocialDetail } from "./CustomSocial";
import { ColorField, Grid2, ImageField, ProfilePreview, Section, SelectField, Switch, TabId, TabList, TextField } from "./editorUi";
import { Current, installPresenceHooks, installTagIconSwap, loadCatalog, NameplateEditor, PickerGrid, onCatalogLoaded, ProfileEffectEditor, profileEffectFor, ProfileFrameEditor, refreshPresence, StatusEditor, TagIconEditor, uninstallPresenceHooks, uninstallTagIconSwap } from "./cosmetics";
import { installNativeSocialHooks } from "@utils/nativeSocialHooks";
import { appearanceOptions, availableServerTags, Catalog, customDiscordMediaURL, nameplateAssetURL, nativeCollectibles, customSocialValidationErrors, nativeSocialProfile, nativeProfileAppearance, normalizeProfileAppearance, ProfileAppearance } from "@utils/profileAppearance";
import { findByProps } from "@webpack";

import { CLOUDCORD_STAFF_ROLES, ProfileBadge } from "@api/Badges";
import { applyBadgeLayout, badgeLayoutKey, defaultBadgeOrder, moveBadgeOrder } from "@api/BadgeLayout";
import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { DataStore } from "@api/index";
import { localStorage } from "@utils/localStorage";
import { isRealProfileView, setRealProfileView } from "@utils/realProfileView";
import { ModalContent as _ModalContent, ModalFooter as _ModalFooter, ModalHeader as _ModalHeader, ModalRoot as _ModalRoot, openModal } from "@utils/modal";

const ModalRoot = _ModalRoot as any;
const ModalHeader = _ModalHeader as any;
const ModalContent = _ModalContent as any;
const ModalFooter = _ModalFooter as any;
import { SincordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { AuthenticationStore, Button, ChannelActionCreators, FluxDispatcher, FriendsStore, IconUtils, Menu, Popout, React, Select, showToast, SnowflakeUtils, Toasts, UserProfileActions, UserProfileStore, UserStore } from "@webpack/common";

import nitroBronze from "file://../../../../../assets/NitroMilestones/bronze.png?base64";
import nitroDiamond from "file://../../../../../assets/NitroMilestones/diamond.png?base64";
import nitroEmerald from "file://../../../../../assets/NitroMilestones/emerald.png?base64";
import nitroGold from "file://../../../../../assets/NitroMilestones/gold.png?base64";
import nitroOpal from "file://../../../../../assets/NitroMilestones/opal.png?base64";
import nitroPlatinum from "file://../../../../../assets/NitroMilestones/platinum.png?base64";
import nitroRuby from "file://../../../../../assets/NitroMilestones/ruby.png?base64";
import nitroSilver from "file://../../../../../assets/NitroMilestones/silver.png?base64";

const pngDataUrl = (source: string) => source.startsWith("data:") ? source : `data:image/png;base64,${source}`;

const DS_KEY = "customProfile_data";
const DS_ENABLED = "customProfile_enabled";
const DS_ALL_DATA = "customProfile_allData";
const DS_ALL_ENABLED = "customProfile_allEnabled";
const LS_ALL_DATA = "SincordCP_allData";
const LS_ALL_ENABLED = "SincordCP_allEnabled";
const LS_KEY_DATA = "SincordCP_data";
const LS_KEY_ENABLED = "SincordCP_enabled";
const SHARED_PROFILE_API = "https://getcloudcord.com";
const LS_SHARE = "CloudCord_fakeProfileShare";

const FLAG = {
    STAFF: 1, PARTNER: 2, HYPESQUAD: 4, BUG_HUNTER_1: 8,
    BRAVERY: 64, BRILLIANCE: 128, BALANCE: 256, EARLY_SUPPORTER: 512,
    BUG_HUNTER_2: 16384, DEV_VERIFIED: 131072, MOD_ALUMNI: 262144, ACTIVE_DEVELOPER: 4194304,
};

const BADGES = [
    { label: "Discord Staff", flag: FLAG.STAFF, icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png" },
    { label: "Partnered Server Owner", flag: FLAG.PARTNER, icon: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png" },
    { label: "HypeSquad Events", flag: FLAG.HYPESQUAD, icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png" },
    { label: "Bug Hunter", flag: FLAG.BUG_HUNTER_1, icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png" },
    { label: "HypeSquad Bravery", flag: FLAG.BRAVERY, icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png" },
    { label: "HypeSquad Brilliance", flag: FLAG.BRILLIANCE, icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png" },
    { label: "HypeSquad Balance", flag: FLAG.BALANCE, icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png" },
    { label: "Early Supporter", flag: FLAG.EARLY_SUPPORTER, icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png" },
    { label: "Golden Bug Hunter", flag: FLAG.BUG_HUNTER_2, icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png" },
    { label: "Moderator Programs Alumni", flag: FLAG.MOD_ALUMNI, icon: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png" },
    { label: "Early Verified Bot Developer", flag: FLAG.DEV_VERIFIED, icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png" },
    { label: "Active Developer", flag: FLAG.ACTIVE_DEVELOPER, icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png" },
];

// Discord artwork archived at a pinned revision; tier IDs are shared across clients.
const EXPERIMENTAL_BADGE_GROUPS = [
    {
        "id": "account_age",
        "label": "Account Age",
        "tiers": [
            {
                "id": "account_age_1",
                "name": "Seed",
                "milestone": "1 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_seed.png"
            },
            {
                "id": "account_age_2",
                "name": "Sprout",
                "milestone": "2 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_sprout.png"
            },
            {
                "id": "account_age_3",
                "name": "Bud",
                "milestone": "3 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_bud.png"
            },
            {
                "id": "account_age_4",
                "name": "Sapling",
                "milestone": "4 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_sapling.png"
            },
            {
                "id": "account_age_5",
                "name": "Blossom",
                "milestone": "5 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_blossom.png"
            },
            {
                "id": "account_age_6",
                "name": "Redwood",
                "milestone": "6 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_redwood.png"
            },
            {
                "id": "account_age_7",
                "name": "Sequoia",
                "milestone": "7 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_sequoia.png"
            },
            {
                "id": "account_age_8",
                "name": "Bristlecone",
                "milestone": "8 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_bristlecone.png"
            },
            {
                "id": "account_age_9",
                "name": "Stromatolite",
                "milestone": "9 years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_stromatolite.png"
            },
            {
                "id": "account_age_10",
                "name": "Primordial",
                "milestone": "10+ years",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/account_age_primordial.png"
            }
        ]
    },
    {
        "id": "streaming",
        "label": "Streaming",
        "tiers": [
            {
                "id": "streaming_1",
                "name": "Newcomer",
                "milestone": "1 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_newcomer.png"
            },
            {
                "id": "streaming_2",
                "name": "Fledgling",
                "milestone": "5 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_fledgling.png"
            },
            {
                "id": "streaming_3",
                "name": "Breakout",
                "milestone": "20 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_breakout.png"
            },
            {
                "id": "streaming_4",
                "name": "Standout",
                "milestone": "75 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_standout.png"
            },
            {
                "id": "streaming_5",
                "name": "Trendsetter",
                "milestone": "150 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_trendsetter.png"
            },
            {
                "id": "streaming_6",
                "name": "Headliner",
                "milestone": "300 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_headliner.png"
            },
            {
                "id": "streaming_7",
                "name": "Star",
                "milestone": "500 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_star.png"
            },
            {
                "id": "streaming_8",
                "name": "Sensation",
                "milestone": "1000 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_sensation.png"
            },
            {
                "id": "streaming_9",
                "name": "Visionary",
                "milestone": "2000 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_visionary.png"
            },
            {
                "id": "streaming_10",
                "name": "Phenomenon",
                "milestone": "5000+ hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/streaming_phenomenon.png"
            }
        ]
    },
    {
        "id": "game_time",
        "label": "Game Time",
        "tiers": [
            {
                "id": "game_time_1",
                "name": "Casual",
                "milestone": "1 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_casual.png"
            },
            {
                "id": "game_time_2",
                "name": "Recreational",
                "milestone": "5 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_recreational.png"
            },
            {
                "id": "game_time_3",
                "name": "Dedicated",
                "milestone": "20 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_dedicated.png"
            },
            {
                "id": "game_time_4",
                "name": "Committed",
                "milestone": "75 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_committed.png"
            },
            {
                "id": "game_time_5",
                "name": "Serious",
                "milestone": "150 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_serious.png"
            },
            {
                "id": "game_time_6",
                "name": "Devoted",
                "milestone": "300 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_devoted.png"
            },
            {
                "id": "game_time_7",
                "name": "Seasoned",
                "milestone": "500 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_seasoned.png"
            },
            {
                "id": "game_time_8",
                "name": "Ironclad",
                "milestone": "1000 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_ironclad.png"
            },
            {
                "id": "game_time_9",
                "name": "Unshakeable",
                "milestone": "2000 hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_unshakeable.png"
            },
            {
                "id": "game_time_10",
                "name": "Eternal",
                "milestone": "5000+ hours",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_time_eternal.png"
            }
        ]
    },
    {
        "id": "game_variety",
        "label": "Game Variety",
        "tiers": [
            {
                "id": "game_variety_1",
                "name": "Sampler",
                "milestone": "2 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_sampler.png"
            },
            {
                "id": "game_variety_2",
                "name": "Dabbler",
                "milestone": "5 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_dabbler.png"
            },
            {
                "id": "game_variety_3",
                "name": "Enthusiast",
                "milestone": "10 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_enthusiast.png"
            },
            {
                "id": "game_variety_4",
                "name": "Ranger",
                "milestone": "15 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_ranger.png"
            },
            {
                "id": "game_variety_5",
                "name": "Explorer",
                "milestone": "20 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_explorer.png"
            },
            {
                "id": "game_variety_6",
                "name": "Adventurer",
                "milestone": "30 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_adventurer.png"
            },
            {
                "id": "game_variety_7",
                "name": "Voyager",
                "milestone": "40 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_voyager.png"
            },
            {
                "id": "game_variety_8",
                "name": "Maverick",
                "milestone": "60 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_maverick.png"
            },
            {
                "id": "game_variety_9",
                "name": "Polymath",
                "milestone": "80 games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_polymath.png"
            },
            {
                "id": "game_variety_10",
                "name": "Universalist",
                "milestone": "100+ games",
                "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/game_variety_universalist.png"
            }
        ]
    }
];
const EVENT_BADGES = [
    {
        "id": "last_meadow",
        "name": "Last Meadow Online",
        "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/last_meadow.png"
    },
    {
        "id": "clown",
        "name": "A Clown, for a Limited Time",
        "icon": "https://raw.githubusercontent.com/dev-hoehle/discord-badges/b97b49091bb08175ae56a11bf4f4a42d52d12380/png/lootboxes.png"
    }
];
const EXTRA_BADGES = [
    ...EXPERIMENTAL_BADGE_GROUPS.flatMap(group => group.tiers.map(tier => ({ ...tier, label: tier.name }))),
    ...EVENT_BADGES.map(badge => ({ ...badge, label: badge.name }))
];
const GIFT_LEVELS = [
    { id: "patron", name: "Patron", count: 1, icon: "https://cdn.discordapp.com/badge-icons/ac305d1b9481f312ce4419e7f8296558.png", light: "#73b8ff", dark: "#2868d7" },
    { id: "champion", name: "Champion", count: 2, icon: "https://cdn.discordapp.com/badge-icons/8b7792c4f65953d3ff564f23429cb79e.png", light: "#79f1c7", dark: "#248f72" },
    { id: "luminary", name: "Luminary", count: 3, icon: "https://cdn.discordapp.com/badge-icons/3119f5504b2cd09576a323908c7c3517.png", light: "#ff9bc7", dark: "#cb3d79" },
    { id: "icon", name: "Icon", count: 6, icon: "https://cdn.discordapp.com/badge-icons/64f2413c9b9803661322aaad25826b62.png", light: "#ef8cff", dark: "#8a31d7" },
    { id: "hero", name: "Hero", count: 10, icon: "https://cdn.discordapp.com/badge-icons/77d65b1f210014a11eb1582ee06ab684.png", light: "#bcff7e", dark: "#6840d8" },
    { id: "legend", name: "Legend", count: 20, icon: "https://cdn.discordapp.com/badge-icons/7fe346cfc5da1340087d8759a9e7a395.png", light: "#ffd66e", dark: "#653bdd" },
];

const OLD_NAME_BADGE_ICON = "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png";
const NITRO_LEVELS = [
    { label: "Nitro", name: "Nitro", icon: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png", art: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png", light: "#d9b8ff", dark: "#5865f2" },
    { label: "Bronze", name: "Bronze", icon: "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png", art: pngDataUrl(nitroBronze), light: "#ffc292", dark: "#a64316" },
    { label: "Silver", name: "Silver", icon: "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png", art: pngDataUrl(nitroSilver), light: "#f1f6fa", dark: "#778793" },
    { label: "Gold", name: "Gold", icon: "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png", art: pngDataUrl(nitroGold), light: "#ffe689", dark: "#d58200" },
    { label: "Platinum", name: "Platinum", icon: "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png", art: pngDataUrl(nitroPlatinum), light: "#bff5ff", dark: "#1689b9" },
    { label: "Diamond", name: "Diamond", icon: "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png", art: pngDataUrl(nitroDiamond), light: "#f0a8ff", dark: "#843cc8" },
    { label: "Emerald", name: "Emerald", icon: "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png", art: pngDataUrl(nitroEmerald), light: "#a5ff81", dark: "#2a9c16" },
    { label: "Ruby", name: "Ruby", icon: "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png", art: pngDataUrl(nitroRuby), light: "#ff91bd", dark: "#c01958" },
    { label: "Opal", name: "Opal", icon: "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png", art: pngDataUrl(nitroOpal), light: "#c8f7ff", dark: "#675cff" },
];
const BOOST_LABELS = ["1 month", "2 months", "3 months", "6 months", "9 months", "1 year", "15 months", "18 months", "2 years"];
const BOOST_ICONS = [
    "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png",
    "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png",
    "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png",
    "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png",
    "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png",
    "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png",
    "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png",
    "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png",
    "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png",
];
const DISCORD_PROFILE_BADGE_ORDER = [
    "sp_staff", "sp_partner", "sp_hypesquad", "sp_bh1",
    "sp_bravery", "sp_brilliance", "sp_balance", "sp_early",
    "sp_bh2", "sp_dev", "sp_mod", "sp_activedev",
    "sp_nitro", "sp_gifting", "sp_boost", "sp_quest", "sp_orbs", "sp_oldname"
];

function profileColor(value: number | undefined, fallback: string): string {
    return Number.isFinite(value) ? `#${Math.max(0, Math.min(0xffffff, Number(value))).toString(16).padStart(6, "0")}` : fallback;
}

function isLightProfileColor(value: number | undefined): boolean {
    if (!Number.isFinite(value)) return false;
    const color = Number(value);
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

function shortProfileDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function NativeNitroBadge({ nitroLevel, nitroSince, accentColor, accentColor2 }: { nitroLevel: number; nitroSince?: string; accentColor?: number; accentColor2?: number; }) {
    const level = NITRO_LEVELS[Math.max(0, Math.min(NITRO_LEVELS.length - 1, nitroLevel))];
    const targetRef = React.useRef<HTMLSpanElement>(null);
    const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = React.useState(false);

    const show = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    };
    const hide = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), 80);
    };
    React.useEffect(() => () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }, []);
    const since = monthsAgo(NITRO_LEVEL_MONTHS[nitroLevel] ?? 0, nitroSince);
    const subscriberDate = shortProfileDate(since);
    const lightProfile = isLightProfileColor(accentColor) || isLightProfileColor(accentColor2);

    return <Popout
        targetElementRef={targetRef}
        shouldShow={open}
        position="top"
        align="center"
        autoInvert
        nudgeAlignIntoViewport
        renderPopout={({ setPopoutRef }) => <div
            ref={setPopoutRef}
            className="cp-native-nitro-popout"
            onPointerEnter={show}
            onPointerLeave={hide}
            style={{
                "--cp-nitro-light": level.light,
                "--cp-nitro-dark": level.dark,
                "--cp-profile-primary": profileColor(accentColor, "#29292f"),
                "--cp-profile-secondary": profileColor(accentColor2 ?? accentColor, "#212126"),
                "--cp-profile-text": lightProfile ? "#15161a" : "#f4f4f5",
                "--cp-profile-muted": lightProfile ? "#4f555d" : "#b7b8bf"
            } as React.CSSProperties}
        >
            <div className="cp-native-nitro-light" />
            <img src={level.art} alt="" />
            <strong>NITRO {level.name.toUpperCase()}</strong>
            <span>Subscriber since {subscriberDate}</span>
        </div>}
    >
        {popoutProps => <span
            {...popoutProps}
            ref={targetRef}
            className="cp-native-nitro-trigger"
            aria-label={level.label}
            onPointerEnter={show}
            onPointerLeave={hide}
            onFocus={show}
            onBlur={hide}
        ><img src={level.icon} alt="" /></span>}
    </Popout>;
}

function nativeNitroBadgeId(level: number): string {
    const months = NITRO_LEVEL_MONTHS[Math.max(0, Math.min(NITRO_LEVEL_MONTHS.length - 1, level))] ?? 0;
    return months > 0 ? `premium_tenure_${months}_month_v2` : "premium";
}

function getDecorationUrl(assetId: string, animated = false): string {
    if (/^a?_[a-f0-9]+$/.test(assetId) || /^[a-f0-9]{32}$/.test(assetId)) return `https://cdn.discordapp.com/avatar-decoration-presets/${assetId}.png?size=160&passthrough=true`;
    return `https://cdn.discordapp.com/media/v1/collectibles-shop/${assetId}/${animated ? "animated" : "static"}`;
}

const ALL_DECORATIONS = Array.from(new Map(decorationCatalog.filter(item => item.category === "decorations").map(item => {
    const asset = item.url.match(/avatar-decoration-presets\/([^/.]+)\.png/)?.[1];
    return [asset, { id: asset || "", skuId: item.id, label: item.label || "Avatar Decoration", url: item.url } ] as const;
})).values()).filter(item => item.id);

function sharedDecorationAsset(value: unknown): string {
    const raw = String(value || "");
    if (!/^https?:/i.test(raw)) return raw;
    try {
        const parts = new URL(raw).pathname.split("/").filter(Boolean);
        const last = parts.pop() || "";
        const asset = /^(?:static|animated)$/i.test(last) ? parts.pop() || "" : last;
        return decodeURIComponent(asset).replace(/\.(?:png|gif|webp)$/i, "");
    }
    catch { return raw; }
}

function nativeDecoration(data: CustomProfileData) {
    const asset = sharedDecorationAsset(data.decorationAsset);
    const skuId = data.decorationSkuId || ALL_DECORATIONS.find(item => item.id === asset)?.skuId;
    return { asset, ...(skuId ? { skuId } : {}) };
}

interface CustomProfileData extends ProfileAppearance {
    localOnly?: boolean;
    username?: string; globalName?: string; avatar?: string; banner?: string;
    bio?: string; accentColor?: number; accentColor2?: number; pronouns?: string;
    badgeFlags?: number; createdAt?: string; nitro?: boolean; nitroLevel?: number; nitroSince?: string;
    boostMonths?: number; email?: string; phone?: string; customBadgeIds?: string[];
    hideBadgesWhenSyncOff?: boolean;
    hideOtherProfiles?: boolean;
    nativeEditorImages?: boolean;
    oldName?: string; decorationAsset?: string; decorationSkuId?: string; copiedUserId?: string; signupDate?: string; replaceRealBadges?: boolean; giftLevel?: number;
    syncRevision?: number;
    hiddenBadgeIds?: string[]; badgeOrder?: string[];
}

let storedData: CustomProfileData = {};
let isEnabled = false;
let domObserver: MutationObserver | null = null;
let cachedOriginalUser: any = null;
let cachedFakeUser: any = null;
let cachedDataHash = 0;
let _trueOriginalUser: any = null;
let _dataVersion = 0;
let allAccountsData: Record<string, CustomProfileData> = {};
let allAccountsEnabled: Record<string, boolean> = {};
let _cachedMyId: string | null = null;
let _realUsername = "";
let _realGlobalName = "";
let _avatarPatchApplied = false;
let _domQueued = false;
let _domMutations: MutationRecord[] = [];
let _cachedRealDateVariants: string[] | null = null;
const REPLACE_BADGES_SYNC_ID = "__cc_replace_real_badges";
// Network budget for the CloudCord profile server. Member lists can touch hundreds
// of users a second, so lookups are cached, negative answers remembered, and
// background refreshes limited to profiles someone actually looked at recently.
const SHARED_PROFILE_TTL_MS = 2 * 60_000;
const SHARED_MISSING_TTL_MS = 15 * 60_000;
const SHARED_VIEWED_WINDOW_MS = 2 * 60_000;
const SHARED_MAX_IN_FLIGHT = 4;
const SHARED_REFRESH_PER_TICK = 5;
const sharedMissingUntil = new Map<string, number>();
const sharedViewedAt = new Map<string, number>();
let sharedBackoffUntil = 0;
const sharedProfiles = new Map<string, CustomProfileData>();
let realGetUserProfile: ((...args: any[]) => any) | null = null;
/** Discord marks profiles the viewer isn't allowed to see as private; show those exactly as Discord does. */
function isPrivateProfile(userId: string): boolean {
    try { return realGetUserProfile?.(userId)?.private === true; } catch { return false; }
}
function viewedSharedProfile(userId: string) {
    if (storedData?.hideOtherProfiles || isRealProfileView(userId) || isPrivateProfile(userId)) return undefined;
    const profile = sharedProfiles.get(userId);
    if (profile) sharedViewedAt.set(userId, Date.now());
    return profile;
}
const sharedProfileFetchedAt = new Map<string, number>();
const sharedRequests = new Set<string>();
let publishTimer: ReturnType<typeof setTimeout> | null = null;
let sharedSyncTimer: ReturnType<typeof setInterval> | null = null;
let uploadedBadges: { id: string; userId: string; name: string; icon: string; }[] = [];
let badgeFetchPending = false;
let badgeFetchedAt = 0;
async function refreshUploadedBadges(force = false) {
    // One list for everyone: refresh every 2 minutes, or at most once a minute when forced.
    if (badgeFetchPending || Date.now() - badgeFetchedAt < (force ? 60_000 : 2 * 60_000)) return;
    badgeFetchPending = true; badgeFetchedAt = Date.now();
    try {
        const response = await fetch("https://getcloudcord.com/v1/custom-badges");
        if (!response.ok) return;
        const payload = await response.json();
        if (!Array.isArray(payload?.badges)) return;
        const next = payload.badges.filter((badge: any) => typeof badge?.id === "string" && typeof badge?.userId === "string" && typeof badge?.name === "string" && typeof badge?.icon === "string" && badge.icon.startsWith("https://getcloudcord.com/v1/custom-badges/"));
        if (JSON.stringify(next) !== JSON.stringify(uploadedBadges)) { uploadedBadges = next; forceAccountPanelRerender(); }
    } catch {} finally { badgeFetchPending = false; }
}
function uploadedUserBadges(userId: string): ProfileBadge[] {
    return uploadedBadges.filter(badge => badge.userId === userId).map(badge => ({ id: `cloudcord-custom-${badge.id}`, description: badge.name, iconSrc: badge.icon, position: 0 }));
}
function refreshBadgesOnFocus() { void refreshUploadedBadges(true); }
let profileEditorOpen = false;
let suppressOwnPullUntil = 0;

function activeUserId(): string | null {
    try {
        return String(AuthenticationStore?.getId?.() || UserStore?.getCurrentUser?.()?.id || _cachedMyId || "") || null;
    } catch { return _cachedMyId; }
}

function fromSharedProfile(data: any): CustomProfileData {
    return {
        ...normalizeProfileAppearance(data),
        username: data?.username || "", globalName: data?.globalName || data?.displayName || "",
        avatar: data?.avatar || "", banner: data?.banner || "", bio: data?.bio || "",
        pronouns: data?.pronouns || "", accentColor: data?.primaryColor ?? data?.accentColor,
        accentColor2: data?.primaryColor != null ? data?.accentColor : data?.accentColor2, badgeFlags: data?.badgeFlags || 0,
        nitro: !!(data?.nitro || data?.nitroLevel >= 0), nitroLevel: data?.nitroLevel, nitroSince: data?.nitroSince || "",
        boostMonths: data?.boostMonths, giftLevel: Number.isInteger(data?.giftLevel) ? data.giftLevel : undefined, customBadgeIds: Array.isArray(data?.customBadgeIds) ? data.customBadgeIds.filter((id: string) => id !== REPLACE_BADGES_SYNC_ID) : [],
        oldName: data?.oldName || "", createdAt: data?.createdAt || "", signupDate: data?.signupDate || data?.joinedSince || "",
        decorationAsset: sharedDecorationAsset(data?.decorationAsset || data?.avatarDecoration), replaceRealBadges: data?.replaceRealBadges === true || Array.isArray(data?.customBadgeIds) && data.customBadgeIds.includes(REPLACE_BADGES_SYNC_ID),
        decorationSkuId: data?.decorationSkuId || data?.avatarDecorationSku,
        syncRevision: Number(data?.syncRevision || 0),
        hiddenBadgeIds: Array.isArray(data?.hiddenBadgeIds) ? data.hiddenBadgeIds : [],
        badgeOrder: Array.isArray(data?.badgeOrder) ? data.badgeOrder : []
    };
}

function hasFakeBadges(data: CustomProfileData | undefined): boolean {
    if (!data) return false;
    return Number(data.badgeFlags ?? 0) !== 0 || data.nitro === true && Number(data.nitroLevel ?? -1) >= 0 || Number(data.boostMonths ?? -1) >= 0 || Number(data.giftLevel ?? -1) >= 0 || (data.customBadgeIds?.length ?? 0) > 0;
}

function shouldReplaceBadges(data: CustomProfileData | undefined): boolean {
    return !!data?.replaceRealBadges && hasFakeBadges(data);
}

const NITRO_LEVEL_MONTHS = [0, 1, 3, 6, 12, 24, 36, 60, 72];
const BOOST_LEVEL_MONTHS = [1, 2, 3, 6, 9, 12, 15, 18, 24];

function monthsAgo(months: number, explicitDate?: string): Date {
    if (explicitDate) return new Date(`${explicitDate}T12:00:00Z`);
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
}

/** Populate every field name used by Discord's desktop profile/badge pipelines. */
function applyNativeProfileMetadata(target: any, data: CustomProfileData, includeNested = true): any {
    if (!target) return target;
    Object.assign(target, nativeProfileAppearance(data));
    if (data.nameplate !== undefined) target.collectibles = nativeCollectibles(target.collectibles, data);
    if (data.profileEffect !== undefined) {
        const effect = data.profileEffect ? profileEffectFor(data.profileEffect.skuId) : null;
        target.profileEffect = effect; target.profile_effect = effect;
        target.profileEffectId = effect?.skuId ?? null; target.profile_effect_id = target.profileEffectId;
    }
    // Discord loads the frame artwork itself from the SKU (profile.profileFrame).
    if (data.profileFrame !== undefined) target.profileFrame = data.profileFrame ? { skuId: data.profileFrame.skuId, type: 3, expiresAt: undefined } : undefined;

    const flags = Number(data.badgeFlags ?? 0);
    if (shouldReplaceBadges(data)) {
        target.publicFlags = flags;
        target.public_flags = flags;
        target.flags = flags;
    }

    const hasNitro = data.nitro === true && Number(data.nitroLevel ?? -1) >= 0;
    const nitroSince = hasNitro
        ? monthsAgo(NITRO_LEVEL_MONTHS[data.nitroLevel ?? 0] ?? 0, data.nitroSince)
        : null;
    target.premiumType = hasNitro ? 2 : 0;
    target.premium_type = target.premiumType;
    target.premiumSince = nitroSince;
    target.premium_since = nitroSince?.toISOString() ?? null;

    const gift = Number(data.giftLevel ?? -1);
    const giftCount = gift >= 0 && gift < GIFT_LEVELS.length ? GIFT_LEVELS[gift].count : 0;
    target.giftCount = giftCount;
    target.gift_count = giftCount;
    target.giftingBadgeTier = gift >= 0 ? gift : null;
    target.gifting_badge_tier = gift >= 0 ? gift : null;

    const boost = Number(data.boostMonths ?? -1);
    const boostSince = boost >= 0 ? monthsAgo(BOOST_LEVEL_MONTHS[boost] ?? 1) : null;
    target.premiumGuildSince = boostSince;
    target.premium_guild_since = boostSince?.toISOString() ?? null;

    // Some profile builds read metadata from the nested user/profile object.
    if (includeNested && target.user && target.user !== target) applyNativeProfileMetadata(target.user, data, false);
    if (includeNested && target.userProfile && target.userProfile !== target) applyNativeProfileMetadata(target.userProfile, data, false);
    return target;
}

function toSharedProfile(data: CustomProfileData) {
    const customBadgeIds = Array.isArray(data.customBadgeIds) ? data.customBadgeIds.filter(id => id !== REPLACE_BADGES_SYNC_ID) : [];
    if (data.replaceRealBadges === true) customBadgeIds.push(REPLACE_BADGES_SYNC_ID);
    const { replaceRealBadges, ...rest } = data;
    return {
        ...rest,
        customBadgeIds,
        displayName: data.globalName,
        joinedSince: data.signupDate,
        avatarDecoration: data.decorationAsset ? getDecorationUrl(data.decorationAsset) : null,
        avatarDecorationSku: data.decorationSkuId || ALL_DECORATIONS.find(item => item.id === data.decorationAsset)?.skuId,
        profileColorsEnabled: data.accentColor != null,
        primaryColor: data.accentColor,
        accentColor: data.accentColor2 ?? data.accentColor,
        syncRevision: Number(data.syncRevision || 0)
    };
}

async function publishSharedProfile(): Promise<void> {
    if (storedData.localOnly) return;
    const ownerId = activeUserId();
    if (!ownerId || !isEnabled) throw new Error("Sign in to Discord before syncing your profile.");
    // Advance the revision without pulling old fields into the open editor.
    const latestResponse = await fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(ownerId)}`, { cache: "no-store" });
    if (latestResponse.ok) {
        const latest = await latestResponse.json();
        storedData.syncRevision = Math.max(Date.now(), Number(storedData.syncRevision || 0), Number(latest?.profile?.syncRevision || 0) + 1);
        allAccountsData[ownerId] = storedData;
        saveDataSync(storedData, true); saveAllDataSync();
    }
    let saved: any = {};
    saved = await DataStore.get(LS_SHARE) || {};
    if (!saved.id) {
        try { saved = JSON.parse(localStorage.getItem(LS_SHARE) || "{}"); } catch { }
        if (saved.id) await DataStore.set(LS_SHARE, saved);
    }
    if (storedData.localOnly) return;
    const response = await fetch(`${SHARED_PROFILE_API}${saved.id ? `/v1/profiles/${encodeURIComponent(saved.id)}` : "/v1/profiles"}`, {
        method: saved.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(saved.editToken ? { Authorization: `Bearer ${saved.editToken}` } : {}) },
        body: JSON.stringify({ ownerId, profile: toSharedProfile(storedData) })
    });
    if (!response.ok) {
        if (response.status === 409) throw new Error("Your shared profile changed on another device. Reopen the editor and try again.");
        if (saved.id && (response.status === 401 || response.status === 404)) {
            await DataStore.set(LS_SHARE, {});
            try { localStorage.removeItem(LS_SHARE); } catch { }
            return publishSharedProfile();
        }
        const details = await response.json().catch(() => null);
        throw new Error(response.status === 413 ? "Your profile images are too large to sync. Use Upload to crop and resize them." : response.status === 429 ? "Too many saves. Wait a moment and try again." : response.status === 503 ? "Profile sync is unavailable right now. Your changes are saved on this device." : `Couldn't sync your profile (${response.status}). ${String(details?.error || "Try again shortly.").slice(0, 160)}`);
    }
    const result = await response.json();
    if (!saved.id && result?.id) await DataStore.set(LS_SHARE, { id: result.id, editToken: result.editToken });
}

// Save edits made outside the modal (menus, Discord's own editor) for the active account.
function saveOwnData(next: CustomProfileData, enabled = isEnabled) {
    storedData = next; isEnabled = enabled;
    const myId = activeUserId();
    if (myId) { allAccountsData[myId] = next; allAccountsEnabled[myId] = enabled; }
    saveDataSync(next, enabled); saveAllDataSync();
    DataStore.set(DS_KEY, next).catch(() => { });
    DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
    cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
    forceAccountPanelRerender();
}

const isImageUri = (value: unknown): value is string => typeof value === "string" && /^(data:image\/(png|jpe?g|gif|webp);base64,|https:\/\/)/i.test(value);
// Discord's Edit Profile writes avatar and banner picks as pending changes. While the
// custom profile is on, keep them as the CloudCord picture and banner instead, so they
// work without Nitro (GIFs included) and Discord never tries to upload them.
function onPendingProfileChange(action: any) {
    if (action?.guildId || !isEnabled || storedData.nativeEditorImages === false) return;
    const avatar = action.pendingAvatar?.imageUri ?? (typeof action.pendingAvatar === "string" ? action.pendingAvatar : undefined);
    const banner = action.pendingBanner?.imageUri ?? (typeof action.pendingBanner === "string" ? action.pendingBanner : undefined);
    if (!isImageUri(avatar) && !isImageUri(banner)) return;
    const next = { ...storedData };
    if (isImageUri(avatar)) next.avatar = avatar;
    if (isImageUri(banner)) { next.banner = banner; next.nitro = true; }
    saveOwnData(next);
    queueSharedPublish();
    setTimeout(() => {
        try { FluxDispatcher.dispatch({ type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", pendingAvatar: undefined, pendingBanner: undefined }); } catch { }
    }, 0);
    try { showToast(isImageUri(banner) && isImageUri(avatar) ? "Saved as your CloudCord picture and banner." : isImageUri(banner) ? "Saved as your CloudCord banner." : "Saved as your CloudCord profile picture.", Toasts.Type.SUCCESS); } catch { }
}

function queueSharedPublish() {
    if (publishTimer) clearTimeout(publishTimer);
    if (storedData.localOnly) return;
    publishTimer = setTimeout(() => void publishSharedProfile().catch(() => { }), 800);
}

async function pullOwnSharedProfile() {
    if (storedData.localOnly) return;
    // Never replace local form state with the last server snapshot while the
    // profile editor is open or immediately after saving a newer revision.
    if (profileEditorOpen || Date.now() < suppressOwnPullUntil) return;
    const id = activeUserId();
    if (!id) return;
    try {
        const response = await fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(id)}`);
        // Existing installations may have local profile data but no row in the
        // website-backed sync database yet. Seed it automatically instead of
        // waiting for the user to edit a field.
        if (response.status === 404) {
            if (isEnabled) queueSharedPublish();
            return;
        }
        if (!response.ok) return;
        const payload = await response.json();
        if (storedData.localOnly) return;
        const pulled = fromSharedProfile(payload?.profile ?? payload);
        if (!Object.keys(pulled).length) return;
        storedData = pulled; isEnabled = true; allAccountsData[id] = pulled; allAccountsEnabled[id] = true;
        saveDataSync(pulled, true); saveAllDataSync();
        await Promise.all([DataStore.set(DS_ALL_DATA, allAccountsData), DataStore.set(DS_ALL_ENABLED, allAccountsEnabled)]);
        cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++; forceAccountPanelRerender();
    } catch { }
}

function requestSharedProfile(userId: string, force = false) {
    if (!/^\d{15,22}$/.test(userId) || isMe(userId) || sharedRequests.has(userId)) return;
    const now = Date.now();
    if (now < sharedBackoffUntil || sharedRequests.size >= SHARED_MAX_IN_FLIGHT) return;
    if ((sharedMissingUntil.get(userId) ?? 0) > now) return;
    const fetchedAt = sharedProfileFetchedAt.get(userId) ?? 0;
    // Even forced refreshes wait a little, so one user is never fetched in a loop.
    if (sharedProfiles.has(userId) && now - fetchedAt < (force ? 30_000 : SHARED_PROFILE_TTL_MS)) return;
    sharedRequests.add(userId);
    void fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(userId)}`)
        .then(r => {
            if (r.status === 404) {
                // No CloudCord profile: remember that instead of asking again.
                sharedMissingUntil.set(userId, Date.now() + SHARED_MISSING_TTL_MS);
                if (sharedMissingUntil.size > 5000) sharedMissingUntil.delete(sharedMissingUntil.keys().next().value!);
                return null;
            }
            if (r.status === 429 || r.status >= 500) {
                const retryAfter = Number(r.headers.get("retry-after")) * 1000;
                sharedBackoffUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 5 * 60_000) : 60_000);
                return null;
            }
            return r.ok ? r.json() : null;
        }).then(payload => {
            const data = payload?.profile ?? payload;
            if (!data) return;
            const next = fromSharedProfile(data);
            const previous = sharedProfiles.get(userId);
            const changed = JSON.stringify(previous ?? null) !== JSON.stringify(next);
            sharedProfiles.set(userId, next);
            sharedProfileFetchedAt.set(userId, Date.now());
            if (!changed) return;
            try {
                const UPS = (Vencord as any).Webpack?.findByStoreName?.("UserProfileStore");
                UPS?.emitChange?.();
                (Vencord as any).Webpack?.findByStoreName?.("UserStore")?.emitChange?.();
                refreshPresence();
            } catch { }
        }).catch(() => { }).finally(() => sharedRequests.delete(userId));
}

function refreshVisibleSharedProfiles() {
    // Keep recently viewed CloudCord profiles fresh (so changes made on another
    // device appear), a few per tick, oldest first. Nobody else is re-fetched.
    const now = Date.now();
    const due = [...sharedViewedAt]
        .filter(([userId, viewedAt]) => now - viewedAt < SHARED_VIEWED_WINDOW_MS && now - (sharedProfileFetchedAt.get(userId) ?? 0) > 30_000)
        .sort((a, b) => (sharedProfileFetchedAt.get(a[0]) ?? 0) - (sharedProfileFetchedAt.get(b[0]) ?? 0))
        .slice(0, SHARED_REFRESH_PER_TICK);
    for (const [userId] of due) requestSharedProfile(userId, true);
    for (const [userId, viewedAt] of sharedViewedAt) if (now - viewedAt > SHARED_VIEWED_WINDOW_MS) sharedViewedAt.delete(userId);
}

const socialLookupAt = new Map<string, number>();
function getCustomSocialData(userId: string): ProfileAppearance | null | undefined {
    if (isMe(userId)) return isEnabled ? storedData : null;
    if (Date.now() - (socialLookupAt.get(userId) || 0) > 30000) {
        socialLookupAt.set(userId, Date.now());
        requestSharedProfile(userId);
    }
    return viewedSharedProfile(userId);
}

function decorateSharedIdentity(source: any, data: CustomProfileData) {
    if (!source || !data) return source;
    const username = data.username || source.username;
    const globalName = data.globalName || source.globalName || source.displayName;
    const clone = Object.assign(Object.create(Object.getPrototypeOf(source) || Object.prototype), source);
    if (username) {
        clone.username = username;
        clone.userName = username;
        clone.tag = `@${username}`;
        clone.getTag = () => `${username}#0000`;
    }
    if (globalName) {
        clone.globalName = globalName;
        clone.displayName = globalName;
        clone.name = globalName;
        clone.getGlobalName = () => globalName;
    }
    return clone;
}

function decorateSharedProfile(profile: any, data: CustomProfileData) {
    if (!profile || !data) return profile;
    const merged: any = nativeSocialProfile(profile, data);
    const username = data.username || profile.username || profile.user?.username;
    const globalName = data.globalName || profile.globalName || profile.displayName || profile.user?.globalName;
    if (username) {
        merged.username = username;
        merged.userName = username;
        merged.tag = `@${username}`;
        merged.getTag = () => `${username}#0000`;
    }
    if (globalName) {
        merged.globalName = globalName;
        merged.displayName = globalName;
        merged.name = globalName;
        merged.getGlobalName = () => globalName;
    }
    if (profile.user) merged.user = decorateSharedIdentity(profile.user, data);
    if (profile.userProfile && profile.userProfile !== profile) merged.userProfile = decorateSharedIdentity(profile.userProfile, data);
    if (profile.displayProfile && profile.displayProfile !== profile) merged.displayProfile = decorateSharedIdentity(profile.displayProfile, data);
    if (data.bio) merged.bio = data.bio;
    if (data.pronouns) merged.pronouns = data.pronouns;
    if (data.banner) {
        merged.bannerURL = data.banner;
        merged.bannerUrl = data.banner;
        merged.bannerSrc = data.banner;
        merged.getBannerURL = () => data.banner;
    }
    if (data.createdAt) merged.createdAt = new Date(data.createdAt + "T12:00:00Z");
    if (data.signupDate) { merged.joinedAt = new Date(data.signupDate + "T12:00:00Z"); merged.memberSince = merged.joinedAt; }
    if (data.accentColor != null) merged.accentColor = data.accentColor;
    if (data.accentColor != null) merged.themeColors = [data.accentColor, data.accentColor2 ?? data.accentColor];
    merged.badges = [];
    applyNativeProfileMetadata(merged, data);
    return Object.assign(Object.create(Object.getPrototypeOf(profile)), profile, merged);
}

function resolveProfileUserId(subject: any, profile: any): string {
    return String(
        (typeof subject === "string" ? subject : subject?.userId || subject?.id || subject?.user?.id)
        || profile?.userId || profile?.id || profile?.user?.id
        || profile?.userProfile?.userId || profile?.userProfile?.user?.id
        || profile?.guildMemberProfile?.userId || profile?.guildMemberProfile?.user?.id
        || profile?.displayProfile?.userId || profile?.displayProfile?.user?.id
        || profile?.profile?.userId || profile?.profile?.user?.id
        || ""
    );
}

function saveDataSync(data: CustomProfileData, enabled: boolean) {
    try { localStorage.setItem(LS_KEY_DATA, JSON.stringify(data)); localStorage.setItem(LS_KEY_ENABLED, enabled ? "1" : "0"); } catch { }
}
function saveAllDataSync() {
    try { localStorage.setItem(LS_ALL_DATA, JSON.stringify(allAccountsData)); localStorage.setItem(LS_ALL_ENABLED, JSON.stringify(allAccountsEnabled)); } catch { }
}
function syncCurrentUserData() {
    const myId = activeUserId();
    if (myId) { _cachedMyId = myId; storedData = allAccountsData[myId] || {}; isEnabled = allAccountsEnabled[myId] || false; }
}
function loadDataSync() {
    try {
        const rawAll = localStorage.getItem(LS_ALL_DATA);
        if (rawAll) {
            try { allAccountsData = JSON.parse(rawAll); } catch { allAccountsData = {}; }
            const rawEnabled = localStorage.getItem(LS_ALL_ENABLED);
            try { allAccountsEnabled = rawEnabled ? JSON.parse(rawEnabled) : {}; } catch { allAccountsEnabled = {}; }
            syncCurrentUserData(); return;
        }
        const raw = localStorage.getItem(LS_KEY_DATA);
        const en = localStorage.getItem(LS_KEY_ENABLED);
        if (raw) { try { storedData = JSON.parse(raw); } catch { storedData = {}; } } else storedData = {};
        isEnabled = en === "1";
    } catch { storedData = {}; isEnabled = false; }
}
function onAccountSwitch() {
    updateCachedRealData(); syncCurrentUserData();
    cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
    _realUsername = ""; _realGlobalName = ""; _cachedRealDateVariants = null;
    if (isEnabled) startDomObserver(); else stopDomObserver();
    void pullOwnSharedProfile();
    forceAccountPanelRerender();
}
loadDataSync();

function isMe(userId: string | null | undefined): boolean {
    if (!userId) return false;
    if (_cachedMyId) return _cachedMyId === userId;
    try { const myId = activeUserId(); if (myId) { _cachedMyId = myId; return myId === userId; } } catch { }
    return false;
}
function updateCachedRealData() {
    try { const myId = activeUserId(); if (myId) _cachedMyId = myId; } catch { }
}
function getRealDateVariants(): string[] {
    if (_cachedRealDateVariants) return _cachedRealDateVariants;
    try {
        const u = UserStore.getCurrentUser(); if (!u?.id) return [];
        const ms = Number(BigInt(u.id) >> 22n) + 1420070400000;
        const d = new Date(ms); const variants = new Set<string>();
        const fmtSpecs: Intl.DateTimeFormatOptions[] = [
            { day: "numeric", month: "short", year: "numeric" }, { day: "numeric", month: "long", year: "numeric" },
            { month: "short", day: "numeric", year: "numeric" }, { month: "long", day: "numeric", year: "numeric" },
            { day: "2-digit", month: "2-digit", year: "numeric" },
        ];
        for (const loc of ["en-US", "en-GB", "fr-FR", navigator.language]) {
            for (const fmt of fmtSpecs) { try { const s = new Intl.DateTimeFormat(loc, fmt).format(d); variants.add(s); variants.add(s.replace(/\s/g, " ")); } catch { } }
        }
        variants.add(d.getFullYear().toString());
        _cachedRealDateVariants = [...variants].filter(v => v.length >= 4);
        return _cachedRealDateVariants;
    } catch { return []; }
}
function getFakeDateVariants(isoDate: string): string[] {
    try {
        const d = new Date(isoDate + "T12:00:00Z"); const variants = new Set<string>();
        for (const fmt of [{ day: "numeric", month: "short", year: "numeric" } as Intl.DateTimeFormatOptions, { day: "numeric", month: "long", year: "numeric" } as Intl.DateTimeFormatOptions]) {
            try { variants.add(new Intl.DateTimeFormat(navigator.language, fmt).format(d)); } catch { }
        }
        return [...variants];
    } catch { return []; }
}
function scanTextNode(node: Text) {
    if (!isEnabled || !node.nodeValue) return;
    const val = (node as any).__cp_orig || node.nodeValue;
    let result = val; let replaced = false;
    if (storedData.createdAt) {
        const realDates = getRealDateVariants(); const fakeDates = getFakeDateVariants(storedData.createdAt);
        if (realDates.length > 0 && fakeDates.length > 0) {
            for (const realDate of realDates) { if (realDate.length >= 4 && val.includes(realDate)) { result = result.split(realDate).join(fakeDates[0]); replaced = true; } }
        }
    }
    if (_realUsername && storedData.username && result.includes(_realUsername)) { result = result.split(_realUsername).join(storedData.username); replaced = true; }
    if (_realGlobalName && storedData.globalName && result.includes(_realGlobalName)) { result = result.split(_realGlobalName).join(storedData.globalName); replaced = true; }
    // Nitro overlays are resolved per profile by userProfileBadges. Never
    // rewrite milestone text from the global DOM observer: storedData belongs
    // to the signed-in user and would replace another user's overlay with ours.
    if (replaced && result !== node.nodeValue) { if ((node as any).__cp_orig === undefined) (node as any).__cp_orig = val; node.nodeValue = result; }
}
function scanNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) { scanTextNode(node as Text); return; }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) scanTextNode(n as Text);
    // Milestone artwork is likewise owned by the clicked badge component.
}
function processDomBatch() {
    _domQueued = false;
    if (!isEnabled) { _domMutations = []; return; }
    const batch = _domMutations; _domMutations = [];
    for (const m of batch) { if (m.type === "characterData") scanTextNode(m.target as Text); else for (const n of m.addedNodes) scanNode(n); }
}
function startDomObserver() {
    stopDomObserver(); if (!isEnabled) return;
    scanNode(document.body);
    domObserver = new MutationObserver(mutations => {
        if (!isEnabled || !mutations.length) return;
        _domMutations.push(...mutations);
        if (!_domQueued) { _domQueued = true; setTimeout(() => requestAnimationFrame(processDomBatch), 10); }
    });
    domObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}
function stopDomObserver() {
    domObserver?.disconnect(); domObserver = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) { if ((n as any).__cp_orig !== undefined) { n.nodeValue = (n as any).__cp_orig; delete (n as any).__cp_orig; } }
}
function forceAccountPanelRerender() {
    try {
        const WP = (Vencord as any).Webpack;
        const US = WP?.findByStoreName?.("UserStore"); if (US?.emitChange) US.emitChange();
        const UPS = WP?.findByStoreName?.("UserProfileStore"); if (UPS?.emitChange) UPS.emitChange();
        refreshPresence();
        FluxDispatcher.dispatch({ type: "USER_SETTINGS_PROTO_UPDATE", settings: { type: 1, proto: {} } });
        if (isEnabled) startDomObserver(); else stopDomObserver();
    } catch { }
}
async function loadData() {
    try {
        const allData = await DataStore.get(DS_ALL_DATA) as Record<string, CustomProfileData> | null;
        const allEnabledDs = await DataStore.get(DS_ALL_ENABLED) as Record<string, boolean> | null;
        if (allData && typeof allData === "object" && Object.keys(allData).length > 0) {
            allAccountsData = allData; allAccountsEnabled = allEnabledDs || {};
            syncCurrentUserData(); saveAllDataSync(); saveDataSync(storedData, isEnabled); return;
        }
        const d = await DataStore.get(DS_KEY) as CustomProfileData | null;
        const e = await DataStore.get(DS_ENABLED) as boolean | null;
        if (d !== null) storedData = d; if (e !== null) isEnabled = e === true;
        const myId = AuthenticationStore?.getId?.();
        if (myId && storedData && Object.keys(storedData).length > 0) {
            allAccountsData[myId] = storedData; allAccountsEnabled[myId] = isEnabled;
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
            saveAllDataSync();
        }
        saveDataSync(storedData, isEnabled);
    } catch { }
}

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: any) => {
    if (!children || !Array.isArray(children) || !user?.id) return;
    try {
        const me = UserStore.getCurrentUser(); if (!me || user.id === me.id) return;
        const refresh = () => {
            cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
            try { (UserProfileStore as any).emitChange?.(); } catch { }
            try { (UserStore as any).emitChange?.(); } catch { }
            forceAccountPanelRerender();
        };
        const hasCloudCord = sharedProfiles.has(user.id) && !storedData.hideOtherProfiles;
        children.push(<Menu.MenuGroup>
            {(hasCloudCord || isRealProfileView(user.id)) && <Menu.MenuItem id="cloudcord-profile-view" label={isRealProfileView(user.id) ? "Return to CloudCord profile" : "Show real profile"} action={() => {
                setRealProfileView(user.id, !isRealProfileView(user.id));
                refresh();
                // Let the menu close first so Discord does not stack modals on a closing layer.
                setTimeout(() => { try { UserProfileActions.openUserProfileModal({ userId: user.id }); } catch { } }, 50);
            }} />}
            <Menu.MenuCheckboxItem id="cloudcord-hide-other-profiles" label="Hide other CloudCord profiles" checked={storedData.hideOtherProfiles === true} action={() => {
                saveOwnData({ ...storedData, hideOtherProfiles: !storedData.hideOtherProfiles });
                refresh();
            }} />
        </Menu.MenuGroup>);
        const isCopied = isEnabled && storedData.copiedUserId === user.id;
        children.push(<Menu.MenuGroup>
            {isCopied ? (
                <Menu.MenuItem id="remove-copy-profile" label="Remove copied profile" color="danger" action={() => {
                    const myId = AuthenticationStore?.getId?.();
                    if (myId) { delete allAccountsData[myId]; delete allAccountsEnabled[myId]; }
                    storedData = {}; isEnabled = false; saveDataSync({}, false);
                    cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
                    saveAllDataSync();
                    DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
                    forceAccountPanelRerender();
                }} />
            ) : (
                <Menu.MenuItem id="copy-user-profile" label="Copy this profile" action={async () => {
                    try {
                        const targetUser = UserStore.getUser(user.id) as any; if (!targetUser) return;
                        const { findByProps } = await import("@webpack") as any;
                        const UPS = findByProps("getUserProfile", "getGuildMemberProfile") as any;
                        const profile = UPS?.getUserProfile?.(user.id) ?? {};
                        const newData: CustomProfileData = {
                            username: targetUser.username || "", globalName: targetUser.globalName || "",
                            bio: profile.bio || targetUser.bio || "", accentColor: profile.accentColor ?? targetUser.accentColor,
                            badgeFlags: targetUser.publicFlags ?? 0, copiedUserId: user.id, nitro: (profile.premiumType ?? 0) > 0,
                        };
                        try { const avatarUrl = IconUtils?.getUserAvatarURL?.(targetUser, true, 512); if (avatarUrl) newData.avatar = avatarUrl; } catch { }
                        if (profile.banner ?? targetUser.banner) { const bid = profile.banner ?? targetUser.banner; newData.banner = `https://cdn.discordapp.com/banners/${user.id}/${bid}.${bid.startsWith("a_") ? "gif" : "png"}?size=512`; }
                        try { newData.createdAt = new Date(Number(BigInt(user.id) >> 22n) + 1420070400000).toISOString().slice(0, 10); } catch { }
                        if (targetUser.avatarDecorationData?.asset) { newData.decorationAsset = targetUser.avatarDecorationData.asset; newData.decorationSkuId = targetUser.avatarDecorationData.skuId; }
                        const myId = AuthenticationStore?.getId?.();
                        if (myId) { allAccountsData[myId] = newData; allAccountsEnabled[myId] = true; }
                        storedData = newData; isEnabled = true; saveDataSync(newData, true); saveAllDataSync();
                        DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
                        forceAccountPanelRerender();
                    } catch (err) { console.error("[ProfileSpoofer] copyUserProfile error:", err); }
                }} />
            )}
        </Menu.MenuGroup>);
    } catch (err) { console.error("[ProfileSpoofer] Context menu patch error:", err); }
};

function EditIcon({ size = 18 }: { size?: number; }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>; }
function FolderIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z" /></svg>; }
function CloseIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>; }
function TrashIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h4a1 1 0 1 1 0 2h-1.1l-.9 12.1A3 3 0 0 1 17 23H7a3 3 0 0 1-3-2.9L3.1 8H2a1 1 0 0 1 0-2h4V4Zm2 0v2h6V4H9ZM5.1 8l.9 11.9a1 1 0 0 0 1 .1h6a1 1 0 0 0 1-.1L14.9 8H5.1Z" /></svg>; }
function SaveIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z" /></svg>; }

function Field({ label, value, placeholder, onChange, type = "text" }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void; type?: string; }) {
    return <div className="cp-field"><div className="cp-section-label">{label}</div><input className="cp-input" type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></div>;
}
function ImageUpload({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void; }) {
    const fileRef = React.useRef<HTMLInputElement>(null);
    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => { if (ev.target?.result) onChange(ev.target.result as string); };
        reader.readAsDataURL(file);
    }
    return (<div className="cp-field"><div className="cp-section-label">{label}</div><div className="cp-image-row">
        <input className="cp-input" placeholder="Image URL..." value={value.startsWith("data:") ? "" : value} onChange={e => onChange(e.target.value)} />
        <button className="cp-file-btn" onClick={() => fileRef.current?.click()} title="Choose a file"><FolderIcon /></button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {value && <><img src={value} alt="" className="cp-preview-avatar" /><button className="cp-clear-btn" onClick={() => onChange("")} title="Remove"><CloseIcon /></button></>}
    </div></div>);
}
function Toggle({ label, checked, onChange, sublabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; sublabel?: string; }) {
    return (<div className="cp-toggle-row" role="switch" aria-checked={checked} tabIndex={0} onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }} onClick={() => onChange(!checked)}>
        <div className="cp-toggle-text"><span className="cp-toggle-label">{label}</span>{sublabel && <span className="cp-toggle-sub">{sublabel}</span>}</div>
        <div className={`cp-toggle ${checked ? "cp-toggle-on" : ""}`}><div className="cp-toggle-thumb" /></div>
    </div>);
}
function BadgeCard({ label, icon, active, onClick, radio }: { label: string; icon?: string; active: boolean; onClick: () => void; radio?: boolean; }) {
    return <button type="button" role={radio ? "radio" : "checkbox"} aria-checked={active} className={`cpx-badge-card ${active ? "cpx-on" : ""}`} onClick={onClick} title={label}>
        <span className="cpx-badge-icon">{icon ? <img src={icon} alt="" loading="lazy" onError={event => event.currentTarget.setAttribute("data-broken", "")} /> : <span aria-hidden="true">–</span>}</span>
        <span className="cpx-badge-label">{label}</span>
    </button>;
}

function BadgeGroup({ title, hint, children, radio }: { title: string; hint?: string; children: React.ReactNode; radio?: boolean; }) {
    return <div className="cpx-field">
        <span className="cpx-label">{title}</span>
        {hint && <span className="cpx-hint">{hint}</span>}
        <div className="cpx-badge-grid" role={radio ? "radiogroup" : "group"} aria-label={title}>{children}</div>
    </div>;
}

function BadgePicker({ selected, onChange, nitroType, onNitroType, giftLevel, onGiftLevel, boostLevel, onBoostLevel, customIds, onCustomIds, oldName, onOldName, replaceRealBadges, onReplaceRealBadges }: {
    selected: number; onChange: (v: number) => void; nitroType: number; onNitroType: (v: number) => void;
    giftLevel: number; onGiftLevel: (v: number) => void;
    boostLevel: number; onBoostLevel: (v: number) => void; customIds: string[]; onCustomIds: (v: string[]) => void; oldName: string; onOldName: (v: string) => void;
    replaceRealBadges: boolean; onReplaceRealBadges: (v: boolean) => void;
}) {
    const toggleId = (id: string) => onCustomIds(customIds.includes(id) ? customIds.filter(other => other !== id) : [...customIds, id]);
    const hasOldName = customIds.includes("oldname");
    return <div className="cpx-badges">
        <Switch label="Hide my real badges" description="When you pick badges here, show only these instead of your real Discord badges." checked={replaceRealBadges} onChange={onReplaceRealBadges} />

        <BadgeGroup title="Discord badges" hint="Pick as many as you like.">
            {BADGES.map(badge => <BadgeCard key={badge.flag} label={badge.label} icon={badge.icon} active={!!(selected & badge.flag)} onClick={() => onChange(selected ^ badge.flag)} />)}
        </BadgeGroup>

        <BadgeGroup title="Nitro badge" hint="The badge changes with how long you've had Nitro." radio>
            <BadgeCard radio label="None" active={nitroType === -1} onClick={() => onNitroType(-1)} />
            {NITRO_LEVELS.map((level, index) => <BadgeCard radio key={index} label={level.label} icon={level.icon} active={nitroType === index} onClick={() => onNitroType(index)} />)}
        </BadgeGroup>

        <BadgeGroup title="Server booster" radio>
            <BadgeCard radio label="None" active={boostLevel === -1} onClick={() => onBoostLevel(-1)} />
            {BOOST_LABELS.map((label, index) => <BadgeCard radio key={index} label={label} icon={BOOST_ICONS[index]} active={boostLevel === index} onClick={() => onBoostLevel(index)} />)}
        </BadgeGroup>

        <BadgeGroup title="Gifting" radio>
            <BadgeCard radio label="None" active={giftLevel === -1} onClick={() => onGiftLevel(-1)} />
            {GIFT_LEVELS.map((level, index) => <BadgeCard radio key={level.id} label={level.name} icon={level.icon} active={giftLevel === index} onClick={() => onGiftLevel(index)} />)}
        </BadgeGroup>

        <BadgeGroup title="Special">
            <BadgeCard label="Completed a Quest" icon="https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png" active={customIds.includes("quest")} onClick={() => toggleId("quest")} />
            <BadgeCard label="Orbs Apprentice" icon="https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png" active={customIds.includes("orbs")} onClick={() => toggleId("orbs")} />
            <BadgeCard label="Originally known as" icon={OLD_NAME_BADGE_ICON} active={hasOldName} onClick={() => toggleId("oldname")} />
        </BadgeGroup>
        {hasOldName && <TextField label="Previous username (shown in the badge tooltip)" value={oldName} placeholder="olduser#0000" onChange={onOldName} />}

        {EVENT_BADGES.length > 0 && <BadgeGroup title="Event badges">
            {EVENT_BADGES.map(badge => <BadgeCard key={badge.id} label={badge.name} icon={badge.icon} active={customIds.includes(badge.id)} onClick={() => toggleId(badge.id)} />)}
        </BadgeGroup>}

        {EXPERIMENTAL_BADGE_GROUPS.length > 0 && <div className="cpx-grid2">
            {EXPERIMENTAL_BADGE_GROUPS.map(group => <SelectField key={group.id} label={group.label}
                options={[{ value: "", label: "None" }, ...group.tiers.map(tier => ({ value: tier.id, label: `${tier.name} · ${tier.milestone}` }))]}
                value={group.tiers.find(tier => customIds.includes(tier.id))?.id || ""}
                onChange={value => onCustomIds([...customIds.filter(id => !group.tiers.some(tier => tier.id === id)), ...(value ? [value] : [])])} />)}
        </div>}
    </div>;
}


function badgeLayoutRows(data: CustomProfileData, userId: string): ProfileBadge[] {
    let native: ProfileBadge[] = [];
    try {
        const profile = UserProfileStore.getUserProfile(userId) as any;
        native = profile?.cloudcordUnorderedBadges?.() || profile?.getBadges?.() || profile?.badges || [];
    } catch { }
    // Regenerate fake badges from the editor draft rather than the last save.
    const rows: ProfileBadge[] = !shouldReplaceBadges(data) && Array.isArray(native) ? native.filter(badge => !/^sp_|^fakeprofile-|^cloudcord-shared-/.test(String(badge.id))) : [];
    const flagKeys: Record<number, string> = {
        [FLAG.STAFF]: "staff", [FLAG.PARTNER]: "partner", [FLAG.HYPESQUAD]: "hypesquad",
        [FLAG.BUG_HUNTER_1]: "bug1", [FLAG.BUG_HUNTER_2]: "bug2",
        [FLAG.BRAVERY]: "bravery", [FLAG.BRILLIANCE]: "brilliance", [FLAG.BALANCE]: "balance",
        [FLAG.EARLY_SUPPORTER]: "early", [FLAG.DEV_VERIFIED]: "vdev",
        [FLAG.MOD_ALUMNI]: "mod", [FLAG.ACTIVE_DEVELOPER]: "active"
    };
    for (const badge of BADGES) if ((data.badgeFlags || 0) & badge.flag) rows.push({ id: flagKeys[badge.flag], description: badge.label, iconSrc: badge.icon });
    if (data.nitro && Number(data.nitroLevel ?? -1) >= 0) rows.push({ id: "nitro", description: "Nitro", iconSrc: NITRO_LEVELS[data.nitroLevel!]?.icon });
    if (Number(data.boostMonths ?? -1) >= 0) rows.push({ id: "boost", description: "Server Booster", iconSrc: BOOST_ICONS[data.boostMonths!] });
    if (Number(data.giftLevel ?? -1) >= 0) rows.push({ id: "gifting", description: GIFT_LEVELS[data.giftLevel!]?.name || "Gifting", iconSrc: GIFT_LEVELS[data.giftLevel!]?.icon });
    const special = [
        ...EXTRA_BADGES,
        { id: "oldname", label: "Originally Known As", icon: OLD_NAME_BADGE_ICON },
        { id: "quest", label: "Completed a Quest", icon: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png" },
        { id: "orbs", label: "Orbs — Apprentice", icon: "https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png" }
    ];
    for (const badge of special) if (data.customBadgeIds?.includes(badge.id)) rows.push({ id: badge.id, description: badge.label, iconSrc: badge.icon });
    rows.push(...uploadedUserBadges(userId));
    const role = CLOUDCORD_STAFF_ROLES[userId];
    if (role) rows.unshift({ id: `cloudcord-official-${role.toLowerCase()}`, description: `CloudCord ${role}` });
    const unique = new Map<string, ProfileBadge>();
    for (const badge of rows) { const key = badgeLayoutKey(badge); if (key && !unique.has(key)) unique.set(key, { ...badge, id: key }); }
    for (const id of data.hiddenBadgeIds || []) if (!unique.has(id)) unique.set(id, { id, description: id });
    return applyBadgeLayout([...unique.values()], { badgeOrder: data.badgeOrder?.length ? data.badgeOrder : defaultBadgeOrder(native) });
}

function BadgeLayoutEditor({ data, userId, onChange }: { data: CustomProfileData; userId: string; onChange: (layout: Pick<CustomProfileData, "badgeOrder" | "hiddenBadgeIds">) => void; }) {
    const rows = badgeLayoutRows(data, userId);
    const hidden = data.hiddenBadgeIds || [];
    const keys = rows.map(row => row.id);
    if (!rows.length) return <p className="cpx-hint">Pick some badges above, then arrange them here.</p>;
    return <div className="cpx-field">
        <ol className="cpx-order-list" aria-label="Badge order">
            {rows.map((row, index) => {
                const isHidden = hidden.includes(row.id);
                const name = row.description || row.id;
                return <li key={row.id} className={`cpx-order-row ${isHidden ? "cpx-order-hidden" : ""}`}>
                    <span className="cpx-order-pos">{index + 1}</span>
                    {row.iconSrc ? <img src={row.iconSrc} alt="" width={22} height={22} /> : <span className="cpx-order-blank" aria-hidden="true" />}
                    <span className="cpx-order-name">{name}{isHidden && <span className="cpx-hint"> · hidden</span>}</span>
                    <div className="cpx-inline">
                        <button type="button" className="cpx-btn cpx-btn-ghost cpx-icon-btn" aria-label={`Move ${name} earlier`} disabled={index === 0} onClick={() => onChange({ badgeOrder: moveBadgeOrder(keys, row.id, -1) })}>↑</button>
                        <button type="button" className="cpx-btn cpx-btn-ghost cpx-icon-btn" aria-label={`Move ${name} later`} disabled={index === rows.length - 1} onClick={() => onChange({ badgeOrder: moveBadgeOrder(keys, row.id, 1) })}>↓</button>
                        <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => onChange({ hiddenBadgeIds: isHidden ? hidden.filter(id => id !== row.id) : [...hidden, row.id] })}>{isHidden ? "Show" : "Hide"}</button>
                    </div>
                </li>;
            })}
        </ol>
        <div className="cpx-inline"><button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => onChange({ hiddenBadgeIds: [], badgeOrder: [] })}>Reset order</button></div>
    </div>;
}

function CustomProfileModal({ rootProps }: { rootProps: any; }) {
    const myId = AuthenticationStore?.getId?.() || "";
    const [selectedAccountId, setSelectedAccountId] = React.useState(myId);
    const [data, setData] = React.useState<CustomProfileData>(() => ({ ...(allAccountsData[myId] || storedData || {}) }));
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState("");
    const [decorationLimit, setDecorationLimit] = React.useState(24);
    const [decorationSearch, setDecorationSearch] = React.useState("");
    const [liveDecorations, setLiveDecorations] = React.useState<typeof ALL_DECORATIONS>([]);
    React.useEffect(() => { loadCatalog().then(result => setLiveDecorations(result.decorations), () => { }); }, []);
    const decorations = [...ALL_DECORATIONS, ...liveDecorations.filter(live => !ALL_DECORATIONS.some(item => item.id === live.id))]
        .filter(item => item.label.toLowerCase().includes(decorationSearch.toLowerCase()));
    const nitroLevel = data.nitroLevel ?? -1;
    const boostLevel = data.boostMonths ?? -1;
    const giftLevel = data.giftLevel ?? -1;
    const customIds = data.customBadgeIds ?? [];
    const oldName = data.oldName ?? "";

    React.useEffect(() => {
        profileEditorOpen = true;
        return () => { profileEditorOpen = false; };
    }, []);

    const accounts = React.useMemo(() => {
        try {
            const MAS = (window as any).Vencord?.Webpack?.findByProps?.("getUsers", "getValidUsers");
            if (MAS?.getUsers) { const users = MAS.getUsers(); if (Array.isArray(users) && users.length > 0) return users; }
        } catch { }
        const me = UserStore.getCurrentUser(); return me ? [me] : [];
    }, []);

    React.useEffect(() => { setData({ ...(allAccountsData[selectedAccountId] || {}) }); }, [selectedAccountId]);

    function set<K extends keyof CustomProfileData>(key: K, val: CustomProfileData[K]) { setData(d => ({ ...d, [key]: val })); }
    const appearanceEnums = React.useMemo(() => {
        try { return findByProps("DisplayNameFont", "DisplayNameEffect") || {}; } catch { return {}; }
    }, []);
    const fonts = appearanceOptions(appearanceEnums.DisplayNameFont);
    const effects = appearanceOptions(appearanceEnums.DisplayNameEffect);
    const nameStyle = data.displayNameStyles || { fontId: 0, effectId: 0, colors: [0xffffff] };
    const tag = data.serverTag || { tag: "", guildId: "", badge: "" };

    async function save(useEverywhere = false) {
        setSaving(true);
        setSaveError("");
        try {
            const appearance = normalizeProfileAppearance(data);
            const socialErrors = customSocialValidationErrors(data);
            if (socialErrors.length) throw new Error(socialErrors[0]);
            if (data.serverTag && !appearance.serverTag) throw new Error("Enter a 1–4 character tag, a valid server ID, and a valid badge hash or leave the badge empty.");
            if (data.displayNameStyles && !appearance.displayNameStyles) throw new Error("Choose valid username styles and colors.");
            const savedData = { ...data, ...appearance, localOnly: !useEverywhere, ...(useEverywhere ? { syncRevision: Date.now() } : {}) };
            if (!useEverywhere && publishTimer) { clearTimeout(publishTimer); publishTimer = null; }
            allAccountsData[selectedAccountId] = savedData; allAccountsEnabled[selectedAccountId] = true;
            if (selectedAccountId === myId) {
                storedData = savedData; isEnabled = true; saveDataSync(storedData, true);
                cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
            }
            saveAllDataSync();
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
            updateCachedRealData(); forceAccountPanelRerender();
            if (selectedAccountId === myId && useEverywhere) {
                // Keep the just-saved local revision authoritative while the
                // website receives it; the polling loop must not restore the
                // previous revision during this window.
                suppressOwnPullUntil = Date.now() + 60_000;
                if (publishTimer) { clearTimeout(publishTimer); publishTimer = null; }
                await publishSharedProfile();
            }
        } catch (err) { console.error("[ProfileSpoofer] save error:", err); suppressOwnPullUntil = 0; setSaveError(err instanceof Error ? err.message : "Couldn't save your profile. Try again."); setSaving(false); return; }
        setSaving(false); rootProps.onClose();
    }

    async function reset() {
        delete allAccountsData[selectedAccountId]; delete allAccountsEnabled[selectedAccountId];
        if (selectedAccountId === myId) {
            storedData = {}; isEnabled = false; saveDataSync({}, false);
            cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
        }
        saveAllDataSync();
        DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
        if (selectedAccountId === myId) { DataStore.set(DS_KEY, {}).catch(() => { }); DataStore.set(DS_ENABLED, false).catch(() => { }); }
        forceAccountPanelRerender(); rootProps.onClose();
    }

    const [tab, setTab] = React.useState<TabId>("profile");
    const [catalogData, setCatalogData] = React.useState<Catalog | null>(null);
    React.useEffect(() => { loadCatalog().then(setCatalogData, () => { }); }, []);
    const [confirmReset, setConfirmReset] = React.useState(false);
    const selectedUser: any = accounts.find((account: any) => account.id === selectedAccountId) || UserStore.getUser(selectedAccountId);
    const fallbackAvatar = selectedUser ? IconUtils.getUserAvatarURL(selectedUser, false, 128) : "https://cdn.discordapp.com/embed/avatars/0.png";
    const currentDecoration = decorations.find(item => item.id === data.decorationAsset) || ALL_DECORATIONS.find(item => item.id === data.decorationAsset) || liveDecorations.find(item => item.id === data.decorationAsset);
    const nameColors = [0, 1, 2].map(index => nameStyle.colors[index] ?? nameStyle.colors[0] ?? 0xffffff);
    const knownTags = availableServerTags((UserStore as any).getUsers?.());

    const panels: Record<TabId, React.ReactNode> = {
        profile: <>
            <Section title="Pictures" description="Shown on your profile, in chat and in member lists for CloudCord users.">
                <ImageField label="Profile picture" value={data.avatar ?? ""} hint="PNG, JPG, WebP or an animated GIF (up to 8 MB)." onChange={value => set("avatar", value)} />
                <Switch label="Simulate Nitro" description="Unlocks a banner and profile colors." checked={data.nitro ?? false} onChange={value => set("nitro", value)} />
                {data.nitro && <ImageField label="Banner" shape="banner" value={data.banner ?? ""} hint="Animated GIF banners work too." onChange={value => set("banner", value)} />}
            </Section>
            <Section title="About you">
                <TextField label="Bio" multiline maxLength={190} value={data.bio ?? ""} placeholder="Tell people about yourself" onChange={value => set("bio", value)} />
                <TextField label="Pronouns" maxLength={40} value={data.pronouns ?? ""} placeholder="they/them" onChange={value => set("pronouns", value)} />
            </Section>
            <Section title="Profile colors" description={data.nitro ? "The gradient behind your profile card." : "Turn on Simulate Nitro to show profile colors."}>
                <Grid2>
                    <ColorField label="Primary" value={data.accentColor} fallback="#5865f2" onChange={value => set("accentColor", value)} />
                    <ColorField label="Accent" optional value={data.accentColor2} fallback="#eb459e" onChange={value => set("accentColor2", value)} />
                </Grid2>
            </Section>
            <Section title="Dates" description="Leave empty to use your real dates.">
                <Grid2>
                    <TextField label="Account created" type="date" value={data.createdAt ?? ""} onChange={value => set("createdAt", value)} />
                    <TextField label="Member since" type="date" value={data.signupDate ?? ""} onChange={value => set("signupDate", value)} />
                    <TextField label="Nitro since" type="date" value={data.nitroSince ?? ""} onChange={value => set("nitroSince", value)} />
                </Grid2>
            </Section>
        </>,
        name: <>
            <Section title="Names">
                <Grid2>
                    <TextField label="Display name" maxLength={32} value={data.globalName ?? ""} placeholder={selectedUser?.globalName || "Display name"} onChange={value => set("globalName", value)} />
                    <TextField label="Username" maxLength={32} value={data.username ?? ""} placeholder={selectedUser?.username || "username"} onChange={value => set("username", value)} />
                </Grid2>
            </Section>
            <Section title="Name style" description="Font, effect and colors for your display name.">
                <Switch label="Custom name style" checked={data.displayNameStyles != null} onChange={value => set("displayNameStyles", value ? nameStyle : null)} />
                {data.displayNameStyles != null && (fonts.length || effects.length ? <>
                    <Grid2>
                        <SelectField label="Font" options={fonts.length ? fonts : [{ value: 0, label: "Default" }]} value={nameStyle.fontId} onChange={value => set("displayNameStyles", { ...nameStyle, fontId: value })} />
                        <SelectField label="Effect" options={effects.length ? effects : [{ value: 0, label: "None" }]} value={nameStyle.effectId} onChange={value => set("displayNameStyles", { ...nameStyle, effectId: value })} />
                    </Grid2>
                    <Grid2>
                        {[0, 1, 2].map(index => <ColorField key={index} label={`Color ${index + 1}`} value={nameColors[index]} fallback="#ffffff"
                            onChange={value => { const colors = [...nameColors]; colors[index] = value ?? 0xffffff; set("displayNameStyles", { ...nameStyle, colors }); }} />)}
                    </Grid2>
                </> : <p className="cpx-hint">Discord's name styles aren't available in this Discord version.</p>)}
            </Section>
            <Section title="Server tag" description="The small tag next to your name. Only changes what CloudCord users see.">
                <Switch label="Custom server tag" checked={data.serverTag != null} onChange={value => set("serverTag", value ? tag : null)} />
                {data.serverTag != null && <>
                    {knownTags.length > 0 && <SelectField label="Start from a tag you've seen" value=""
                        options={[{ value: "", label: "Choose a tag…" }, ...knownTags.map(item => ({ value: `${item.guildId}:${item.badge}`, label: item.tag }))]}
                        onChange={value => { const picked = knownTags.find(item => `${item.guildId}:${item.badge}` === value); if (picked) set("serverTag", { ...picked, tag: tag.tag || picked.tag, icon: tag.icon }); }} />}
                    <Grid2>
                        <TextField label="Tag text" maxLength={4} value={tag.tag} placeholder="CC" onChange={value => set("serverTag", { ...tag, tag: Array.from(value).slice(0, 4).join("") })} />
                        <TextField label="Server ID" value={tag.guildId} placeholder="123456789012345678" error={tag.guildId && !/^\d{15,22}$/.test(tag.guildId) ? "Server IDs are 15–22 digits." : undefined} onChange={value => set("serverTag", { ...tag, guildId: value.trim() })} />
                    </Grid2>
                    <TagIconEditor tag={tag} onChange={icon => set("serverTag", { ...tag, icon })} />
                    <div className="cpx-inline">
                        <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => { const user = UserStore.getUser(selectedAccountId) as any; const current = user?.primaryGuild || user?.primary_guild; if (current?.tag) set("serverTag", { tag: current.tag, guildId: current.identityGuildId || current.identity_guild_id, badge: current.badge || "" }); }}>Copy my current tag</button>
                    </div>
                </>}
            </Section>
        </>,
        cosmetics: <>
            <Section title="Avatar decoration" description="The frame around your profile picture.">
                <Current label={currentDecoration?.label || (data.decorationAsset ? "Decoration" : null)} image={currentDecoration?.url} onRemove={() => { set("decorationAsset", undefined); set("decorationSkuId", undefined); }} />
                <PickerGrid items={decorations} label="decorations" keyOf={item => item.id} textOf={item => item.label} renderImage={item => item.url}
                    isSelected={item => data.decorationAsset === item.id} onPick={item => { set("decorationAsset", item.id); set("decorationSkuId", item.skuId); }}
                    noneLabel="No decoration" noneSelected={!data.decorationAsset} onNone={() => { set("decorationAsset", undefined); set("decorationSkuId", undefined); }} />
            </Section>
            <Section title="Profile frame"><ProfileFrameEditor data={data} set={set as any} /></Section>
            <Section title="Profile effect"><ProfileEffectEditor data={data} set={set as any} /></Section>
            <Section title="Nameplate"><NameplateEditor data={data} set={set as any} /></Section>
        </>,
        status: <Section title="Status & activity"><StatusEditor data={data} set={set as any} /></Section>,
        badges: <>
            <Section title="Badges" description="Pick the badges shown on your profile.">
                <Switch label="Hide CloudCord badges while sync is off" description="When you save on this device only, show no CloudCord badges on your profile." checked={data.hideBadgesWhenSyncOff === true} onChange={value => set("hideBadgesWhenSyncOff", value)} />
                <Switch label="Use Discord's Edit Profile for picture and banner" description="While your custom profile is on, a picture or banner you pick in Discord's own Edit Profile is saved here instead, GIFs included." checked={data.nativeEditorImages !== false} onChange={value => set("nativeEditorImages", value)} />
                <Switch label="Hide other CloudCord profiles" description="Show everyone with their real Discord profile. You can also switch this from any user's menu." checked={data.hideOtherProfiles === true} onChange={value => set("hideOtherProfiles", value)} />
                <BadgePicker selected={data.badgeFlags ?? 0} onChange={v => set("badgeFlags", v)} nitroType={nitroLevel} onNitroType={v => { set("nitroLevel", v); set("nitro", v >= 0); }} giftLevel={giftLevel} onGiftLevel={v => set("giftLevel", v)} boostLevel={boostLevel} onBoostLevel={v => set("boostMonths", v)} customIds={customIds} onCustomIds={v => set("customBadgeIds", v)} oldName={oldName} onOldName={v => set("oldName", v)} replaceRealBadges={data.replaceRealBadges === true} onReplaceRealBadges={v => set("replaceRealBadges", v)} />
            </Section>
            <Section title="Badge order" description="Hide badges or change their order.">
                <BadgeLayoutEditor data={data} userId={selectedAccountId} onChange={layout => setData(previous => ({ ...previous, ...layout }))} />
            </Section>
        </>,
        connections: <>
            <Section title="Connections" description="Accounts shown on your profile. These are previews, not verified connections.">
                <CustomSocialEditor data={data} onChange={value => setData(current => ({ ...current, ...value }))} resolveUser={async userId => {
                    let shared = sharedProfiles.get(userId);
                    if (!shared && !isMe(userId)) {
                        try {
                            const response = await fetch(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(10000) });
                            if (response.ok) { const payload = await response.json(); shared = fromSharedProfile(payload?.profile ?? payload); sharedProfiles.set(userId, shared); sharedProfileFetchedAt.set(userId, Date.now()); }
                        } catch { /* Cached Discord user data remains usable offline. */ }
                    }
                    if (isMe(userId) && isEnabled) shared = storedData;
                    const user = UserStore.getUser(userId);
                    if (!shared && !user) return null;
                    const profile = UserProfileStore.getUserProfile(userId) as any;
                    return { username: shared?.username || user?.username || "", displayName: shared?.globalName || user?.globalName || "", avatar: shared?.avatar || (user ? IconUtils.getUserAvatarURL(user) : ""), banner: shared?.banner || customDiscordMediaURL("banners", userId, profile?.banner ?? (user as any)?.banner), bio: shared?.bio || profile?.bio || "", badges: user ? badgeLayoutRows(shared || {}, userId).map(badge => ({ name: badge.description || badge.key || "Badge", icon: badge.iconSrc || "" })) : [] };
                }} />
            </Section>
            <Section title="Custom images & badges" description="Upload your own badge, profile picture or banner on the CloudCord website.">
                <div className="cpx-inline"><button type="button" className="cpx-btn" onClick={() => window.open("https://getcloudcord.com/upload", "_blank", "noopener,noreferrer")}>Open upload page</button></div>
            </Section>
        </>
    };

    return (<ModalRoot {...rootProps} size="large" className="cpx-root">
        <ModalHeader separator={false} className="cpx-header">
            <div className="cpx-header-title"><EditIcon size={18} /><span>Custom Profile</span></div>
            {accounts.length > 1 && <div className="cpx-account">
                <Select
                    options={accounts.map((acc: any) => ({ value: acc.id, label: acc.globalName || acc.username }))}
                    isSelected={(v: string) => v === selectedAccountId}
                    select={(v: string) => setSelectedAccountId(v)}
                    serialize={(v: string) => v}
                    renderOptionLabel={(o: any) => <div className="cpx-account-option"><img src={IconUtils.getUserAvatarURL(accounts.find((a: any) => a.id === o.value), false, 20)} alt="" />{o.label}</div>}
                    renderOptionValue={(selected: any[]) => { const option = selected[0]; if (!option) return <span>Select account</span>; return <div className="cpx-account-option"><img src={IconUtils.getUserAvatarURL(accounts.find((a: any) => a.id === option.value), false, 20)} alt="" />{option.label}</div>; }}
                />
            </div>}
            <button type="button" className="cpx-close" aria-label="Close" title="Close" onClick={rootProps.onClose}><CloseIcon /></button>
        </ModalHeader>

        <ModalContent className="cpx-content" scrollerClassName="cpx-scroller">
            <div className="cpx-layout">
                <TabList value={tab} onChange={setTab} />
                <div className="cpx-panel" id="cpx-panel" role="tabpanel" aria-labelledby={`cpx-tab-${tab}`} key={tab}>{panels[tab]}</div>
                <ProfilePreview data={data} fallbackName={selectedUser?.globalName || selectedUser?.username || "You"} fallbackUsername={selectedUser?.username || "username"} fallbackAvatar={fallbackAvatar}
                    decorationUrl={currentDecoration?.url} nameplateUrl={data.nameplate ? nameplateAssetURL(data.nameplate.asset) : undefined}
                    effectName={data.profileEffect ? catalogData?.effects.find(item => item.skuId === data.profileEffect?.skuId)?.title || "Selected" : undefined}
                    frameName={data.profileFrame ? catalogData?.frames.find(item => item.skuId === data.profileFrame?.skuId)?.label || "Selected" : undefined} />
            </div>
        </ModalContent>

        <ModalFooter className="cpx-footer">
            {saveError && <div className="cpx-footer-error" role="alert">{saveError}</div>}
            <div className="cpx-footer-left">
                {confirmReset
                    ? <><span className="cpx-hint">Reset everything for this account?</span><button type="button" className="cpx-btn cpx-btn-danger" onClick={reset}>Yes, reset</button><button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => setConfirmReset(false)}>Keep</button></>
                    : <button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => setConfirmReset(true)}><TrashIcon /><span>Reset</span></button>}
            </div>
            <div className="cpx-footer-right">
                <button type="button" className="cpx-btn cpx-btn-ghost" onClick={rootProps.onClose}>Cancel</button>
                <button type="button" className="cpx-btn" onClick={() => void save(false)} disabled={saving} title="Only this device; nothing is uploaded">Save on this device</button>
                <button type="button" className="cpx-btn cpx-btn-primary" onClick={() => void save(true)} disabled={saving}><SaveIcon /><span>{saving ? "Syncing…" : "Save everywhere"}</span></button>
            </div>
        </ModalFooter>
    </ModalRoot>);
}

function CustomProfileButton() {
    return <HeaderBarButton icon={() => <EditIcon size={18} />} tooltip="Custom Profile" onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)} />;
}

export default definePlugin({
    name: "ProfileSpoofer",
    enabledByDefault: true,
    description: "Updating / experimental — visually customize your profile. Some options may currently contain errors.",
    authors: [SincordDevs.nobody],
    dependencies: ["HeaderBarAPI", "ContextMenuAPI", "ProfileSectionsAPI"],

    patches: [
        {
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /(?<=function \i\((\i)\){)(?=.{0,20}let{avatarDecoration)/,
                replace: "const ccDecorationUrl=$self.patchDecorationUrl($1);if(ccDecorationUrl)return ccDecorationUrl;"
            }
        },
        { find: ':"SHOULD_LOAD");', replacement: { match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/, replace: "$self.patchBannerUrl(arguments[0])||$&" } },
        { find: ".WIDGETS_RTC_UPSELL_COACHMARK)", replacement: { match: /currentUser:(\i)(?=.{0,200}voiceDb)/, replace: "currentUser:$self.fakeCurrentUser($1)" } },
        { find: "DISPLAY_NAME", noWarn: true, replacement: { match: /(?<=currentUser:\i,user:)(\i)/, replace: "$self.fakeCurrentUser($1)" } },
        { find: "obfuscatedEmail", noWarn: true, replacement: [{ match: /obfuscatedEmail:(\i)/, replace: "obfuscatedEmail:$self.fakeObfuscatedEmail($1)" }, { match: /obfuscatedPhone:(\i)/, replace: "obfuscatedPhone:$self.fakeObfuscatedPhone($1)" }] },
        { find: "isHoveringOrFocusing", replacement: { noWarn: true, match: /user:([A-Za-z_$][\w$]*),displayProfile:([A-Za-z_$][\w$]*),themeType/, replace: "user:$self.fakeCurrentUser($1),displayProfile:$2,themeType" } },
        { find: "AccountPanel", replacement: { match: /user:([a-zA-Z0-9_]+),/, replace: "user:$self.fakeCurrentUser($1)," } },
        { find: "UserAccountSettings", replacement: [{ match: /user:([a-zA-Z0-9_]+),/, replace: "user:$self.fakeCurrentUser($1)," }, { match: /email:([^,}]+),/, replace: "email:$self.fakeObfuscatedEmail($1)," }] },
    ],

    getBadgeLayout(userId: string) {
        if (isMe(userId)) return isEnabled ? storedData : null;
        requestSharedProfile(userId);
        return viewedSharedProfile(userId);
    },

    fakeCurrentUser(user: any) {
        if (!user || !isMe(user.id) || !isEnabled) return user;
        if (cachedOriginalUser === user && cachedFakeUser && cachedDataHash === _dataVersion) return cachedFakeUser;
        const realUser = (user as any).__cp_isClone ? _trueOriginalUser || user : user;
        if (!realUser.__cp_isClone) _trueOriginalUser = realUser;
        const realUsername = realUser.__cp_isClone ? (realUser._realUsername || realUser.username) : realUser.username;
        const realGlobalName = realUser.__cp_isClone ? (realUser._realGlobalName ?? realUser.globalName) : realUser.globalName;
        const realDisplayName = realUser.__cp_isClone ? (realUser._realDisplayName ?? realUser.displayName) : realUser.displayName;
        const clone = Object.create(Object.getPrototypeOf(realUser));
        for (const key of Reflect.ownKeys(realUser)) {
            if (key === "username" || key === "globalName" || key === "displayName" || key === "__cp_isClone") continue;
            const desc = Object.getOwnPropertyDescriptor(realUser, key);
            if (desc) Object.defineProperty(clone, key, desc);
        }
        Object.defineProperty(clone, "__cp_isClone", { value: true, enumerable: false, configurable: true });
        clone._realUsername = realUsername; clone._realGlobalName = realGlobalName; clone._realDisplayName = realDisplayName;
        const fakeUsername = storedData.username || realUsername;
        const fakeGlobal = storedData.globalName || realGlobalName;
        const fakeDisplay = storedData.globalName || realGlobalName || realDisplayName || realUsername;
        Object.defineProperty(clone, "username", { get: () => isEnabled ? fakeUsername : realUsername, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "globalName", { get: () => isEnabled ? fakeGlobal : realGlobalName, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "displayName", { get: () => isEnabled ? fakeDisplay : (realDisplayName || realGlobalName || realUsername), set: () => { }, configurable: true, enumerable: true });
        clone.getTag = () => (storedData.username || realUsername) + "#0000";
        clone.getGlobalName = () => isEnabled ? fakeGlobal : realGlobalName;
        if (storedData.createdAt) { const fakeCreatedAt = new Date(storedData.createdAt + "T12:00:00Z"); Object.defineProperty(clone, "createdAt", { get: () => fakeCreatedAt, configurable: true, enumerable: true }); }
        if (storedData.decorationAsset) { clone.avatarDecoration = nativeDecoration(storedData); clone.avatarDecorationData = clone.avatarDecoration; }
        const wantedFlags = storedData.badgeFlags != null ? storedData.badgeFlags : 0;
        if (shouldReplaceBadges(storedData)) {
            clone.publicFlags = wantedFlags; clone.flags = wantedFlags;
        } else {
            clone.publicFlags = realUser.publicFlags ?? realUser.flags ?? 0; clone.flags = realUser.flags ?? realUser.publicFlags ?? 0;
        }
        applyNativeProfileMetadata(clone, storedData);
        cachedOriginalUser = user; cachedFakeUser = clone; cachedDataHash = _dataVersion;
        return clone;
    },

    fakeOtherUser(user: any) {
        if (isRealProfileView(user?.id)) return user?.__cp_original || user;
        if (!user || isMe(user.id)) return user;
        const shared = viewedSharedProfile(user.id);
        if (!shared) {
            requestSharedProfile(user.id);
            return user;
        }
        const realUser = user.__cp_isClone ? (user.__cp_original || user) : user;
        const clone = Object.create(Object.getPrototypeOf(realUser));
        for (const key of Reflect.ownKeys(realUser)) {
            if (key === "username" || key === "globalName" || key === "displayName" || key === "__cp_isClone" || key === "__cp_original") continue;
            const desc = Object.getOwnPropertyDescriptor(realUser, key);
            if (desc) Object.defineProperty(clone, key, desc);
        }
        Object.defineProperty(clone, "__cp_isClone", { value: true, enumerable: false, configurable: true });
        Object.defineProperty(clone, "__cp_original", { value: realUser, enumerable: false, configurable: true });
        
        const fakeUsername = shared.username || realUser.username;
        const fakeGlobal = shared.globalName || realUser.globalName;
        const fakeDisplay = shared.globalName || shared.username || realUser.displayName;
        
        Object.defineProperty(clone, "username", { get: () => fakeUsername, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "globalName", { get: () => fakeGlobal, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "displayName", { get: () => fakeDisplay, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "userName", { get: () => fakeUsername, set: () => { }, configurable: true, enumerable: true });
        Object.defineProperty(clone, "tag", { get: () => `@${fakeUsername}`, set: () => { }, configurable: true, enumerable: true });
        clone.getTag = () => fakeUsername + "#0000";
        clone.getGlobalName = () => fakeGlobal;
        
        if (shared.decorationAsset) { clone.avatarDecoration = nativeDecoration(shared); clone.avatarDecorationData = clone.avatarDecoration; }
        const wantedFlags = shared.badgeFlags != null ? shared.badgeFlags : 0;
        if (shouldReplaceBadges(shared)) {
            clone.publicFlags = wantedFlags; clone.flags = wantedFlags;
        } else {
            clone.publicFlags = realUser.publicFlags ?? realUser.flags ?? 0; clone.flags = realUser.flags ?? realUser.publicFlags ?? 0;
        }
        applyNativeProfileMetadata(clone, shared);
        return clone;
    },

    getActiveProfileColors(userId: string): number[] | null {
        const mine = isMe(userId);
        if (mine && (!isEnabled || !storedData.nitro)) return null;
        const data = mine ? storedData : viewedSharedProfile(userId);
        if (data?.accentColor == null) return null;
        const colors = [data.accentColor, data.accentColor2 ?? data.accentColor];
        return colors.every(color => Number.isFinite(color) && color >= 0 && color <= 0xffffff) ? colors : null;
    },

    hookUserProfile(profile: any) {
        if (!profile || !isEnabled) return profile;
        try {
            const merged: any = nativeSocialProfile(profile, storedData);
            if (storedData.bio) merged.bio = storedData.bio;
            if (storedData.pronouns) merged.pronouns = storedData.pronouns;
            if (storedData.accentColor != null) merged.accentColor = storedData.accentColor;
            if (storedData.banner) {
                merged.bannerURL = storedData.banner;
                merged.bannerUrl = storedData.banner;
                merged.bannerSrc = storedData.banner;
                merged.getBannerURL = () => storedData.banner;
            }
            if (storedData.signupDate) { try { merged.joinedAt = new Date(storedData.signupDate + "T12:00:00Z"); } catch { } }
            if (storedData.decorationAsset) { merged.avatarDecoration = nativeDecoration(storedData); merged.avatarDecorationData = merged.avatarDecoration; }
            if (storedData.nitro && storedData.accentColor != null) merged.themeColors = [storedData.accentColor, storedData.accentColor2 ?? storedData.accentColor];
            applyNativeProfileMetadata(merged, storedData);
            merged.badges = [];
            return Object.assign(Object.create(Object.getPrototypeOf(profile)), profile, merged);
        } catch { return profile; }
    },

fakeObfuscatedEmail(real: string | null) {
        if (!isEnabled || !storedData.email || !real) return real;
        const fake = storedData.email; const atIdx = fake.indexOf("@");
        if (atIdx <= 1) return fake;
        return fake[0] + "***" + fake.slice(atIdx - 1);
    },
    fakeObfuscatedPhone(real: string | null) {
        if (!isEnabled || !storedData.phone || !real) return real;
        const fake = storedData.phone;
        return fake.length < 4 ? fake : "***-***-" + fake.slice(-4);
    },
    patchDecorationUrl(input: any) {
        const user = input?.user ?? input;
        const asset = sharedDecorationAsset(input?.avatarDecoration?.asset || input?.avatarDecorationData?.asset || user?.avatarDecoration?.asset || user?.avatarDecorationData?.asset);
        const item = ALL_DECORATIONS.find(decoration => decoration.id === asset);
        return item?.url;
    },

    patchBannerUrl({ displayProfile }: any) {
        if (!isEnabled || !storedData.nitro || !storedData.banner) return null;
        try { return isMe(displayProfile?.userId) ? storedData.banner : null; } catch { return null; }
    },

    toolboxActions: { "Open Profile Spoofer"() { openModal(props => <CustomProfileModal rootProps={props} />); } },
    _origGetUserAvatarURL: null as any,
    _catalogListener: null as null | (() => void),
    _origGetAvatarDecorationURL: null as any,
    _origExtractTimestamp: null as any,

    userProfileBadges: [{
        getBadges({ userId }: { userId: string; guildId: string; }) {
            void refreshUploadedBadges();
            const published = uploadedUserBadges(userId);
            const userIsMe = isMe(userId);
            let profileData: CustomProfileData | undefined;
            if (userIsMe) {
                if (!isEnabled) return published;
                // Optional: no CloudCord badges while syncing is switched off for this account.
                if (storedData.localOnly && storedData.hideBadgesWhenSyncOff) return [];
                profileData = storedData;
            } else {
                // Keep checking the shared profile after its short cache window. Previously
                // desktop stopped requesting as soon as one response was cached, so later
                // changes made on mobile could never appear until Discord restarted.
                requestSharedProfile(userId);
                profileData = viewedSharedProfile(userId);
                if (!profileData) return published;
            }

            // Suppress real Discord badges by zeroing publicFlags on the live user object
            try {
                const WP = (Vencord as any).Webpack;
                const US = WP?.findByStoreName?.("UserStore") || WP?.findByProps?.("getCurrentUser", "getUser");
                const liveUser = userIsMe ? US?.getCurrentUser?.() : US?.getUser?.(userId);
                if (liveUser && shouldReplaceBadges(profileData)) {
                    Object.defineProperty(liveUser, "publicFlags", { get: () => 0, set: () => {}, configurable: true, enumerable: true });
                    Object.defineProperty(liveUser, "flags", { get: () => 0, set: () => {}, configurable: true, enumerable: true });
                }
            } catch { }

            // Let Discord's profile badge renderer determine the icon size.
            // Forcing 26px made CloudCord badges visibly larger than native ones.
            const style = { objectFit: "contain" as const };
            const nl = profileData.nitroLevel ?? -1;
            const bm = profileData.boostMonths ?? -1;
            const gl = profileData.giftLevel ?? -1;
            const hasNitroFake = profileData.nitro === true && nl >= 0 && nl < NITRO_LEVELS.length;
            const hasBoostFake = bm >= 0 && bm < BOOST_ICONS.length;
            const f = profileData.badgeFlags ?? 0; const badges: ProfileBadge[] = [];
            // Keep Discord's badge sequence while retaining CloudCord's full Nitro
            // milestone hover card on Windows.
            if (f & FLAG.STAFF) badges.push({ id: "sp_staff", description: "Discord Staff", iconSrc: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png", position: 0, props: { style } });
            if (f & FLAG.PARTNER) badges.push({ id: "sp_partner", description: "Partnered Server Owner", iconSrc: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png", position: 0, props: { style } });
            if (f & FLAG.HYPESQUAD) badges.push({ id: "sp_hypesquad", description: "HypeSquad Events", iconSrc: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png", position: 0, props: { style } });
            if (f & FLAG.BUG_HUNTER_1) badges.push({ id: "sp_bh1", description: "Bug Hunter", iconSrc: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png", position: 0, props: { style } });
            if (f & FLAG.BRAVERY) badges.push({ id: "sp_bravery", description: "HypeSquad Bravery", iconSrc: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png", position: 0, props: { style } });
            if (f & FLAG.BRILLIANCE) badges.push({ id: "sp_brilliance", description: "HypeSquad Brilliance", iconSrc: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png", position: 0, props: { style } });
            if (f & FLAG.BALANCE) badges.push({ id: "sp_balance", description: "HypeSquad Balance", iconSrc: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png", position: 0, props: { style } });
            if (f & FLAG.EARLY_SUPPORTER) badges.push({ id: "sp_early", description: "Early Supporter", iconSrc: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png", position: 0, props: { style } });
            if (f & FLAG.BUG_HUNTER_2) badges.push({ id: "sp_bh2", description: "Golden Bug Hunter", iconSrc: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png", position: 0, props: { style } });
            if (f & FLAG.DEV_VERIFIED) badges.push({ id: "sp_dev", description: "Early Verified Bot Developer", iconSrc: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png", position: 0, props: { style } });
            if (f & FLAG.MOD_ALUMNI) badges.push({ id: "sp_mod", description: "Moderator Programs Alumni", iconSrc: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png", position: 0, props: { style } });
            if (f & FLAG.ACTIVE_DEVELOPER) badges.push({ id: "sp_activedev", description: "Active Developer", iconSrc: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png", position: 0, props: { style } });
            if (hasNitroFake) badges.push({
                id: nativeNitroBadgeId(nl),
                key: NITRO_LEVELS[nl].name,
                description: `Subscriber since ${shortProfileDate(monthsAgo(NITRO_LEVEL_MONTHS[nl] ?? 0, profileData.nitroSince))}`,
                iconSrc: NITRO_LEVELS[nl].icon,
                link: "https://discord.com/settings/premium",
                props: { style },
                position: 0
            });
            if (gl >= 0 && gl < GIFT_LEVELS.length) {
                const gift = GIFT_LEVELS[gl];
                badges.push({ id: "sp_gifting", description: gift.name, iconSrc: gift.icon, position: 0, props: { style } });
            }
            if (hasBoostFake) {
                const boostSince = monthsAgo(BOOST_LEVEL_MONTHS[bm] ?? 1);
                badges.push({ id: "sp_boost", description: `Server boosting since ${shortProfileDate(boostSince)}`, iconSrc: BOOST_ICONS[bm], position: 0, props: { style } });
            }
            if (profileData.customBadgeIds?.includes("oldname")) { const desc = profileData.oldName ? `Originally Known As: ${profileData.oldName}` : "Originally Known As"; badges.push({ id: "sp_oldname", description: desc, iconSrc: OLD_NAME_BADGE_ICON, position: 0, props: { style } }); }
            if (profileData.customBadgeIds?.includes("quest")) badges.push({ id: "sp_quest", description: "Completed a Quest", iconSrc: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png", position: 0, props: { style } });
            if (profileData.customBadgeIds?.includes("orbs")) badges.push({ id: "sp_orbs", description: "Orbs — Apprentice", iconSrc: "https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png", position: 0, props: { style } });
            for (const badge of EXTRA_BADGES) {
                if (profileData.customBadgeIds?.includes(badge.id)) badges.push({ id: `sp_${badge.id}`, description: badge.label, iconSrc: badge.icon, position: 0, props: { style } });
            }
            return [...badges, ...published].sort((a, b) => {
                const normalizedA = a.id.startsWith("premium_tenure_") || a.id === "premium" ? "sp_nitro" : a.id;
                const normalizedB = b.id.startsWith("premium_tenure_") || b.id === "premium" ? "sp_nitro" : b.id;
                const ai = DISCORD_PROFILE_BADGE_ORDER.indexOf(normalizedA);
                const bi = DISCORD_PROFILE_BADGE_ORDER.indexOf(normalizedB);
                return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
            });
        }
    } as ProfileBadge] as ProfileBadge[],

    async start() {
        installPresenceHooks(userId => isMe(userId) ? (isEnabled ? storedData : undefined) : isRealProfileView(userId) ? undefined : viewedSharedProfile(userId));
        installTagIconSwap();
        this._catalogListener = onCatalogLoaded(() => { cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++; forceAccountPanelRerender(); });
        // Also hook the public resolver: a source-text patch alone can miss
        // Discord's newer/minified resolver layout.
        const resolver: any = IconUtils;
        if (typeof resolver?.getAvatarDecorationURL === "function" && !this._origGetAvatarDecorationURL) {
            this._origGetAvatarDecorationURL = resolver.getAvatarDecorationURL;
            const original = resolver.getAvatarDecorationURL;
            resolver.getAvatarDecorationURL = (input: any, ...args: any[]) => this.patchDecorationUrl(input) || original.call(resolver, input, ...args);
        }
        addHeaderBarButton("profile-spoofer-btn", () => <CustomProfileButton />, 10);
        addContextMenuPatch("user-context", userContextMenuPatch);
        FluxDispatcher.subscribe("CONNECTION_OPEN", onAccountSwitch);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", onPendingProfileChange);

        // Keep Discord's stored user immutable, but return the configured profile
        // to desktop surfaces which read the current user directly.
        try {
            const US: any = UserStore || (Vencord as any).Webpack?.findByStoreName?.("UserStore") || (Vencord as any).Webpack?.findByProps?.("getCurrentUser", "getUser");
            if (US && !US._cp_hook) {
                let lastReal: any = null, lastFake: any = null, lastVersion = -1;
                const originalCurrent = US.getCurrentUser.bind(US);
                US.getCurrentUser = () => {
                    const real = originalCurrent();
                    if (!real) return real;
                    if (real !== lastReal) {
                        if (real.username) _realUsername = real.username;
                        if (real.globalName) _realGlobalName = real.globalName;
                    }
                    if (!isEnabled) return real;
                    if (real === lastReal && lastVersion === _dataVersion && lastFake) return lastFake;
                    lastReal = real;
                    lastVersion = _dataVersion;
                    lastFake = this.fakeCurrentUser(real);
                    return lastFake;
                };
                const originalGet = US.getUser.bind(US);
                US.getUser = (id: string) => {
                    const real = originalGet(id);
                    return isEnabled && isMe(id) ? this.fakeCurrentUser(real) : this.fakeOtherUser(real);
                };
                US._cp_hook = true;
            }
        } catch { }
        try {
            const UPS = (Vencord as any).Webpack?.findByProps?.("getUserProfile", "getGuildMemberProfile");
            if (UPS && !UPS._cp_hook) {
                const origGet = UPS.getUserProfile.bind(UPS);
                realGetUserProfile = origGet;
                UPS.getUserProfile = (...args: any[]) => {
                    try {
                        const p = origGet(...args);
                        const uid = resolveProfileUserId(args[0], p);
                        if (isMe(uid)) return (isEnabled && p) ? this.hookUserProfile(p) : p;
                        requestSharedProfile(uid);
                        const shared = viewedSharedProfile(uid);
                        return shared && p ? decorateSharedProfile(p, shared) : p;
                    } catch { return origGet(...args); }
                };
                const origGuild = UPS.getGuildMemberProfile.bind(UPS);
                UPS.getGuildMemberProfile = (...args: any[]) => {
                    try {
                        const p = origGuild(...args);
                        const uid = resolveProfileUserId(args[0], p);
                        if (isMe(uid)) return (isEnabled && p) ? this.hookUserProfile(p) : p;
                        requestSharedProfile(uid);
                        const shared = viewedSharedProfile(uid);
                        return shared && p ? decorateSharedProfile(p, shared) : p;
                    } catch { return origGuild(...args); }
                };
                UPS._cp_hook = true;
            }
        } catch { }

        if (IconUtils?.getUserAvatarURL && !_avatarPatchApplied) {
            this._origGetUserAvatarURL = IconUtils.getUserAvatarURL;
            const orig = this._origGetUserAvatarURL;
            (IconUtils as any).getUserAvatarURL = (user: any, ...args: any[]) => {
                if (user?.id && isMe(user.id) && isEnabled && storedData.avatar) return storedData.avatar;
                if (user?.id && !isMe(user.id)) {
                    requestSharedProfile(user.id);
                    const shared = viewedSharedProfile(user.id);
                    if (shared?.avatar) return shared.avatar;
                }
                return orig(user, ...args);
            };
            _avatarPatchApplied = true;
        }

        if (SnowflakeUtils?.extractTimestamp && !this._origExtractTimestamp) {
            this._origExtractTimestamp = SnowflakeUtils.extractTimestamp;
            const orig = this._origExtractTimestamp;
            (SnowflakeUtils as any).extractTimestamp = (snowflake: string) => {
                if (isEnabled && isMe(snowflake)) {
                    if (storedData.signupDate) return new Date(storedData.signupDate + "T12:00:00Z").getTime();
                    if (storedData.createdAt) return new Date(storedData.createdAt + "T12:00:00Z").getTime();
                }
                return orig(snowflake);
            };
        }

        await loadData();
        this._nativeSocial = installNativeSocialHooks({
            ownId: () => UserStore.getCurrentUser()?.id || "",
            ownData: () => isEnabled ? storedData : null,
            profileActions: UserProfileActions,
            profileStore: UserProfileStore, getData: getCustomSocialData,
            channelActions: ChannelActionCreators,
            platforms: findByProps("isSupported", "getByUrl"), openDetail: entry => openSocialDetail(entry),
        });
        this._socialClick = (event: MouseEvent) => {
            const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (anchor && this._nativeSocial?.openURL(anchor.href)) { event.preventDefault(); event.stopImmediatePropagation(); }
        };
        document.addEventListener("click", this._socialClick, true);
        updateCachedRealData();
        // Pull the canonical snapshot before publishing. Publishing first made a
        // stale desktop installation overwrite changes made on mobile.
        await pullOwnSharedProfile();
        void refreshUploadedBadges(true);
        window.addEventListener("focus", refreshBadgesOnFocus);
        if (!sharedSyncTimer) sharedSyncTimer = setInterval(() => {
            if (document.hidden) return;
            void pullOwnSharedProfile();
            refreshVisibleSharedProfiles();
            void refreshUploadedBadges();
        }, 15_000);
        if (isEnabled) forceAccountPanelRerender();
    },

    stop() {
        uninstallPresenceHooks(); uninstallTagIconSwap(); this._catalogListener?.(); this._catalogListener = null;
        document.removeEventListener("click", this._socialClick, true);
        this._nativeSocial?.stop(); this._nativeSocial = null;
        window.removeEventListener("focus", refreshBadgesOnFocus);
        removeHeaderBarButton("profile-spoofer-btn"); removeContextMenuPatch("user-context", userContextMenuPatch);
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", onAccountSwitch); FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", onPendingProfileChange); stopDomObserver();
        if (sharedSyncTimer) { clearInterval(sharedSyncTimer); sharedSyncTimer = null; }
        if (this._origExtractTimestamp && SnowflakeUtils) { (SnowflakeUtils as any).extractTimestamp = this._origExtractTimestamp; this._origExtractTimestamp = null; }
        if (this._origGetUserAvatarURL && IconUtils) { (IconUtils as any).getUserAvatarURL = this._origGetUserAvatarURL; this._origGetUserAvatarURL = null; _avatarPatchApplied = false; }
        if (this._origGetAvatarDecorationURL && IconUtils) { (IconUtils as any).getAvatarDecorationURL = this._origGetAvatarDecorationURL; this._origGetAvatarDecorationURL = null; }
    },

    settingsAboutComponent() { return <Button onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)}>Open Profile Editor</Button>; },
});
