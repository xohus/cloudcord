/*
 * CloudCord, a Discord desktop client mod
 * Copyright (c) 2026 Xohus
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ProfileBadge } from "@api/Badges";
import { CloudCordProfileKey, CloudCordSharedProfile, fetchCloudCordProfile, findProfileId, publishCloudCordProfile, withProfileMarker } from "@api/CloudCordProfiles";
import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { DataStore } from "@api/index";
import { ModalCloseButton as _ModalCloseButton, ModalContent as _ModalContent, ModalFooter as _ModalFooter, ModalHeader as _ModalHeader, ModalRoot as _ModalRoot, openModal } from "@utils/modal";

const ModalRoot = _ModalRoot as any;
const ModalHeader = _ModalHeader as any;
const ModalContent = _ModalContent as any;
const ModalFooter = _ModalFooter as any;
const ModalCloseButton = _ModalCloseButton as any;
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { AuthenticationStore, Button, FluxDispatcher, IconUtils, Menu, React, RestAPI, Select, SnowflakeUtils, UserStore } from "@webpack/common";


const DS_KEY = "customProfile_data";
const DS_ENABLED = "customProfile_enabled";
const DS_ALL_DATA = "customProfile_allData";
const DS_ALL_ENABLED = "customProfile_allEnabled";
const DS_SHARE_IDS = "CloudCord_sharedProfileIds";
const DS_MARKER_IDS = "CloudCord_installedProfileMarkers";
const LS_ALL_DATA = "CloudCord_FakeProfile_allData";
const LS_ALL_ENABLED = "CloudCord_FakeProfile_allEnabled";
const LS_KEY_DATA = "CloudCord_FakeProfile_data";
const LS_KEY_ENABLED = "CloudCord_FakeProfile_enabled";
const LEGACY_LS_ALL_DATA = "SincordCP_allData";
const LEGACY_LS_ALL_ENABLED = "SincordCP_allEnabled";
const LEGACY_LS_KEY_DATA = "SincordCP_data";
const LEGACY_LS_KEY_ENABLED = "SincordCP_enabled";

const FLAG = {
    STAFF: 1, PARTNER: 2, HYPESQUAD: 4, BUG_HUNTER_1: 8,
    BRAVERY: 64, BRILLIANCE: 128, BALANCE: 256, EARLY_SUPPORTER: 512,
    BUG_HUNTER_2: 16384, DEV_VERIFIED: 131072, MOD_ALUMNI: 262144, ACTIVE_DEVELOPER: 4194304,
};

const BADGES = [
    { label: "Discord Staff", flag: FLAG.STAFF, icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png" },
    { label: "Partner", flag: FLAG.PARTNER, icon: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png" },
    { label: "HypeSquad Events", flag: FLAG.HYPESQUAD, icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png" },
    { label: "Bug Hunter Lvl 1", flag: FLAG.BUG_HUNTER_1, icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png" },
    { label: "HypeSquad Bravery", flag: FLAG.BRAVERY, icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png" },
    { label: "HypeSquad Brilliance", flag: FLAG.BRILLIANCE, icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png" },
    { label: "HypeSquad Balance", flag: FLAG.BALANCE, icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png" },
    { label: "Early Supporter", flag: FLAG.EARLY_SUPPORTER, icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png" },
    { label: "Former Moderator", flag: FLAG.MOD_ALUMNI, icon: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png" },
    { label: "Bug Hunter Lvl 2", flag: FLAG.BUG_HUNTER_2, icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png" },
    { label: "Verified Developer", flag: FLAG.DEV_VERIFIED, icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png" },
    { label: "Active Developer", flag: FLAG.ACTIVE_DEVELOPER, icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png" },
];

const OLD_NAME_BADGE_ICON = "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png";
const NITRO_LEVELS = [
    { label: "Nitro (0 months)", icon: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png" },
    { label: "Bronze (1 month)", icon: "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png" },
    { label: "Silver (2 months)", icon: "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png" },
    { label: "Gold (3 months)", icon: "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png" },
    { label: "Platinum (6 months)", icon: "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png" },
    { label: "Diamond (12 months)", icon: "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png" },
    { label: "Emerald (24 months)", icon: "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png" },
    { label: "Ruby (36 months)", icon: "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png" },
    { label: "Opal (72 months)", icon: "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png" },
];
const BOOST_LABELS = ["1 Month", "2 Months", "3 Months", "6 Months", "9 Months", "12 Months", "15 Months", "18 Months", "24 Months"];
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
const AVATAR_DECORATIONS = [
    { id: "1144307957425778779", label: "Hearts" }, { id: "1144308196723408958", label: "Hearts Animated" },
    { id: "1212569433839636530", label: "Lofi Cafe" }, { id: "1481387347642810480", label: "Winter" },
    { id: "1343751617362661526", label: "Magic Orb" }, { id: "1373015260465987705", label: "Dragon" },
    { id: "1333866045303423026", label: "Ghost" }, { id: "1144308439720394944", label: "Sakura Drift" },
    { id: "1432550258126229565", label: "Neon" }, { id: "1462116613632426014", label: "Cyber City" },
    { id: "1462116613682757888", label: "Retro" }, { id: "1144307629225672846", label: "Fire" },
    { id: "1341506443718688768", label: "Void" }, { id: "1447654090640330763", label: "Celestial" },
    { id: "1483857762890022923", label: "Snowy" }, { id: "1479561706672885811", label: "Ice" },
    { id: "1212569856189407352", label: "Cozy" }, { id: "1485784028710830242", label: "New Year" },
    { id: "1341506444150702080", label: "Abyss" }, { id: "1232071712695386162", label: "Spring" },
    { id: "1220514048068812901", label: "Summer" }, { id: "1427463138634109026", label: "Autumn" },
    { id: "1341506443865489408", label: "Darkness" },
];

function getDecorationUrl(assetId: string, animated = false): string {
    return /^\d+$/.test(assetId)
        ? `https://cdn.discordapp.com/media/v1/collectibles-shop/${assetId}/${animated ? "animated" : "static"}`
        : `https://cdn.discordapp.com/avatar-decoration-presets/${assetId}.png?size=96&passthrough=${animated}`;
}

function discoverDiscordDecorations() {
    const found = new Map(AVATAR_DECORATIONS.map(decoration => [decoration.id, decoration]));
    const visited = new Set<unknown>();
    const visit = (value: any, depth = 0, label = "Discord decoration") => {
        if (!value || depth > 6 || visited.has(value)) return;
        if (typeof value === "object") visited.add(value);
        if (Array.isArray(value)) { value.forEach(item => visit(item, depth + 1, label)); return; }
        if (typeof value !== "object") return;
        const nextLabel = typeof value.name === "string" ? value.name : typeof value.title === "string" ? value.title : label;
        const decoration = value.avatarDecoration || value.avatar_decoration || value.decoration;
        const asset = decoration?.asset || value.avatarDecorationData?.asset;
        if (typeof asset === "string" && asset.length > 8) found.set(asset, { id: asset, label: nextLabel });
        for (const [key, child] of Object.entries(value)) if (!key.toLowerCase().includes("description")) visit(child, depth + 1, nextLabel);
    };
    try {
        const webpack = (window as any).Vencord?.Webpack;
        const candidates = [
            webpack?.findByProps?.("getCollectiblesCategories"),
            webpack?.findByProps?.("getCategories", "getProducts"),
            webpack?.findByProps?.("getCollectibles", "getSku")
        ];
        for (const store of candidates) {
            if (!store) continue;
            for (const method of ["getCollectiblesCategories", "getCategories", "getProducts", "getCollectibles"]) {
                try { if (typeof store[method] === "function") visit(store[method](), 0); } catch { }
            }
        }
        visit(UserStore.getCurrentUser(), 0, "Current decoration");
    } catch { }
    return [...found.values()];
}

interface CustomProfileData extends CloudCordSharedProfile {
    username?: string; globalName?: string; avatar?: string; banner?: string;
    bio?: string; accentColor?: number; accentColor2?: number; pronouns?: string;
    badgeFlags?: number; createdAt?: string; nitro?: boolean; nitroLevel?: number;
    boostMonths?: number; email?: string; phone?: string; customBadgeIds?: string[];
    oldName?: string; decorationAsset?: string; copiedUserId?: string; signupDate?: string;
    hideRealBadges?: boolean;
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
const sharedProfiles = new Map<string, { id: string; data: CustomProfileData; }>();
const sharedProfileRequests = new Map<string, Promise<void>>();

function saveDataSync(data: CustomProfileData, enabled: boolean) {
    try { localStorage.setItem(LS_KEY_DATA, JSON.stringify(data)); localStorage.setItem(LS_KEY_ENABLED, enabled ? "1" : "0"); } catch { }
}
function saveAllDataSync() {
    try { localStorage.setItem(LS_ALL_DATA, JSON.stringify(allAccountsData)); localStorage.setItem(LS_ALL_ENABLED, JSON.stringify(allAccountsEnabled)); } catch { }
}
function syncCurrentUserData() {
    const myId = _cachedMyId || AuthenticationStore?.getId?.();
    if (myId) { _cachedMyId = myId; storedData = allAccountsData[myId] || {}; isEnabled = allAccountsEnabled[myId] || false; }
}
function loadDataSync() {
    try {
        const rawAll = localStorage.getItem(LS_ALL_DATA) || localStorage.getItem(LEGACY_LS_ALL_DATA);
        if (rawAll) {
            try { allAccountsData = JSON.parse(rawAll); } catch { allAccountsData = {}; }
            const rawEnabled = localStorage.getItem(LS_ALL_ENABLED) || localStorage.getItem(LEGACY_LS_ALL_ENABLED);
            try { allAccountsEnabled = rawEnabled ? JSON.parse(rawEnabled) : {}; } catch { allAccountsEnabled = {}; }
            syncCurrentUserData(); return;
        }
        const raw = localStorage.getItem(LS_KEY_DATA) || localStorage.getItem(LEGACY_LS_KEY_DATA);
        const en = localStorage.getItem(LS_KEY_ENABLED) || localStorage.getItem(LEGACY_LS_KEY_ENABLED);
        if (raw) { try { storedData = JSON.parse(raw); } catch { storedData = {}; } } else storedData = {};
        isEnabled = en === "1";
    } catch { storedData = {}; isEnabled = false; }
}
function onAccountSwitch() {
    updateCachedRealData(); syncCurrentUserData();
    cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
    _realUsername = ""; _realGlobalName = ""; _cachedRealDateVariants = null;
    if (isEnabled) startDomObserver(); else stopDomObserver();
    forceAccountPanelRerender();
}
loadDataSync();

function isMe(userId: string | null | undefined): boolean {
    if (!userId) return false;
    if (_cachedMyId) return _cachedMyId === userId;
    try { const myId = AuthenticationStore?.getId?.(); if (myId) { _cachedMyId = myId; return myId === userId; } } catch { }
    return false;
}
function updateCachedRealData() {
    try { const myId = AuthenticationStore?.getId?.(); if (myId) _cachedMyId = myId; } catch { }
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
    if (replaced && result !== node.nodeValue) { if ((node as any).__cp_orig === undefined) (node as any).__cp_orig = val; node.nodeValue = result; }
}
function scanNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) { scanTextNode(node as Text); return; }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) scanTextNode(n as Text);
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
        FluxDispatcher.dispatch({ type: "USER_SETTINGS_PROTO_UPDATE", settings: { type: 1, proto: {} } });
        if (isEnabled) startDomObserver(); else stopDomObserver();
    } catch { }
}

function sharedForUser(userId: string | null | undefined) {
    return userId ? sharedProfiles.get(userId)?.data : undefined;
}

function requestSharedProfile(userId: string, bio?: string | null) {
    const id = findProfileId(bio);
    if (!id) { sharedProfiles.delete(userId); return; }
    if (sharedProfiles.get(userId)?.id === id || sharedProfileRequests.has(`${userId}:${id}`)) return;
    const key = `${userId}:${id}`;
    const request = fetchCloudCordProfile(id).then(data => {
        sharedProfiles.set(userId, { id, data });
        forceAccountPanelRerender();
    }).catch(error => console.warn("[CloudCord] Could not load shared profile", error)).finally(() => sharedProfileRequests.delete(key));
    sharedProfileRequests.set(key, request);
}

function cloneUserWithProfile(user: any, data: CustomProfileData) {
    if (!user || !data) return user;
    const clone = Object.assign(Object.create(Object.getPrototypeOf(user)), user);
    if (data.username) clone.username = data.username;
    if (data.globalName) { clone.globalName = data.globalName; clone.displayName = data.globalName; }
    if (data.decorationAsset) { clone.avatarDecoration = null; clone.avatarDecorationData = { asset: data.decorationAsset, skuId: data.decorationAsset }; }
    if (data.hideRealBadges) { clone.publicFlags = 0; clone.flags = 0; }
    else if (data.badgeFlags != null) { clone.publicFlags = data.badgeFlags; clone.flags = data.badgeFlags; }
    if (data.nitro) clone.premiumType = 2;
    return clone;
}

function mergeProfile(profile: any, data: CustomProfileData) {
    if (!profile || !data) return profile;
    const merged: any = {};
    if (data.bio != null) merged.bio = data.bio;
    if (data.pronouns != null) merged.pronouns = data.pronouns;
    if (data.accentColor != null) merged.accentColor = data.accentColor;
    if (data.banner) merged.banner = data.banner;
    if (data.signupDate) { try { merged.joinedAt = new Date(data.signupDate + "T12:00:00Z"); } catch { } }
    if (data.decorationAsset) { merged.avatarDecoration = null; merged.avatarDecorationData = { asset: data.decorationAsset, skuId: data.decorationAsset }; }
    if (data.nitro) {
        merged.premiumType = 2;
        if (data.accentColor != null) merged.themeColors = [data.accentColor, data.accentColor2 ?? data.accentColor];
        const levelMonths = [1, 2, 3, 6, 12, 24, 36, 72];
        const since = new Date(); since.setMonth(since.getMonth() - (levelMonths[data.nitroLevel ?? 0] ?? 1)); merged.premiumSince = since;
        const boostMonths = [1, 2, 3, 6, 9, 12, 15, 18, 24];
        if ((data.boostMonths ?? -1) >= 0) { const boostSince = new Date(); boostSince.setMonth(boostSince.getMonth() - (boostMonths[data.boostMonths!] ?? 1)); merged.premiumGuildSince = boostSince; }
    }
    merged.publicFlags = data.hideRealBadges ? 0 : (data.badgeFlags != null ? data.badgeFlags : profile.publicFlags);
    return Object.assign(Object.create(Object.getPrototypeOf(profile)), profile, merged);
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
                        try { const avatarUrl = IconUtils?.getUserAvatarURL?.(targetUser, false, 512); if (avatarUrl) newData.avatar = avatarUrl; } catch { }
                        if (profile.banner ?? targetUser.banner) { const bid = profile.banner ?? targetUser.banner; newData.banner = `https://cdn.discordapp.com/banners/${user.id}/${bid}.${bid.startsWith("a_") ? "gif" : "png"}?size=512`; }
                        try { newData.createdAt = new Date(Number(BigInt(user.id) >> 22n) + 1420070400000).toISOString().slice(0, 10); } catch { }
                        if (targetUser.avatarDecorationData?.asset) newData.decorationAsset = targetUser.avatarDecorationData.asset;
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
    return (<div className="cp-toggle-row" onClick={() => onChange(!checked)}>
        <div className="cp-toggle-text"><span className="cp-toggle-label">{label}</span>{sublabel && <span className="cp-toggle-sub">{sublabel}</span>}</div>
        <div className={`cp-toggle ${checked ? "cp-toggle-on" : ""}`}><div className="cp-toggle-thumb" /></div>
    </div>);
}
function BadgeBtn({ label, icon, active, onClick }: { label: string; icon?: string; active: boolean; onClick: () => void; }) {
    return (<button onClick={onClick} className={`cp-badge ${active ? "cp-badge-on" : ""}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <img src={icon} alt="" style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />}<span>{label}</span>
    </button>);
}
function BadgePicker({ selected, onChange, nitroType, onNitroType, boostLevel, onBoostLevel, customIds, onCustomIds, oldName, onOldName, hideRealBadges, onHideRealBadges }: {
    selected: number; onChange: (v: number) => void; nitroType: number; onNitroType: (v: number) => void;
    boostLevel: number; onBoostLevel: (v: number) => void; customIds: string[]; onCustomIds: (v: string[]) => void; oldName: string; onOldName: (v: string) => void;
    hideRealBadges: boolean; onHideRealBadges: (v: boolean) => void;
}) {
    const hasOldName = customIds.includes("oldname");
    return (<div className="cp-field">
        <div className="cp-section-label">Badges</div>
        <Toggle label="Hide real Discord badges" checked={hideRealBadges} onChange={onHideRealBadges} sublabel="Keeps your selected fake badges visible." />
        <div className="cp-badges" style={{ marginTop: 8 }}>{BADGES.map(b => <BadgeBtn key={b.flag} label={b.label} icon={b.icon} active={!!(selected & b.flag)} onClick={() => onChange(selected ^ b.flag)} />)}</div>
        <div className="cp-section-label" style={{ marginTop: 8 }}>Evolving Nitro Badge</div>
        <div className="cp-badges">
            <BadgeBtn label="None" active={nitroType === -1} onClick={() => onNitroType(-1)} />
            {NITRO_LEVELS.map((n, i) => <BadgeBtn key={i} label={n.label} icon={n.icon} active={nitroType === i} onClick={() => { onNitroType(i); if (i >= 1) onNitroType(i); }} />)}
        </div>
        <div className="cp-section-label" style={{ marginTop: 8 }}>Special Badges</div>
        <div className="cp-badges">
            <BadgeBtn label="Completed a quest" icon="https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png" active={customIds.includes("quest")} onClick={() => onCustomIds(customIds.includes("quest") ? customIds.filter(x => x !== "quest") : [...customIds, "quest"])} />
            <BadgeBtn label="Orbs  -  Apprentice" icon="https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png" active={customIds.includes("orbs")} onClick={() => onCustomIds(customIds.includes("orbs") ? customIds.filter(x => x !== "orbs") : [...customIds, "orbs"])} />
            <BadgeBtn label="Old username" icon={OLD_NAME_BADGE_ICON} active={hasOldName} onClick={() => onCustomIds(hasOldName ? customIds.filter(x => x !== "oldname") : [...customIds, "oldname"])} />
        </div>
        {hasOldName && <div className="cp-field" style={{ marginTop: 6 }}><div className="cp-section-label">Old username displayed in tooltip</div><input className="cp-input" value={oldName} placeholder="OldUser#0000" onChange={e => onOldName(e.target.value)} /></div>}
        <div className="cp-section-label" style={{ marginTop: 8 }}>Boost Badge (Server Booster)</div>
        <div className="cp-badges">
            <BadgeBtn label="None" active={boostLevel === -1} onClick={() => onBoostLevel(-1)} />
            {BOOST_LABELS.map((lbl, i) => <BadgeBtn key={i} label={lbl} icon={BOOST_ICONS[i]} active={boostLevel === i} onClick={() => onBoostLevel(i)} />)}
        </div>
    </div>);
}


function CustomProfileModal({ rootProps }: { rootProps: any; }) {
    const myId = AuthenticationStore?.getId?.() || "";
    const [selectedAccountId, setSelectedAccountId] = React.useState(myId);
    const [data, setData] = React.useState<CustomProfileData>(() => ({ ...(allAccountsData[myId] || storedData || {}) }));
    const [saving, setSaving] = React.useState(false);
    const [shareStatus, setShareStatus] = React.useState("");
    const publishVersion = React.useRef(0);
    const [decorationSearch, setDecorationSearch] = React.useState("");
    const nitroLevel = data.nitroLevel ?? -1;
    const boostLevel = data.boostMonths ?? -1;
    const customIds = data.customBadgeIds ?? [];
    const oldName = data.oldName ?? "";
    const decorations = React.useMemo(() => discoverDiscordDecorations().filter(decoration => decoration.label.toLowerCase().includes(decorationSearch.toLowerCase()) || decoration.id.includes(decorationSearch)), [decorationSearch]);

    const accounts = React.useMemo(() => {
        try {
            const MAS = (window as any).Vencord?.Webpack?.findByProps?.("getUsers", "getValidUsers");
            if (MAS?.getUsers) { const users = MAS.getUsers(); if (Array.isArray(users) && users.length > 0) return users; }
        } catch { }
        const me = UserStore.getCurrentUser(); return me ? [me] : [];
    }, []);

    React.useEffect(() => { setData({ ...(allAccountsData[selectedAccountId] || {}) }); }, [selectedAccountId]);

    function set<K extends keyof CustomProfileData>(key: K, val: CustomProfileData[K]) { setData(d => ({ ...d, [key]: val })); }

    async function persist(profile = data) {
        try {
            const savedData = { ...profile };
            allAccountsData[selectedAccountId] = savedData; allAccountsEnabled[selectedAccountId] = true;
            if (selectedAccountId === myId) {
                storedData = savedData; isEnabled = true; saveDataSync(storedData, true);
                cachedFakeUser = null; cachedOriginalUser = null; _dataVersion++;
            }
            saveAllDataSync();
            DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
            updateCachedRealData(); forceAccountPanelRerender();
        } catch (err) { console.error("[CloudCord] profile save error:", err); }
    }

    async function persistAndPublish(profile = data, close = false) {
        const version = ++publishVersion.current;
        await persist(profile);
        const keys = await DataStore.get<Record<string, CloudCordProfileKey | string>>(DS_SHARE_IDS) ?? {};
        const savedKey = keys[selectedAccountId];
        const key = typeof savedKey === "object" && savedKey?.id && savedKey?.editToken ? savedKey : undefined;
        const { id, editToken, marker } = await publishCloudCordProfile(profile, key);
        if (!key) {
            keys[selectedAccountId] = { id, editToken };
            await DataStore.set(DS_SHARE_IDS, keys);
        }
        const installed = await DataStore.get<Record<string, string>>(DS_MARKER_IDS) ?? {};
        if (selectedAccountId === myId && installed[selectedAccountId] !== id) {
            const response = await RestAPI.get({ url: `/users/${myId}/profile?with_mutual_guilds=false&with_mutual_friends_count=false` });
            const realBio = response?.body?.user_profile?.bio ?? response?.body?.bio ?? "";
            await RestAPI.patch({ url: "/users/@me/profile", body: { bio: withProfileMarker(realBio, id) } });
            installed[selectedAccountId] = id;
            await DataStore.set(DS_MARKER_IDS, installed);
        }
        if (version === publishVersion.current) setShareStatus(key
            ? "Saved and shared automatically."
            : "Saved and shared automatically. CloudCord connected it to your real profile for you.");
        if (close) rootProps.onClose();
    }

    React.useEffect(() => {
        const snapshot = { ...data };
        const version = publishVersion.current + 1;
        setShareStatus("Saving automatically...");
        const timer = window.setTimeout(() => {
            setSaving(true);
            persistAndPublish(snapshot).catch(error => {
                if (version >= publishVersion.current) setShareStatus(error instanceof Error ? error.message : String(error));
            }).finally(() => setSaving(false));
        }, 850);
        return () => window.clearTimeout(timer);
    }, [data, selectedAccountId]);

    async function reset() {
        delete allAccountsData[selectedAccountId]; delete allAccountsEnabled[selectedAccountId];
        if (selectedAccountId === myId) {
            storedData = {}; isEnabled = false; saveDataSync({}, false);
            cachedFakeUser = null; cachedOriginalUser = null; _trueOriginalUser = null; _dataVersion++;
        }
        saveAllDataSync();
        DataStore.set(DS_ALL_DATA, allAccountsData).catch(() => { }); DataStore.set(DS_ALL_ENABLED, allAccountsEnabled).catch(() => { });
        DataStore.set(DS_KEY, {}).catch(() => { }); DataStore.set(DS_ENABLED, false).catch(() => { });
        forceAccountPanelRerender(); rootProps.onClose();
    }

    const accentHex = data.accentColor != null ? "#" + data.accentColor.toString(16).padStart(6, "0") : "";
    const accent2Hex = data.accentColor2 != null ? "#" + data.accentColor2.toString(16).padStart(6, "0") : "";

    return (<ModalRoot {...rootProps} size="medium">
        <ModalHeader separator={false}>
            <div className="cp-header"><EditIcon size={16} /><span className="cp-header-title">CloudCord Fake Profile</span></div>
            <div style={{ marginLeft: "auto", marginRight: 8, minWidth: 200 }}>
                <Select
                    options={accounts.map((acc: any) => ({ value: acc.id, label: acc.globalName || acc.username }))}
                    isSelected={(v: string) => v === selectedAccountId}
                    select={(v: string) => setSelectedAccountId(v)}
                    serialize={(v: string) => v}
                    renderOptionLabel={(o: any) => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={IconUtils.getUserAvatarURL(accounts.find((a: any) => a.id === o.value), false, 20)} style={{ borderRadius: "50%", width: 20, height: 20 }} />{o.label}</div>}
                    renderOptionValue={(selected: any[]) => { const option = selected[0]; if (!option) return <span>Select Account</span>; return <div style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={IconUtils.getUserAvatarURL(accounts.find((a: any) => a.id === option.value), false, 20)} style={{ borderRadius: "50%", width: 20, height: 20 }} />{option.label}</div>; }}
                />
            </div>
            <ModalCloseButton onClick={rootProps.onClose} />
        </ModalHeader>

        <ModalContent className="cp-content">
            <Field label="Username" value={data.username ?? ""} placeholder="my_username" onChange={v => set("username", v)} />
            <Field label="Display Name" value={data.globalName ?? ""} placeholder="My Name" onChange={v => set("globalName", v)} />
            <ImageUpload label="Profile Picture" value={data.avatar ?? ""} onChange={v => set("avatar", v)} />
            <Toggle label="Simulate Nitro" sublabel="Enables banner and profile color" checked={data.nitro ?? false} onChange={v => set("nitro", v)} />
            {data.nitro && <ImageUpload label="Banner" value={data.banner ?? ""} onChange={v => set("banner", v)} />}
            <div className="cp-divider" />
            <Field label="Bio" value={data.bio ?? ""} placeholder="My description..." onChange={v => set("bio", v)} />
            <Field label="Pronouns" value={data.pronouns ?? ""} placeholder="he/him" onChange={v => set("pronouns", v)} />
            <div className="cp-field">
                <div className="cp-section-label">Profile color (Nitro  -  gradient possible)</div>
                <div className="cp-color-row" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>Color 1</span>
                    <input type="color" value={accentHex || "#5865f2"} className="cp-color-swatch" onChange={e => { const n = parseInt(e.target.value.replace("#", ""), 16); if (!isNaN(n)) set("accentColor", n); }} />
                    <input value={accentHex} placeholder="#5865f2" className="cp-input cp-color-input" onChange={e => { const h = e.target.value.replace("#", ""); const n = parseInt(h, 16); if (!isNaN(n) && h.length === 6) set("accentColor", n); else if (!e.target.value || e.target.value === "#") set("accentColor", undefined); }} />
                    {data.accentColor != null && <button className="cp-clear-btn" onClick={() => set("accentColor", undefined)}><CloseIcon /></button>}
                </div>
                <div className="cp-color-row">
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>Color 2</span>
                    <input type="color" value={accent2Hex || "#eb459e"} className="cp-color-swatch" onChange={e => { const n = parseInt(e.target.value.replace("#", ""), 16); if (!isNaN(n)) set("accentColor2", n); }} />
                    <input value={accent2Hex} placeholder="#eb459e (optional)" className="cp-input cp-color-input" onChange={e => { const h = e.target.value.replace("#", ""); const n = parseInt(h, 16); if (!isNaN(n) && h.length === 6) set("accentColor2", n); else if (!e.target.value || e.target.value === "#") set("accentColor2", undefined); }} />
                    {data.accentColor2 != null && <button className="cp-clear-btn" onClick={() => set("accentColor2", undefined)}><CloseIcon /></button>}
                </div>
            </div>
            <Field label="Account creation date" value={data.createdAt ?? ""} placeholder="2010-06-29" type="date" onChange={v => set("createdAt", v)} />
            <Field label="Signup date (shown in profile)" value={data.signupDate ?? ""} placeholder="2010-06-29" type="date" onChange={v => set("signupDate", v)} />
            <div className="cp-divider" />
            <BadgePicker selected={data.badgeFlags ?? 0} onChange={v => set("badgeFlags", v)} nitroType={nitroLevel} onNitroType={v => { set("nitroLevel", v); if (v >= 1) set("nitro", true); }} boostLevel={boostLevel} onBoostLevel={v => set("boostMonths", v)} customIds={customIds} onCustomIds={v => set("customBadgeIds", v)} oldName={oldName} onOldName={v => set("oldName", v)} hideRealBadges={!!data.hideRealBadges} onHideRealBadges={v => set("hideRealBadges", v)} />
            <div className="cp-divider" />
            <div className="cp-section-label">Avatar decoration</div>
            <input className="cp-input" value={decorationSearch} placeholder="Search built-in and Discord catalog decorations..." onChange={event => setDecorationSearch(event.target.value)} style={{ marginBottom: 8 }} />
            <div className="cp-badges" style={{ flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => set("decorationAsset", undefined)} className={`cp-badge ${!data.decorationAsset ? "cp-badge-on" : ""}`} style={{ minWidth: 60 }}>None</button>
                {decorations.map(dec => (
                    <button key={dec.id} onClick={() => set("decorationAsset", data.decorationAsset === dec.id ? undefined : dec.id)} className={`cp-badge ${data.decorationAsset === dec.id ? "cp-badge-on" : ""}`} title={dec.label} style={{ padding: 3, lineHeight: 0, width: 52, height: 52, borderRadius: 6 }}>
                        <img src={getDecorationUrl(dec.id)} alt={dec.label} style={{ width: 46, height: 46, objectFit: "contain", display: "block" }} />
                    </button>
                ))}
            </div>
            <div className="cp-hint">Includes CloudCord presets plus decorations discovered from Discord's current collectibles catalog. You can still paste any asset ID below.</div>
            <Field label="Custom decoration asset ID" value={data.decorationAsset ?? ""} placeholder="Paste any Discord collectible asset ID" onChange={v => set("decorationAsset", v || undefined)} />
            <div className="cp-share-card">
                <strong>Automatic CloudCord sharing</strong>
                <span>Every editor change is saved and published automatically. CloudCord maintains the invisible profile link in your real About Me without changing its visible text.</span>
                {shareStatus && <div className="cp-share-status">{shareStatus}</div>}
            </div>
        </ModalContent>

        <ModalFooter className="cp-footer">
            <button className="cp-btn cp-btn-danger" onClick={reset}><TrashIcon /><span>Reset</span></button>
            <button className="cp-btn cp-btn-primary" onClick={() => { setSaving(true); persistAndPublish(data, true).catch(error => setShareStatus(error instanceof Error ? error.message : String(error))).finally(() => setSaving(false)); }} disabled={saving}><span>{saving ? "Finishing..." : "Done"}</span></button>
        </ModalFooter>
    </ModalRoot>);
}

function CustomProfileButton() {
    return <HeaderBarButton icon={() => <EditIcon size={18} />} tooltip="Custom Profile" onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)} />;
}

export default definePlugin({
    name: "FakeProfile",
    enabledByDefault: true,
    description: "Create a complete custom profile that saves and shares automatically with other CloudCord users.",
    authors: [Devs.Xohus],
    dependencies: ["HeaderBarAPI", "ContextMenuAPI"],

    patches: [
        { find: ':"SHOULD_LOAD");', replacement: { match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/, replace: "$self.patchBannerUrl(arguments[0])||$&" } },
        { find: ".WIDGETS_RTC_UPSELL_COACHMARK)", replacement: { match: /currentUser:(\i)(?=.{0,200}voiceDb)/, replace: "currentUser:$self.fakeCurrentUser($1)" } },
        { find: "DISPLAY_NAME", noWarn: true, replacement: { match: /(?<=currentUser:\i,user:)(\i)/, replace: "$self.fakeCurrentUser($1)" } },
        { find: "obfuscatedEmail", noWarn: true, replacement: [{ match: /obfuscatedEmail:(\i)/, replace: "obfuscatedEmail:$self.fakeObfuscatedEmail($1)" }, { match: /obfuscatedPhone:(\i)/, replace: "obfuscatedPhone:$self.fakeObfuscatedPhone($1)" }] },
        { find: "isHoveringOrFocusing", replacement: { noWarn: true, match: /user:([A-Za-z_$][\w$]*),displayProfile:([A-Za-z_$][\w$]*),themeType/, replace: "user:$self.fakeCurrentUser($1),displayProfile:$2,themeType" } },
        { find: "AccountPanel", replacement: { match: /user:([a-zA-Z0-9_]+),/, replace: "user:$self.fakeCurrentUser($1)," } },
        { find: "UserAccountSettings", replacement: [{ match: /user:([a-zA-Z0-9_]+),/, replace: "user:$self.fakeCurrentUser($1)," }, { match: /email:([^,}]+),/, replace: "email:$self.fakeObfuscatedEmail($1)," }] },
    ],

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
        if (storedData.decorationAsset) { clone.avatarDecoration = null; clone.avatarDecorationData = { asset: storedData.decorationAsset, skuId: storedData.decorationAsset }; }
        const wantedFlags = storedData.hideRealBadges ? 0 : (storedData.badgeFlags != null ? storedData.badgeFlags : realUser.publicFlags);
        clone.publicFlags = wantedFlags; clone.flags = wantedFlags;
        if (storedData.nitro) {
            clone.premiumType = 2;
            const LEVEL_MONTHS = [1, 2, 3, 6, 12, 24, 36, 72];
            const since = new Date(); since.setMonth(since.getMonth() - (LEVEL_MONTHS[storedData.nitroLevel!] ?? 1)); clone.premiumSince = since;
            const bm = storedData.boostMonths ?? -1;
            if (bm >= 0) { const BOOST_M = [1, 2, 3, 6, 9, 12, 15, 18, 24]; const boostSince = new Date(); boostSince.setMonth(boostSince.getMonth() - (BOOST_M[bm] ?? 1)); clone.premiumGuildSince = boostSince; }
            else clone.premiumGuildSince = null;
        } else { clone.premiumType = 0; clone.premiumSince = null; clone.premiumGuildSince = null; }
        cachedOriginalUser = user; cachedFakeUser = clone; cachedDataHash = _dataVersion;
        return clone;
    },

    hookUserProfile(profile: any) {
        return isEnabled ? mergeProfile(profile, storedData) : profile;
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
    patchBannerUrl({ displayProfile }: any) {
        try {
            const userId = displayProfile?.userId;
            const data = isMe(userId) ? (isEnabled ? storedData : undefined) : sharedForUser(userId);
            return data?.nitro && data.banner ? data.banner : null;
        } catch { return null; }
    },

    toolboxActions: { "Open Fake Profile"() { openModal(props => <CustomProfileModal rootProps={props} />); } },
    _origGetUserAvatarURL: null as any,
    _origExtractTimestamp: null as any,

    userProfileBadges: [{
        getBadges({ userId }: { userId: string; guildId: string; }) {
            const data = isMe(userId) ? (isEnabled ? storedData : undefined) : sharedForUser(userId);
            if (!data) return [];
            const style = { borderRadius: "50%", width: "22px", height: "22px" };
            const nl = data.nitroLevel ?? -1; const bm = data.boostMonths ?? -1;
            const hasNitroFake = nl >= 0 && nl < NITRO_LEVELS.length; const hasBoostFake = bm >= 0 && bm < BOOST_ICONS.length;
            const f = data.badgeFlags ?? 0; const badges: ProfileBadge[] = [];
            if (f & FLAG.STAFF) badges.push({ id: "sp_staff", description: "Discord Staff", iconSrc: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png", position: 0, props: { style } });
            if (hasNitroFake) badges.push({ id: "sp_nitro", description: "Nitro Subscriber", iconSrc: NITRO_LEVELS[nl].icon, position: 0, props: { style } });
            if (f & FLAG.PARTNER) badges.push({ id: "sp_partner", description: "Partnered Server Owner", iconSrc: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png", position: 0, props: { style } });
            if (f & FLAG.MOD_ALUMNI) badges.push({ id: "sp_mod", description: "Discord Certified Moderator", iconSrc: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png", position: 0, props: { style } });
            if (f & FLAG.HYPESQUAD) badges.push({ id: "sp_hypesquad", description: "HypeSquad Events", iconSrc: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png", position: 0, props: { style } });
            if (f & FLAG.BRAVERY) badges.push({ id: "sp_bravery", description: "HypeSquad Bravery", iconSrc: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png", position: 0, props: { style } });
            if (f & FLAG.BRILLIANCE) badges.push({ id: "sp_brilliance", description: "HypeSquad Brilliance", iconSrc: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png", position: 0, props: { style } });
            if (f & FLAG.BALANCE) badges.push({ id: "sp_balance", description: "HypeSquad Balance", iconSrc: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png", position: 0, props: { style } });
            if (f & FLAG.BUG_HUNTER_1) badges.push({ id: "sp_bh1", description: "Bug Hunter Level 1", iconSrc: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png", position: 0, props: { style } });
            if (f & FLAG.BUG_HUNTER_2) badges.push({ id: "sp_bh2", description: "Bug Hunter Level 2", iconSrc: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png", position: 0, props: { style } });
            if (f & FLAG.DEV_VERIFIED) badges.push({ id: "sp_dev", description: "Early Verified Bot Developer", iconSrc: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png", position: 0, props: { style } });
            if (f & FLAG.ACTIVE_DEVELOPER) badges.push({ id: "sp_activedev", description: "Active Developer", iconSrc: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png", position: 0, props: { style } });
            if (f & FLAG.EARLY_SUPPORTER) badges.push({ id: "sp_early", description: "Early Supporter", iconSrc: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png", position: 0, props: { style } });
            if (hasBoostFake) badges.push({ id: "sp_boost", description: `Server Booster  -  ${BOOST_LABELS[bm]}`, iconSrc: BOOST_ICONS[bm], position: 0, props: { style } });
            if (data.customBadgeIds?.includes("oldname")) { const desc = data.oldName ? `Old username: ${data.oldName}` : "Old username"; badges.push({ id: "sp_oldname", description: desc, iconSrc: OLD_NAME_BADGE_ICON, position: 0, props: { style } }); }
            if (data.customBadgeIds?.includes("quest")) badges.push({ id: "sp_quest", description: "Completed a quest", iconSrc: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png", position: 0, props: { style } });
            if (data.customBadgeIds?.includes("orbs")) badges.push({ id: "sp_orbs", description: "Orbs  -  Apprentice", iconSrc: "https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png", position: 0, props: { style } });
            return badges;
        }
    } as ProfileBadge] as ProfileBadge[],

    async start() {
        addHeaderBarButton("profile-spoofer-btn", () => <CustomProfileButton />, 10);
        addContextMenuPatch("user-context", userContextMenuPatch);
        FluxDispatcher.subscribe("CONNECTION_OPEN", onAccountSwitch);

        try {
            const US = (Vencord as any).Webpack?.findByProps?.("getCurrentUser", "getUser");
            if (US && !US._cp_hook) {
                let _lastReal: any = null, _lastFake: any = null, _lastVer = -1;
                const origCurrent = US.getCurrentUser.bind(US);
                US.getCurrentUser = () => {
                    const real = origCurrent();
                    if (real) {
                        if (real !== _lastReal) { if (real.username) _realUsername = real.username; if (real.globalName) _realGlobalName = real.globalName; }
                        if (real === _lastReal && _lastVer === _dataVersion && _lastFake) return _lastFake;
                        _lastReal = real; _lastVer = _dataVersion; _lastFake = this.fakeCurrentUser(real);
                        return _lastFake;
                    }
                    return this.fakeCurrentUser(real);
                };
                const origGet = US.getUser.bind(US);
                US.getUser = (id: string) => {
                    const real = origGet(id);
                    if (isMe(id)) return this.fakeCurrentUser(real);
                    const shared = sharedForUser(id);
                    return shared ? cloneUserWithProfile(real, shared) : real;
                };
                US._cp_hook = true;
            }
        } catch { }

        try {
            const UPS = (Vencord as any).Webpack?.findByProps?.("getUserProfile", "getGuildMemberProfile");
            if (UPS && !UPS._cp_hook) {
                const origGet = UPS.getUserProfile.bind(UPS);
                UPS.getUserProfile = (uid: string) => {
                    try {
                        const p = origGet(uid);
                        if (isMe(uid)) return (isEnabled && p) ? this.hookUserProfile(p) : p;
                        requestSharedProfile(uid, p?.bio);
                        const shared = sharedForUser(uid);
                        return shared ? mergeProfile(p, shared) : p;
                    } catch { return origGet(uid); }
                };
                const origGuild = UPS.getGuildMemberProfile.bind(UPS);
                UPS.getGuildMemberProfile = (uid: string, gid: string) => {
                    try {
                        const p = origGuild(uid, gid);
                        if (isMe(uid)) return (isEnabled && p) ? this.hookUserProfile(p) : p;
                        requestSharedProfile(uid, p?.bio);
                        const shared = sharedForUser(uid);
                        return shared ? mergeProfile(p, shared) : p;
                    } catch { return origGuild(uid, gid); }
                };
                UPS._cp_hook = true;
            }
        } catch { }

        if (IconUtils?.getUserAvatarURL && !_avatarPatchApplied) {
            this._origGetUserAvatarURL = IconUtils.getUserAvatarURL;
            const orig = this._origGetUserAvatarURL;
            (IconUtils as any).getUserAvatarURL = (user: any, ...args: any[]) => {
                if (user?.id && isMe(user.id) && isEnabled && storedData.avatar) return storedData.avatar;
                const shared = sharedForUser(user?.id);
                if (shared?.avatar) return shared.avatar;
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
                const shared = sharedForUser(snowflake);
                if (shared?.signupDate) return new Date(shared.signupDate + "T12:00:00Z").getTime();
                if (shared?.createdAt) return new Date(shared.createdAt + "T12:00:00Z").getTime();
                return orig(snowflake);
            };
        }

        await loadData();
        updateCachedRealData();
        if (isEnabled) forceAccountPanelRerender();
    },

    stop() {
        removeHeaderBarButton("profile-spoofer-btn"); removeContextMenuPatch("user-context", userContextMenuPatch);
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", onAccountSwitch); stopDomObserver();
        if (this._origExtractTimestamp && SnowflakeUtils) { (SnowflakeUtils as any).extractTimestamp = this._origExtractTimestamp; this._origExtractTimestamp = null; }
        if (this._origGetUserAvatarURL && IconUtils) { (IconUtils as any).getUserAvatarURL = this._origGetUserAvatarURL; this._origGetUserAvatarURL = null; _avatarPatchApplied = false; }
    },

    settingsAboutComponent() { return <Button onClick={() => openModal(props => <CustomProfileModal rootProps={props} />)}>Open Fake Profile Editor</Button>; },
});

