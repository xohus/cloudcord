/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Device-only extras that live in the Custom Profile editor: Fake Nitro, a local
// fake Nitro gift link, local fake friend requests, leave all servers and a full reset.

import * as DataStore from "@api/DataStore";
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

interface BoostFake { level?: boolean; booster?: boolean; }
interface Extras { fakeNitro?: boolean; giftCode?: string; giftPlan?: string; giftStyle?: number; boosts?: Record<string, BoostFake>; fakeRequests?: { id: string; user: any; since: string; }[]; fakeOrbs?: number; }

function readExtras(): Extras {
    try { return JSON.parse(localStorage.getItem(LS_EXTRAS) || "{}") || {}; } catch { return {}; }
}
let extras: Extras = readExtras();
const listeners = new Set<() => void>();
function writeExtras(next: Extras) {
    extras = next;
    try { localStorage.setItem(LS_EXTRAS, JSON.stringify(next)); } catch { }
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

function applyFakeNitro() {
    try {
        const state = OverridePremiumTypeStore?.getState?.();
        if (!state) return;
        const ownerId = UserStore.getCurrentUser()?.id || "";
        let changed = false;
        if (ownedNitroOverride && (ownedNitroOverride.state !== state || ownedNitroOverride.ownerId !== ownerId)) {
            changed = restoreFakeNitroOverride(ownedNitroOverride.state === state);
        }
        if (extras.fakeNitro && !shopPaused && ownerId && state.premiumTypeActual !== 2) {
            // Own only the override installed here. Never erase another plugin's
            // override just because this switch defaults to off.
            if (!ownedNitroOverride && state.premiumTypeOverride !== 2) ownedNitroOverride = { state, ownerId, previous: state.premiumTypeOverride };
            if (state.premiumTypeOverride !== 2) { state.premiumTypeOverride = 2; changed = true; }
        } else changed = restoreFakeNitroOverride() || changed;
        if (changed) (OverridePremiumTypeStore as any).emitChange?.();
    } catch { }
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
let boostOriginals: { getGuild: any; getMember: any; } | null = null;
const guildOverlays = new WeakMap<object, any>();
const memberOverlays = new WeakMap<object, any>();
// Our own overlays, so a guild that comes back through getGuild is never wrapped twice.
const overlaySet = new WeakSet<object>();
function boostFor(guildId?: string | null) { return guildId ? extras.boosts?.[guildId] : undefined; }
// Read-only overlays: Discord's stores keep their real data, we only change what's returned.
function installBoostHooks() {
    if (boostOriginals || !GuildStore || !GuildMemberStore) return;
    boostOriginals = { getGuild: GuildStore.getGuild, getMember: GuildMemberStore.getMember };
    const { getGuild, getMember } = boostOriginals;
    (GuildStore as any).getGuild = function (guildId: string, ...rest: any[]) {
        const guild = getGuild.call(this, guildId, ...rest);
        if (!guild || typeof guild !== "object" || overlaySet.has(guild) || !boostFor(guildId)?.level) return guild;
        let overlay = guildOverlays.get(guild);
        if (!overlay) guildOverlays.set(guild, overlay = new Proxy(guild, { get: (target, key) => key === "premiumTier" ? 3 : key === "premiumSubscriberCount" ? Math.max(14, target.premiumSubscriberCount ?? 0) : Reflect.get(target, key, target) }));
        overlaySet.add(overlay);
        return overlay;
    };
    (GuildMemberStore as any).getMember = function (guildId: string, userId: string, ...rest: any[]) {
        const member = getMember.call(this, guildId, userId, ...rest);
        if (!member || member.premiumSince || !boostFor(guildId)?.booster || userId !== UserStore.getCurrentUser()?.id) return member;
        let overlay = memberOverlays.get(member);
        if (!overlay) memberOverlays.set(member, overlay = { ...member, premiumSince: BOOST_SINCE.toISOString() });
        return overlay;
    };
}
function uninstallBoostHooks() {
    if (!boostOriginals) return;
    (GuildStore as any).getGuild = boostOriginals.getGuild; (GuildMemberStore as any).getMember = boostOriginals.getMember;
    boostOriginals = null;
}
function refreshGuildViews(guildId: string) {
    try { (GuildStore as any).emitChange?.(); (GuildMemberStore as any).emitChange?.(); } catch { }
    try { FluxDispatcher.dispatch({ type: "GUILD_MEMBER_PROFILE_UPDATE", guildId }); } catch { }
}

function BoostSection() {
    const guildId = SelectedGuildStore.getGuildId();
    const guild = guildId ? GuildStore.getGuild(guildId) : null;
    const [times, setTimes] = React.useState(1);
    const [reached, setReached] = React.useState(0);
    const fake = boostFor(guildId) ?? {};
    const set = (patch: BoostFake) => { if (!guildId) return; writeExtras({ ...extras, boosts: { ...extras.boosts, [guildId]: { ...fake, ...patch } } }); refreshGuildViews(guildId); };
    return <Section title="Fake boost" description={guild ? `For ${guild.name}. Only on this device: other people see the real server.` : "Open a server first, then come back here."}>
        {guild && <>
            <Grid2>
                <SelectField label="Boosts" options={[1, 2, 3, 5, 10].map(value => ({ value, label: `${value}x` }))} value={times} onChange={value => setTimes(Number(value))} />
                <SelectField label="Message" options={[{ value: 0, label: "Just boosted" }, { value: 1, label: "Reached level 1" }, { value: 2, label: "Reached level 2" }, { value: 3, label: "Reached level 3" }]} value={reached} onChange={value => setReached(Number(value))} />
            </Grid2>
            <div className="cpx-inline"><button type="button" className="cpx-btn" onClick={() => sendFakeBoostMessage(times, reached)}>Send fake boost message</button></div>
            <span className="cpx-hint">Shows in the channel you have open and disappears when you switch channels or restart.</span>
            <Switch label="Show this server as Level 3" description="Boost bar and perks look unlocked here. Real limits like upload size don't change." checked={fake.level === true} onChange={value => set({ level: value })} />
            <Switch label="Show me as a booster here" description="The boosting icon by your name and Server Booster since on your profile." checked={fake.booster === true} onChange={value => set({ booster: value })} />
        </>}
    </Section>;
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
        try { user = (await RestAPI.get({ url: `/users/${id}` }))?.body; } catch { }
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
    try { await DataStore.clear(); } catch { }
    try { for (const key of Object.keys(localStorage)) if (/^(customProfile|cloudcord|CloudCord|Vencord|sincord)/i.test(key)) localStorage.removeItem(key); } catch { }
    try { await VencordNative.settings.set({} as any); } catch { }
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
    for (const store of [orbStores.currency, orbStores.wallet]) try { store?.emitChange?.(); } catch { }
}

let orbRetry: ReturnType<typeof setInterval> | undefined;
export function startExtras() {
    installOrbHooks();
    // The wallet store registers late; keep trying for a minute.
    let tries = 0;
    orbRetry = setInterval(() => { installOrbHooks(); if ((orbStores.currency && orbStores.wallet) || ++tries > 20) clearInterval(orbRetry); }, 3000);
    installGiftHook();
    installBoostHooks();
    applyFakeNitro();
    restoreFakeRequests();
    FluxDispatcher.subscribe("CONNECTION_OPEN", applyFakeNitro);
    FluxDispatcher.subscribe("CONNECTION_OPEN", installOrbHooks);
    FluxDispatcher.subscribe("CONNECTION_OPEN", restoreSoon);
    for (const type of SHOP_OPEN) FluxDispatcher.subscribe(type, pauseForShop);
    for (const type of SHOP_CLOSE) FluxDispatcher.subscribe(type, resumeAfterShop);
}
export function stopExtras() {
    for (const type of SHOP_OPEN) FluxDispatcher.unsubscribe(type, pauseForShop);
    for (const type of SHOP_CLOSE) FluxDispatcher.unsubscribe(type, resumeAfterShop);
    shopPaused = false;
    uninstallGiftHook();
    uninstallBoostHooks();
    clearInterval(orbRetry);
    uninstallOrbHooks();
    FluxDispatcher.unsubscribe("CONNECTION_OPEN", applyFakeNitro);
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
            <Switch label="Act like I have Nitro" description="Removes Nitro previews, upsells and Get Nitro prompts. Real Nitro features like big uploads still need real Nitro." checked={state.fakeNitro === true} onChange={value => { writeExtras({ ...extras, fakeNitro: value }); applyFakeNitro(); }} />
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
