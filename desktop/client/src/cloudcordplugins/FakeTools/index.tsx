/*
 * CloudCord Fake Tools
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Alerts, FluxDispatcher, GuildStore, Menu, NavigationRouter, React, ReadStateStore, RelationshipStore, SelectedChannelStore, SelectedGuildStore, showToast, Toasts, UserStore } from "@webpack/common";

// Device-only pranks and previews. Nothing here is sent to Discord.

const STORE_KEY = "CloudCord_fakeTools";
interface FakeToolsData {
    /** channelId -> fake ping count */
    pings?: Record<string, number>;
    /** guildId -> user ids you "banned" (their messages are hidden on this device) */
    bans?: Record<string, string[]>;
}
let data: FakeToolsData = {};
const save = () => DataStore.set(STORE_KEY, data);
const changed = new Set<() => void>();
const notify = () => changed.forEach(listener => listener());
function useData() {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => { changed.add(force); return () => void changed.delete(force); }, []);
    return data;
}

const settings = definePluginSettings({
    banScreenKey: {
        type: OptionType.STRING,
        description: "Keybind for the fake account-disabled screen (Esc closes it)",
        default: "Ctrl+Shift+B",
    },
});

// ---- Fake account-disabled screen ----
let banScreen: HTMLElement | null = null;
export function showBanScreen(kind: "disabled" | "suspended" = "disabled") {
    if (banScreen) return;
    const until = new Date(Date.now() + 14 * 86400_000).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    banScreen = document.createElement("div");
    banScreen.className = "cc-ban-screen";
    banScreen.innerHTML = `<div class="cc-ban-card">
        <div class="cc-ban-icon">!</div>
        <h1>${kind === "disabled" ? "Your account has been disabled" : "Your account has been suspended"}</h1>
        <p>${kind === "disabled"
            ? "Your account was disabled for violating Discord's Terms of Service or Community Guidelines. You can no longer use this account."
            : `Your account has been suspended until ${until} for violating Discord's Terms of Service or Community Guidelines.`}</p>
        <div class="cc-ban-buttons"><button data-close>Log Out</button><button data-close class="cc-ban-ghost">Learn more</button></div>
        <span class="cc-ban-hint">Press Esc to close</span></div>`;
    banScreen.addEventListener("click", event => { if ((event.target as HTMLElement).closest("[data-close]")) hideBanScreen(); });
    document.body.appendChild(banScreen);
}
export function hideBanScreen() { banScreen?.remove(); banScreen = null; }
const matchesKey = (event: KeyboardEvent, combo: string) => {
    const parts = combo.toLowerCase().split("+").map(part => part.trim());
    const key = parts[parts.length - 1];
    return event.key.toLowerCase() === key && event.ctrlKey === parts.includes("ctrl") && event.shiftKey === parts.includes("shift") && event.altKey === parts.includes("alt");
};
const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && banScreen) { hideBanScreen(); event.stopPropagation(); return; }
    if (matchesKey(event, settings.store.banScreenKey || "Ctrl+Shift+B")) { banScreen ? hideBanScreen() : showBanScreen(); event.preventDefault(); }
};

// ---- Fake removal from a server, after a delay ----
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
export function scheduleRemoval(guildId: string, seconds: number, kind: "kick" | "ban", reason: string) {
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return showToast("Pick a server first.", Toasts.Type.FAILURE);
    clearTimeout(removalTimers.get(guildId));
    removalTimers.set(guildId, setTimeout(() => {
        removalTimers.delete(guildId);
        const name = guild.name;
        if (SelectedGuildStore.getGuildId() === guildId) NavigationRouter.transitionTo("/channels/@me");
        // Takes the server out of your list on this device. Reloading Discord brings it back.
        try { FluxDispatcher.dispatch({ type: "GUILD_DELETE", guild: { id: guildId, unavailable: false } }); } catch { }
        Alerts.show({
            title: kind === "ban" ? `You've been banned from ${name}` : `You've been removed from ${name}`,
            body: <div className="cc-removal">
                <p>{kind === "ban" ? `A moderator banned you from ${name}.` : `A moderator removed you from ${name}.`}</p>
                {reason.trim() && <p><b>Reason:</b> {reason.trim()}</p>}
            </div>,
            confirmText: "Okay",
        });
    }, Math.max(1, seconds) * 1000));
    notify();
}
export const cancelRemoval = (guildId: string) => { clearTimeout(removalTimers.get(guildId)); removalTimers.delete(guildId); notify(); };
export const pendingRemovals = () => [...removalTimers.keys()];

// ---- Fake typing ----
let typingTimer: ReturnType<typeof setInterval> | undefined;
let typingUntil = 0;
export function startTyping(channelId: string, userIds: string[], seconds: number) {
    stopTyping();
    const ids = userIds.filter(id => /^\d{15,22}$/.test(id)).slice(0, 10);
    if (!channelId || !ids.length) return showToast("Open a chat and add at least one user ID.", Toasts.Type.FAILURE);
    typingUntil = Date.now() + Math.max(5, seconds) * 1000;
    const tick = () => {
        if (Date.now() > typingUntil) return stopTyping();
        for (const userId of ids) try { FluxDispatcher.dispatch({ type: "TYPING_START", channelId, userId }); } catch { }
    };
    tick();
    typingTimer = setInterval(tick, 8000);
    notify();
}
export function stopTyping() { clearInterval(typingTimer); typingTimer = undefined; typingUntil = 0; notify(); }
export const typingActive = () => !!typingTimer;

// ---- Fake unread pings ----
const GuildReadStateStore: any = findStoreLazy("GuildReadStateStore");
let pingOriginals: { channel?: any; guild?: any; unread?: any; } | null = null;
const channelPings = (channelId: string) => data.pings?.[channelId] ?? 0;
const guildPings = (guildId: string) => Object.entries(data.pings ?? {})
    .reduce((sum, [channelId, count]) => sum + ((ChannelStoreLazy.getChannel(channelId) as any)?.guild_id === guildId ? count : 0), 0);
const ChannelStoreLazy: any = findStoreLazy("ChannelStore");
function installPingHooks() {
    if (pingOriginals) return;
    pingOriginals = {};
    const rs: any = ReadStateStore;
    if (typeof rs?.getMentionCount === "function") {
        pingOriginals.channel = rs.getMentionCount;
        rs.getMentionCount = function (channelId: string, ...rest: unknown[]) { return channelPings(channelId) || pingOriginals!.channel.call(this, channelId, ...rest); };
    }
    if (typeof rs?.hasUnread === "function") {
        pingOriginals.unread = rs.hasUnread;
        rs.hasUnread = function (channelId: string, ...rest: unknown[]) { return channelPings(channelId) > 0 || pingOriginals!.unread.call(this, channelId, ...rest); };
    }
    try {
        if (typeof GuildReadStateStore?.getMentionCount === "function") {
            pingOriginals.guild = GuildReadStateStore.getMentionCount;
            GuildReadStateStore.getMentionCount = function (guildId: string, ...rest: unknown[]) { return (pingOriginals!.guild.call(this, guildId, ...rest) || 0) + guildPings(guildId); };
        }
    } catch { /* older clients have no guild read state store */ }
}
function uninstallPingHooks() {
    if (!pingOriginals) return;
    const rs: any = ReadStateStore;
    if (pingOriginals.channel) rs.getMentionCount = pingOriginals.channel;
    if (pingOriginals.unread) rs.hasUnread = pingOriginals.unread;
    try { if (pingOriginals.guild) GuildReadStateStore.getMentionCount = pingOriginals.guild; } catch { }
    pingOriginals = null;
}
const refreshBadges = () => { for (const store of [ReadStateStore as any, GuildReadStateStore]) try { store?.emitChange?.(); } catch { } };
export function setPings(channelId: string, count: number) {
    data.pings = { ...data.pings };
    if (count > 0) data.pings[channelId] = Math.min(count, 9999); else delete data.pings[channelId];
    void save(); refreshBadges(); notify();
}

// ---- Fake bans: hide a user's messages in a server, on this device ----
let blockedOriginal: any = null;
const fakeBanned = (userId: string) => {
    const guildId = SelectedGuildStore.getGuildId();
    return !!guildId && !!data.bans?.[guildId]?.includes(userId);
};
function installBanHooks() {
    const rs: any = RelationshipStore;
    if (blockedOriginal || typeof rs?.isBlocked !== "function") return;
    blockedOriginal = rs.isBlocked;
    // Discord collapses messages from blocked people; fake-banned people count as blocked in that server.
    rs.isBlocked = function (userId: string, ...rest: unknown[]) { return fakeBanned(userId) || blockedOriginal.call(this, userId, ...rest); };
}
function uninstallBanHooks() { if (blockedOriginal) { (RelationshipStore as any).isBlocked = blockedOriginal; blockedOriginal = null; } }
export function fakeBan(guildId: string, userId: string, banned: boolean) {
    const list = new Set(data.bans?.[guildId] ?? []);
    if (banned) list.add(userId); else list.delete(userId);
    data.bans = { ...data.bans, [guildId]: [...list] };
    void save();
    try { (RelationshipStore as any).emitChange?.(); } catch { }
    const user = UserStore.getUser(userId) as any;
    showToast(banned ? `${user?.globalName || user?.username || "User"} was banned (only on your device).` : "Ban removed.", Toasts.Type.SUCCESS);
    notify();
}

const userMenu: NavContextMenuPatchCallback = (children, { user, guildId }: { user: any; guildId?: string; }) => {
    const guild = guildId ?? SelectedGuildStore.getGuildId();
    if (!user?.id || !guild || user.id === (UserStore.getCurrentUser() as any)?.id) return;
    const banned = !!data.bans?.[guild]?.includes(user.id);
    children.push(<Menu.MenuItem id="cc-fake-ban" label={banned ? "Unban (fake)" : "Ban (fake)"} color={banned ? undefined : "danger"} action={() => fakeBan(guild, user.id, !banned)} />);
};

/** The Fake tools section in Extras. */
export function FakeToolsSection({ Section, SelectField }: { Section: any; SelectField: any; }) {
    const state = useData();
    const guilds = Object.values(GuildStore.getGuilds() as Record<string, any>).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const [guildId, setGuildId] = React.useState("");
    const [delay, setDelay] = React.useState("30");
    const [unit, setUnit] = React.useState<"s" | "m">("s");
    const [kind, setKind] = React.useState<"kick" | "ban">("kick");
    const [reason, setReason] = React.useState("");
    const [typers, setTypers] = React.useState("");
    const [typingFor, setTypingFor] = React.useState("60");
    const [pings, setPingsInput] = React.useState("");
    const channelId = SelectedChannelStore.getChannelId();
    const bannedCount = Object.values(state.bans ?? {}).reduce((sum, list) => sum + list.length, 0);
    return <>
        <Section title="Fake ban screen" description={`Shows a fake "account disabled" screen. Keybind: ${settings.store.banScreenKey || "Ctrl+Shift+B"} (change it in the FakeTools plugin settings). Esc closes it.`}>
            <div className="cpx-inline">
                <button type="button" className="cpx-btn" onClick={() => showBanScreen("disabled")}>Show disabled screen</button>
                <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => showBanScreen("suspended")}>Show suspended screen</button>
            </div>
        </Section>
        <Section title="Fake removal from a server" description="After the time you pick, the server leaves your list and you get a message that a moderator removed or banned you. Only on this device; reload Discord (Ctrl+R) to get the server back.">
            <SelectField label="Server" options={[{ value: "", label: "Pick a server" }, ...guilds.map(guild => ({ value: guild.id, label: guild.name }))]} value={guildId} onChange={(value: any) => setGuildId(String(value))} />
            <div className="cpx-inline">
                <input className="cpx-input" type="number" min={1} value={delay} onChange={event => setDelay(event.currentTarget.value)} style={{ width: 90 }} />
                <SelectField label="" options={[{ value: "s", label: "seconds" }, { value: "m", label: "minutes" }]} value={unit} onChange={(value: any) => setUnit(value)} />
                <SelectField label="" options={[{ value: "kick", label: "Removed (kick)" }, { value: "ban", label: "Banned" }]} value={kind} onChange={(value: any) => setKind(value)} />
            </div>
            <input className="cpx-input" placeholder="Reason (optional)" maxLength={200} value={reason} onChange={event => setReason(event.currentTarget.value)} />
            <div className="cpx-inline">
                <button type="button" className="cpx-btn" disabled={!guildId} onClick={() => { scheduleRemoval(guildId, (Number(delay) || 1) * (unit === "m" ? 60 : 1), kind, reason); showToast("Scheduled.", Toasts.Type.SUCCESS); }}>Start timer</button>
                {pendingRemovals().map(id => <button key={id} type="button" className="cpx-btn cpx-btn-ghost" onClick={() => cancelRemoval(id)}>Cancel {GuildStore.getGuild(id)?.name}</button>)}
            </div>
        </Section>
        <Section title="Fake typing" description="People look like they're typing in the chat you have open, on this device.">
            <input className="cpx-input" placeholder="User IDs, separated by commas" value={typers} onChange={event => setTypers(event.currentTarget.value)} />
            <div className="cpx-inline">
                <input className="cpx-input" type="number" min={5} value={typingFor} onChange={event => setTypingFor(event.currentTarget.value)} style={{ width: 90 }} />
                <span className="cpx-hint">seconds</span>
                {typingActive()
                    ? <button type="button" className="cpx-btn cpx-btn-ghost" onClick={stopTyping}>Stop</button>
                    : <button type="button" className="cpx-btn" onClick={() => startTyping(channelId ?? "", typers.split(/[\s,]+/), Number(typingFor) || 60)}>Start typing</button>}
            </div>
        </Section>
        <Section title="Fake unread pings" description="Red ping badges on the chat you have open (and its server), on this device.">
            <div className="cpx-inline">
                <input className="cpx-input" type="number" min={0} placeholder="Pings" value={pings} onChange={event => setPingsInput(event.currentTarget.value)} style={{ width: 110 }} />
                <button type="button" className="cpx-btn" disabled={!channelId} onClick={() => channelId && setPings(channelId, Math.floor(Number(pings) || 0))}>Set on this chat</button>
                {Object.keys(state.pings ?? {}).length > 0 && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => { data.pings = {}; void save(); refreshBadges(); notify(); }}>Clear all</button>}
            </div>
            <span className="cpx-hint">Opening the chat doesn't clear them; use Clear all.</span>
        </Section>
        <Section title="Fake bans" description="Right-click someone in a server and choose Ban (fake): their messages are hidden for you in that server, on this device. Nothing happens to them.">
            <span className="cpx-hint">{bannedCount ? `${bannedCount} fake ban${bannedCount === 1 ? "" : "s"}.` : "No fake bans yet."}</span>
            {bannedCount > 0 && <div className="cpx-inline"><button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => { data.bans = {}; void save(); try { (RelationshipStore as any).emitChange?.(); } catch { } notify(); }}>Remove all fake bans</button></div>}
        </Section>
    </>;
}

export default definePlugin({
    name: "FakeTools",
    description: "Device-only pranks: a fake account-disabled screen, fake removal from a server on a timer, fake typing, fake unread pings and fake bans that hide someone's messages for you. Controls are in Extras.",
    authors: [Devs.Xohus],
    tags: ["Fun"],
    enabledByDefault: true,
    settings,
    contextMenus: { "user-context": userMenu, "guild-user-context": userMenu },
    async start() {
        data = (await DataStore.get(STORE_KEY)) ?? {};
        installPingHooks(); installBanHooks(); refreshBadges();
        window.addEventListener("keydown", onKey, true);
    },
    stop() {
        window.removeEventListener("keydown", onKey, true);
        hideBanScreen(); stopTyping();
        for (const id of [...removalTimers.keys()]) cancelRemoval(id);
        uninstallPingHooks(); uninstallBanHooks(); refreshBadges();
    },
});
