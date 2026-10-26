/*
 * CloudCord Fake Profile
 * Originally created by xohus for CloudCord on iOS and Android.
 * Adapted and substantially expanded for CloudCord Desktop by xohus.
 * Copyright (c) 2026 xohus and CloudCord contributors
 * Portions copyright (c) 2026 Sincord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logger } from "./logger";
import "./style.css";
import "./editor.css";
import decorationCatalog from "./decorations.json";
import { CustomSocialEditor, openSocialDetail } from "./CustomSocial";
import { ColorField, DiscordProfileCard, Grid2, ImageField, ProfilePreview, Section, SelectField, Switch, TabId, TabList, TextField } from "./editorUi";
import { Current, installPresenceHooks, installTagIconSwap, loadCatalog, NameplateEditor, PickerGrid, onCatalogLoaded, ProfileEffectEditor, profileEffectFor, ProfileFrameEditor, refreshPresence, StatusEditor, TagIconEditor, uninstallPresenceHooks, uninstallTagIconSwap } from "./cosmetics";
import { installNativeSocialHooks } from "@utils/nativeSocialHooks";
import { appearanceOptions, availableServerTags, Catalog, customDiscordMediaURL, nameplateAssetURL, nativeCollectibles, customSocialValidationErrors, nativeSocialProfile, nativeProfileAppearance, normalizeProfileAppearance, ProfileAppearance } from "@utils/profileAppearance";
import { findByCodeLazy, findByProps, findStoreLazy } from "@webpack";
import { fetchProfileResponse } from "@utils/profileSyncNetwork";

import { CLOUDCORD_STAFF_ROLES, ProfileBadge } from "@api/Badges";
import { applyBadgeLayout, badgeLayoutKey, defaultBadgeOrder, moveBadgeOrder } from "@api/BadgeLayout";
import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { DataStore } from "@api/index";
import { localStorage } from "@utils/localStorage";
import { isRealProfileView, setRealProfileView } from "@utils/realProfileView";

import { addFakeRequest, fakeGiftFor, hasFakeRequest, isFakeNitroActive, refreshFakeNitro, removeFakeRequest, setProfileNitroSource, startExtras, stopExtras } from "./extras";
import { ModalContent as _ModalContent, ModalFooter as _ModalFooter, ModalHeader as _ModalHeader, ModalRoot as _ModalRoot, openModal } from "@utils/modal";

const ModalRoot = _ModalRoot as any;
const ModalHeader = _ModalHeader as any;
const ModalContent = _ModalContent as any;
const ModalFooter = _ModalFooter as any;
import { SincordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { AuthenticationStore, RelationshipStore, Button, ChannelActionCreators, FluxDispatcher, RestAPI, FriendsStore, IconUtils, Menu, Popout, React, Select, showToast, SnowflakeUtils, Toasts, UserProfileActions, UserProfileStore, UserStore } from "@webpack/common";

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
    return date.toLocaleDateString("en-GB", { month: "2-digit", day: "2-digit", year: "numeric" });
}


// Discord's own badge IDs, so fake badges are handled exactly like real ones
// (native tooltips, ordering and click actions). Gifting has no native ID.
const NATIVE_BADGE_IDS: Record<string, string> = {
    sp_staff: "staff", sp_partner: "partner", sp_hypesquad: "hypesquad", sp_bh1: "bug_hunter_level_1",
    sp_bravery: "hypesquad_house_1", sp_brilliance: "hypesquad_house_2", sp_balance: "hypesquad_house_3",
    sp_early: "early_supporter", sp_bh2: "bug_hunter_level_2", sp_dev: "verified_developer",
    sp_mod: "certified_moderator", sp_activedev: "active_developer", sp_oldname: "legacy_username",
    sp_quest: "quest_completed", sp_orbs: "orb_profile_badge", sp_gifting: "gifting"
};
function nativeBadge(badge: ProfileBadge, boostLevel: number): ProfileBadge {
    if (badge.id === "sp_boost" && boostLevel >= 0) return { ...badge, id: `guild_booster_lvl${Math.min(9, boostLevel + 1)}` };
    const id = NATIVE_BADGE_IDS[badge.id];
    return id ? { ...badge, id } : badge;
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
    // Order and hidden badges chosen in Discord's own badge customiser (Discord badge_ids).
    nativeBadgeOrder?: number[];
    nativeHiddenBadges?: number[];
    nativeEditorImages?: boolean;
    oldName?: string; decorationAsset?: string; decorationSkuId?: string; copiedUserId?: string; signupDate?: string; replaceRealBadges?: boolean; giftLevel?: number;
    syncRevision?: number;
    hiddenBadgeIds?: string[]; badgeOrder?: string[];
    /** Custom amount shown on an activity badge (years, hours or games), by badge key. */
    activityAmounts?: Record<string, number>;
}

let storedData: CustomProfileData = {};
let isEnabled = false;
let domObserver: MutationObserver | null = null;
let cachedOriginalUser: any = null;
let cachedFakeUser: any = null;
let otherUserCache = new WeakMap<object, { profile: CustomProfileData; user: any; }>();
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
const sharedQueued = new Set<string>();
const discordReloadedAt = new Map<string, number>();
const SHARED_REFRESH_PER_TICK = 5;
const sharedMissingUntil = new Map<string, number>();
const sharedViewedAt = new Map<string, number>();
let sharedBackoffUntil = 0;
const sharedProfiles = new Map<string, CustomProfileData>();
let realGetUserProfile: ((...args: unknown[]) => any) | null = null;
let realGetCurrentUser: (() => any) | null = null;
/** Discord marks profiles the viewer isn't allowed to see as private; show those exactly as Discord does. */
function isPrivateProfile(userId: string): boolean {
    try { return realGetUserProfile?.(userId)?.private === true; } catch { return false; }
}
// Like Discord: a private profile still shows the person, but its badges are only
// visible to their friends.
function badgesHiddenFor(userId: string): boolean {
    if (isMe(userId) || !isPrivateProfile(userId)) return false;
    try { return !RelationshipStore.isFriend(userId); } catch { return true; }
}
function viewedSharedProfile(userId: string, _forBadges?: boolean) {
    if (isRealProfileView(userId)) return undefined;
    const local = localProfileFor(userId);
    // Hide other profiles hides synced ones; your own local edits still show.
    const profile = storedData?.hideOtherProfiles ? undefined : sharedProfiles.get(userId);
    if (profile) sharedViewedAt.set(userId, Date.now());
    return local ? { ...(profile || {}), ...local } : profile;
}
const sharedProfileFetchedAt = new Map<string, number>();
const sharedRequests = new Set<string>();
let publishTimer: ReturnType<typeof setTimeout> | null = null;
let sharedSyncTimer: ReturnType<typeof setInterval> | null = null;
let uploadedBadges: { id: string; userId: string; name: string; icon: string; }[] = [];
let badgeFetchPending = false;
let badgeFetchedAt = 0;
async function refreshUploadedBadges(force = false) {
    // One list for everyone: refresh every 2 minutes; forced refreshes (focus, after uploads) skip the wait.
    if (badgeFetchPending || !force && Date.now() - badgeFetchedAt < 2 * 60_000) return;
    badgeFetchPending = true; badgeFetchedAt = Date.now();
    try {
        const response = await fetchProfileResponse("https://getcloudcord.com/v1/custom-badges");
        if (!response.ok) return;
        const payload = await response.json();
        if (!Array.isArray(payload?.badges)) return;
        const next = payload.badges.filter((badge: any) => typeof badge?.id === "string" && typeof badge?.userId === "string" && typeof badge?.name === "string" && typeof badge?.icon === "string" && badge.icon.startsWith("https://getcloudcord.com/v1/custom-badges/"));
        if (JSON.stringify(next) !== JSON.stringify(uploadedBadges)) { uploadedBadges = next; forceAccountPanelRerender(); }
    } catch (e) { logger.warn("Fetching uploaded badges failed", e); } finally { badgeFetchPending = false; }
}
function uploadedUserBadges(userId: string): ProfileBadge[] {
    return uploadedBadges.filter(badge => badge.userId === userId).map(badge => ({ id: `cloudcord-custom-${badge.id}`, description: badge.name, iconSrc: badge.icon, position: 0 }));
}
function refreshBadgesOnFocus() { void refreshUploadedBadges(true); }
let profileEditorOpen = false;
let suppressOwnPullUntil = 0;

function activeUserId(): string | null {
    try {
        const authenticated = AuthenticationStore?.getId?.();
        if (authenticated) return String(authenticated);
        // Do not recurse through our own UserStore wrapper during startup, and
        // never publish as the previous account after Discord has logged out.
        const user = realGetCurrentUser ? realGetCurrentUser() : UserStore?.getCurrentUser?.();
        return user?.id ? String(user.id) : null;
    } catch { return null; }
}

function fromSharedProfile(data: any): CustomProfileData {
    return {
        ...normalizeProfileAppearance(data),
        username: data?.username || "", globalName: data?.globalName || data?.displayName || "",
        avatar: data?.avatar || "", banner: data?.banner || "", bio: data?.bio || "",
        pronouns: data?.pronouns || "", accentColor: data?.primaryColor ?? data?.accentColor,
        accentColor2: data?.primaryColor != null ? data?.accentColor : data?.accentColor2, badgeFlags: data?.badgeFlags || 0,
        nitro: data?.nitro === true || data?.nitro == null && Number(data?.nitroLevel ?? -1) >= 0, nitroLevel: data?.nitroLevel, nitroSince: data?.nitroSince || "",
        boostMonths: data?.boostMonths, giftLevel: Number.isInteger(data?.giftLevel) ? data.giftLevel : undefined, customBadgeIds: Array.isArray(data?.customBadgeIds) ? data.customBadgeIds.filter((id: string) => id !== REPLACE_BADGES_SYNC_ID) : [],
        oldName: data?.oldName || "", createdAt: data?.createdAt || "", signupDate: data?.signupDate || data?.joinedSince || "",
        decorationAsset: sharedDecorationAsset(data?.decorationAsset || data?.avatarDecoration), replaceRealBadges: data?.replaceRealBadges === true || Array.isArray(data?.customBadgeIds) && data.customBadgeIds.includes(REPLACE_BADGES_SYNC_ID),
        decorationSkuId: data?.decorationSkuId || data?.avatarDecorationSku,
        syncRevision: Number(data?.syncRevision || 0),
        hiddenBadgeIds: Array.isArray(data?.hiddenBadgeIds) ? data.hiddenBadgeIds : [],
        nativeBadgeOrder: Array.isArray(data?.nativeBadgeOrder) ? data.nativeBadgeOrder.map(Number) : [],
        nativeHiddenBadges: Array.isArray(data?.nativeHiddenBadges) ? data.nativeHiddenBadges.map(Number) : [],
        badgeOrder: Array.isArray(data?.badgeOrder) ? data.badgeOrder : []
    };
}

function hasFakeBadges(data: CustomProfileData | undefined): boolean {
    if (!data) return false;
    return Number(data.badgeFlags ?? 0) !== 0 || data.nitro === true && Number(data.nitroLevel ?? -1) >= 0 || Number(data.boostMonths ?? -1) >= 0 || Number(data.giftLevel ?? -1) >= 0 || (data.customBadgeIds?.length ?? 0) > 0;
}

function shouldReplaceBadges(data: CustomProfileData | undefined): boolean {
    return !(data?.localOnly && data.hideBadgesWhenSyncOff) && !!data?.replaceRealBadges && hasFakeBadges(data);
}

const NITRO_LEVEL_MONTHS = [0, 1, 3, 6, 12, 24, 36, 60, 72];
const BOOST_LEVEL_MONTHS = [1, 2, 3, 6, 9, 12, 15, 18, 24];

// Discord's Nitro card picks the tier from the "subscriber since" date, so a saved
// date only counts when it lands inside the chosen tier; otherwise use the tier's start.
function nitroSinceFor(level: number, savedDate?: string): Date {
    const months = NITRO_LEVEL_MONTHS[level] ?? 0;
    const next = NITRO_LEVEL_MONTHS[level + 1];
    const saved = monthsAgo(months, savedDate);
    const age = (Date.now() - saved.getTime()) / (30.44 * 86400_000);
    if (age >= months && (next === undefined || age < next)) return saved;
    return monthsAgo(months);
}

function monthsAgo(months: number, explicitDate?: string): Date {
    if (typeof explicitDate === "string") {
        const day = explicitDate.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            const parsed = new Date(`${day}T12:00:00Z`);
            if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day) return parsed;
        }
    }
    const date = new Date();
    const count = Number.isFinite(Number(months)) ? Math.max(0, Math.min(1200, Math.trunc(Number(months)))) : 0;
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() - count);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
    return date;
}

/** Populate every field name used by Discord's desktop profile/badge pipelines. */
function applyNativeProfileMetadata(target: any, data: CustomProfileData, includeNested = true, includeSubscription = true): any {
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

    if (data.localOnly && data.hideBadgesWhenSyncOff) return target;
    const flags = Number(data.badgeFlags ?? 0);
    if (shouldReplaceBadges(data)) {
        target.publicFlags = flags;
        target.public_flags = flags;
    }
    // UserStore is consumed by billing, purchases, gifts and upload checks as
    // well as profiles. Cosmetic Nitro belongs on profile snapshots only.
    if (!includeSubscription) return target;

    const replace = shouldReplaceBadges(data);
    const nitroLevel = Number(data.nitroLevel ?? -1);
    const hasNitro = data.nitro === true && Number.isInteger(nitroLevel) && nitroLevel >= 0 && nitroLevel < NITRO_LEVEL_MONTHS.length;
    if (hasNitro || replace) {
        const nitroSince = hasNitro ? monthsAgo(NITRO_LEVEL_MONTHS[nitroLevel], data.nitroSince) : null;
        target.premiumType = hasNitro ? 2 : 0;
        target.premium_type = target.premiumType;
        target.premiumSince = nitroSince;
        target.premium_since = nitroSince?.toISOString() ?? null;
    }

    const gift = Number(data.giftLevel ?? -1);
    const hasGift = Number.isInteger(gift) && gift >= 0 && gift < GIFT_LEVELS.length;
    if (hasGift || replace) {
        const giftCount = hasGift ? GIFT_LEVELS[gift].count : 0;
        target.giftCount = giftCount;
        target.gift_count = giftCount;
        target.giftingBadgeTier = hasGift ? gift : null;
        target.gifting_badge_tier = hasGift ? gift : null;
    }

    const boost = Number(data.boostMonths ?? -1);
    const hasBoost = Number.isInteger(boost) && boost >= 0 && boost < BOOST_LEVEL_MONTHS.length;
    if (hasBoost || replace) {
        const boostSince = hasBoost ? monthsAgo(BOOST_LEVEL_MONTHS[boost]) : null;
        target.premiumGuildSince = boostSince;
        target.premium_guild_since = boostSince?.toISOString() ?? null;
    }

    // Some profile builds read metadata from the nested user/profile object.
    if (includeNested && target.user && target.user !== target) applyNativeProfileMetadata(target.user, data, false, false);
    if (includeNested && target.userProfile && target.userProfile !== target) applyNativeProfileMetadata(target.userProfile, data, false);
    return target;
}

// Last profile pulled from the server for this account (any device's format).
let lastRemoteProfile: Record<string, any> | null = null;
let profileRuntimeActive = false;
let profileRuntimeGeneration = 0;
// Device-only settings that never belong in the shared profile.
const LOCAL_ONLY_FIELDS = ["localOnly", "hideOtherProfiles", "nativeEditorImages", "hideBadgesWhenSyncOff", "copiedUserId"];
function remoteOnlyFields() {
    if (!lastRemoteProfile || typeof lastRemoteProfile !== "object") return {};
    const kept: Record<string, any> = {};
    for (const [key, value] of Object.entries(lastRemoteProfile)) if (!LOCAL_ONLY_FIELDS.includes(key)) kept[key] = value;
    return kept;
}

function toSharedProfile(data: CustomProfileData) {
    const customBadgeIds = Array.isArray(data.customBadgeIds) ? data.customBadgeIds.filter(id => id !== REPLACE_BADGES_SYNC_ID) : [];
    if (data.replaceRealBadges === true) customBadgeIds.push(REPLACE_BADGES_SYNC_ID);
    const { replaceRealBadges, localOnly, hideOtherProfiles, nativeEditorImages, hideBadgesWhenSyncOff, copiedUserId, ...rest } = data as any;
    return {
        ...rest,
        replaceRealBadges: data.replaceRealBadges === true,
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
    if (!profileRuntimeActive || storedData.localOnly) return;
    const queue = publishSharedProfile as typeof publishSharedProfile & { pending?: Promise<void>; queued?: boolean; };
    if (queue.pending) {
        queue.queued = true;
        return queue.pending;
    }
    queue.pending = (async () => {
        try {
            do {
                queue.queued = false;
                try { await publishSharedProfileSnapshot(); }
                catch (error) {
                    // A save requested during the failed request still deserves a
                    // fresh attempt; every caller waits for the final saved state.
                    if (!queue.queued) throw error;
                }
            } while (queue.queued && profileRuntimeActive && !storedData.localOnly);
        } finally { queue.pending = undefined; }
    })();
    return queue.pending;
}

async function publishSharedProfileSnapshot(allowRetry = true): Promise<void> {
    if (!profileRuntimeActive || storedData.localOnly) return;
    const generation = profileRuntimeGeneration;
    const ownerId = activeUserId();
    if (!ownerId || !isEnabled) throw new Error("Sign in to Discord before syncing your profile.");
    let remoteRevision = 0;
    // Advance the revision without pulling old fields into the open editor.
    const latestResponse = await fetchProfileResponse(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(ownerId)}`, { cache: "no-store" });
    if (!profileRuntimeActive || generation !== profileRuntimeGeneration || activeUserId() !== ownerId || storedData.localOnly) return;
    if (latestResponse.ok) {
        const latest = await latestResponse.json();
        if (!profileRuntimeActive || generation !== profileRuntimeGeneration || activeUserId() !== ownerId || storedData.localOnly) return;
        lastRemoteProfile = latest?.profile && typeof latest.profile === "object" ? latest.profile : lastRemoteProfile;
        remoteRevision = Number(latest?.profile?.syncRevision || 0);
    }
    else if (latestResponse.status === 404) lastRemoteProfile = null;
    else throw new Error(`Couldn't load your latest shared profile (${latestResponse.status}). Your local changes are saved; try syncing again shortly.`);
    const shareKey = `${LS_SHARE}:${ownerId}`;
    let saved: any = {};
    saved = await DataStore.get(shareKey) || {};
    if (!saved.id && allowRetry) {
        // Migrate old installations once, without sharing one edit token across
        // Discord accounts or deleting another account's credentials on a 401.
        let legacy: any = await DataStore.get(LS_SHARE) || {};
        if (!legacy.id) { try { legacy = JSON.parse(localStorage.getItem(LS_SHARE) || "{}"); } catch { /* silent: corrupt legacy share entry is treated as empty */ } }
        if (legacy.id && (!legacy.ownerId || legacy.ownerId === ownerId)) {
            saved = legacy;
            await DataStore.set(shareKey, { ...saved, ownerId });
        }
    }
    if (!profileRuntimeActive || generation !== profileRuntimeGeneration || storedData.localOnly || activeUserId() !== ownerId) return;
    // Reading credentials can yield to a newer edit. Stamp the actual snapshot
    // being uploaded, not the object that existed before that await.
    storedData.syncRevision = Math.max(Date.now(), Number(storedData.syncRevision || 0) + 1, remoteRevision + 1);
    allAccountsData[ownerId] = storedData;
    saveDataSync(storedData, true); saveAllDataSync();
    const response = await fetchProfileResponse(`${SHARED_PROFILE_API}${saved.id ? `/v1/profiles/${encodeURIComponent(saved.id)}` : "/v1/profiles"}`, {
        method: saved.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(saved.editToken ? { Authorization: `Bearer ${saved.editToken}` } : {}) },
        // Keep fields only the phone app knows about, so saving here never wipes them.
        body: JSON.stringify({ ownerId, profile: { ...remoteOnlyFields(), ...toSharedProfile(storedData) } })
    });
    if (!profileRuntimeActive || generation !== profileRuntimeGeneration || activeUserId() !== ownerId) return;
    if (!response.ok) {
        if (response.status === 409) {
            if (allowRetry) return publishSharedProfileSnapshot(false);
            throw new Error("Your shared profile changed on another device. Reopen the editor and try again.");
        }
        if (saved.id && (response.status === 401 || response.status === 404)) {
            await DataStore.set(shareKey, {});
            if (allowRetry) return publishSharedProfileSnapshot(false);
            throw new Error("Your sharing credentials expired. Try saving your profile again.");
        }
        const details = await response.json().catch(() => null);
        throw new Error(response.status === 413 ? "Your profile images are too large to sync. Use Upload to crop and resize them." : response.status === 429 ? "Too many saves. Wait a moment and try again." : response.status === 503 ? "Profile sync is unavailable right now. Your changes are saved on this device." : `Couldn't sync your profile (${response.status}). ${String(details?.error || "Try again shortly.").slice(0, 160)}`);
    }
    const result = await response.json();
    if (!profileRuntimeActive || generation !== profileRuntimeGeneration || activeUserId() !== ownerId) return;
    if (!saved.id && result?.id) await DataStore.set(shareKey, { id: result.id, editToken: result.editToken, ownerId });
}

// Save edits made outside the modal (menus, Discord's own editor) for the active account.
function saveOwnData(next: CustomProfileData, enabled = isEnabled) {
    // Native image edits need the same conflict protection as modal saves,
    // including when the server is temporarily unavailable.
    if (enabled && !next.localOnly) next = { ...next, syncRevision: Math.max(Date.now(), Number(storedData.syncRevision || 0) + 1) };
    storedData = next; isEnabled = enabled;
    const myId = activeUserId();
    if (myId) { allAccountsData[myId] = next; allAccountsEnabled[myId] = enabled; }
    saveDataSync(next, enabled); saveAllDataSync();
    DataStore.set(DS_KEY, next).catch(() => { });
    DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
    cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
    forceAccountPanelRerender();
}

function resetProfileAccount(accountId: string) {
    if (!accountId) return;
    // An explicit local reset is not an invitation to import the same remote
    // profile again on the next poll. Keep that preference across restarts.
    const cleared: CustomProfileData = { localOnly: true };
    allAccountsData[accountId] = cleared;
    allAccountsEnabled[accountId] = false;
    if (accountId === activeUserId()) {
        if (publishTimer) { clearTimeout(publishTimer); publishTimer = null; }
        storedData = cleared; isEnabled = false;
        saveDataSync(cleared, false);
        DataStore.set(DS_KEY, cleared).catch(() => { });
        DataStore.set(DS_ENABLED, false).catch(() => { });
        cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
    }
    saveAllDataSync();
    DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { });
    DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
    forceAccountPanelRerender();
}

const profileStoreCleanups: (() => void)[] = [];
function installProfileReadHook(store: any, method: string, handler: (original: Function, args: any[]) => any) {
    const original = store?.[method];
    if (typeof original !== "function") return;
    const generation = profileRuntimeGeneration;
    const wrapped = function (this: any, ...args: unknown[]) {
        if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return original.apply(this, args);
        return handler(original.bind(this), args);
    };
    store[method] = wrapped;
    profileStoreCleanups.push(() => { if (store[method] === wrapped) store[method] = original; });
}
function uninstallProfileStoreHooks() {
    for (const cleanup of profileStoreCleanups.splice(0).reverse()) cleanup();
    realGetUserProfile = null;
    realGetCurrentUser = null;
}
function installProfileStoreHooks(plugin: any) {
    const owner = {};
    try {
        const US: any = UserStore;
        if (US && !US._cp_hook) {
            if (typeof US.getCurrentUser === "function") realGetCurrentUser = US.getCurrentUser.bind(US);
            let lastReal: any = null, lastFake: any = null, lastVersion = -1;
            installProfileReadHook(US, "getCurrentUser", original => {
                const real = original();
                if (!real) return real;
                if (real !== lastReal) {
                    if (real.username) _realUsername = real.username;
                    if (real.globalName) _realGlobalName = real.globalName;
                }
                if (!isEnabled) return real;
                if (real === lastReal && lastVersion === _dataVersion && lastFake) return lastFake;
                lastReal = real; lastVersion = _dataVersion;
                return lastFake = plugin.fakeCurrentUser(real);
            });
            installProfileReadHook(US, "getUser", (original, args) => {
                const real = original(...args);
                return isEnabled && isMe(args[0]) ? plugin.fakeCurrentUser(real) : plugin.fakeOtherUser(real);
            });
            US._cp_hook = owner;
            profileStoreCleanups.push(() => { if (US._cp_hook === owner) delete US._cp_hook; });
            if (typeof US.addChangeListener === "function" && typeof US.removeChangeListener === "function") {
                const invalidate = () => {
                    otherUserCache = new WeakMap();
                    cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
                };
                US.addChangeListener(invalidate);
                profileStoreCleanups.push(() => US.removeChangeListener(invalidate));
            }
        }
    } catch (e) { logger.warn("Installing UserStore hooks failed", e); }
    try {
        const UPS = Vencord.Webpack?.findByProps?.("getUserProfile", "getGuildMemberProfile");
        if (UPS && !UPS._cp_hook) {
            if (typeof UPS.getUserProfile === "function") realGetUserProfile = UPS.getUserProfile.bind(UPS);
            for (const method of ["getUserProfile", "getGuildMemberProfile"]) installProfileReadHook(UPS, method, (original, args) => {
                const profile = original(...args);
                try {
                    const id = resolveProfileUserId(args[0], profile);
                    if (isMe(id)) return isEnabled && profile ? plugin.hookUserProfile(profile) : profile;
                    requestSharedProfile(id);
                    const shared = viewedSharedProfile(id);
                    return shared && profile ? decorateSharedProfile(profile, shared) : profile;
                } catch { return profile; }
            });
            UPS._cp_hook = owner;
            profileStoreCleanups.push(() => { if (UPS._cp_hook === owner) delete UPS._cp_hook; });
        }
    } catch (e) { logger.warn("Installing UserProfileStore hook failed", e); }
}

const isImageUri = (value: unknown): value is string => typeof value === "string" && /^(data:image\/(png|jpe?g|gif|webp);base64,|https:\/\/)/i.test(value);
// Discord's Edit Profile writes avatar and banner picks as pending changes. While the
// custom profile is on, keep them as the CloudCord picture and banner instead, so they
// work without Nitro (GIFs included) and Discord never tries to upload them.
function onPendingProfileChange(action: any) {
    if (action?.guildId || !isEnabled) return;
    // Discord's badge customiser saves to Discord's server, which doesn't know fake badges.
    // Keep the chosen order and hidden badges here instead, so they apply to fake badges.
    const order = action.pendingBadgeDisplayOrder, hiddenBadges = action.pendingBadgeHiddenBadges;
    if (Array.isArray(order) || Array.isArray(hiddenBadges)) {
        saveOwnData({ ...storedData, ...(Array.isArray(order) ? { nativeBadgeOrder: order.map(Number) } : {}), ...(Array.isArray(hiddenBadges) ? { nativeHiddenBadges: hiddenBadges.map(Number) } : {}) });
        queueSharedPublish();
        setTimeout(() => reloadDiscordProfile(activeUserId()), 300);
    }
    if (storedData.nativeEditorImages === false) return;
    const avatar = action.pendingAvatar?.imageUri ?? (typeof action.pendingAvatar === "string" ? action.pendingAvatar : undefined);
    const banner = action.pendingBanner?.imageUri ?? (typeof action.pendingBanner === "string" ? action.pendingBanner : undefined);
    if (!isImageUri(avatar) && !isImageUri(banner)) return;
    const next = { ...storedData };
    if (isImageUri(avatar)) next.avatar = avatar;
    if (isImageUri(banner)) { next.banner = banner; next.nitro = true; }
    saveOwnData(next);
    queueSharedPublish();
    setTimeout(() => {
        try { FluxDispatcher.dispatch({ type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", pendingAvatar: undefined, pendingBanner: undefined }); } catch (e) { logger.warn("Clearing pending avatar/banner failed", e); }
    }, 0);
    try { showToast(isImageUri(banner) && isImageUri(avatar) ? "Saved as your CloudCord picture and banner." : isImageUri(banner) ? "Saved as your CloudCord banner." : "Saved as your CloudCord profile picture.", Toasts.Type.SUCCESS); } catch (e) { logger.warn("Showing save toast failed", e); }
}

function queueSharedPublish() {
    if (publishTimer) clearTimeout(publishTimer);
    if (!profileRuntimeActive || storedData.localOnly) return;
    publishTimer = setTimeout(() => void publishSharedProfile().catch(() => { }), 800);
}

async function pullOwnSharedProfile() {
    if (!profileRuntimeActive || storedData.localOnly) return;
    const generation = profileRuntimeGeneration;
    // Never replace local form state with the last server snapshot while the
    // profile editor is open or immediately after saving a newer revision.
    if (profileEditorOpen || Date.now() < suppressOwnPullUntil) return;
    const id = activeUserId();
    if (!id) return;
    const localSnapshot = JSON.stringify(storedData);
    try {
        const response = await fetchProfileResponse(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(id)}`);
        // Existing installations may have local profile data but no row in the
        // website-backed sync database yet. Seed it automatically instead of
        // waiting for the user to edit a field.
        if (response.status === 404) {
            if (isEnabled) queueSharedPublish();
            return;
        }
        if (!response.ok) return;
        const payload = await response.json();
        if (!profileRuntimeActive || generation !== profileRuntimeGeneration || activeUserId() !== id || storedData.localOnly || profileEditorOpen || Date.now() < suppressOwnPullUntil || JSON.stringify(storedData) !== localSnapshot) return;
        const remote = payload?.profile ?? payload;
        if (Number(remote?.syncRevision || 0) < Number(storedData.syncRevision || 0)) return;
        lastRemoteProfile = payload?.profile ?? payload ?? null;
        const pulled = fromSharedProfile(lastRemoteProfile);
        for (const key of LOCAL_ONLY_FIELDS) if (Object.prototype.hasOwnProperty.call(storedData, key)) (pulled as any)[key] = (storedData as any)[key];
        if (!Object.keys(pulled).length) return;
        if (JSON.stringify(pulled) === JSON.stringify(storedData) && isEnabled) return;
        storedData = pulled; isEnabled = true; allAccountsData[id] = pulled; allAccountsEnabled[id] = true;
        saveDataSync(pulled, true); saveAllDataSync();
        await Promise.all([DataStore.set(DS_ALL_DATA, allAccountsData), DataStore.set(DS_ALL_ENABLED, allAccountsEnabled)]);
        cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++; forceAccountPanelRerender();
    } catch (e) { logger.warn("Pulling profile from the cloud failed", e); }
}

function requestSharedProfile(userId: string, force = false) {
    if (!profileRuntimeActive || !/^\d{15,22}$/.test(userId) || isMe(userId) || sharedRequests.has(userId)) return;
    const generation = profileRuntimeGeneration;
    const now = Date.now();
    if (now < sharedBackoffUntil) { if (sharedQueued.size < 200) sharedQueued.add(userId); return; }
    // Busy: queue it instead of dropping it, so the profile still loads (and its badges replace the real ones).
    if (sharedRequests.size >= SHARED_MAX_IN_FLIGHT) { if (sharedQueued.size < 200) sharedQueued.add(userId); return; }
    // "No profile" is remembered, but only for a minute when the profile is actually opened.
    const missingUntil = sharedMissingUntil.get(userId) ?? 0;
    if (missingUntil > now && (!force || missingUntil - SHARED_MISSING_TTL_MS + 60_000 > now)) return;
    const fetchedAt = sharedProfileFetchedAt.get(userId) ?? 0;
    // Even forced refreshes wait a little, so one user is never fetched in a loop.
    if (sharedProfiles.has(userId) && now - fetchedAt < (force ? 30_000 : SHARED_PROFILE_TTL_MS)) return;
    sharedRequests.add(userId);
    void fetchProfileResponse(`${SHARED_PROFILE_API}/v1/profiles/user/${encodeURIComponent(userId)}`)
        .then(r => {
            if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return null;
            if (r.status === 404) {
                sharedQueued.delete(userId);
                // No CloudCord profile: remember that instead of asking again.
                sharedMissingUntil.set(userId, Date.now() + SHARED_MISSING_TTL_MS);
                if (sharedMissingUntil.size > 5000) sharedMissingUntil.delete(sharedMissingUntil.keys().next().value!);
                // A deleted shared profile must restore Discord's original presentation.
                // Keep transient failures separate: only a confirmed 404 removes it.
                if (sharedProfiles.delete(userId)) {
                    sharedProfileFetchedAt.delete(userId);
                    try {
                        refreshPresence();
                    } catch (e) { logger.warn("Refreshing profile stores failed", e); }
                }
                return null;
            }
            if (r.status === 429 || r.status >= 500) {
                const retryAfter = Number(r.headers.get("retry-after")) * 1000;
                sharedBackoffUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 5 * 60_000) : 60_000);
                if (sharedQueued.size < 200) sharedQueued.add(userId);
                return null;
            }
            return r.ok ? r.json() : null;
        }).then(payload => {
            if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return;
            const data = payload?.profile ?? payload;
            if (!data) return;
            const next = fromSharedProfile(data);
            const previous = sharedProfiles.get(userId);
            const changed = JSON.stringify(previous ?? null) !== JSON.stringify(next);
            sharedMissingUntil.delete(userId);
            sharedQueued.delete(userId);
            if (changed) sharedProfiles.set(userId, next);
            sharedProfileFetchedAt.set(userId, Date.now());
            if (!changed) return;
            // Discord may already hold this user's badge info: apply the fake data to it now.
            reapplyBadgeDirectory(userId);
            // If Discord already loaded this profile, have it load once more so the
            // badges arrive in its own data (at most every 5 minutes per user).
            if (Date.now() - (discordReloadedAt.get(userId) ?? 0) > 5 * 60_000 && realGetUserProfile?.(userId)) {
                discordReloadedAt.set(userId, Date.now());
                reloadDiscordProfile(userId);
            }
            try {
                refreshPresence();
            } catch (e) { logger.warn("Refreshing profile stores failed", e); }
        }).catch(() => {
            if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return;
            sharedBackoffUntil = Math.max(sharedBackoffUntil, Date.now() + 30_000);
            if (sharedQueued.size < 200) sharedQueued.add(userId);
        }).finally(() => {
            if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return;
            sharedRequests.delete(userId);
            if (Date.now() < sharedBackoffUntil) return;
            const next = sharedQueued.values().next().value;
            if (next) { sharedQueued.delete(next); requestSharedProfile(next); }
        });
}

function refreshVisibleSharedProfiles() {
    // Keep recently viewed CloudCord profiles fresh (so changes made on another
    // device appear), a few per tick, oldest first. Nobody else is re-fetched.
    const now = Date.now();
    if (!profileRuntimeActive || now < sharedBackoffUntil) return;
    for (const userId of [...sharedQueued]) {
        if (sharedRequests.size >= SHARED_MAX_IN_FLIGHT) break;
        sharedQueued.delete(userId);
        requestSharedProfile(userId, true);
    }
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
    const clone = Object.create(Object.getPrototypeOf(source) || Object.prototype);
    // Native account flags/methods may be non-enumerable. Preserve them on the
    // presentation clone instead of dropping them through object spread/assign.
    for (const key of Reflect.ownKeys(source)) {
        const descriptor = Object.getOwnPropertyDescriptor(source, key);
        if (descriptor) Object.defineProperty(clone, key, { ...descriptor, configurable: true, ...("value" in descriptor ? { writable: true } : {}) });
    }
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
    // Badges arrive in Discord's own profile data (rewriteFetchedProfile); leave them as they are.
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
    try { localStorage.setItem(LS_KEY_DATA, JSON.stringify(data)); localStorage.setItem(LS_KEY_ENABLED, enabled ? "1" : "0"); } catch (e) { logger.warn("Saving profile to localStorage failed", e); }
}
function saveAllDataSync() {
    try { localStorage.setItem(LS_ALL_DATA, JSON.stringify(allAccountsData)); localStorage.setItem(LS_ALL_ENABLED, JSON.stringify(allAccountsEnabled)); } catch (e) { logger.warn("Saving all-account profiles to localStorage failed", e); }
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
    lastRemoteProfile = null;
    _cachedMyId = null;
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
    try { const myId = activeUserId(); if (myId) { _cachedMyId = myId; return myId === userId; } } catch { /* silent: called on every render to check the current user */ }
    return false;
}
function updateCachedRealData() {
    try { const myId = activeUserId(); if (myId) _cachedMyId = myId; } catch { /* silent: called on every render to cache the current user id */ }
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
            for (const fmt of fmtSpecs) { try { const s = new Intl.DateTimeFormat(loc, fmt).format(d); variants.add(s); variants.add(s.replace(/\s/g, " ")); } catch { /* silent: some locales reject some formats; that variant is just skipped */ } }
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
            try { variants.add(new Intl.DateTimeFormat(navigator.language, fmt).format(d)); } catch { /* silent: some locales reject some formats; that variant is just skipped */ }
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
// DOM on purpose: a catch-all for the real name and join date in places that read
// them from somewhere other than the patched UserStore/UserProfileStore (tooltips,
// copied text, older cached components). It matches text content only, never class names.
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
    try { refreshFakeNitro(); } catch (e) { logger.warn("Refreshing fake Nitro failed", e); }
    try {
        refreshPresence();
        if (isEnabled) startDomObserver(); else stopDomObserver();
    } catch (e) { logger.warn("Applying profile change failed", e); }
}
async function loadData() {
    try {
        const generation = profileRuntimeGeneration;
        const ownerId = activeUserId();
        const snapshot = JSON.stringify([allAccountsData, allAccountsEnabled, storedData, isEnabled]);
        const canRestore = () => profileRuntimeActive && generation === profileRuntimeGeneration && activeUserId() === ownerId
            && JSON.stringify([allAccountsData, allAccountsEnabled, storedData, isEnabled]) === snapshot;
        const allData = await DataStore.get(DS_ALL_DATA) as Record<string, CustomProfileData> | null;
        const allEnabledDs = await DataStore.get(DS_ALL_ENABLED) as Record<string, boolean> | null;
        if (!canRestore()) return;
        if (allData && typeof allData === "object" && Object.keys(allData).length > 0) {
            allAccountsData = allData; allAccountsEnabled = allEnabledDs || {};
            syncCurrentUserData(); saveAllDataSync(); saveDataSync(storedData, isEnabled); return;
        }
        const d = await DataStore.get(DS_KEY) as CustomProfileData | null;
        const e = await DataStore.get(DS_ENABLED) as boolean | null;
        if (!canRestore()) return;
        if (d !== null) storedData = d; if (e !== null) isEnabled = e === true;
        const myId = ownerId;
        if (myId && storedData && Object.keys(storedData).length > 0) {
            allAccountsData[myId] = storedData; allAccountsEnabled[myId] = isEnabled;
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
            saveAllDataSync();
        }
        saveDataSync(storedData, isEnabled);
    } catch (e) { logger.warn("Saving profile failed", e); }
}

function realProfileMenuItem(userId: string) {
    const viewingReal = isRealProfileView(userId);
    if (!viewingReal && (!sharedProfiles.has(userId) || storedData.hideOtherProfiles)) return null;
    return <Menu.MenuItem id="cloudcord-profile-view" label={viewingReal ? "Return to CloudCord profile" : "Show real profile"} action={() => {
        setRealProfileView(userId, !viewingReal);
        cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
        try { UserProfileStore.emitChange?.(); } catch (e) { logger.warn("Refreshing UserProfileStore failed", e); }
        try { UserStore.emitChange?.(); } catch (e) { logger.warn("Refreshing UserStore failed", e); }
        forceAccountPanelRerender();
        // Let the menu close first so Discord does not stack modals on a closing layer.
        setTimeout(() => { try { UserProfileActions.openUserProfileModal({ userId }); } catch (e) { logger.warn("Opening profile modal failed", e); } }, 50);
    }} />;
}

// The "..." menu on a profile popout or full profile.
const profileOverflowPatch: NavContextMenuPatchCallback = (children, props: any) => {
    const userId = props?.user?.id ?? props?.userId;
    if (!Array.isArray(children) || !userId || isMe(userId)) return;
    const item = realProfileMenuItem(userId);
    if (item) children.unshift(<Menu.MenuGroup>{item}</Menu.MenuGroup>);
};

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: any) => {
    if (!children || !Array.isArray(children) || !user?.id) return;
    try {
        const me = UserStore.getCurrentUser(); if (!me || user.id === me.id) return;
        children.push(<Menu.MenuGroup>
            {realProfileMenuItem(user.id)}
            {!user.bot && (hasFakeRequest(user.id)
                ? <Menu.MenuItem id="cloudcord-fake-request-remove" label="Remove fake friend request" action={() => removeFakeRequest(user.id)} />
                : <Menu.MenuItem id="cloudcord-fake-request" label="Fake friend request" subtext="Only you see it" action={() => addFakeRequest(user)} />)}
        </Menu.MenuGroup>);
        const isCopied = isEnabled && storedData.copiedUserId === user.id;
        children.push(<Menu.MenuGroup>
            {isCopied ? (
                <Menu.MenuItem id="remove-copy-profile" label="Remove copied profile" color="danger" action={() => {
                    resetProfileAccount(activeUserId() || "");
                }} />
            ) : (
                [["discord", hasCloudCordProfile(user.id) ? "Copy Discord profile" : "Copy this profile"], ...(hasCloudCordProfile(user.id) ? [["cloudcord", "Copy CloudCord profile"]] : [])].map(([source, label]) => <Menu.MenuItem key={source} id={`copy-user-profile-${source}`} label={label} subtext="Names, pictures, colours, badges and more" action={async () => {
                    try {
                        const newData: CustomProfileData = { localOnly: true, ...(await buildCopiedProfile(user.id, source as "discord" | "cloudcord")) };
                        const myId = AuthenticationStore?.getId?.();
                        if (myId) { allAccountsData[myId] = newData; allAccountsEnabled[myId] = true; }
                        storedData = newData; isEnabled = true; saveDataSync(newData, true); saveAllDataSync();
                        DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
                        forceAccountPanelRerender();
                        showToast(`Copied ${newData.globalName || newData.username || "their"} profile. Saved on this device only.`, Toasts.Type.SUCCESS);
                    } catch (err) { logger.error("Copying user profile failed:", err); showToast("Couldn't copy that profile.", Toasts.Type.FAILURE); }
                }} />)
            )}
        </Menu.MenuGroup>);
    } catch (err) { logger.error("Context menu patch failed:", err); }
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

function BadgePicker({ selected, onChange, nitroType, onNitroType, giftLevel, onGiftLevel, boostLevel, onBoostLevel, customIds, onCustomIds, oldName, onOldName, replaceRealBadges, onReplaceRealBadges, activityAmounts = {}, onActivityAmounts }: {
    selected: number; onChange: (v: number) => void; nitroType: number; onNitroType: (v: number) => void;
    giftLevel: number; onGiftLevel: (v: number) => void;
    boostLevel: number; onBoostLevel: (v: number) => void; customIds: string[]; onCustomIds: (v: string[]) => void; oldName: string; onOldName: (v: string) => void;
    replaceRealBadges: boolean; onReplaceRealBadges: (v: boolean) => void;
    activityAmounts?: Record<string, number>; onActivityAmounts?: (v: Record<string, number>) => void;
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
            {EXPERIMENTAL_BADGE_GROUPS.map(group => {
                const picked = group.tiers.find(tier => customIds.includes(tier.id));
                const badge = ACTIVITY_BADGES.find(item => item.key === group.id);
                const tierIndex = picked && badge ? badge.tiers.findIndex(([name]) => name === picked.name) : -1;
                const unit = group.id === "account_age" ? "Years" : group.id === "game_variety" ? "Games played" : "Hours";
                return <div key={group.id} className="cpx-field">
                    <SelectField label={group.label}
                        options={[{ value: "", label: "None" }, ...group.tiers.map(tier => ({ value: tier.id, label: `${tier.name} · ${tier.milestone}` }))]}
                        value={picked?.id || ""}
                        onChange={value => onCustomIds([...customIds.filter(id => !group.tiers.some(tier => tier.id === id)), ...(value ? [value] : [])])} />
                    {picked && onActivityAmounts && <TextField label={`${unit} shown on the badge`} type="number" value={activityAmounts[group.id] != null ? String(activityAmounts[group.id]) : ""}
                        placeholder={tierIndex >= 0 && badge ? String(badge.tiers[tierIndex][1]) : ""} hint="Empty uses the tier's amount."
                        onChange={text => { const next = { ...activityAmounts }; const value = Math.floor(Number(text)); if (text.trim() && Number.isFinite(value) && value >= 0) next[group.id] = Math.min(value, 1_000_000); else delete next[group.id]; onActivityAmounts(next); }} />}
                </div>;
            })}
        </div>}
    </div>;
}


function badgeLayoutRows(data: CustomProfileData, userId: string): ProfileBadge[] {
    let native: ProfileBadge[] = [];
    try {
        const profile = UserProfileStore.getUserProfile(userId) as any;
        native = profile?.cloudcordUnorderedBadges?.() || profile?.getBadges?.() || profile?.badges || [];
    } catch { /* silent: runs during render; missing native badges just means none */ }
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
            const MAS = Vencord.Webpack?.findByProps?.("getUsers", "getValidUsers");
            if (MAS?.getUsers) { const users = MAS.getUsers(); if (Array.isArray(users) && users.length > 0) return users; }
        } catch { /* silent: runs during render; falls back to the current account */ }
        const me = UserStore.getCurrentUser(); return me ? [me] : [];
    }, []);

    React.useEffect(() => { setData({ ...(allAccountsData[selectedAccountId] || {}) }); }, [selectedAccountId]);

    function set<K extends keyof CustomProfileData>(key: K, val: CustomProfileData[K]) { setData(d => ({ ...d, [key]: val })); }
    const appearanceEnums = React.useMemo(() => {
        // Discord now ships the font and effect lists as separate plain enums.
        const find = (filter: (m: any) => boolean) => { try { return Vencord.Webpack.find(filter, { isIndirect: true }); } catch { return undefined; } };
        return {
            DisplayNameFont: find(m => m?.BANGERS === 1 && m?.DEFAULT === 11),
            DisplayNameEffect: find(m => m && typeof m === "object" && "SOLID" in m && "GRADIENT" in m && "NEON" in m)
        };
    }, []);
    const fonts = appearanceOptions(appearanceEnums.DisplayNameFont);
    const effects = appearanceOptions(appearanceEnums.DisplayNameEffect).filter(option => !/^test/i.test(String(option.label)));
    const nameStyle = data.displayNameStyles || { fontId: 11, effectId: 1, colors: [0xffffff] };
    const tag = data.serverTag || { tag: "", guildId: "", badge: "" };

    async function save(useEverywhere = false) {
        if (!myId || activeUserId() !== myId) {
            setSaveError("Your Discord account changed. Close and reopen the profile editor before saving.");
            return;
        }
        setSaving(true);
        setSaveError("");
        try {
            const appearance = normalizeProfileAppearance(data);
            const socialErrors = customSocialValidationErrors(data);
            if (socialErrors.length) throw new Error(socialErrors[0]);
            if (data.serverTag && !appearance.serverTag) throw new Error("Enter a 1–4 character tag, a valid server ID, and a valid badge hash or leave the badge empty.");
            if (data.displayNameStyles && !appearance.displayNameStyles) throw new Error("Choose valid username styles and colors.");
            const savedData = { ...data, ...appearance, localOnly: !useEverywhere, ...(useEverywhere ? { syncRevision: Math.max(Date.now(), Number(allAccountsData[selectedAccountId]?.syncRevision || 0) + 1) } : {}) };
            if (!useEverywhere && publishTimer) { clearTimeout(publishTimer); publishTimer = null; }
            allAccountsData[selectedAccountId] = savedData; allAccountsEnabled[selectedAccountId] = true;
            if (selectedAccountId === myId) {
                storedData = savedData; isEnabled = true; saveDataSync(storedData, true);
                cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
            }
            saveAllDataSync();
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
            updateCachedRealData(); forceAccountPanelRerender();
            reloadDiscordProfile(selectedAccountId);
            if (selectedAccountId === myId && useEverywhere) {
                // Keep the just-saved local revision authoritative while the
                // website receives it; the polling loop must not restore the
                // previous revision during this window.
                suppressOwnPullUntil = Date.now() + 60_000;
                if (publishTimer) { clearTimeout(publishTimer); publishTimer = null; }
                await publishSharedProfile();
            }
        } catch (err) { logger.error("Saving profile failed:", err); suppressOwnPullUntil = 0; setSaveError(err instanceof Error ? err.message : "Couldn't save your profile. Try again."); setSaving(false); return; }
        setSaving(false); rootProps.onClose();
    }

    async function reset() {
        if (!myId || activeUserId() !== myId) {
            setSaveError("Your Discord account changed. Close and reopen the profile editor before resetting.");
            return;
        }
        resetProfileAccount(selectedAccountId);
        rootProps.onClose();
    }

    const [tab, setTab] = React.useState<TabId>("profile");
    const [catalogData, setCatalogData] = React.useState<Catalog | null>(null);
    React.useEffect(() => { loadCatalog().then(setCatalogData, () => { }); }, []);
    const [confirmReset, setConfirmReset] = React.useState(false);
    const selectedUser: any = accounts.find((account: any) => account.id === selectedAccountId) || UserStore.getUser(selectedAccountId);
    const fallbackAvatar = selectedUser ? IconUtils.getUserAvatarURL(selectedUser, false, 128) : "https://cdn.discordapp.com/embed/avatars/0.png";
    const currentDecoration = decorations.find(item => item.id === data.decorationAsset) || ALL_DECORATIONS.find(item => item.id === data.decorationAsset) || liveDecorations.find(item => item.id === data.decorationAsset);
    const nameColors = [0, 1, 2].map(index => nameStyle.colors[index] ?? nameStyle.colors[0] ?? 0xffffff);
    const knownTags = availableServerTags(UserStore.getUsers());

    const panels: Record<TabId, React.ReactNode> = {
        profile: <>
            <CopyProfileSection onCopy={copied => setData(previous => ({ ...previous, ...copied }))} />
            <Section title="Pictures" description="Shown on your profile, in chat and in member lists for CloudCord users.">
                <ImageField key={`avatar-${selectedAccountId}`} label="Profile picture" value={data.avatar ?? ""} hint="PNG, JPG, WebP or an animated GIF (up to 8 MB)." onChange={value => set("avatar", value)} />
                <Switch label="Simulate Nitro" description="Unlocks profile colors. Your banner works with or without it." checked={data.nitro ?? false} onChange={value => set("nitro", value)} />
                <ImageField key={`banner-${selectedAccountId}`} label="Banner" shape="banner" value={data.banner ?? ""} hint="Animated GIF banners work too." onChange={value => set("banner", value)} />
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
            <LocalTagSection />
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
                <Switch label="Hide other CloudCord profiles" description="Show everyone with their real Discord profile. You can still open one person's real profile from the three-dot menu on their profile." checked={data.hideOtherProfiles === true} onChange={value => set("hideOtherProfiles", value)} />
                <BadgePicker selected={data.badgeFlags ?? 0} onChange={v => set("badgeFlags", v)} nitroType={nitroLevel} onNitroType={v => { set("nitroLevel", v); set("nitro", v >= 0); }} giftLevel={giftLevel} onGiftLevel={v => set("giftLevel", v)} boostLevel={boostLevel} onBoostLevel={v => set("boostMonths", v)} customIds={customIds} onCustomIds={v => set("customBadgeIds", v)} oldName={oldName} onOldName={v => set("oldName", v)} replaceRealBadges={data.replaceRealBadges === true} onReplaceRealBadges={v => set("replaceRealBadges", v)} activityAmounts={data.activityAmounts ?? {}} onActivityAmounts={v => set("activityAmounts", v)} />
            </Section>
            <Section title="Badge order" description="Hide badges or change their order.">
                <BadgeLayoutEditor data={data} userId={selectedAccountId} onChange={layout => setData(previous => ({ ...previous, ...layout }))} />
            </Section>
        </>,
        others: <OtherProfilesPanel />,
        saved: <SavedProfilesPanel current={data} onLoad={value => setData({ ...value })} fallbackName={selectedUser?.globalName || selectedUser?.username || "You"} fallbackUsername={selectedUser?.username || "username"} fallbackAvatar={fallbackAvatar}
            decorationFor={asset => (decorations.find(item => item.id === asset) || ALL_DECORATIONS.find(item => item.id === asset) || liveDecorations.find(item => item.id === asset))?.url}
            effectFor={skuId => catalogData?.effects.find(item => item.skuId === skuId)?.title} frameFor={skuId => catalogData?.frames.find(item => item.skuId === skuId)?.label} />,
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
                    ? <><span className="cpx-hint">Reset this device? Your shared profile stays unchanged.</span><button type="button" className="cpx-btn cpx-btn-danger" onClick={reset}>Yes, reset</button><button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => setConfirmReset(false)}>Keep</button></>
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
            // Discord applies the Nitro type override only for staff. Apply it while Fake Nitro is on.
            find: ".getPremiumTypeActual();return ",
            replacement: {
                match: /(function \i\((\i),(\i)\)\{)if\(!\2\)return \3;(?=let \i=\i\.\i\.getPremiumTypeOverride\(\))/,
                replace: "$1if(!$2&&!$self.fakeNitroActive())return $3;"
            }
        },
        {
            // Local-only tag next to your own name in chat (APP, OFFICIAL, SYSTEM...).
            find: "Types.SYSTEM_DM:null!=",
            noWarn: true,
            replacement: {
                match: /(function \i\((\i)\)\{let \i,\{message:\i,channel:\i,user:(\i),isRepliedMessage:\i\}=\2;)/,
                replace: "$1{const __ccTag=$self.localBotTag($3);if(__ccTag!=null)return __ccTag;}"
            }
        },
        {
            // Clicking your own tiered Nitro badge opens Get Nitro (no real Nitro) or Nitro Home (Fake Nitro).
            // With a custom profile, show the tier card like everyone else sees it.
            find: "TIERED_TENURE_BADGE_CLICKED",
            noWarn: true,
            replacement: [
                {
                    match: /(premium_type:\i,viewed_user_id:\i\?\.userId\}\),\i\)\{)(\i)\?/,
                    replace: "$1$2&&!$self.ownTenureCard()?"
                },
                {
                    match: /(\}if\()(\i)(\)\{let \i=null!=\i\.link\?)/,
                    replace: "$1$2&&!$self.ownTenureCard()$3"
                }
            ]
        },
        {
            // Resolve the device-only fake gift link without asking Discord.
            find: "GIFT_CODE_RESOLVE(e),query:{with_application",
            noWarn: true,
            replacement: {
                match: /(async function \i\((\i)\){)(?=let \i=arguments\.length>1.{0,200}?GIFT_CODE_RESOLVE\(\2\),query)/,
                replace: "$1{const __ccGift=$self.fakeGiftCode($2);if(__ccGift)return __ccGift;}"
            }
        },
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

    badgesHiddenFor(userId: string) {
        return profileRuntimeActive && badgesHiddenFor(userId);
    },

    getBadgeLayout(userId: string) {
        if (!profileRuntimeActive) return null;
        if (isMe(userId)) return isEnabled && !(storedData.localOnly && storedData.hideBadgesWhenSyncOff) ? storedData : null;
        requestSharedProfile(userId, true);
        return viewedSharedProfile(userId, true);
    },


    filterNativeBadges(userId: string, badges: ProfileBadge[]) {
        const data = this.getBadgeLayout(userId);
        if (!data) return badges;
        const custom = (badge: ProfileBadge) => (badge as any).cloudcordProfileBadge === true || /^cloudcord-(?:official|custom)-/.test(badge.id);
        if (shouldReplaceBadges(data)) return badges.filter(custom);
        const replaced = new Set(badges.filter(badge => (badge as any).cloudcordProfileBadge === true).map(badgeLayoutKey));
        return badges.filter(badge => custom(badge) || !replaced.has(badgeLayoutKey(badge)));
    },

    localBotTag(user: any) {
        if (!profileRuntimeActive || localNameTag == null || !user?.id || !isMe(user.id)) return null;
        return localNameTag;
    },

    fakeNitroActive() {
        return isFakeNitroActive();
    },

    ownTenureCard() {
        return profileRuntimeActive && isEnabled && !!storedData.nitro;
    },

    fakeGiftCode(code: string) {
        if (!profileRuntimeActive) return null;
        return fakeGiftFor(code);
    },

    fakeCurrentUser(user: any) {
        if (!profileRuntimeActive || !user || !isMe(user.id) || !isEnabled) return user;
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
            clone.publicFlags = wantedFlags;
        }
        applyNativeProfileMetadata(clone, storedData, false, false);
        cachedOriginalUser = user; cachedFakeUser = clone; cachedDataHash = _dataVersion;
        return clone;
    },

    fakeOtherUser(user: any) {
        if (!profileRuntimeActive) return user?.__cp_original || user;
        if (isRealProfileView(user?.id)) return user?.__cp_original || user;
        if (!user || isMe(user.id)) return user;
        const shared = viewedSharedProfile(user.id);
        if (!shared) {
            requestSharedProfile(user.id);
            return user;
        }
        const realUser = user.__cp_isClone ? (user.__cp_original || user) : user;
        const cached = otherUserCache.get(realUser);
        if (cached?.profile === shared) return cached.user;
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
            clone.publicFlags = wantedFlags;
        }
        applyNativeProfileMetadata(clone, shared, false, false);
        otherUserCache.set(realUser, { profile: shared, user: clone });
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
            if (storedData.signupDate) { try { merged.joinedAt = new Date(storedData.signupDate + "T12:00:00Z"); } catch { /* silent: runs per profile read; an invalid date leaves joinedAt unset */ } }
            if (storedData.decorationAsset) { merged.avatarDecoration = nativeDecoration(storedData); merged.avatarDecorationData = merged.avatarDecoration; }
            if (storedData.nitro && storedData.accentColor != null) merged.themeColors = [storedData.accentColor, storedData.accentColor2 ?? storedData.accentColor];
            applyNativeProfileMetadata(merged, storedData);
            return Object.assign(Object.create(Object.getPrototypeOf(profile)), profile, merged);
        } catch { return profile; }
    },

fakeObfuscatedEmail(real: string | null) {
        if (!profileRuntimeActive || !isEnabled || !storedData.email || !real) return real;
        const fake = storedData.email; const atIdx = fake.indexOf("@");
        if (atIdx <= 1) return fake;
        return fake[0] + "***" + fake.slice(atIdx - 1);
    },
    fakeObfuscatedPhone(real: string | null) {
        if (!profileRuntimeActive || !isEnabled || !storedData.phone || !real) return real;
        const fake = storedData.phone;
        return fake.length < 4 ? fake : "***-***-" + fake.slice(-4);
    },
    patchDecorationUrl(input: any) {
        if (!profileRuntimeActive) return undefined;
        const user = input?.user ?? input;
        const asset = sharedDecorationAsset(input?.avatarDecoration?.asset || input?.avatarDecorationData?.asset || input?.avatar_decoration_data?.asset || user?.avatarDecoration?.asset || user?.avatarDecorationData?.asset || user?.avatar_decoration_data?.asset);
        const item = ALL_DECORATIONS.find(decoration => decoration.id === asset);
        return item?.url;
    },

    patchBannerUrl({ displayProfile }: any) {
        if (!profileRuntimeActive || !isEnabled || !storedData.banner) return null;
        try { return isMe(displayProfile?.userId) ? storedData.banner : null; } catch { return null; }
    },

    toolboxActions: { "Open Profile Spoofer"() { openModal(props => <CustomProfileModal rootProps={props} />); } },
    _origGetUserAvatarURL: null as any,
    _catalogListener: null as null | (() => void),
    _origGetAvatarDecorationURL: null as any,
    _origExtractTimestamp: null as any,

    userProfileBadges: [{
        // Fake Discord badges now live in profile.badges (see discordProfileBadges);
        // only CloudCord's own uploaded badges still come through the badge API.
        getBadges({ userId }: { userId: string; guildId: string; }) {
            void refreshUploadedBadges();
            return badgesHiddenFor(userId) ? [] : uploadedUserBadges(userId);
        }
    } as ProfileBadge] as ProfileBadge[],

    async start() {
        profileRuntimeActive = true;
        const generation = ++profileRuntimeGeneration;
        installPresenceHooks(userId => isMe(userId) ? (isEnabled ? storedData : undefined) : isRealProfileView(userId) ? undefined : viewedSharedProfile(userId));
        installTagIconSwap();
        try { installSwitcherHook(); } catch (e) { logger.warn("Installing account switcher hook failed", e); }
        this._catalogListener = onCatalogLoaded(() => { cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++; forceAccountPanelRerender(); });
        // Also hook the public resolver: a source-text patch alone can miss
        // Discord's newer/minified resolver layout.
        const resolver: any = IconUtils;
        if (typeof resolver?.getAvatarDecorationURL === "function" && !this._origGetAvatarDecorationURL) {
            this._origGetAvatarDecorationURL = resolver.getAvatarDecorationURL;
            const original = resolver.getAvatarDecorationURL;
            resolver.getAvatarDecorationURL = (input: any, ...args: unknown[]) => this.patchDecorationUrl(input) || original.call(resolver, input, ...args);
        }
        addHeaderBarButton("profile-spoofer-btn", () => <CustomProfileButton />, 10);
        addContextMenuPatch("user-context", userContextMenuPatch);
        addContextMenuPatch(["user-profile-actions", "user-profile-overflow-menu"], profileOverflowPatch);
        FluxDispatcher.subscribe("CONNECTION_OPEN", onAccountSwitch);
        FluxDispatcher.addInterceptor?.(rewriteFetchedProfile);
        FluxDispatcher.addInterceptor?.(rewriteBadgeDirectory);
        // Discord loads your profile and badge info at startup, possibly before these
        // hooks exist; load them again once Discord has settled so the fake data applies.
        reloadDiscordProfile(activeUserId());
        for (const delay of [3000, 12000]) setTimeout(() => { if (profileRuntimeActive) reloadDiscordProfile(activeUserId()); }, delay);
        setProfileNitroSource(() => profileRuntimeActive && isEnabled && storedData.nitro === true);
        startExtras();
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", onPendingProfileChange);

        installProfileStoreHooks(this);

        if (IconUtils?.getUserAvatarURL && !_avatarPatchApplied) {
            this._origGetUserAvatarURL = IconUtils.getUserAvatarURL;
            const orig = this._origGetUserAvatarURL;
            (IconUtils as any).getUserAvatarURL = (user: any, ...args: unknown[]) => {
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
        if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return;
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
        if (!profileRuntimeActive || generation !== profileRuntimeGeneration) return;
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
        profileRuntimeActive = false;
        try { uninstallSwitcherHook(); } catch (e) { logger.warn("Removing account switcher hook failed", e); }
        try { const d = FluxDispatcher as any; if (Array.isArray(d._interceptors)) d._interceptors = d._interceptors.filter((fn: any) => fn !== rewriteFetchedProfile && fn !== rewriteBadgeDirectory); } catch (e) { logger.warn("Removing flux interceptors failed", e); }
        reloadDiscordProfile(activeUserId());
        profileRuntimeGeneration++;
        otherUserCache = new WeakMap();
        sharedRequests.clear(); sharedQueued.clear();
        cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
        uninstallProfileStoreHooks();
        if (publishTimer) { clearTimeout(publishTimer); publishTimer = null; }
        (publishSharedProfile as any).queued = false;
        profileEditorOpen = false;
        uninstallPresenceHooks(); uninstallTagIconSwap(); this._catalogListener?.(); this._catalogListener = null;
        document.removeEventListener("click", this._socialClick, true);
        this._nativeSocial?.stop(); this._nativeSocial = null;
        window.removeEventListener("focus", refreshBadgesOnFocus);
        removeHeaderBarButton("profile-spoofer-btn"); removeContextMenuPatch("user-context", userContextMenuPatch); removeContextMenuPatch(["user-profile-actions", "user-profile-overflow-menu"], profileOverflowPatch);
        stopExtras();
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", onAccountSwitch); FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", onPendingProfileChange); stopDomObserver();
        if (sharedSyncTimer) { clearInterval(sharedSyncTimer); sharedSyncTimer = null; }
        if (this._origExtractTimestamp && SnowflakeUtils) { (SnowflakeUtils as any).extractTimestamp = this._origExtractTimestamp; this._origExtractTimestamp = null; }
        if (this._origGetUserAvatarURL && IconUtils) { (IconUtils as any).getUserAvatarURL = this._origGetUserAvatarURL; this._origGetUserAvatarURL = null; _avatarPatchApplied = false; }
        if (this._origGetAvatarDecorationURL && IconUtils) { (IconUtils as any).getAvatarDecorationURL = this._origGetAvatarDecorationURL; this._origGetAvatarDecorationURL = null; }
    },

    settingsAboutComponent() { return <Button onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)}>Open Profile Editor</Button>; },
});

// Every badge CloudCord shows for a user (fake Discord badges plus uploaded ones),
// in Discord's order and with Discord's own badge IDs.
function buildProfileBadges(userId: string): ProfileBadge[] {
        void refreshUploadedBadges();
        const published = uploadedUserBadges(userId);
        const userIsMe = isMe(userId);
        let profileData: CustomProfileData | undefined;
        if (userIsMe) {
            if (!isEnabled) return published;
            // New feature: no CloudCord badges while sync is switched off, if chosen.
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
            const liveUser = userIsMe ? UserStore.getCurrentUser() : UserStore.getUser(userId);
            if (liveUser && shouldReplaceBadges(profileData)) {
                Object.defineProperty(liveUser, "publicFlags", { get: () => 0, set: () => {}, configurable: true, enumerable: true });
                Object.defineProperty(liveUser, "flags", { get: () => 0, set: () => {}, configurable: true, enumerable: true });
            }
        } catch (e) { logger.warn("Hiding native badge flags failed", e); }

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
            description: `Subscriber since ${shortProfileDate(nitroSinceFor(nl, profileData.nitroSince))}`,
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
        }).map(badge => nativeBadge(badge, bm));
}

const badgeIconHash = (url?: string) => url?.match(/\/badge-icons\/([a-f0-9]{32})\.png/)?.[1];
// Shape Discord uses for badges in profile.badges, so it renders them as real ones.
function toDiscordBadge(badge: ProfileBadge): any {
    const hash = badgeIconHash(badge.iconSrc);
    return { id: badge.id, description: badge.description, icon: hash ?? badge.iconSrc, ...(hash ? {} : { iconSrc: badge.iconSrc }), ...(badge.link ? { link: badge.link } : {}) };
}
// The badge list Discord should show: fake badges replace real ones of the same kind,
// or all real ones when "Hide my real badges" is on.
function discordProfileBadges(userId: string, data: CustomProfileData, real: any[] | undefined): any[] {
    const published = new Set(uploadedUserBadges(userId).map(badge => badge.id));
    const fake = [...buildProfileBadges(userId).filter(badge => !isLegacyActivityBadge(badge.id)), ...activityProfileBadges(data)].filter(badge => !published.has(badge.id)).map(toDiscordBadge);
    const taken = new Set(fake.map(badgeLayoutKey));
    const list = shouldReplaceBadges(data) || !Array.isArray(real) ? fake : [...real.filter(badge => !taken.has(badgeLayoutKey(badge))), ...fake];
    // Apply the order and hidden badges chosen in Discord's badge customiser.
    const hidden = new Set(data.nativeHiddenBadges ?? []);
    const order = data.nativeBadgeOrder ?? [];
    const rank = (badge: any) => { const i = order.indexOf(directoryBadgeId(badge.id) ?? -1); return i < 0 ? order.length : i; };
    return list.filter(badge => !hidden.has(directoryBadgeId(badge.id) ?? -1)).map((badge, i) => ({ badge, i }))
        .sort((a, b) => rank(a.badge) - rank(b.badge) || a.i - b.i).map(item => item.badge);
}

// Discord loads every profile (badges included) through USER_PROFILE_FETCH_SUCCESS with
// the raw API body. Edit that body the way Discord's server would have sent it, so the
// fake badges and Nitro/boost dates are Discord's own data from the start.
const fetchUserProfile = findByCodeLazy("USER_PROFILE_FETCH_START");
function profileDataFor(userId: string): CustomProfileData | undefined {
    if (isMe(userId)) return isEnabled && !(storedData.localOnly && storedData.hideBadgesWhenSyncOff) ? storedData : undefined;
    if (badgesHiddenFor(userId)) return undefined;
    return viewedSharedProfile(userId);
}
function rewriteFetchedProfile(action: any) {
    if (action?.type !== "USER_PROFILE_FETCH_SUCCESS" || !profileRuntimeActive) return false;
    const raw = action.userProfile;
    const userId = raw?.user?.id;
    const data = userId ? profileDataFor(userId) : undefined;
    if (!data) return false;
    try {
        raw.badges = discordProfileBadges(userId, data, raw.badges);
        const level = Number(data.nitroLevel ?? -1);
        if (data.nitro === true && level >= 0 && level < NITRO_LEVEL_MONTHS.length) {
            raw.premium_type = 2;
            raw.premium_since = nitroSinceFor(level, data.nitroSince).toISOString();
        }
        const boost = Number(data.boostMonths ?? -1);
        if (boost >= 0 && boost < BOOST_LEVEL_MONTHS.length) raw.premium_guild_since = monthsAgo(BOOST_LEVEL_MONTHS[boost]).toISOString();
    } catch (e) { logger.warn("Rewriting fetched profile failed", e); }
    return false;
}
// Discord's badge directory (owned badges, tiers, "Subscriber since" labels) loads
// separately from the profile. Edit it the same way as it arrives.
const fetchBadgeDirectory = findByCodeLazy("BADGE_DIRECTORY_FETCH_START");
// Discord's numeric badge_id for each badge ID it uses in profiles.
function directoryBadgeId(id: string): number | undefined {
    if (id === "premium" || id.startsWith("premium_tenure_")) return 1;
    if (id.startsWith("guild_booster_lvl")) return 12;
    return ({ staff: 22, partner: 2, certified_moderator: 3, hypesquad: 4, hypesquad_house_1: 5, hypesquad_house_2: 6, hypesquad_house_3: 7,
        bug_hunter_level_1: 8, bug_hunter_level_2: 9, verified_developer: 10, early_supporter: 11, legacy_username: 13,
        quest_completed: 14, orb_profile_badge: 16, gifting: 17, account_age: 18, streaming: 19, game_time: 20, game_variety: 21 } as Record<string, number>)[id];
}
// Badges Discord derives from activity, not ones CloudCord lets you pick.
const DIRECTORY_ONLY_BADGES = new Set([18, 19, 20, 21]);
function addMonths(date: Date, months: number) { const next = new Date(date); next.setMonth(next.getMonth() + months); return next; }
// Progress toward the next tier, worked out from the fake start date the same way
// Discord reports it: days since the start, the current tier's day and the next one's.
function tierStartDate(tier: any, since: Date): Date {
    const req = tier?.requirements?.[0];
    const amount = Number(req?.threshold ?? 0);
    return addMonths(since, req?.unit === "years" ? amount * 12 : amount);
}
function fakeTierProgress(tiers: any[], index: number, since: Date) {
    const next = tiers[index + 1];
    if (!next) return [];
    const day = 86400_000;
    const days = (date: Date) => Math.max(0, Math.round((date.getTime() - since.getTime()) / day));
    const current = days(new Date());
    const floor = days(tierStartDate(tiers[index], since));
    const threshold = Math.max(current, days(tierStartDate(next, since)));
    const left = threshold - current;
    const months = Math.round(left / 30.44);
    const helper = left < 31 ? `${left} more day${left === 1 ? "" : "s"}` : `${months} more month${months === 1 ? "" : "s"}`;
    return [{ progress_type: 1, current, floor, threshold, unit: "days", window: null, progress_helper_text: helper }];
}
function tieredEntry(entry: any, tierIndex: number, since: Date, monthsPerTier: number[], label: string) {
    const keys: string[] = (entry.tiers || []).map((tier: any) => tier.key);
    const index = Math.max(0, Math.min(keys.length - 1, tierIndex));
    const obtained: Record<string, string> = {};
    keys.slice(0, index + 1).forEach((key, i) => { obtained[key] = addMonths(since, monthsPerTier[i] ?? 0).toISOString(); });
    // The entry carries the current tier's artwork at the top level; use the chosen tier's.
    const tier = entry.tiers?.[index] ?? {};
    const art = Object.fromEntries(["simple_icon_url", "simple_icon_raster_url", "complex_icon_static_url", "complex_icon_animated_url"]
        .filter(key => tier[key]).map(key => [key, tier[key]]));
    const tiers = (entry.tiers || []).map((item: any, i: number) => ({ ...item, owned: i <= index }));
    return { ...entry, ...art, tiers, progress: fakeTierProgress(entry.tiers || [], index, since), owned: true, hidden: !!entry.__ccHidden, obtained_at: since.toISOString(), current_tier: keys[index], next_tier: keys[index + 1] ?? null, tier_obtained_at: obtained, info_label: label };
}
// The line under a badge's title ("A Nitro original") is only sent to owners. Known
// ones are listed here; others are learned from any real owner's badges we see.
const KNOWN_BADGE_INFO: Record<number, string> = { 5: "First in, no hesitation", 6: "Patience meets discipline", 7: "Calm in the chaos", 11: "A Nitro original", 14: "1 Quest completed", 16: "This is just the beginning..." };
const LS_BADGE_INFO = "cloudcord_badge_info";
let learnedBadgeInfo: Record<number, string> = (() => { try { return JSON.parse(localStorage.getItem(LS_BADGE_INFO) || "{}") || {}; } catch { return {}; } })();
function learnBadgeInfo(entries: any[]) {
    let changed = false;
    for (const entry of entries) {
        if (!entry?.owned || !entry.info_label || entry.tiers?.length || DIRECTORY_ONLY_BADGES.has(entry.badge_id)) continue;
        if (learnedBadgeInfo[entry.badge_id] !== entry.info_label) { learnedBadgeInfo = { ...learnedBadgeInfo, [entry.badge_id]: entry.info_label }; changed = true; }
    }
    if (changed) try { localStorage.setItem(LS_BADGE_INFO, JSON.stringify(learnedBadgeInfo)); } catch (e) { logger.warn("Saving learned badge info failed", e); }
}

function fakeDirectoryEntry(entry: any, userId: string, data: CustomProfileData, owned: Map<number, any>, replace: boolean) {
    if (!entry) return entry;
    entry = { ...entry, __ccHidden: (data.nativeHiddenBadges ?? []).includes(entry.badge_id) };
    // Activity badges (account age, game time...): the chosen tier, else real unless real badges are hidden.
    if (DIRECTORY_ONLY_BADGES.has(entry.badge_id)) return activityDirectoryEntry(entry, data) ?? (replace ? { ...entry, owned: false } : entry);
    const fake = owned.get(entry.badge_id);
    if (!fake) return replace ? { ...entry, owned: false, current_tier: undefined, next_tier: undefined, info_label: undefined } : entry;
    if (entry.badge_id === 1) {
        const level = Number(data.nitroLevel ?? 0);
        const since = nitroSinceFor(level, data.nitroSince);
        return tieredEntry(entry, level, since, NITRO_LEVEL_MONTHS, `Subscriber since ${shortProfileDate(since)}`);
    }
    if (entry.badge_id === 12) {
        const level = Number(data.boostMonths ?? 0);
        const since = monthsAgo(BOOST_LEVEL_MONTHS[level] ?? 1);
        return tieredEntry(entry, level, since, [0, ...BOOST_LEVEL_MONTHS.map((months, i) => (BOOST_LEVEL_MONTHS[i + 1] ?? months) - BOOST_LEVEL_MONTHS[0])].slice(0, 9), `Boosting since ${shortProfileDate(since)}`);
    }
    if (entry.badge_id === 17) {
        const level = Number(data.giftLevel ?? 0);
        return tieredEntry(entry, level, monthsAgo(1), [], fake.description);
    }
    return { ...entry, owned: true, hidden: (data.nativeHiddenBadges ?? []).includes(entry.badge_id), info_label: entry.info_label ?? learnedBadgeInfo[entry.badge_id] ?? KNOWN_BADGE_INFO[entry.badge_id] };
}
function rewriteBadgeDirectory(action: any) {
    if (!profileRuntimeActive) return false;
    const type = action?.type;
    if (type !== "BADGE_DIRECTORY_FETCH_SUCCESS" && type !== "BADGE_FETCH_SUCCESS" && type !== "BADGE_SUMMARY_FETCH_SUCCESS") return false;
    const userId = action.userId;
    try { learnBadgeInfo(Array.isArray(action.badges) ? action.badges : action.badge ? [action.badge] : []); } catch (e) { logger.warn("Learning badge info failed", e); }
    const data = userId ? profileDataFor(userId) : undefined;
    if (!data) return false;
    try {
        const owned = new Map<number, any>();
        for (const badge of buildProfileBadges(userId)) { const id = directoryBadgeId(badge.id); if (id != null) owned.set(id, badge); }
        for (const item of ACTIVITY_BADGES) if (activityTier(data, item.key) >= 0) owned.set(item.badgeId, { id: item.key });
        const replace = shouldReplaceBadges(data);
        if (Array.isArray(action.badges)) {
            const entries = action.badges.map((entry: any) => fakeDirectoryEntry(entry, userId, data, owned, replace));
            // Other people's badge info only lists badges they really own, so fake ones have
            // no entry. Build them from the full badge list Discord keeps for your account.
            const listed = new Set(entries.map((entry: any) => entry?.badge_id));
            const myId = activeUserId();
            for (const badgeId of owned.keys()) {
                if (listed.has(badgeId) || !myId || myId === userId) continue;
                const template = badgeDirectoryStore?.getBadgeById?.(badgeId, myId);
                if (template) entries.push(fakeDirectoryEntry({ ...template, owned: false, info_label: undefined, progress: undefined }, userId, data, owned, replace));
            }
            action.badges = entries;
        }
        if (action.badge) action.badge = fakeDirectoryEntry(action.badge, userId, data, owned, replace);
    } catch (e) { logger.warn("Rewriting badge directory failed", e); }
    return false;
}
function reloadBadgeDirectory(userId: string | null | undefined) {
    if (!userId) return;
    reapplyBadgeDirectory(userId);
    try { void Promise.resolve(fetchBadgeDirectory(userId)).catch(() => { }); } catch (e) { logger.warn("Fetching badge directory failed", e); }
}
// Re-run the badge rewrite on the badge info Discord already has (no network). A fetch
// can be skipped while Discord's copy is fresh, which left badges without fake data.
const badgeDirectoryStore = findStoreLazy("BadgeDirectoryStore");

// Switch Accounts list: show the spoofed username for the signed-in account.
const multiAccountStore = findStoreLazy("MultiAccountStore");
let switcherOriginals: { getUsers: any; getValidUsers: any; } | null = null;
// Same array back for the same input, or Discord's store hooks re-render forever.
const switcherCache = new WeakMap<object, { name: string; result: any[]; }>();
function spoofSwitcherUsers(users: any) {
    if (!profileRuntimeActive || !isEnabled || !storedData.username || !Array.isArray(users)) return users;
    const name = storedData.username;
    const hit = switcherCache.get(users);
    if (hit && hit.name === name) return hit.result;
    if (!users.some(user => user && isMe(user.id) && user.username !== name)) return users;
    const result = users.map(user => user && isMe(user.id) ? { ...user, username: name } : user);
    switcherCache.set(users, { name, result });
    return result;
}
function installSwitcherHook() {
    if (switcherOriginals || !multiAccountStore?.getUsers) return;
    const store: any = multiAccountStore;
    switcherOriginals = { getUsers: store.getUsers, getValidUsers: store.getValidUsers };
    const { getUsers, getValidUsers } = switcherOriginals;
    store.getUsers = function (...args: unknown[]) { return spoofSwitcherUsers(getUsers.apply(this, args)); };
    if (getValidUsers) store.getValidUsers = function (...args: unknown[]) { return spoofSwitcherUsers(getValidUsers.apply(this, args)); };
}
function uninstallSwitcherHook() {
    if (!switcherOriginals) return;
    const store: any = multiAccountStore;
    store.getUsers = switcherOriginals.getUsers;
    if (switcherOriginals.getValidUsers) store.getValidUsers = switcherOriginals.getValidUsers;
    switcherOriginals = null;
}
function reapplyBadgeDirectory(userId: string | null | undefined) {
    if (!userId) return;
    try {
        if (!badgeDirectoryStore?.hasCatalogFor?.(userId)) return;
        const badges = (badgeDirectoryStore.getBadges(userId) || []).map((entry: any) => ({ ...entry }));
        if (badges.length) FluxDispatcher.dispatch({ type: "BADGE_DIRECTORY_FETCH_SUCCESS", userId, badges });
    } catch (e) { logger.warn("Re-dispatching badge directory failed", e); }
}

// Ask Discord to load a profile again so the edited data replaces what it cached.
function reloadDiscordProfile(userId: string | null | undefined) {
    if (!userId) return;
    try { void Promise.resolve(fetchUserProfile(userId, { withMutualGuilds: false, withMutualFriends: false })).catch(() => { }); } catch (e) { logger.warn("Fetching user profile failed", e); }
    reloadBadgeDirectory(userId);
}

// ---- Discord's tiered activity badges ----
type ActivityBadgeKey = "account_age" | "streaming" | "game_time" | "game_variety";
// Tier names and thresholds as Discord lists them in its badge directory.
const ACTIVITY_BADGES: { key: ActivityBadgeKey; badgeId: number; title: string; tiers: [string, number][]; label: (amount: number) => string; }[] = [
    { key: "account_age", badgeId: 18, title: "Account Age", label: years => `${years} year${years === 1 ? "" : "s"}`,
        tiers: [["Seed", 1], ["Sprout", 2], ["Sapling", 3], ["Bud", 4], ["Blossom", 5], ["Redwood", 6], ["Sequoia", 7], ["Bristlecone", 8], ["Stromatolite", 9], ["Primordial", 10]] },
    { key: "streaming", badgeId: 19, title: "Streaming", label: hours => `${hours.toLocaleString("en-US")} hour${hours === 1 ? "" : "s"} streamed to others`,
        tiers: [["Newcomer", 1], ["Fledgling", 5], ["Breakout", 20], ["Standout", 75], ["Trendsetter", 150], ["Headliner", 300], ["Star", 500], ["Sensation", 1000], ["Visionary", 2000], ["Phenomenon", 5000]] },
    { key: "game_time", badgeId: 20, title: "Game Time", label: hours => `${hours.toLocaleString("en-US")} hour${hours === 1 ? "" : "s"} of games played`,
        tiers: [["Casual", 1], ["Recreational", 5], ["Dedicated", 20], ["Committed", 75], ["Serious", 150], ["Devoted", 300], ["Seasoned", 500], ["Ironclad", 1000], ["Unshakeable", 2000], ["Eternal", 5000]] },
    { key: "game_variety", badgeId: 21, title: "Game Variety", label: games => `${games} games played`,
        tiers: [["Sampler", 2], ["Dabbler", 5], ["Enthusiast", 10], ["Ranger", 15], ["Explorer", 20], ["Adventurer", 30], ["Voyager", 40], ["Maverick", 60], ["Polymath", 80], ["Universalist", 100]] }
];
// The badge editor stores these picks in customBadgeIds ("game_time_3"); match the
// picked tier to Discord's by name (CloudCord's Account Age list orders Bud/Sapling differently).
// Discord's badge-icons hash for each tier (from real owners). Mobile only loads badge
// art from these; the few tiers nobody nearby owned fall back to CloudCord's image.
const ACTIVITY_ICON_HASHES: Record<string, (string | null)[]> = {account_age: ["b5716cca77a6e24b20eabe4d008479a9", "d7648c523cf6322e650b4f7ea718b8a3", "73d2776a9c6d93a7e041e6fd90da86f6", "bce1cb27ae581e866dc86f9f16e4046e", "c2ff7d8d6285305f969be81c3c92dd78", "813d80b654901205a69da56b5e5ff2e4", "e9cdafeb9234bd7262e733e6072d1739", "2f766b95be1f0bfcc69404ab898cf71a", "7c078b2e82d6010fe46268ff204927de", "c478f85138cb30158637442110ab33b7"], streaming: ["30670da18925260946379b7fe10def26", "046ddc05551d3b91d269460956d81188", "dac8be3f227ad66655e402814c366f64", "852c0e2f5d2d73e75b1eabb286417acf", "f5e5b1a2820da1981084e4b719be72e7", "0b06966b175dc72c9b5eaea61003d530", "3ba1b4e528fdebfe49cd7021550e9826", "063ec3175b47664507d30feaf83dfa99", null, null], game_time: ["3efa50b9d9eff04c04a0bdd6e78b8dc0", "7f60a090de6cfe230bbc32c482fbaf2c", "054c89b927c8c8907ab652fb458fb97f", "452bbe19d924544ab70cfd8f3cc0e446", "269355d438e62bd1f45e127b34459caf", "feb9939317a21090e6dcdf410e3c3000", "db259eb9f31a389ff0aff009b704babb", "208e1bb66e311286cae364bc6f19277a", "be98f2d9a07ba288bf271b0757fbce6a", "7c57adf7939dd1132e02cb273ac07b96"], game_variety: ["f2e95dea497883ba979fbb7262df4fb1", "5df9e6c933a4255e2edd6030719da8c6", "1043a575492403efe4ec42efa451050c", "5816a47693a62f0529e53ed2fbc7f41c", "ce9ae4ae128db559173a0a29c49becd2", "b27e9974811d0c4e420724fc0e54b4b2", "68af20428336f8c018bab39206644d60", null, "33e5593de1a98a7b12aba93174357031", null]};
function activityTier(data: CustomProfileData, key: ActivityBadgeKey): number {
    const group = EXPERIMENTAL_BADGE_GROUPS.find(item => item.id === key);
    const picked = group?.tiers.find(tier => data.customBadgeIds?.includes(tier.id));
    if (!picked) return -1;
    return ACTIVITY_BADGES.find(item => item.key === key)!.tiers.findIndex(([name]) => name === picked.name);
}
// CloudCord's own copies of these badges, replaced by Discord's native ones.
const isLegacyActivityBadge = (id: string) => /^sp_(?:account_age|streaming|game_time|game_variety)_\d+$/.test(id);
// Profile badge rows for the chosen activity badges; Discord draws the tier icon itself.
function activityProfileBadges(data: CustomProfileData): ProfileBadge[] {
    const myId = activeUserId();
    return ACTIVITY_BADGES.filter(badge => activityTier(data, badge.key) >= 0).map(badge => {
        const tier = activityTier(data, badge.key);
        const hash = ACTIVITY_ICON_HASHES[badge.key]?.[tier];
        const icon = hash ? `https://cdn.discordapp.com/badge-icons/${hash}.png` : myId ? badgeDirectoryStore?.getBadgeById?.(badge.badgeId, myId)?.tiers?.[tier]?.simple_icon_raster_url : undefined;
        return { id: badge.key, description: badge.title, iconSrc: icon ?? "", position: 0 } as ProfileBadge;
    });
}
function activityDirectoryEntry(entry: any, data: CustomProfileData) {
    const badge = ACTIVITY_BADGES.find(item => item.badgeId === entry.badge_id);
    const tier = badge ? activityTier(data, badge.key) : -1;
    if (!badge || tier < 0) return null;
    const custom = Number(data.activityAmounts?.[badge.key]);
    const amount = Number.isFinite(custom) && custom >= 0 && data.activityAmounts?.[badge.key] != null ? custom : badge.tiers[tier][1];
    const since = badge.key === "account_age" ? monthsAgo(amount * 12) : monthsAgo(1);
    return { ...tieredEntry(entry, tier, since, [], badge.label(amount)), progress: [] };
}


// ---- Other profiles: edits to other people's profiles, only on this device ----
const LS_LOCAL_PROFILES = "cloudcord_local_profiles";
let localProfiles: Record<string, CustomProfileData> = (() => {
    try { const value = JSON.parse(localStorage.getItem(LS_LOCAL_PROFILES) || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; }
})();
function localProfileFor(userId: string): CustomProfileData | undefined {
    return /^\d{15,22}$/.test(userId) && !isMe(userId) ? localProfiles[userId] : undefined;
}
function writeLocalProfiles(next: Record<string, CustomProfileData>, changedId?: string) {
    localProfiles = next;
    try { localStorage.setItem(LS_LOCAL_PROFILES, JSON.stringify(next)); } catch (e) { logger.warn("Saving local profiles failed", e); }
    otherUserCache = new WeakMap();
    _dataVersion++;
    forceAccountPanelRerender();
    if (changedId) reloadDiscordProfile(changedId);
}
function localUserLabel(userId: string, data?: CustomProfileData) {
    const user = UserStore.getUser(userId) as any;
    return { name: data?.globalName || user?.globalName || user?.username || "Unknown user", username: data?.username || user?.username || userId, avatar: data?.avatar || (user ? IconUtils.getUserAvatarURL(user, false, 40) : "") };
}

function OtherProfilesPanel() {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    const [userId, setUserId] = React.useState("");
    const [draft, setDraft] = React.useState<CustomProfileData | null>(null);
    const [query, setQuery] = React.useState("");
    const ids = Object.keys(localProfiles);
    const validId = /^\d{15,22}$/.test(userId.trim());
    const set = <K extends keyof CustomProfileData>(key: K, value: CustomProfileData[K]) => setDraft(previous => ({ ...(previous || {}), [key]: value }));
    const open = (id: string) => {
        const clean = id.trim();
        setUserId(clean);
        setDraft({ ...(localProfiles[clean] || {}) });
        if (/^\d{15,22}$/.test(clean) && !UserStore.getUser(clean)) { try { void Promise.resolve(fetchUserProfile(clean, { withMutualGuilds: false, withMutualFriends: false })).then(force, () => { }); } catch (e) { logger.warn("Fetching local profile user failed", e); } }
    };
    const save = () => {
        if (!validId || !draft) return;
        if (isMe(userId.trim())) { showToast("Edit your own profile in the other tabs.", Toasts.Type.FAILURE); return; }
        const clean = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== undefined && value !== null)) as CustomProfileData;
        writeLocalProfiles({ ...localProfiles, [userId.trim()]: clean }, userId.trim());
        showToast("Saved on this device. Only you see this.", Toasts.Type.SUCCESS);
        force();
    };
    const remove = (id: string) => {
        const next = { ...localProfiles };
        delete next[id];
        writeLocalProfiles(next, id);
        if (id === userId.trim()) { setDraft(null); setUserId(""); }
        force();
    };
    const filtered = ids.filter(id => { const label = localUserLabel(id, localProfiles[id]); const needle = query.trim().toLowerCase(); return !needle || id.includes(needle) || label.name.toLowerCase().includes(needle) || label.username.toLowerCase().includes(needle); });
    const nitroLevel = Number(draft?.nitroLevel ?? -1);
    const target = validId ? localUserLabel(userId.trim(), draft || undefined) : null;
    return <>
        <Section title="Other profiles" description="Change how other people's profiles look, only on this device. Nobody else sees it, and their Discord account doesn't change.">
            <div className="cpx-inline">
                <input className="cpx-input" value={userId} placeholder="Discord user ID (right-click someone → Copy User ID)" onChange={event => setUserId(event.currentTarget.value)} />
                <button type="button" className="cpx-btn" disabled={!validId} onClick={() => open(userId)}>{validId && localProfiles[userId.trim()] ? "Edit" : "Add"}</button>
            </div>
        </Section>
        <Section title={`People you edited (${ids.length})`}>
            {ids.length > 4 && <input className="cpx-input" value={query} placeholder="Search" onChange={event => setQuery(event.currentTarget.value)} />}
            {!ids.length && <span className="cpx-hint">Nobody yet. Add someone's user ID above.</span>}
            {filtered.map(id => {
                const label = localUserLabel(id, localProfiles[id]);
                const data = localProfiles[id];
                const extras = [data.nitro && Number(data.nitroLevel ?? -1) >= 0 ? "Nitro" : "", Number(data.boostMonths ?? -1) >= 0 ? "Booster" : "", data.badgeFlags ? "Badges" : "", data.avatar ? "Picture" : "", data.bio ? "Bio" : ""].filter(Boolean).join(" · ");
                return <div key={id} className="cpx-order-row" style={{ gap: 12, outline: id === userId.trim() && draft ? "2px solid var(--cpx-brand)" : undefined }}>
                    {label.avatar ? <img src={label.avatar} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cpx-surface)" }} />}
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label.name}</strong>
                        <span className="cpx-hint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{label.username}{extras ? ` · ${extras}` : ""}</span>
                    </span>
                    <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => open(id)}>Edit</button>
                    <button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => remove(id)}>Restore</button>
                </div>;
            })}
        </Section>
        {draft && target && <>
            <Section title={`Editing ${target.name}`} description={`User ID ${userId.trim()}. Empty fields keep their real (or synced) value.`}>
                <Grid2>
                    <TextField label="Display name" maxLength={32} value={draft.globalName ?? ""} placeholder={target.name} onChange={value => set("globalName", value)} />
                    <TextField label="Username" maxLength={32} value={draft.username ?? ""} placeholder={target.username} onChange={value => set("username", value)} />
                </Grid2>
                <Grid2>
                    <ImageField label="Profile picture" value={draft.avatar ?? ""} onChange={value => set("avatar", value)} />
                    <ImageField label="Banner" shape="banner" value={draft.banner ?? ""} onChange={value => set("banner", value)} />
                </Grid2>
                <TextField label="Pronouns" maxLength={40} value={draft.pronouns ?? ""} onChange={value => set("pronouns", value)} />
                <TextField label="About me" maxLength={190} multiline value={draft.bio ?? ""} onChange={value => set("bio", value)} />
                <Grid2>
                    <ColorField label="Profile colour" optional fallback="#5865f2" value={draft.accentColor} onChange={value => set("accentColor", value)} />
                    <ColorField label="Second colour" optional fallback="#5865f2" value={draft.accentColor2} onChange={value => set("accentColor2", value)} />
                </Grid2>
                <Grid2>
                    <TextField label="Account created" value={draft.createdAt ?? ""} placeholder="YYYY-MM-DD" onChange={value => set("createdAt", value)} />
                    <TextField label="Nitro since" value={draft.nitroSince ?? ""} placeholder="YYYY-MM-DD" onChange={value => set("nitroSince", value)} />
                </Grid2>
            </Section>
            <Section title="Badges, Nitro and boosting" description="Shown on their profile on this device.">
                <BadgePicker selected={draft.badgeFlags ?? 0} onChange={value => set("badgeFlags", value)} nitroType={nitroLevel} onNitroType={value => { set("nitroLevel", value); set("nitro", value >= 0); }}
                    giftLevel={Number(draft.giftLevel ?? -1)} onGiftLevel={value => set("giftLevel", value)} boostLevel={Number(draft.boostMonths ?? -1)} onBoostLevel={value => set("boostMonths", value)}
                    customIds={draft.customBadgeIds ?? []} onCustomIds={value => set("customBadgeIds", value)} oldName={draft.oldName ?? ""} onOldName={value => set("oldName", value)}
                    replaceRealBadges={draft.replaceRealBadges === true} onReplaceRealBadges={value => set("replaceRealBadges", value)}
                    activityAmounts={draft.activityAmounts ?? {}} onActivityAmounts={value => set("activityAmounts", value)} />
            </Section>
            <div className="cpx-inline">
                <button type="button" className="cpx-btn cpx-btn-primary" onClick={save}>Save for {target.name}</button>
                <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => { setDraft(null); }}>Close</button>
                {localProfiles[userId.trim()] && <button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => remove(userId.trim())}>Restore original</button>}
            </div>
        </>}
    </>;
}


// ---- Saved profiles: named copies of your custom profile you can switch between ----
interface SavedProfile { id: string; name: string; savedAt: number; data: CustomProfileData; }
const LS_SAVED_PROFILES = "cloudcord_saved_profiles";
function readSavedProfiles(): SavedProfile[] {
    try { const value = JSON.parse(localStorage.getItem(LS_SAVED_PROFILES) || "[]"); return Array.isArray(value) ? value.filter(item => item?.id && item?.data) : []; } catch { return []; }
}
function writeSavedProfiles(next: SavedProfile[]) {
    try { localStorage.setItem(LS_SAVED_PROFILES, JSON.stringify(next)); return true; }
    catch { showToast("Couldn't save: storage is full. Remove a saved profile or use image links instead of uploads.", Toasts.Type.FAILURE); return false; }
}
// Only the look is saved; sync bookkeeping stays with the live profile.
function savedSnapshot(data: CustomProfileData): CustomProfileData {
    const { syncRevision: _revision, localOnly: _localOnly, ...rest } = data as any;
    return JSON.parse(JSON.stringify(rest));
}

function SavedProfilesPanel({ current, onLoad, fallbackName, fallbackUsername, fallbackAvatar, decorationFor, effectFor, frameFor }: {
    current: CustomProfileData; onLoad: (data: CustomProfileData) => void; fallbackName: string; fallbackUsername: string; fallbackAvatar: string;
    decorationFor: (asset: string) => string | undefined; effectFor: (skuId: string) => string | undefined; frameFor: (skuId: string) => string | undefined;
}) {
    const [items, setItems] = React.useState<SavedProfile[]>(readSavedProfiles);
    const [name, setName] = React.useState("");
    const [renaming, setRenaming] = React.useState<string | null>(null);
    const [renameText, setRenameText] = React.useState("");
    const commit = (next: SavedProfile[]) => { if (writeSavedProfiles(next)) setItems(next); };
    const currentJson = JSON.stringify(savedSnapshot(current));
    const saveCurrent = () => {
        const label = name.trim() || `Profile ${items.length + 1}`;
        commit([{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: label.slice(0, 40), savedAt: Date.now(), data: savedSnapshot(current) }, ...items]);
        setName("");
        showToast(`Saved "${label}".`, Toasts.Type.SUCCESS);
    };
    const load = (item: SavedProfile) => { onLoad({ ...current, ...item.data }); showToast(`Loaded "${item.name}". Press Save to use it.`, Toasts.Type.SUCCESS); };
    const date = (time: number) => new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return <>
        <Section title="Saved profiles" description="Keep copies of your custom profile and switch between them. Saved on this device.">
            <div className="cpx-inline">
                <input className="cpx-input" value={name} maxLength={40} placeholder={`Name, like "Main" or "Profile ${items.length + 1}"`} onChange={event => setName(event.currentTarget.value)} onKeyDown={event => { if (event.key === "Enter") saveCurrent(); }} />
                <button type="button" className="cpx-btn cpx-btn-primary" onClick={saveCurrent}>Save current profile</button>
            </div>
        </Section>
        {!items.length && <span className="cpx-hint">No saved profiles yet. Set up your profile, then save it here to come back to it later.</span>}
        <div className="cpx-saved-grid">
            {items.map(item => {
                const data = item.data;
                const active = JSON.stringify(data) === currentJson;
                const badges = (() => { try { return badgeLayoutRows(data, UserStore.getCurrentUser()?.id ?? "").filter(badge => badge.iconSrc).map(badge => ({ id: String(badge.id), icon: String(badge.iconSrc), label: String(badge.description || "") })); } catch { return []; } })();
                const rename = () => { commit(items.map(other => other.id === item.id ? { ...other, name: renameText.trim() || other.name } : other)); setRenaming(null); };
                return <div key={item.id} className="cpx-saved-item">
                    <DiscordProfileCard data={data} fallbackName={fallbackName} fallbackUsername={fallbackUsername} fallbackAvatar={fallbackAvatar}
                        decorationUrl={data.decorationAsset ? decorationFor(data.decorationAsset) : undefined} badges={badges} />
                    <div className="cpx-saved-foot">
                        <div className="cpx-saved-meta">
                            {renaming === item.id
                                ? <input className="cpx-input" autoFocus value={renameText} maxLength={40} onChange={event => setRenameText(event.currentTarget.value)} onKeyDown={event => { if (event.key === "Enter") rename(); if (event.key === "Escape") setRenaming(null); }} onBlur={rename} />
                                : <span className="cpx-saved-name" title="Click to rename" onClick={() => { setRenaming(item.id); setRenameText(item.name); }}>{item.name}</span>}
                            <span className="cpx-saved-sub">{active ? <span className="cpx-saved-live">In use</span> : <span>Saved {date(item.savedAt)}</span>}</span>
                        </div>
                    </div>
                    <div className="cpx-saved-actions">
                        <button type="button" className="cpx-btn cpx-btn-primary" disabled={active} onClick={() => load(item)}>{active ? "In use" : "Use profile"}</button>
                        <button type="button" className="cpx-icon-btn" aria-label="Update with current profile" title="Replace with your current profile" onClick={() => { commit(items.map(other => other.id === item.id ? { ...other, data: savedSnapshot(current), savedAt: Date.now() } : other)); showToast(`Updated "${item.name}".`, Toasts.Type.SUCCESS); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/></svg>
                        </button>
                        <button type="button" className="cpx-icon-btn cpx-danger" aria-label="Delete saved profile" title="Delete" onClick={() => commit(items.filter(other => other.id !== item.id))}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>
                        </button>
                    </div>
                </div>;
            })}
        </div>
    </>;
}


// ---- Copy someone's profile: everything Discord shows, plus their CloudCord look ----
const NITRO_TIER_MONTHS = [0, 1, 3, 6, 12, 24, 36, 60, 72];
const BOOST_TIER_MONTHS = [1, 2, 3, 6, 9, 12, 15, 18, 24];
const monthsSince = (date: any) => { const time = date ? new Date(date).getTime() : NaN; return Number.isFinite(time) ? (Date.now() - time) / (30.44 * 86400_000) : -1; };
const tierFor = (months: number, tiers: number[]) => { let index = -1; tiers.forEach((value, i) => { if (months >= value) index = i; }); return index; };
// Discord's badge list -> our badge fields.
const BADGE_ID_FLAGS: Record<string, number> = {
    staff: FLAG.STAFF, partner: FLAG.PARTNER, hypesquad: FLAG.HYPESQUAD, bug_hunter_level_1: FLAG.BUG_HUNTER_1, bug_hunter_level_2: FLAG.BUG_HUNTER_2,
    hypesquad_house_1: FLAG.BRAVERY, hypesquad_house_2: FLAG.BRILLIANCE, hypesquad_house_3: FLAG.BALANCE, early_supporter: FLAG.EARLY_SUPPORTER,
    verified_developer: FLAG.DEV_VERIFIED, certified_moderator: FLAG.MOD_ALUMNI, active_developer: FLAG.ACTIVE_DEVELOPER
};
function applyDiscordBadges(data: CustomProfileData, badges: any[]) {
    let flags = 0;
    const custom: string[] = [];
    for (const badge of badges) {
        const id = String(badge?.id || "");
        const description = String(badge?.description || "");
        if (BADGE_ID_FLAGS[id]) flags |= BADGE_ID_FLAGS[id];
        // Activity badges: the tier shows only in the icon.
        else if (ACTIVITY_ICON_HASHES[id]) { const tier = ACTIVITY_ICON_HASHES[id].indexOf(String(badge?.icon || "")); const picked = EXPERIMENTAL_BADGE_GROUPS.find(group => group.id === id)?.tiers[tier]; if (picked) custom.push(picked.id); }
        else if (id === "premium") { data.nitro = true; if (Number(data.nitroLevel ?? -1) < 0) data.nitroLevel = 0; }
        else if (/^premium_tenure_(\d+)_month/.test(id)) { const months = Number(id.match(/^premium_tenure_(\d+)_month/)![1]); data.nitro = true; data.nitroLevel = Math.max(0, NITRO_TIER_MONTHS.indexOf(months)); }
        else if (/^guild_booster_lvl(\d+)$/.test(id)) data.boostMonths = Math.max(0, Number(id.match(/(\d+)$/)![1]) - 1);
        else if (id === "legacy_username") { custom.push("oldname"); data.oldName = description.replace(/^originally known as\s*/i, "").trim() || description; }
        else if (id === "quest_completed") custom.push("quest");
        else if (id === "orb_profile_badge") custom.push("orbs");
        else if (id === "gifting" || /gift/i.test(id)) { const gift = GIFT_LEVELS.findIndex(level => new RegExp("\\b" + level.name + "\\b", "i").test(description)); data.giftLevel = gift >= 0 ? gift : 0; }
    }
    data.badgeFlags = flags;
    data.customBadgeIds = custom;
    // Show exactly their badges, not yours mixed in.
    data.replaceRealBadges = true;
}

/** Whether this person has a CloudCord profile to copy. */
function hasCloudCordProfile(userId: string) { return sharedProfiles.has(userId); }

async function buildCopiedProfile(userId: string, source: "discord" | "cloudcord" = "discord"): Promise<CustomProfileData> {
    if (source === "cloudcord") {
        const shared = sharedProfiles.get(userId);
        if (!shared) throw new Error("This person doesn't have a CloudCord profile.");
        return { ...JSON.parse(JSON.stringify(shared)), copiedUserId: userId };
    }
    // Ask Discord for their real profile. The API answer has no CloudCord look drawn over it.
    let body: any = null;
    try { body = (await Promise.race([RestAPI.get({ url: `/users/${userId}/profile`, query: { with_mutual_guilds: false, with_mutual_friends: false, with_mutual_friends_count: false } }), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))]) as any)?.body; } catch (e) { logger.warn("Fetching profile failed", e); }
    const user: any = body?.user ?? UserStore.getUser(userId);
    if (!user) throw new Error("Couldn't load that profile. Check the user ID and try again.");
    const profile: any = body?.user_profile ?? {};
    const pick = (...values: any[]) => values.find(value => value != null);
    // Start from a blank look so nothing of yours (frame, tag, extra badges...) is left over.
    const data: CustomProfileData = { username: user.username || "", globalName: pick(user.global_name, user.globalName) || "", bio: pick(profile.bio, user.bio) || "", pronouns: profile.pronouns || "", copiedUserId: userId,
        badgeFlags: Number(pick(user.public_flags, user.publicFlags) ?? 0), avatar: "", banner: "", accentColor: undefined, accentColor2: undefined, nitro: false, nitroLevel: -1, nitroSince: "", boostMonths: -1, giftLevel: -1,
        customBadgeIds: [], oldName: "", decorationAsset: "", decorationSkuId: "", nameplate: null, profileEffect: null, profileFrame: null, displayNameStyles: null, serverTag: null };
    if (user.avatar) data.avatar = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${String(user.avatar).startsWith("a_") ? "gif" : "png"}?size=512`;
    const bannerId = pick(profile.banner, user.banner);
    if (bannerId) data.banner = `https://cdn.discordapp.com/banners/${userId}/${bannerId}.${String(bannerId).startsWith("a_") ? "gif" : "png"}?size=600`;
    const colors: number[] = (pick(profile.theme_colors, profile.themeColors) ?? []).filter((value: any) => typeof value === "number");
    if (colors.length) { data.accentColor = colors[0]; data.accentColor2 = colors[1] ?? colors[0]; }
    else if (typeof pick(profile.accent_color, user.accent_color) === "number") data.accentColor = pick(profile.accent_color, user.accent_color);
    try { data.createdAt = new Date(Number(BigInt(userId) >> 22n) + 1420070400000).toISOString().slice(0, 10); } catch { /* silent: invalid snowflake means no creation date */ }
    if (body?.premium_since || (body?.premium_type ?? 0) > 0) {
        data.nitro = true;
        data.nitroLevel = Math.max(0, tierFor(Math.max(0, monthsSince(body.premium_since)), NITRO_TIER_MONTHS));
        if (body.premium_since) data.nitroSince = String(body.premium_since).slice(0, 10);
    }
    if (body?.premium_guild_since) data.boostMonths = Math.max(0, tierFor(monthsSince(body.premium_guild_since), BOOST_TIER_MONTHS));
    const decoration = pick(user.avatar_decoration_data, user.avatarDecorationData);
    if (decoration?.asset) { data.decorationAsset = decoration.asset; data.decorationSkuId = String(pick(decoration.sku_id, decoration.skuId) ?? ""); }
    const nameplate = user.collectibles?.nameplate;
    if (nameplate?.asset) data.nameplate = { skuId: String(pick(nameplate.sku_id, nameplate.skuId) ?? ""), asset: nameplate.asset, label: nameplate.label, palette: nameplate.palette };
    const effectSku = pick(profile.profile_effect?.sku_id, profile.profileEffect?.skuId);
    if (effectSku) data.profileEffect = { skuId: String(effectSku) };
    const styles = pick(user.display_name_styles, user.displayNameStyles);
    if (styles && (typeof pick(styles.font_id, styles.fontId) === "number")) data.displayNameStyles = { fontId: pick(styles.font_id, styles.fontId) || 11, effectId: pick(styles.effect_id, styles.effectId) || 1, colors: Array.isArray(styles.colors) ? styles.colors : [] };
    const guild = pick(user.primary_guild, user.primaryGuild);
    const tagGuild = pick(guild?.identity_guild_id, guild?.identityGuildId);
    if (guild?.tag && tagGuild && guild.badge) data.serverTag = { tag: guild.tag, guildId: String(tagGuild), badge: guild.badge };
    if (Array.isArray(body?.badges) && body.badges.length) applyDiscordBadges(data, body.badges);
    return data;
}

// A user ID, an @mention, a profile link, or the username of someone Discord has loaded.
function resolveCopyTarget(text: string): string | null {
    const value = text.trim();
    const id = value.match(/\d{15,22}/)?.[0];
    if (id) return id;
    const name = value.replace(/^@/, "").toLowerCase();
    if (!name) return null;
    const users = Object.values(UserStore.getUsers() ?? {}) as any[];
    return (users.find(user => user?.username?.toLowerCase() === name) ?? users.find(user => user?.globalName?.toLowerCase() === name))?.id ?? null;
}

function CopyProfileSection({ onCopy }: { onCopy: (data: CustomProfileData) => void; }) {
    const [query, setQuery] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const target = resolveCopyTarget(query);
    const both = !!target && hasCloudCordProfile(target);
    const copy = async (source: "discord" | "cloudcord" = "discord") => {
        if (busy || !query.trim()) return;
        if (!target) { setError("Couldn't find that person. Use their user ID (right-click them → Copy User ID), or the username of someone you share a server with."); return; }
        setBusy(true); setError("");
        try {
            const data = await buildCopiedProfile(target, source);
            onCopy(data);
            showToast(`Copied ${data.globalName || data.username}. Press Save to use it.`, Toasts.Type.SUCCESS);
        } catch (problem: any) { setError(problem?.message || "Couldn't copy that profile."); }
        finally { setBusy(false); }
    };
    return <Section title="Copy someone's profile" description="Fill this editor with another person's profile: names, pictures, colours, name style, badges, Nitro, decoration and more. Nothing is saved until you press Save.">
        <div className="cpx-inline">
            <input className="cpx-input" value={query} placeholder="User ID, @username or profile link" onChange={event => { setQuery(event.currentTarget.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter") void copy(); }} />
            <button type="button" className="cpx-btn" disabled={!query.trim() || busy} onClick={() => void copy("discord")}>{busy ? "Copying…" : both ? "Copy Discord profile" : "Copy profile"}</button>
            {both && <button type="button" className="cpx-btn cpx-btn-primary" disabled={busy} onClick={() => void copy("cloudcord")}>Copy CloudCord profile</button>}
        </div>
        {error && <span className="cpx-hint cpx-error" role="alert">{error}</span>}
        {both && <span className="cpx-hint">This person uses CloudCord. Copy their real Discord profile, or the custom profile they show with CloudCord.</span>}
    </Section>;
}


// ---- Tag next to your name in chat, only on this device (never synced) ----
const LS_LOCAL_TAG = "cloudcord_local_tag";
// Discord's tag types: 0 App, 1 Server, 2 System, 3 Official, 7 AI.
const LOCAL_TAG_OPTIONS = [{ value: -1, label: "None" }, { value: 0, label: "App" }, { value: 3, label: "Official" }, { value: 2, label: "System" }, { value: 7, label: "AI" }, { value: 1, label: "Server" }];
let localNameTag: number | null = (() => { try { const value = localStorage.getItem(LS_LOCAL_TAG); return value != null && LOCAL_TAG_OPTIONS.some(option => option.value === Number(value) && option.value >= 0) ? Number(value) : null; } catch { return null; } })();
function LocalTagSection() {
    const [value, setValue] = React.useState(localNameTag ?? -1);
    return <Section title="Tag next to your name" description="Shows a Discord tag after your name on your messages. Only on this device: it is never synced, so nobody else sees it.">
        <SelectField label="Tag" options={LOCAL_TAG_OPTIONS} value={value} onChange={next => {
            const tag = Number(next);
            localNameTag = tag >= 0 ? tag : null;
            try { if (localNameTag == null) localStorage.removeItem(LS_LOCAL_TAG); else localStorage.setItem(LS_LOCAL_TAG, String(localNameTag)); } catch (e) { logger.warn("Saving local tag failed", e); }
            setValue(tag);
            forceAccountPanelRerender();
        }} />
    </Section>;
}
