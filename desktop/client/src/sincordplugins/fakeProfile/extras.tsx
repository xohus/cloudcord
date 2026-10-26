/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Device-only extras that live in the Custom Profile editor: Fake Nitro, a local
// fake Nitro gift link, local fake friend requests, leave all servers and a full reset.

import { logger } from "./logger";
import * as DataStore from "@api/DataStore";
import { findStoreLazy } from "@webpack";
import { Alerts, ChannelStore, Flux, FluxDispatcher, GuildMemberStore, GuildStore, OverridePremiumTypeStore, React, RelationshipStore, RestAPI, SelectedChannelStore, SelectedGuildStore, showToast, SnowflakeUtils, Toasts, UserStore } from "@webpack/common";

import { Grid2, Section, SelectField, Switch } from "./editorUi";

const LS_EXTRAS = "cloudcord_profile_extras";
const NITRO_APP_ID = "521842831262875670";
const NITRO_SKU = "521847234246082599";
const NITRO_BASIC_SKU = "978380684370378762";
// Discord's own plan IDs, so the embed shows the right product and length.
const GIFT_PLANS = [
    { id: "511651880837840896", label: "Nitro, 1 month", name: "Nitro Monthly", sku: NITRO_SKU, interval: 1, price: 999 },
    { id: "511651885459963904", label: "Nitro, 1 year", name: "Nitro Yearly", sku: NITRO_SKU, interval: 2, price: 9999 },
    { id: "978380692553465866", label: "Nitro Basic, 1 month", name: "Nitro Basic Monthly", sku: NITRO_BASIC_SKU, interval: 1, price: 299 },
    { id: "1024422698568122368", label: "Nitro Basic, 1 year", name: "Nitro Basic Yearly", sku: NITRO_BASIC_SKU, interval: 2, price: 2999 }
];
// Discord's gift box designs (PremiumGiftStyles).
const GIFT_STYLES = [
    { value: 4, label: "Standard box" }, { value: 2, label: "Box" }, { value: 1, label: "Snow globe" }, { value: 3, label: "Cup" },
    { value: 5, label: "Cake" }, { value: 6, label: "Chest" }, { value: 7, label: "Coffee" }, { value: 8, label: "Seasonal box" },
    { value: 9, label: "Seasonal cake" }, { value: 10, label: "Seasonal chest" }, { value: 11, label: "Seasonal coffee" }, { value: 12, label: "Nitroween" }
];
const INCOMING_REQUEST = 3;
const GuildMemberCountStore: any = findStoreLazy("GuildMemberCountStore");
const GuildRoleStore: any = findStoreLazy("GuildRoleStore");
const ChannelMemberStore: any = findStoreLazy("ChannelMemberStore");
const PresenceStore: any = findStoreLazy("PresenceStore");

// Roles of a server as a list, highest first. Discord renamed this getter a few times.
function rolesOf(guildId: string): any[] {
    let roles: any = null;
    try { roles = GuildRoleStore?.getUnsafeMutableRoles?.(guildId) ?? GuildRoleStore?.getRolesSnapshot?.(guildId) ?? GuildRoleStore?.getRoles?.(guildId); } catch { /* silent: called from render hooks; a missing getter means no roles */ }
    if (!roles) roles = (GuildStore.getGuild(guildId) as any)?.roles;
    return Object.values(roles ?? {}).filter((role: any) => role?.id && role.id !== guildId).sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0));
}

// Fake roles and booster status layered on your real member record. The colour,
// hoist and icon role follow the highest role, like Discord works it out.
const memberCache = new WeakMap<object, { key: string; value: any; }>();
function fakeMember(guildId: string, member: any) {
    const fake = boostFor(guildId);
    const extraRoles = (fake?.roles ?? []).filter(id => !member.roles?.includes(id));
    const booster = fake?.booster && !member.premiumSince;
    if (!extraRoles.length && !booster) return member;
    const key = extraRoles.join(",") + (booster ? "|b" : "");
    const hit = memberCache.get(member);
    if (hit && hit.key === key) return hit.value;
    const value: any = { ...member };
    if (booster) value.premiumSince = BOOST_SINCE.toISOString();
    if (extraRoles.length) {
        value.roles = [...(member.roles ?? []), ...extraRoles];
        const byId = new Map(rolesOf(guildId).map((role: any) => [role.id, role]));
        const mine = value.roles.map((id: string) => byId.get(id)).filter(Boolean).sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0));
        const colored = mine.find((role: any) => role.colorString || role.color);
        if (colored) { value.colorString = colored.colorString ?? value.colorString; value.colorStrings = colored.colorStrings ?? value.colorStrings; value.colorRoleId = colored.id; }
        const hoisted = mine.find((role: any) => role.hoist);
        if (hoisted) value.hoistRoleId = hoisted.id;
        const icon = mine.find((role: any) => role.icon || role.unicodeEmoji);
        if (icon) value.iconRoleId = icon.id;
        if (mine[0]) value.highestRoleId = mine[0].id;
    }
    memberCache.set(member, { key, value });
    return value;
}

interface CustomRole { id: string; name: string; color: string; hoist: boolean; emoji?: string; admin?: boolean; top?: boolean; }
interface RoleTweak { name?: string; color?: string; emoji?: string; }
interface BoostFake { level?: boolean; booster?: boolean; partner?: boolean; verified?: boolean; members?: number; online?: number; roles?: string[]; owner?: boolean; customRoles?: CustomRole[]; roleTweaks?: Record<string, RoleTweak>; }
interface Extras { fakeNitro?: boolean; giftCode?: string; giftPlan?: string; giftStyle?: number; boosts?: Record<string, BoostFake>; fakeRequests?: { id: string; user: any; since: string; }[]; fakeOrbs?: number; }

function readExtras(): Extras {
    try { return JSON.parse(localStorage.getItem(LS_EXTRAS) || "{}") || {}; } catch { return {}; }
}
let extras: Extras = readExtras();
const listeners = new Set<() => void>();
function writeExtras(next: Extras) {
    extras = next;
    try { localStorage.setItem(LS_EXTRAS, JSON.stringify(next)); } catch (e) { logger.warn("Saving extras failed", e); }
    listeners.forEach(fn => fn());
}
function useExtras() {
    const [, force] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => { listeners.add(force); return () => void listeners.delete(force); }, []);
    return extras;
}

// ---- Fake Nitro ----
let ownedNitroOverride: { state: any; ownerId: string; previous: any; } | null = null;
function restoreFakeNitroOverride(accountChanged = false) {
    const owned = ownedNitroOverride;
    ownedNitroOverride = null;
    if (!owned || owned.state.premiumTypeOverride !== 2) return false;
    owned.state.premiumTypeOverride = accountChanged ? undefined : owned.previous;
    return true;
}
// Fake Nitro makes the Shop show member prices, and Discord's server then rejects the
// purchase. Pause it while the Shop or a purchase window is open.
let shopPaused = false;
const SHOP_OPEN = ["COLLECTIBLES_SHOP_OPEN","COLLECTIBLES_PRODUCT_DETAILS_OPEN","COLLECTIBLES_SHOP_HOME_FETCH","SKU_PURCHASE_MODAL_OPEN","PREMIUM_PAYMENT_MODAL_OPEN"];
const SHOP_CLOSE = ["SKU_PURCHASE_MODAL_CLOSE","SKU_PURCHASE_SUCCESS","PREMIUM_PAYMENT_MODAL_CLOSED","CHANNEL_SELECT"];
function pauseForShop() { if (!shopPaused) { shopPaused = true; applyFakeNitro(); } }
function resumeAfterShop() { if (shopPaused) { shopPaused = false; applyFakeNitro(); } }

// Nitro turned on in the custom profile also hides Nitro upsells, like "Act like I have Nitro".
let profileNitroOn: () => boolean = () => false;
export function setProfileNitroSource(source: () => boolean) { profileNitroOn = source; }
export function refreshFakeNitro() { applyFakeNitro(); }
// Discord only uses the Nitro override for staff; the plugin patch asks this instead.
let fakeNitroActive = false;
export function isFakeNitroActive() { return fakeNitroActive; }
// Your account record keeps its real Nitro type until Discord rebuilds it, so set it now.
function setCurrentPremiumType(type: number | undefined) {
    try {
        const me: any = UserStore.getCurrentUser();
        if (!me || type == null || me.premiumType === type) return false;
        me.premiumType = type;
        (UserStore as any).emitChange?.();
        return true;
    } catch { return false; }
}

function applyFakeNitro() {
    try {
        const state = OverridePremiumTypeStore?.getState?.();
        if (!state) return;
        const ownerId = UserStore.getCurrentUser()?.id || "";
        let changed = false;
        if (ownedNitroOverride && (ownedNitroOverride.state !== state || ownedNitroOverride.ownerId !== ownerId)) {
            changed = restoreFakeNitroOverride(ownedNitroOverride.state === state);
        }
        const active = !!((extras.fakeNitro || profileNitroOn()) && !shopPaused && ownerId && state.premiumTypeActual !== 2);
        if (active) {
            // Own only the override installed here. Never erase another plugin's
            // override just because this switch defaults to off.
            if (!ownedNitroOverride && state.premiumTypeOverride !== 2) ownedNitroOverride = { state, ownerId, previous: state.premiumTypeOverride };
            if (state.premiumTypeOverride !== 2) { state.premiumTypeOverride = 2; changed = true; }
        } else changed = restoreFakeNitroOverride() || changed;
        const wasActive = fakeNitroActive;
        fakeNitroActive = active;
        if (active) changed = setCurrentPremiumType(2) || changed;
        else if (wasActive) changed = setCurrentPremiumType(state.premiumTypeActual ?? 0) || changed;
        if (changed) { (OverridePremiumTypeStore as any).emitChange?.(); restoreKeptTheme(); }
    } catch (e) { logger.warn("Updating Nitro override failed", e); }
}

// ---- Fake gift link ----
// Same alphabet Discord uses for gift codes.
const GIFT_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function newGiftCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, b => GIFT_CHARS[b % GIFT_CHARS.length]).join("");
}
const giftUrl = (code: string) => `https://discord.gift/${code}`;

function fakeGiftBody(code: string) {
    const plan = GIFT_PLANS.find(item => item.id === extras.giftPlan) ?? GIFT_PLANS[0];
    const me = UserStore.getCurrentUser() as any;
    return {
        code, sku_id: plan.sku, application_id: NITRO_APP_ID, uses: 0, max_uses: 1, redeemed: false,
        expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
        subscription_plan_id: plan.id,
        subscription_plan: { id: plan.id, name: plan.name, interval: plan.interval, interval_count: 1, tax_inclusive: true, sku_id: plan.sku, currency: "usd", price: plan.price, price_tier: null },
        user: me ? { id: me.id, username: me.username, global_name: me.globalName, avatar: me.avatar, discriminator: me.discriminator ?? "0" } : undefined,
        store_listing: { id: plan.sku, summary: "", sku: { id: plan.sku, type: 5, application_id: NITRO_APP_ID, name: plan.sku === NITRO_BASIC_SKU ? "Nitro Basic" : "Nitro", flags: 0, premium: true, product_line: 1 } },
        gift_style: extras.giftStyle ?? 4, batch_id: null, promotion: null, flags: 0
    };
}

const giftPath = (url: unknown) => typeof url === "string" ? url.match(/\/entitlements\/gift-codes\/([A-Za-z0-9-]+)(\/redeem)?/) : null;
let restOriginals: { post: any; wrappedPost: any; } | null = null;
// Only the code made on this device resolves as a gift, and only here. Everyone
// else (and this device after you make a new link) gets Discord's "invalid gift".
function installGiftHook() {
    if (restOriginals || !RestAPI) return;
    const post: any = RestAPI.post;
    const owned = { post, wrappedPost: null as any };
    const wrappedPost = function (this: any, req: any, ...rest: any[]) {
        if (restOriginals !== owned) return post.call(this, req, ...rest);
        const match = giftPath(req?.url);
        if (match?.[2] && extras.giftCode && match[1] === extras.giftCode) {
            showToast("This is your fake gift. It only looks real on your device.", Toasts.Type.MESSAGE);
            return Promise.reject({ ok: false, status: 400, body: { code: 50050, message: "This gift is only a preview on this device." } });
        }
        return post.call(this, req, ...rest);
    };
    owned.wrappedPost = wrappedPost;
    restOriginals = owned;
    (RestAPI as any).post = wrappedPost;
}
function uninstallGiftHook() {
    if (!restOriginals) return;
    // We never changed GET, and another plugin may have wrapped POST since us.
    if (RestAPI.post === restOriginals.wrappedPost) (RestAPI as any).post = restOriginals.post;
    restOriginals = null;
}

// Called from the patched gift resolver: only the current device link resolves.
export function fakeGiftFor(code: string) {
    return extras.giftCode && code === extras.giftCode ? fakeGiftBody(code) : null;
}

// ---- Fake boost ----
// Boost system messages: 8 = boosted, 9/10/11 = boosted and the server reached level 1/2/3.
function sendFakeBoostMessage(times: number, reachedLevel: number) {
    const channelId = SelectedChannelStore.getChannelId();
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    const me = UserStore.getCurrentUser() as any;
    if (!channel?.guild_id || !me) { showToast("Open a server text channel first.", Toasts.Type.FAILURE); return; }
    FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE", channelId, optimistic: false, isPushNotification: false,
        message: {
            id: SnowflakeUtils.fromTimestamp(Date.now()), type: reachedLevel > 0 ? 8 + reachedLevel : 8, content: times > 1 ? String(times) : "",
            channel_id: channelId, guild_id: channel.guild_id, timestamp: new Date().toISOString(), edited_timestamp: null, flags: 0,
            author: { id: me.id, username: me.username, global_name: me.globalName, avatar: me.avatar, discriminator: me.discriminator ?? "0", public_flags: me.publicFlags ?? 0 },
            attachments: [], embeds: [], mentions: [], mention_roles: [], mention_everyone: false, pinned: false, tts: false, components: []
        }
    });
}

const BOOST_SINCE = new Date(Date.now() - 90 * 86400_000);
let boostOriginals: { getGuild: any; getMember: any; getSelfMember?: any; } | null = null;
const guildOverlays = new WeakMap<object, any>();
// Our own overlays, so a guild that comes back through getGuild is never wrapped twice.
const overlaySet = new WeakSet<object>();
// Same Set back for the same inputs, so screens that compare features don't re-render forever.
const featureCache = new WeakMap<object, { key: string; value: Set<string>; }>();
function fakeFeatures(real: any, partner: boolean, verified: boolean) {
    const base = real && typeof real === "object" ? real : {};
    const key = (partner ? "P" : "") + (verified ? "V" : "");
    const hit = featureCache.get(base);
    if (hit && hit.key === key) return hit.value;
    const value = new Set<string>(real ?? []);
    if (partner) value.add("PARTNERED");
    if (verified) value.add("VERIFIED");
    featureCache.set(base, { key, value });
    return value;
}
function boostFor(guildId?: string | null) { return guildId ? extras.boosts?.[guildId] : undefined; }
// Read-only overlays: Discord's stores keep their real data, we only change what's returned.
// ---- Visual roles: your own roles and new names/colours/icons for real ones, only on this device ----
const hexNumber = (hex?: string) => { const value = parseInt(String(hex || "").replace(/^#/, ""), 16); return Number.isFinite(value) ? value : 0; };
const roleCache = new Map<string, any>();
function styledRole(base: any, patch: { name?: string; color?: string; emoji?: string; }) {
    const color = patch.color ? hexNumber(patch.color) : null;
    return {
        ...base,
        ...(patch.name ? { name: patch.name } : {}),
        ...(color != null ? { color, colorString: patch.color, colors: { primary_color: color, secondary_color: null, tertiary_color: null }, colorStrings: { primaryColor: patch.color, secondaryColor: null, tertiaryColor: null } } : {}),
        ...(patch.emoji ? { unicodeEmoji: patch.emoji, icon: null } : {})
    };
}
function customRoleRecord(guildId: string, role: CustomRole, index: number, topPosition: number) {
    const key = guildId + ":" + JSON.stringify(role) + ":" + index + ":" + topPosition;
    const hit = roleCache.get(key);
    if (hit) return hit;
    const value = styledRole({
        id: role.id, name: role.name, guildId, permissions: role.admin ? 8n : 0n, mentionable: false,
        position: role.top ? topPosition + 1 + index : 0, color: 0, colorString: null, colors: { primary_color: null, secondary_color: null, tertiary_color: null },
        colorStrings: { primaryColor: null, secondaryColor: null, tertiaryColor: null }, hoist: role.hoist, managed: false, tags: {}, icon: null, unicodeEmoji: null, flags: 0, description: null
    }, { color: role.color, emoji: role.emoji });
    roleCache.set(key, value);
    return value;
}
let roleOriginals: { getUnsafeMutableRoles: any; getRole: any; getManyRoles: any; getNumRoles: any; } | null = null;
function visualRolesFor(guildId: string) {
    const fake = boostFor(guildId);
    return { custom: fake?.customRoles ?? [], tweaks: fake?.roleTweaks ?? {} };
}
const roleListCache = new WeakMap<object, { key: string; value: any; }>();
function installRoleHooks() {
    if (roleOriginals || !GuildRoleStore?.getUnsafeMutableRoles) return;
    const store: any = GuildRoleStore;
    roleOriginals = { getUnsafeMutableRoles: store.getUnsafeMutableRoles, getRole: store.getRole, getManyRoles: store.getManyRoles, getNumRoles: store.getNumRoles };
    const original = roleOriginals;
    const topOf = (roles: any) => Math.max(0, ...Object.values(roles ?? {}).map((role: any) => Number(role?.position) || 0));
    const patchOne = (guildId: string, role: any) => {
        const tweak = role && visualRolesFor(guildId).tweaks[role.id];
        if (!tweak) return role;
        const key = guildId + ":tweak:" + role.id + ":" + JSON.stringify(tweak) + ":" + role.position;
        let value = roleCache.get(key);
        if (!value) roleCache.set(key, value = styledRole(role, tweak));
        return value;
    };
    store.getUnsafeMutableRoles = function (guildId: string, ...rest: any[]) {
        const roles = original.getUnsafeMutableRoles.call(this, guildId, ...rest);
        const { custom, tweaks } = visualRolesFor(guildId);
        if (!roles || (!custom.length && !Object.keys(tweaks).length)) return roles;
        const key = JSON.stringify(custom) + JSON.stringify(tweaks);
        const hit = roleListCache.get(roles);
        if (hit && hit.key === key) return hit.value;
        const top = topOf(roles);
        const value: any = {};
        for (const [id, role] of Object.entries(roles)) value[id] = patchOne(guildId, role);
        custom.forEach((role, index) => { value[role.id] = customRoleRecord(guildId, role, index, top); });
        roleListCache.set(roles, { key, value });
        return value;
    };
    store.getRole = function (guildId: string, roleId: string, ...rest: any[]) {
        const custom = visualRolesFor(guildId).custom;
        const index = custom.findIndex(role => role.id === roleId);
        if (index >= 0) return customRoleRecord(guildId, custom[index], index, topOf(original.getUnsafeMutableRoles.call(this, guildId)));
        return patchOne(guildId, original.getRole.call(this, guildId, roleId, ...rest));
    };
    store.getManyRoles = function (guildId: string, ids: string[], ...rest: any[]) {
        const custom = visualRolesFor(guildId).custom;
        if (!custom.length && !Object.keys(visualRolesFor(guildId).tweaks).length) return original.getManyRoles.call(this, guildId, ids, ...rest);
        return (ids ?? []).map(id => store.getRole(guildId, id)).filter(Boolean);
    };
    store.getNumRoles = function (guildId: string, ...rest: any[]) {
        return original.getNumRoles.call(this, guildId, ...rest) + visualRolesFor(guildId).custom.length;
    };
}
function uninstallRoleHooks() {
    if (!roleOriginals) return;
    Object.assign(GuildRoleStore as any, roleOriginals);
    roleOriginals = null;
}

function installBoostHooks() {
    try { installRoleHooks(); } catch (e) { logger.warn("Installing role hooks failed", e); }
    try { installCountHooks(); } catch (e) { logger.warn("Installing count hooks failed", e); }
    try { installMemberListHook(); } catch (e) { logger.warn("Installing member list hook failed", e); }
    if (boostOriginals || !GuildStore || !GuildMemberStore) return;
    boostOriginals = { getGuild: GuildStore.getGuild, getMember: GuildMemberStore.getMember, getSelfMember: (GuildMemberStore as any).getSelfMember };
    const { getGuild, getMember } = boostOriginals;
    (GuildStore as any).getGuild = function (guildId: string, ...rest: any[]) {
        const guild = getGuild.call(this, guildId, ...rest);
        const fake = boostFor(guildId);
        if (!guild || typeof guild !== "object" || overlaySet.has(guild) || !(fake?.level || fake?.partner || fake?.verified || fake?.owner || fake?.members != null || fake?.online != null)) return guild;
        let overlay = guildOverlays.get(guild);
        if (!overlay) guildOverlays.set(guild, overlay = new Proxy(guild, {
            get: (target, key) => {
                const now = boostFor(guildId);
                if (now?.level && key === "premiumTier") return 3;
                if (now?.level && key === "premiumSubscriberCount") return Math.max(14, target.premiumSubscriberCount ?? 0);
                if (now?.owner && key === "ownerId") return UserStore.getCurrentUser()?.id ?? target.ownerId;
                if (now?.owner && key === "isOwner") return (userId: any) => String(userId?.id ?? userId) === UserStore.getCurrentUser()?.id || target.isOwner?.(userId);
                if (now?.members != null && (key === "memberCount" || key === "approximateMemberCount")) return now.members;
                if (now?.online != null && (key === "presenceCount" || key === "approximatePresenceCount")) return now.online;
                if (key === "features" && (now?.partner || now?.verified)) return fakeFeatures(target.features, !!now.partner, !!now.verified);
                if (key === "hasFeature" && (now?.partner || now?.verified)) return (feature: string) => (now.partner && feature === "PARTNERED") || (now.verified && feature === "VERIFIED") || target.hasFeature?.(feature);
                return Reflect.get(target, key, target);
            }
        }));
        overlaySet.add(overlay);
        return overlay;
    };
    (GuildMemberStore as any).getMember = function (guildId: string, userId: string, ...rest: any[]) {
        const member = getMember.call(this, guildId, userId, ...rest);
        if (!member || typeof member !== "object" || !boostFor(guildId) || userId !== UserStore.getCurrentUser()?.id) return member;
        return fakeMember(guildId, member);
    };
    const { getSelfMember } = boostOriginals;
    if (getSelfMember) (GuildMemberStore as any).getSelfMember = function (guildId: string, ...rest: any[]) {
        const member = getSelfMember.call(this, guildId, ...rest);
        return member && typeof member === "object" && boostFor(guildId) ? fakeMember(guildId, member) : member;
    };
}
// Member list: move you under your highest hoisted fake role, like Discord would.
// Discord builds the list on its servers; this rewrites the rows it hands the list.
const listCache = new WeakMap<object, { key: string; value: any }>();
function regroupMemberList(guildId: string, props: any) {
    const fake = boostFor(guildId);
    const me = UserStore.getCurrentUser()?.id;
    if (!fake?.roles?.length || !me || !props || !Array.isArray(props.rows)) return props;
    const byId = new Map(rolesOf(guildId).map((role: any) => [role.id, role]));
    const hoist = fake.roles.map((id: string) => byId.get(id)).filter((role: any) => role?.hoist).sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0))[0];
    const rowIndex = props.rows.findIndex((row: any) => row?.type === "MEMBER" && String(row.userId) === me);
    if (!hoist) return props;
    // Big lists only load rows near the screen; with no roles you sit deep in "Online", so build your row.
    const mineRow = rowIndex >= 0 ? props.rows[rowIndex] : selfMemberRow(guildId, me);
    if (!mineRow) return props;
    const current = byId.get(mineRow.hoistRoleId);
    if (current && (current.position ?? 0) >= (hoist.position ?? 0)) return props;
    const key = hoist.id + "|" + props.rows.length + "|" + rowIndex + "|" + (mineRow.status || "");
    const hit = listCache.get(props);
    if (hit && hit.key === key) return hit.value;
    const rows = props.rows.slice();
    const counts = new Map<string, number>((props.groups ?? []).map((group: any) => [String(group.id), group.count ?? 0]));
    let oldHeader = -1;
    if (rowIndex >= 0) {
        rows.splice(rowIndex, 1);
        // Old group loses one; drop its header if it is now empty.
        for (let i = rowIndex - 1; i >= 0; i--) if (rows[i]?.type === "GROUP") { oldHeader = i; break; }
    } else {
        // Not loaded: you are counted in Online or Offline.
        const statusGroup = mineRow.status === "offline" || mineRow.status === "invisible" ? "offline" : "online";
        if (counts.has(statusGroup)) counts.set(statusGroup, Math.max(0, (counts.get(statusGroup) ?? 1) - 1));
    }
    if (oldHeader >= 0) {
        const id = String(rows[oldHeader].id);
        counts.set(id, Math.max(0, (counts.get(id) ?? 1) - 1));
        if (!counts.get(id) && rows[oldHeader + 1]?.type !== "MEMBER") rows.splice(oldHeader, 1);
    }
    const row = { ...mineRow, hoistRoleId: hoist.id, roles: [...new Set([...(mineRow.roles ?? []), ...fake.roles])] };
    try { const member = fakeMember(guildId, mineRow); Object.assign(row, { colorString: member.colorString, colorStrings: member.colorStrings, colorRoleId: member.colorRoleId, iconRoleId: member.iconRoleId, highestRoleId: member.highestRoleId, hoistRoleId: hoist.id }); } catch { /* silent: runs per member-list render; falls back to the plain row */ }
    let header = rows.findIndex((entry: any) => entry?.type === "GROUP" && String(entry.id) === hoist.id);
    if (header < 0) {
        // New header above the first role group that sits lower than this role (or above "Online").
        header = rows.findIndex((entry: any) => entry?.type === "GROUP" && (byId.has(String(entry.id)) ? (byId.get(String(entry.id)).position ?? 0) < (hoist.position ?? 0) : true));
        if (header < 0) header = rows.length;
        rows.splice(header, 0, { type: "GROUP", key: hoist.id, id: hoist.id, title: hoist.name });
    }
    rows.splice(header + 1, 0, row);
    counts.set(hoist.id, (counts.get(hoist.id) ?? 0) + 1);
    const groups = rows.map((entry: any, index: number) => entry?.type === "GROUP" ? { ...entry, count: counts.get(String(entry.id)) ?? 0, index } : null).filter(Boolean);
    const value = { ...props, rows, groups, version: (props.version ?? 0) + 0.5 };
    listCache.set(props, { key, value });
    return value;
}

// Your own member-list row, built from the stores when Discord hasn't loaded it.
function selfMemberRow(guildId: string, me: string) {
    try {
        const member = GuildMemberStore.getMember(guildId, me);
        const user = UserStore.getUser(me);
        if (!member || !user) return null;
        const status = PresenceStore?.getStatus?.(me) ?? "online";
        return { ...member, type: "MEMBER", userId: me, user, status, activities: PresenceStore?.getActivities?.(me) ?? [], applicationStream: null, isOwner: GuildStore.getGuild(guildId)?.ownerId === me, isMobileOnline: false, isVROnline: false };
    } catch { return null; }
}
// Visual ownership: the crown on your row in the member list.
const ownerRowCache = new WeakMap<object, any>();
function markOwnerRow(props: any) {
    const me = UserStore.getCurrentUser()?.id;
    if (!me || !Array.isArray(props?.rows)) return props;
    const hit = ownerRowCache.get(props);
    if (hit) return hit;
    const index = props.rows.findIndex((row: any) => row?.type === "MEMBER" && String(row.userId) === me);
    if (index < 0 || props.rows[index].isOwner) return props;
    const rows = props.rows.slice();
    rows[index] = { ...rows[index], isOwner: true };
    const value = { ...props, rows };
    ownerRowCache.set(props, value);
    return value;
}
// Fake member counts in the member list's "Online — N" / "Offline — N" headers.
const countCache = new WeakMap<object, { key: string; value: any }>();
function fakeListCounts(guildId: string, props: any) {
    const fake = boostFor(guildId);
    if (!Array.isArray(props?.groups) || (fake?.online == null && fake?.members == null)) return props;
    const online = fake.online ?? props.groups.find((group: any) => group.id === "online")?.count ?? 0;
    const offline = fake.members != null ? Math.max(0, fake.members - online) : undefined;
    const key = online + "|" + offline;
    const hit = countCache.get(props);
    if (hit && hit.key === key) return hit.value;
    const groups = props.groups.map((group: any) => group.id === "online" ? { ...group, count: online } : group.id === "offline" && offline != null ? { ...group, count: offline } : group);
    const value = { ...props, groups };
    countCache.set(props, { key, value });
    return value;
}
let listOriginal: any = null;
function installMemberListHook() {
    if (listOriginal || !ChannelMemberStore?.getProps) return;
    const store: any = ChannelMemberStore;
    listOriginal = store.getProps;
    store.getProps = function (guildId: string, ...rest: any[]) {
        const props = listOriginal.call(this, guildId, ...rest);
        try {
            const fake = boostFor(guildId);
            let next = fake?.roles?.length ? regroupMemberList(guildId, props) : props;
            if (fake?.owner) next = markOwnerRow(next);
            if (fake?.online != null || fake?.members != null) next = fakeListCounts(guildId, next);
            return next;
        } catch { return props; }
    };
}
function uninstallMemberListHook() {
    if (!listOriginal) return;
    (ChannelMemberStore as any).getProps = listOriginal;
    listOriginal = null;
}

// Fake member and online counts shown in the server header, invites and member list.
let countOriginals: { getMemberCount: any; getOnlineCount: any; } | null = null;
function installCountHooks() {
    if (countOriginals || !GuildMemberCountStore?.getMemberCount) return;
    const store: any = GuildMemberCountStore;
    countOriginals = { getMemberCount: store.getMemberCount, getOnlineCount: store.getOnlineCount };
    const { getMemberCount, getOnlineCount } = countOriginals;
    store.getMemberCount = function (guildId: string, ...rest: any[]) { return boostFor(guildId)?.members ?? getMemberCount.call(this, guildId, ...rest); };
    if (getOnlineCount) store.getOnlineCount = function (guildId: string, ...rest: any[]) { return boostFor(guildId)?.online ?? getOnlineCount.call(this, guildId, ...rest); };
}
function uninstallCountHooks() {
    if (!countOriginals) return;
    const store: any = GuildMemberCountStore;
    store.getMemberCount = countOriginals.getMemberCount;
    if (countOriginals.getOnlineCount) store.getOnlineCount = countOriginals.getOnlineCount;
    countOriginals = null;
}
function uninstallBoostHooks() {
    uninstallRoleHooks();
    uninstallCountHooks();
    uninstallMemberListHook();
    if (!boostOriginals) return;
    (GuildStore as any).getGuild = boostOriginals.getGuild; (GuildMemberStore as any).getMember = boostOriginals.getMember;
    if (boostOriginals.getSelfMember) (GuildMemberStore as any).getSelfMember = boostOriginals.getSelfMember;
    boostOriginals = null;
}
function refreshGuildViews(guildId: string) {
    try { (GuildStore as any).emitChange?.(); (GuildMemberStore as any).emitChange?.(); (GuildMemberCountStore as any)?.emitChange?.(); (ChannelMemberStore as any)?.emitChange?.(); (GuildRoleStore as any)?.emitChange?.(); } catch (e) { logger.warn("Refreshing guild stores failed", e); }
    try { FluxDispatcher.dispatch({ type: "GUILD_MEMBER_PROFILE_UPDATE", guildId }); } catch (e) { logger.warn("Dispatching member profile update failed", e); }
}

function BoostSection() {
    const [chosenId, setChosenId] = React.useState(() => SelectedGuildStore.getGuildId() ?? "");
    const guildId = /^\d{15,22}$/.test(chosenId.trim()) ? chosenId.trim() : null;
    const guild = guildId ? GuildStore.getGuild(guildId) : null;
    const [roleQuery, setRoleQuery] = React.useState("");
    const [times, setTimes] = React.useState(1);
    const [reached, setReached] = React.useState(0);
    const fake = boostFor(guildId) ?? {};
    const set = (patch: BoostFake) => { if (!guildId) return; writeExtras({ ...extras, boosts: { ...extras.boosts, [guildId]: { ...fake, ...patch } } }); refreshGuildViews(guildId); };
    const roles = guild ? rolesOf(guild.id) : [];
    const chosenRoles = new Set(fake.roles ?? []);
    const query = roleQuery.trim().toLowerCase();
    const shownRoles = roles.filter((role: any) => !role.managed && (!query || role.name.toLowerCase().includes(query))).slice(0, 60);
    const toggleRole = (id: string) => { const next = new Set(chosenRoles); if (next.has(id)) next.delete(id); else next.add(id); set({ roles: [...next] }); };
    return <Section title="Fake server" description={guild ? `For ${guild.name}. Only on this device: other people see the real server.` : guildId ? "You're not in a server with that ID." : "Enter a server ID, or open a server first."}>
        <label className="cpx-field"><span className="cpx-label">Server ID</span><input className="cpx-input" value={chosenId} placeholder="Right-click a server → Copy Server ID" onChange={event => setChosenId(event.currentTarget.value)} /></label>
        {guild && <>
            <Grid2>
                <SelectField label="Boosts" options={[1, 2, 3, 5, 10].map(value => ({ value, label: `${value}x` }))} value={times} onChange={value => setTimes(Number(value))} />
                <SelectField label="Message" options={[{ value: 0, label: "Just boosted" }, { value: 1, label: "Reached level 1" }, { value: 2, label: "Reached level 2" }, { value: 3, label: "Reached level 3" }]} value={reached} onChange={value => setReached(Number(value))} />
            </Grid2>
            <div className="cpx-inline"><button type="button" className="cpx-btn" onClick={() => sendFakeBoostMessage(times, reached)}>Send fake boost message</button></div>
            <span className="cpx-hint">Shows in the channel you have open and disappears when you switch channels or restart.</span>
            <Switch label="Show this server as Level 3" description="Boost bar and perks look unlocked here. Real limits like upload size don't change." checked={fake.level === true} onChange={value => set({ level: value })} />
            <Switch label="Show as a Partner server" description="Partner badge next to the server name and in invites." checked={fake.partner === true} onChange={value => set({ partner: value })} />
            <Switch label="Show as a Verified server" description="Verified check next to the server name." checked={fake.verified === true} onChange={value => set({ verified: value })} />
            <Grid2>
                <label className="cpx-field"><span className="cpx-label">Members</span><input className="cpx-input" type="number" min={0} placeholder="Real count" value={fake.members ?? ""} onChange={event => { const text = event.currentTarget.value; set({ members: text === "" ? undefined : Math.max(0, Math.floor(Number(text) || 0)) }); }} /></label>
                <label className="cpx-field"><span className="cpx-label">Online</span><input className="cpx-input" type="number" min={0} placeholder="Real count" value={fake.online ?? ""} onChange={event => { const text = event.currentTarget.value; set({ online: text === "" ? undefined : Math.max(0, Math.floor(Number(text) || 0)) }); }} /></label>
            </Grid2>
            <Switch label="Show me as the server owner" description="Crown next to your name and owner-only menus. Owner actions still fail, because Discord knows the real owner." checked={fake.owner === true} onChange={value => set({ owner: value })} />
            <Switch label="Show me as a booster here" description="The boosting icon by your name and Server Booster since on your profile." checked={fake.booster === true} onChange={value => set({ booster: value })} />
            <div className="cpx-field">
                <span className="cpx-label">Fake roles {chosenRoles.size ? `(${chosenRoles.size})` : ""}</span>
                <span className="cpx-hint">Your name colour, role icon and member list group follow your highest role, and the roles show on your profile. Only on this device.</span>
                <input className="cpx-input" value={roleQuery} placeholder="Search roles" onChange={event => setRoleQuery(event.currentTarget.value)} />
                <div className="cpx-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                    {shownRoles.map((role: any) => <button key={role.id} type="button" className={"cpx-segment" + (chosenRoles.has(role.id) ? " cpx-on" : "")} onClick={() => toggleRole(role.id)}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: role.colorString || "#99aab5", flex: "0 0 10px" }} />{role.name}
                    </button>)}
                    {!shownRoles.length && <span className="cpx-hint">No roles found.</span>}
                </div>
                {chosenRoles.size > 0 && <div className="cpx-inline"><button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => set({ roles: [] })}>Remove all fake roles</button></div>}
            </div>
            <VisualRolesEditor guildId={guild.id} fake={fake} roles={roles} onChange={set} />
        </>}
    </Section>;
}

function VisualRolesEditor({ guildId, fake, roles, onChange }: { guildId: string; fake: BoostFake; roles: any[]; onChange: (patch: BoostFake) => void; }) {
    const [draft, setDraft] = React.useState<CustomRole>({ id: "", name: "", color: "#5865f2", hoist: true, emoji: "", admin: false, top: true });
    const [tweakId, setTweakId] = React.useState("");
    const custom = fake.customRoles ?? [];
    const tweaks = fake.roleTweaks ?? {};
    const realRoles = roles.filter((role: any) => !String(role.id).startsWith("cc-role-"));
    const tweak = tweakId ? tweaks[tweakId] ?? {} : {};
    const setTweak = (patch: RoleTweak) => {
        const next = { ...tweaks, [tweakId]: { ...tweak, ...patch } };
        for (const key of Object.keys(next[tweakId])) if (!(next[tweakId] as any)[key]) delete (next[tweakId] as any)[key];
        if (!Object.keys(next[tweakId]).length) delete next[tweakId];
        onChange({ roleTweaks: next });
    };
    const addRole = () => {
        if (!draft.name.trim()) return;
        const role = { ...draft, name: draft.name.trim().slice(0, 100), id: "cc-role-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
        onChange({ customRoles: [...custom, role], roles: [...(fake.roles ?? []), role.id] });
        setDraft({ ...draft, name: "", emoji: "" });
    };
    return <>
        <div className="cpx-field">
            <span className="cpx-label">Your own roles</span>
            <span className="cpx-hint">Make roles that only you see. Put them above every role, even bots, and give them a colour, an emoji icon or Administrator. Administrator only changes what Discord shows you; real actions still need real permissions.</span>
            {custom.map(role => <div key={role.id} className="cpx-order-row" style={{ gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: role.color, flex: "0 0 12px" }} />
                <span style={{ flex: 1 }}>{role.emoji ? role.emoji + " " : ""}{role.name}{role.admin ? " · Administrator" : ""}{role.top ? " · Top" : ""}</span>
                <button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => onChange({ customRoles: custom.filter(other => other.id !== role.id), roles: (fake.roles ?? []).filter(id => id !== role.id) })}>Delete</button>
            </div>)}
            <Grid2>
                <label className="cpx-field"><span className="cpx-label">Name</span><input className="cpx-input" value={draft.name} maxLength={100} placeholder="Owner" onChange={event => setDraft({ ...draft, name: event.currentTarget.value })} /></label>
                <label className="cpx-field"><span className="cpx-label">Colour</span><input className="cpx-input" type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.currentTarget.value })} /></label>
            </Grid2>
            <label className="cpx-field"><span className="cpx-label">Emoji icon</span><input className="cpx-input" value={draft.emoji ?? ""} maxLength={8} placeholder="👑 (optional)" onChange={event => setDraft({ ...draft, emoji: event.currentTarget.value })} /></label>
            <Switch label="Show separately in the member list" checked={draft.hoist} onChange={value => setDraft({ ...draft, hoist: value })} />
            <Switch label="Above every other role" description="Higher than all real roles, bots included." checked={draft.top === true} onChange={value => setDraft({ ...draft, top: value })} />
            <Switch label="Administrator" description="Discord shows you admin options. They won't work, because the server doesn't give you the permission." checked={draft.admin === true} onChange={value => setDraft({ ...draft, admin: value })} />
            <div className="cpx-inline"><button type="button" className="cpx-btn cpx-btn-primary" disabled={!draft.name.trim()} onClick={addRole}>Create role and give it to me</button></div>
        </div>
        <div className="cpx-field">
            <span className="cpx-label">Restyle a real role</span>
            <span className="cpx-hint">Give any role here a different name, colour or emoji icon, only on this device.</span>
            <SelectField label="Role" options={[{ value: "", label: "Choose a role" }, ...realRoles.map((role: any) => ({ value: role.id, label: (tweaks[role.id] ? "✎ " : "") + role.name }))]} value={tweakId} onChange={value => setTweakId(String(value))} />
            {tweakId && <>
                <Grid2>
                    <label className="cpx-field"><span className="cpx-label">New name</span><input className="cpx-input" value={tweak.name ?? ""} maxLength={100} placeholder="Keep name" onChange={event => setTweak({ name: event.currentTarget.value })} /></label>
                    <label className="cpx-field"><span className="cpx-label">New colour</span><input className="cpx-input" type="color" value={tweak.color ?? "#99aab5"} onChange={event => setTweak({ color: event.currentTarget.value })} /></label>
                </Grid2>
                <label className="cpx-field"><span className="cpx-label">Emoji icon</span><input className="cpx-input" value={tweak.emoji ?? ""} maxLength={8} placeholder="⭐ (optional)" onChange={event => setTweak({ emoji: event.currentTarget.value })} /></label>
                {tweaks[tweakId] && <div className="cpx-inline"><button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => { const next = { ...tweaks }; delete next[tweakId]; onChange({ roleTweaks: next }); }}>Reset this role</button></div>}
            </>}
        </div>
    </>;
}

// ---- Fake friend requests ----
// Saved in extras so requests stay until removed. Discord reloads relationships
// on every connect, so they are shown again after each start or reconnect.
interface FakeRequest { id: string; user: any; since: string; }
const fakeRequests = new Set<string>();
const savedRequests = (): FakeRequest[] => Array.isArray(extras.fakeRequests) ? extras.fakeRequests.filter(item => item && /^\d{17,20}$/.test(item.id) && item.user) : [];
function showFakeRequest(item: FakeRequest) {
    fakeRequests.add(item.id);
    FluxDispatcher.dispatch({ type: "RELATIONSHIP_ADD", relationship: { id: item.id, type: INCOMING_REQUEST, user: item.user, since: item.since, nickname: null }, shouldNotify: false });
}
function restoreFakeRequests() {
    for (const item of savedRequests()) if ((RelationshipStore.getRelationshipType(item.id) ?? 0) === 0) showFakeRequest(item);
}
const restoreSoon = () => void setTimeout(restoreFakeRequests, 1500);
export function hasFakeRequest(userId: string) { return fakeRequests.has(userId); }
export async function addFakeRequestById(rawId: string) {
    // Accepts an ID, a mention like <@123> or a profile link.
    const id = (rawId.match(/\d{17,20}/) || [""])[0];
    if (!id) { showToast("Paste a user ID, mention or profile link.", Toasts.Type.FAILURE); return false; }
    let user: any = UserStore.getUser(id);
    if (!user) {
        // Not cached yet: look the user up once so the request has a name and avatar.
        try { user = (await RestAPI.get({ url: `/users/${id}` }))?.body; } catch (e) { logger.warn("Looking up user failed", e); }
    }
    if (!user) { showToast("Couldn't find that user.", Toasts.Type.FAILURE); return false; }
    addFakeRequest(user);
    return fakeRequests.has(id);
}
export function addFakeRequest(user: any) {
    if ((RelationshipStore.getRelationshipType(user.id) ?? 0) !== 0) { showToast("You already have a friend request or friendship with this user.", Toasts.Type.FAILURE); return; }
    const raw = { id: user.id, username: user.username, global_name: user.globalName ?? user.global_name ?? null, avatar: user.avatar ?? null, discriminator: user.discriminator ?? "0", public_flags: user.publicFlags ?? user.public_flags ?? 0, bot: user.bot ?? false };
    const item: FakeRequest = { id: user.id, user: raw, since: new Date().toISOString() };
    writeExtras({ ...extras, fakeRequests: [...savedRequests().filter(entry => entry.id !== item.id), item] });
    showFakeRequest(item);
}
export function removeFakeRequest(userId: string, forget = true) {
    fakeRequests.delete(userId);
    if (forget) writeExtras({ ...extras, fakeRequests: savedRequests().filter(entry => entry.id !== userId) });
    FluxDispatcher.dispatch({ type: "RELATIONSHIP_REMOVE", relationship: { id: userId, type: INCOMING_REQUEST } });
}

// ---- Leave all servers ----
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function leavableGuilds() {
    const me = UserStore.getCurrentUser()?.id;
    return Object.values(GuildStore.getGuilds()).filter((guild: any) => guild && guild.ownerId !== me) as any[];
}
let leaving = false;
async function leaveAllServers() {
    if (leaving) return;
    leaving = true;
    const guilds = leavableGuilds();
    let left = 0;
    try {
        for (const guild of guilds) {
            for (let attempt = 0; attempt < 3; attempt++) {
                try { await RestAPI.del({ url: `/users/@me/guilds/${guild.id}`, body: { lurking: false } }); left++; break; } catch (error: any) {
                    const retry = Number(error?.body?.retry_after);
                    if (error?.status === 429 && Number.isFinite(retry)) { await sleep(retry * 1000 + 250); continue; }
                    break;
                }
            }
            await sleep(1200);
        }
    } finally { leaving = false; }
    showToast(`Left ${left} of ${guilds.length} servers.`, left === guilds.length ? Toasts.Type.SUCCESS : Toasts.Type.FAILURE);
}
function confirmLeaveAll() {
    const count = leavableGuilds().length;
    if (!count) { showToast("No servers to leave (servers you own are skipped).", Toasts.Type.MESSAGE); return; }
    const s = count === 1 ? "" : "s";
    Alerts.show({
        title: "Leave all servers?", confirmText: `Leave ${count} server${s}`, cancelText: "Cancel", confirmColor: "red",
        body: `You will leave ${count} server${s}. Servers you own are skipped. You'll need new invites to rejoin.`,
        onConfirm: () => Alerts.show({
            title: "Are you sure?", confirmText: "Yes, leave them all", cancelText: "Cancel", confirmColor: "red",
            body: "Last chance to cancel. It runs slowly in the background to avoid rate limits.",
            onConfirm: () => void leaveAllServers()
        })
    });
}

// ---- Reset ----
async function resetEverything() {
    try { await DataStore.clear(); } catch (e) { logger.warn("Clearing DataStore failed", e); }
    try { for (const key of Object.keys(localStorage)) if (/^(customProfile|cloudcord|CloudCord|Vencord|sincord)/i.test(key)) localStorage.removeItem(key); } catch (e) { logger.warn("Clearing localStorage failed", e); }
    try { await VencordNative.settings.set({} as any); } catch (e) { logger.warn("Clearing settings failed", e); }
    location.reload();
}
function confirmReset() {
    Alerts.show({
        title: "Reset CloudCord?", confirmText: "Reset everything", cancelText: "Cancel", confirmColor: "red",
        body: "Deletes your custom profile, badges, plugin settings and everything CloudCord saved on this device, then restarts like a fresh install. Your Discord account is not touched.",
        onConfirm: () => void resetEverything()
    });
}

// Fake orbs: the wallet shows our number instead of the real balance, only on this device.
const orbStores: { currency?: any; wallet?: any; } = {};
const fakeOrbCount = () => typeof extras.fakeOrbs === "number" && extras.fakeOrbs >= 0 ? extras.fakeOrbs : null;
// Stores load lazily, so this is safe to call again; it hooks whatever is new.
function installOrbHooks() {
    const all: any[] = (Flux as any)?.Store?.getAll?.() ?? [];
    const get = (name: string) => all.find((store: any) => store.getName?.() === name);
    const currency = orbStores.currency ? null : get("VirtualCurrencyStore");
    const real = currency && Object.getOwnPropertyDescriptor(Object.getPrototypeOf(currency), "balance")?.get;
    if (real) {
        Object.defineProperty(currency, "balance", { configurable: true, get() { return fakeOrbCount() ?? real.call(this); } });
        orbStores.currency = currency;
    }
    const wallet = orbStores.wallet ? null : get("WalletBalanceStore");
    if (wallet?.getBalance) {
        const realGet = wallet.getBalance;
        wallet.getBalance = function (...args: any[]) { return fakeOrbCount() ?? realGet.apply(this, args); };
        wallet.__ccRealGetBalance = realGet;
        orbStores.wallet = wallet;
    }
}
function uninstallOrbHooks() {
    const { currency, wallet } = orbStores;
    if (currency) delete currency.balance;
    if (wallet?.__ccRealGetBalance) { wallet.getBalance = wallet.__ccRealGetBalance; delete wallet.__ccRealGetBalance; }
    refreshOrbs();
    orbStores.currency = orbStores.wallet = undefined;
}
function refreshOrbs() {
    for (const store of [orbStores.currency, orbStores.wallet]) try { store?.emitChange?.(); } catch (e) { logger.warn("Refreshing orb stores failed", e); }
}

let orbRetry: ReturnType<typeof setInterval> | undefined;
// Nitro gradient themes with Fake Nitro: Discord saves the theme to your account, its servers
// drop it because the account has no real Nitro, and the next settings sync resets it. Remember
// the theme you picked here and put it back after each sync.
const LS_NITRO_THEME = "cloudcord_nitro_theme";
const ClientThemesBackgroundStore: any = findStoreLazy("ClientThemesBackgroundStore");
let keptThemePreset: number | null = (() => { try { const value = Number(localStorage.getItem(LS_NITRO_THEME)); return Number.isFinite(value) && value > 0 ? value : null; } catch { return null; } })();
function rememberTheme(action: any) {
    const theme = action?.changes?.appearance?.settings?.clientThemeSettings;
    if (!theme || !("backgroundGradientPresetId" in theme)) return;
    keptThemePreset = typeof theme.backgroundGradientPresetId === "number" ? theme.backgroundGradientPresetId : null;
    try { if (keptThemePreset != null) localStorage.setItem(LS_NITRO_THEME, String(keptThemePreset)); else localStorage.removeItem(LS_NITRO_THEME); } catch (e) { logger.warn("Saving Nitro theme failed", e); }
}
let themeTimer: ReturnType<typeof setTimeout> | undefined;
function restoreKeptTheme() {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(() => {
        if (!extras.fakeNitro || keptThemePreset == null) return;
        try {
            if (ClientThemesBackgroundStore?.gradientPreset?.id === keptThemePreset) return;
            FluxDispatcher.dispatch({ type: "UPDATE_BACKGROUND_GRADIENT_PRESET", presetId: keptThemePreset });
        } catch (e) { logger.warn("Restoring Nitro theme failed", e); }
    }, 400);
}
const THEME_SYNC_EVENTS = ["USER_SETTINGS_PROTO_UPDATE", "CONNECTION_OPEN", "OVERLAY_INITIALIZE", "CURRENT_USER_UPDATE"];

export function startExtras() {
    FluxDispatcher.subscribe("SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE", rememberTheme);
    for (const type of THEME_SYNC_EVENTS) FluxDispatcher.subscribe(type, restoreKeptTheme);
    restoreKeptTheme();
    installOrbHooks();
    // The wallet store registers late; keep trying for a minute.
    let tries = 0;
    orbRetry = setInterval(() => { installOrbHooks(); if ((orbStores.currency && orbStores.wallet) || ++tries > 20) clearInterval(orbRetry); }, 3000);
    installGiftHook();
    installBoostHooks();
    applyFakeNitro();
    restoreFakeRequests();
    FluxDispatcher.subscribe("CONNECTION_OPEN", applyFakeNitro);
    FluxDispatcher.subscribe("CURRENT_USER_UPDATE", applyFakeNitro);
    FluxDispatcher.subscribe("CONNECTION_OPEN", installOrbHooks);
    FluxDispatcher.subscribe("CONNECTION_OPEN", restoreSoon);
    for (const type of SHOP_OPEN) FluxDispatcher.subscribe(type, pauseForShop);
    for (const type of SHOP_CLOSE) FluxDispatcher.subscribe(type, resumeAfterShop);
}
export function stopExtras() {
    FluxDispatcher.unsubscribe("SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE", rememberTheme);
    for (const type of THEME_SYNC_EVENTS) FluxDispatcher.unsubscribe(type, restoreKeptTheme);
    clearTimeout(themeTimer);
    for (const type of SHOP_OPEN) FluxDispatcher.unsubscribe(type, pauseForShop);
    for (const type of SHOP_CLOSE) FluxDispatcher.unsubscribe(type, resumeAfterShop);
    shopPaused = false;
    uninstallGiftHook();
    uninstallBoostHooks();
    clearInterval(orbRetry);
    uninstallOrbHooks();
    FluxDispatcher.unsubscribe("CONNECTION_OPEN", applyFakeNitro);
    FluxDispatcher.unsubscribe("CURRENT_USER_UPDATE", applyFakeNitro);
    FluxDispatcher.unsubscribe("CONNECTION_OPEN", installOrbHooks);
    FluxDispatcher.unsubscribe("CONNECTION_OPEN", restoreSoon);
    if (extras.fakeNitro) { const prev = extras; extras = { ...prev, fakeNitro: false }; applyFakeNitro(); extras = prev; }
    // Hide them while stopped, but keep them saved for next start.
    for (const id of [...fakeRequests]) removeFakeRequest(id, false);
}

export function ExtrasPanel() {
    const state = useExtras();
    const [friendId, setFriendId] = React.useState("");
    const [, force] = React.useReducer(x => x + 1, 0);
    const code = state.giftCode;
    const copy = () => { if (!code) return; navigator.clipboard?.writeText(giftUrl(code)).then(() => showToast("Copied gift link.", Toasts.Type.SUCCESS), () => { }); };
    return <>
        <Section title="Fake Nitro" description="Only on this device. Nothing changes for other people.">
            <Switch label="Act like I have Nitro" description="Removes Nitro previews, upsells and Get Nitro prompts. Turns on by itself while Nitro is on in your custom profile. Real Nitro features like big uploads still need real Nitro." checked={state.fakeNitro === true} onChange={value => { writeExtras({ ...extras, fakeNitro: value }); applyFakeNitro(); }} />
        </Section>
        <Section title="Fake orbs" description="Shows this many orbs in your wallet, only on this device. You can't spend them.">
            <input className="cpx-input" type="number" min={0} placeholder="Leave empty for your real balance" value={state.fakeOrbs ?? ""} onChange={event => { const text = event.currentTarget.value; const value = text === "" ? undefined : Math.max(0, Math.floor(Number(text) || 0)); installOrbHooks(); writeExtras({ ...extras, fakeOrbs: value }); refreshOrbs(); }} />
        </Section>
        <Section title="Fake Nitro gift" description="A gift link that shows as a Nitro gift only on your device. Everyone else sees an invalid link, and it can't be redeemed.">
            <Grid2>
                <SelectField label="Gift" options={GIFT_PLANS.map(item => ({ value: item.id, label: item.label }))} value={state.giftPlan ?? GIFT_PLANS[0].id} onChange={value => writeExtras({ ...extras, giftPlan: value, giftCode: extras.giftCode && newGiftCode() })} />
                <SelectField label="Design" options={GIFT_STYLES} value={state.giftStyle ?? 4} onChange={value => writeExtras({ ...extras, giftStyle: Number(value), giftCode: extras.giftCode && newGiftCode() })} />
            </Grid2>
            {code && <span className="cpx-hint">Changing the gift or design makes a new link, because Discord remembers each link once it's shown.</span>}
            {code && <input className="cpx-input" readOnly value={giftUrl(code)} onFocus={event => event.currentTarget.select()} />}
            <div className="cpx-inline">
                <button type="button" className="cpx-btn" onClick={() => writeExtras({ ...extras, giftCode: newGiftCode() })}>{code ? "Refresh link" : "Make link"}</button>
                {code && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={copy}>Copy</button>}
                {code && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => writeExtras({ ...extras, giftCode: undefined })}>Remove</button>}
            </div>
        </Section>
        <BoostSection />
        <Section title="Fake friend request" description="Paste a user ID (right-click them, Copy User ID). Only you see the request. Don't accept it: that sends them a real request.">
            <input className="cpx-input" placeholder="User ID, mention or profile link" inputMode="numeric" value={friendId} onChange={event => setFriendId(event.target.value)} />
            <div className="cpx-inline">
                <button type="button" className="cpx-btn" onClick={async () => { if (await addFakeRequestById(friendId)) { setFriendId(""); showToast("Fake friend request added. Check Friends, Pending.", Toasts.Type.SUCCESS); } force(); }}>Add request</button>
                {savedRequests().length > 0 && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => { for (const item of savedRequests()) removeFakeRequest(item.id); force(); }}>Remove all ({savedRequests().length})</button>}
            </div>
            <span className="cpx-hint">They stay until you remove them, even after restarting.</span>
        </Section>
        <Section title="Account tools">
            <div className="cpx-inline">
                <button type="button" className="cpx-btn cpx-btn-danger" onClick={confirmLeaveAll}>Leave all servers</button>
                <button type="button" className="cpx-btn cpx-btn-danger" onClick={confirmReset}>Reset CloudCord</button>
            </div>
            <span className="cpx-hint">Leave all servers skips servers you own and asks twice. Reset deletes everything CloudCord saved on this device.</span>
        </Section>
    </>;
}
