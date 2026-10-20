/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Device-only extras that live in the Custom Profile editor: Fake Nitro, a local
// fake Nitro gift link, local fake friend requests, leave all servers and a full reset.

import * as DataStore from "@api/DataStore";
import { Alerts, FluxDispatcher, GuildStore, OverridePremiumTypeStore, React, RelationshipStore, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";

import { Section, Switch } from "./editorUi";

const LS_EXTRAS = "cloudcord_profile_extras";
const NITRO_APP_ID = "521842831262875670";
const NITRO_MONTHLY_SKU = "521847234246082599";
const NITRO_MONTHLY_PLAN = "511651880837840896";
const INCOMING_REQUEST = 3;

interface Extras { fakeNitro?: boolean; giftCode?: string; }

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
function applyFakeNitro() {
    try {
        const state = OverridePremiumTypeStore?.getState?.();
        if (!state) return;
        // Never lower a real subscription; only lift accounts without Nitro.
        if (extras.fakeNitro) { if (state.premiumTypeActual !== 2) state.premiumTypeOverride = 2; }
        else if (state.premiumTypeOverride === 2 && state.premiumTypeActual !== 2) state.premiumTypeOverride = undefined;
        (OverridePremiumTypeStore as any).emitChange?.();
    } catch { }
}

// ---- Fake gift link ----
const GIFT_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function newGiftCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, b => GIFT_CHARS[b % GIFT_CHARS.length]).join("");
}
const giftUrl = (code: string) => `https://discord.gift/${code}`;

function fakeGiftBody(code: string) {
    const me = UserStore.getCurrentUser() as any;
    return {
        code, sku_id: NITRO_MONTHLY_SKU, application_id: NITRO_APP_ID, uses: 0, max_uses: 1, redeemed: false,
        expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
        subscription_plan_id: NITRO_MONTHLY_PLAN,
        subscription_plan: { id: NITRO_MONTHLY_PLAN, name: "Nitro Monthly", interval: 1, interval_count: 1, tax_inclusive: true, sku_id: NITRO_MONTHLY_SKU, currency: "usd", price: 999, price_tier: null },
        user: me ? { id: me.id, username: me.username, global_name: me.globalName, avatar: me.avatar, discriminator: me.discriminator ?? "0" } : undefined,
        store_listing: null, gift_style: null, batch_id: null, promotion: null, flags: 0
    };
}

const giftPath = (url: unknown) => typeof url === "string" ? url.match(/\/entitlements\/gift-codes\/([A-Za-z0-9-]+)(\/redeem)?/) : null;
let restOriginals: { get: any; post: any; } | null = null;
// Only the code made on this device resolves as a gift, and only here. Everyone
// else (and this device after you make a new link) gets Discord's "invalid gift".
function installGiftHook() {
    if (restOriginals || !RestAPI) return;
    restOriginals = { get: RestAPI.get, post: RestAPI.post };
    const { get, post } = restOriginals;
    (RestAPI as any).get = function (req: any, ...rest: any[]) {
        const match = giftPath(req?.url);
        if (match && !match[2] && extras.giftCode && match[1] === extras.giftCode) return Promise.resolve({ ok: true, status: 200, body: fakeGiftBody(match[1]), headers: {} });
        return get.call(this, req, ...rest);
    };
    (RestAPI as any).post = function (req: any, ...rest: any[]) {
        const match = giftPath(req?.url);
        if (match?.[2] && extras.giftCode && match[1] === extras.giftCode) {
            showToast("This is your fake gift. It only looks real on your device.", Toasts.Type.MESSAGE);
            return Promise.reject({ ok: false, status: 400, body: { code: 50050, message: "This gift is only a preview on this device." } });
        }
        return post.call(this, req, ...rest);
    };
}
function uninstallGiftHook() {
    if (!restOriginals) return;
    (RestAPI as any).get = restOriginals.get; (RestAPI as any).post = restOriginals.post;
    restOriginals = null;
}

// ---- Fake friend requests ----
const fakeRequests = new Set<string>();
export function hasFakeRequest(userId: string) { return fakeRequests.has(userId); }
export function addFakeRequest(user: any) {
    if (RelationshipStore.getRelationshipType(user.id) !== 0) { showToast("You already have a friend request or friendship with this user.", Toasts.Type.FAILURE); return; }
    fakeRequests.add(user.id);
    FluxDispatcher.dispatch({ type: "RELATIONSHIP_ADD", relationship: { id: user.id, type: INCOMING_REQUEST, user, since: new Date().toISOString(), nickname: null }, shouldNotify: true });
}
export function removeFakeRequest(userId: string) {
    fakeRequests.delete(userId);
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

export function startExtras() {
    installGiftHook();
    applyFakeNitro();
    FluxDispatcher.subscribe("CONNECTION_OPEN", applyFakeNitro);
}
export function stopExtras() {
    uninstallGiftHook();
    FluxDispatcher.unsubscribe("CONNECTION_OPEN", applyFakeNitro);
    if (extras.fakeNitro) { const prev = extras; extras = { ...prev, fakeNitro: false }; applyFakeNitro(); extras = prev; }
    for (const id of [...fakeRequests]) removeFakeRequest(id);
}

export function ExtrasPanel() {
    const state = useExtras();
    const code = state.giftCode;
    const copy = () => { if (!code) return; navigator.clipboard?.writeText(giftUrl(code)).then(() => showToast("Copied gift link.", Toasts.Type.SUCCESS), () => { }); };
    return <>
        <Section title="Fake Nitro" description="Only on this device. Nothing changes for other people.">
            <Switch label="Act like I have Nitro" description="Removes Nitro previews, upsells and Get Nitro prompts. Real Nitro features like big uploads still need real Nitro." checked={state.fakeNitro === true} onChange={value => { writeExtras({ ...extras, fakeNitro: value }); applyFakeNitro(); }} />
        </Section>
        <Section title="Fake Nitro gift" description="A gift link that shows as a Nitro gift only on your device. Everyone else sees an invalid link, and it can't be redeemed.">
            {code && <input className="cpx-input" readOnly value={giftUrl(code)} onFocus={event => event.currentTarget.select()} />}
            <div className="cpx-inline">
                <button type="button" className="cpx-btn" onClick={() => writeExtras({ ...extras, giftCode: newGiftCode() })}>{code ? "Refresh link" : "Make link"}</button>
                {code && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={copy}>Copy</button>}
                {code && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => writeExtras({ ...extras, giftCode: undefined })}>Remove</button>}
            </div>
        </Section>
        <Section title="Fake friend request" description="Right-click anyone and pick Fake friend request. Only you see it. Don't accept it: that sends them a real request.">
            <span className="cpx-hint">{fakeRequests.size ? `${fakeRequests.size} showing now. They go away when Discord restarts.` : "None showing."}</span>
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
