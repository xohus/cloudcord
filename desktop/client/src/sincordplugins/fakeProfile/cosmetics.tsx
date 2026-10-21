/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { withTimeout } from "@utils/asyncTimeout";
import { ACTIVITY_TYPES, Catalog, customServerTagIcon, nameplateAssetURL, nativeActivities, normalizeProfileAppearance, parseCatalog, PRESENCE_STATUSES, ProfileAppearance, serverTagCustomIcon, streamURL, TAG_ICON_MAX_LENGTH } from "@utils/profileAppearance";
import { findByCode, findStore } from "@webpack";
import { PresenceStore, React, RestAPI, UserStore } from "@webpack/common";

// ---------- Discord's collectibles catalog ----------
// Read from the signed-in client's own shop endpoints, so the lists match what
// Discord currently offers instead of a hard-coded snapshot.

let catalog: Catalog | null = null;
let catalogPromise: Promise<Catalog> | null = null;
let catalogFailedAt = 0;
const listeners = new Set<() => void>();
async function get(url: string, query?: Record<string, any>): Promise<any> {
    const response: any = await withTimeout(RestAPI.get({ url, query, retries: 1 } as any), 8000);
    return response?.body;
}

function shopStore(): any {
    try { return findStore("CollectiblesCategoryStore"); } catch { return null; }
}

async function fromDiscordStore(effects: any): Promise<Catalog | null> {
    const store = shopStore();
    if (!store) return null;
    if (!store.products?.size) {
        try {
            const fetchCategories: any = findByCode('"COLLECTIBLES_CATEGORIES_FETCH"', "CATEGORIES_FETCH_STARTED");
            if (typeof fetchCategories === "function") await withTimeout(Promise.resolve(fetchCategories()), 8000);
        } catch { }
    }
    const products = store.products ? [...store.products.values()] : [];
    return products.length ? parseCatalog([{ products }], effects) : null;
}

export function loadCatalog(force = false): Promise<Catalog> {
    if (catalog && !force) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    if (!force && Date.now() - catalogFailedAt < 60_000) return Promise.reject(new Error("Discord's catalog is unavailable right now. Try again in a minute."));
    catalogPromise = (async () => {
        const effects = await get("/user-profile-effects").catch(() => null);
        // Prefer Discord's own shop store: it has every product type, including
        // profile frames, and keeps Discord's renderer able to draw them.
        let parsed = await fromDiscordStore(effects);
        if (!parsed) {
            const categories = await get("/collectibles-categories/v2").catch(() => get("/collectibles-categories"));
            parsed = parseCatalog(categories, effects);
        }
        if (!parsed.decorations.length && !parsed.nameplates.length && !parsed.effects.length && !parsed.frames.length) throw new Error("Discord returned an empty catalog.");
        catalog = parsed;
        listeners.forEach(listener => { try { listener(); } catch { /* A closed editor cannot invalidate a loaded catalog. */ } });
        return parsed;
    })().catch(error => {
        catalogFailedAt = Date.now();
        throw error instanceof Error && error.message ? error : new Error("Couldn't load Discord's catalog. Check your connection and try again.");
    }).finally(() => { catalogPromise = null; });
    return catalogPromise;
}

/** Full effect config for Discord's renderer; starts loading the catalog when unknown. */
export function profileEffectFor(skuId: string | undefined): any {
    if (!skuId) return null;
    const known = catalog?.effects.find(effect => effect.skuId === skuId);
    if (!known && !catalog) loadCatalog().catch(() => { });
    return { ...(known?.config || {}), skuId, expiresAt: null };
}

export function onCatalogLoaded(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export { nameplateAssetURL, parseCatalog };

// ---------- presence: custom status, activity and status dot ----------

type DataLookup = (userId: string) => ProfileAppearance | undefined;
type Patched = { store: any; originals: Record<string, Function>; };
let patchedStores: Patched[] | null = null;

const selfStore = (): any => { try { return findStore("SelfPresenceStore"); } catch { return null; } };
const myId = (): string => { try { return String(UserStore.getCurrentUser()?.id || ""); } catch { return ""; } };

function mergeActivities(data: ProfileAppearance | undefined, real: any) {
    const custom = data ? nativeActivities(data) : [];
    if (!custom.length) return real;
    const hasStatus = custom.some(activity => activity.type === 4);
    return [...custom, ...(Array.isArray(real) ? real : []).filter(activity => !activity?.cloudcordCustom && !(hasStatus && activity?.type === 4))];
}

function restyleStatus(data: ProfileAppearance | undefined, real: string) {
    const wanted = normalizeProfileAppearance(data || {}).presenceStatus;
    // Only restyle someone who is actually online; never make an offline account look online.
    if (!wanted || real === "offline") return real;
    return wanted === "invisible" ? "offline" : wanted;
}

/** Wraps read methods only. userArg: the store's methods take a user ID first (PresenceStore)
 * or describe the signed-in user (SelfPresenceStore). Nothing here is sent to Discord. */
function hookStore(store: any, userArg: boolean, lookup: DataLookup): Patched | null {
    if (!store) return null;
    const originals: Record<string, Function> = {};
    const user = (args: any[]) => userArg ? String(args[0] ?? "") : myId();
    const wrap = (name: string, fn: (data: ProfileAppearance | undefined, real: any, args: any[]) => any) => {
        if (typeof store[name] !== "function") return;
        const original = store[name];
        originals[name] = original;
        store[name] = function (...args: any[]) {
            const real = original.apply(this, args);
            try { const id = user(args); return id ? fn(lookup(id), real, args) : real; } catch { return real; }
        };
    };
    for (const name of ["getActivities", "getUnfilteredActivities"]) wrap(name, (data, real) => mergeActivities(data, real));
    wrap("getPrimaryActivity", (data, real) => (data && nativeActivities(data).find(activity => activity.type !== 4)) || real);
    wrap("findActivity", (data, real, args) => {
        const predicate = args[userArg ? 1 : 0];
        return (data && typeof predicate === "function" && nativeActivities(data).find(predicate)) || real;
    });
    wrap("getStatus", (data, real) => restyleStatus(data, real));
    return { store, originals };
}

export function installPresenceHooks(lookup: DataLookup) {
    if (patchedStores) return;
    patchedStores = [hookStore(PresenceStore, true, lookup), hookStore(selfStore(), false, lookup)].filter(Boolean) as Patched[];
}

export function uninstallPresenceHooks() {
    for (const { store, originals } of patchedStores || []) Object.assign(store, originals);
    patchedStores = null;
}

export function refreshPresence() {
    try { (PresenceStore as any)?.emitChange?.(); } catch { }
    try { selfStore()?.emitChange?.(); } catch { }
}

// ---------- custom server tag icon ----------
// The tag travels through Discord's badge-hash field as a key; images that
// Discord builds for that key are swapped for the uploaded icon.

let tagObserver: MutationObserver | null = null;
const TAG_IMAGE = /\/guild-tag-badges\/\d{15,22}\/(cc[a-f0-9]{30})\./;

function swapTagImage(image: HTMLImageElement) {
    const key = image.src.match(TAG_IMAGE)?.[1];
    const icon = key && customServerTagIcon(key);
    if (icon && image.src !== icon) { image.dataset.ccTagIcon = key; image.src = icon; }
}

export function installTagIconSwap() {
    if (tagObserver || typeof MutationObserver === "undefined") return;
    const scan = (root: ParentNode) => root.querySelectorAll?.<HTMLImageElement>('img[src*="/guild-tag-badges/"]').forEach(swapTagImage);
    tagObserver = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === "attributes" && record.target instanceof HTMLImageElement) swapTagImage(record.target);
            record.addedNodes.forEach(node => {
                if (node instanceof HTMLImageElement) swapTagImage(node);
                else if (node instanceof Element) scan(node);
            });
        }
    });
    tagObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    scan(document);
}

export function uninstallTagIconSwap() {
    tagObserver?.disconnect();
    tagObserver = null;
}

/** Resize an uploaded image to a 64×64 PNG data URL small enough to sync. */
export function readTagIcon(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error("Choose a PNG, JPEG, WebP or GIF image."));
        if (file.size > 4 * 1024 * 1024) return reject(new Error("Choose an image under 4 MB."));
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 64;
            const context = canvas.getContext("2d");
            if (!context) { URL.revokeObjectURL(url); return reject(new Error("Your browser couldn't process that image.")); }
            const scale = Math.min(64 / image.width, 64 / image.height);
            const width = image.width * scale, height = image.height * scale;
            context.drawImage(image, (64 - width) / 2, (64 - height) / 2, width, height);
            URL.revokeObjectURL(url);
            const data = canvas.toDataURL("image/png");
            data.length > TAG_ICON_MAX_LENGTH ? reject(new Error("That icon is too detailed to sync. Try a simpler image.")) : resolve(data);
        };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't a readable image.")); };
        image.src = url;
    });
}

// ---------- editor ----------

type Setter = <K extends keyof ProfileAppearance>(key: K, value: ProfileAppearance[K]) => void;

function useCatalog() {
    const mounted = React.useRef(false);
    const request = React.useRef(0);
    const [state, setState] = React.useState<{ catalog: Catalog | null; error: string; loading: boolean; }>({ catalog, error: "", loading: !catalog });
    const load = React.useCallback((force = false) => {
        if (!mounted.current) return;
        const revision = ++request.current;
        setState(previous => ({ ...previous, loading: true, error: "" }));
        loadCatalog(force).then(result => {
            if (mounted.current && request.current === revision) setState({ catalog: result, error: "", loading: false });
        }, error => {
            if (mounted.current && request.current === revision) setState(previous => ({ ...previous, error: error?.message || "Couldn't load Discord's catalog. Retry when connected.", loading: false }));
        });
    }, []);
    React.useEffect(() => { mounted.current = true; if (!catalog) load(); return () => { mounted.current = false; request.current++; }; }, []);
    return { ...state, retry: () => load(true) };
}

function CatalogState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void; }) {
    if (loading) return <div className="cp-cos-state" role="status"><span className="cp-cos-spinner" aria-hidden="true" />Loading Discord's catalog…</div>;
    if (error) return <div className="cp-cos-state cp-cos-error" role="alert"><span>{error}</span><button className="cp-btn cp-btn-ghost" onClick={retry}>Try again</button></div>;
    return null;
}

/** "Currently using" strip so the choice is visible without scrolling the grid. */
export function Current({ label, image, wide, onRemove }: { label: string | null; image?: string; wide?: boolean; onRemove: () => void; }) {
    return <div className="cp-cos-current">
        {label
            ? <>{image && <img className={wide ? "cp-cos-current-wide" : "cp-cos-current-square"} src={image} alt="" />}<span className="cp-cos-current-label">{label}</span><button className="cp-btn cp-btn-ghost" onClick={onRemove}>Remove</button></>
            : <span className="cp-cos-current-label cp-cos-muted">Nothing selected</span>}
    </div>;
}

export function PickerGrid<T>({ items, label, keyOf, textOf, isSelected, onPick, renderImage, wide, noneLabel, noneSelected, onNone }: {
    items: T[]; label: string; keyOf: (item: T) => string; textOf: (item: T) => string; isSelected: (item: T) => boolean; onPick: (item: T) => void;
    renderImage: (item: T) => string; wide?: boolean; noneLabel: string; noneSelected: boolean; onNone: () => void;
}) {
    const [query, setQuery] = React.useState("");
    const [limit, setLimit] = React.useState(24);
    const needle = query.trim().toLowerCase();
    const filtered = needle ? items.filter(item => textOf(item).toLowerCase().includes(needle)) : items;
    return <div className="cp-cos-picker">
        <input className="cp-input" type="search" aria-label={`Search ${label}`} placeholder={`Search ${items.length} ${label}`} value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} />
        <div className={`cp-cos-grid ${wide ? "cp-cos-grid-wide" : ""}`} role="listbox" aria-label={label}>
            {!needle && <button role="option" aria-selected={noneSelected} className={`cp-cos-card cp-cos-none ${noneSelected ? "cp-cos-on" : ""}`} onClick={onNone}>
                <span className={`cp-cos-thumb ${wide ? "cp-cos-thumb-wide" : ""}`} aria-hidden="true">∅</span><span className="cp-cos-name">{noneLabel}</span>
            </button>}
            {filtered.slice(0, limit).map(item => {
                const selected = isSelected(item);
                return <button key={keyOf(item)} role="option" aria-selected={selected} title={textOf(item)} className={`cp-cos-card ${selected ? "cp-cos-on" : ""}`} onClick={() => onPick(item)}>
                    <span className={`cp-cos-thumb ${wide ? "cp-cos-thumb-wide" : ""}`}>{renderImage(item) ? <img src={renderImage(item)} alt="" loading="lazy" onError={event => event.currentTarget.setAttribute("data-broken", "")} /> : null}</span>
                    <span className="cp-cos-name">{textOf(item)}</span>
                </button>;
            })}
        </div>
        {!filtered.length && <div className="cp-cos-state">No {label} match “{query}”.</div>}
        {limit < filtered.length && <button className="cp-btn cp-btn-ghost cp-cos-more" onClick={() => setLimit(value => value + 36)}>Show more ({filtered.length - limit} left)</button>}
    </div>;
}

export function NameplateEditor({ data, set }: { data: ProfileAppearance; set: Setter; }) {
    const state = useCatalog();
    const current = data.nameplate;
    return <>
        <div className="cp-cos-section">
            <p className="cp-cos-help">The background behind your name in member lists and DMs.</p>
            <Current label={current ? current.label || "Nameplate" : null} image={current ? nameplateAssetURL(current.asset) : undefined} wide onRemove={() => set("nameplate", null)} />
            <CatalogState {...state} />
            {state.catalog && <PickerGrid items={state.catalog.nameplates} label="nameplates" wide keyOf={item => item.skuId} textOf={item => item.label}
                isSelected={item => current?.skuId === item.skuId} renderImage={item => nameplateAssetURL(item.asset)}
                onPick={item => set("nameplate", { skuId: item.skuId, asset: item.asset, label: item.label, palette: item.palette })}
                noneLabel="No nameplate" noneSelected={!current} onNone={() => set("nameplate", null)} />}
        </div>
    </>;
}

export function ProfileEffectEditor({ data, set }: { data: ProfileAppearance; set: Setter; }) {
    const state = useCatalog();
    const currentId = data.profileEffect?.skuId;
    const current = state.catalog?.effects.find(effect => effect.skuId === currentId);
    return <>
        <div className="cp-cos-section">
            <p className="cp-cos-help">An animated effect that plays over your profile card.</p>
            <Current label={currentId ? current?.title || "Profile effect" : null} image={current?.preview} onRemove={() => set("profileEffect", null)} />
            <CatalogState {...state} />
            {state.catalog && <PickerGrid items={state.catalog.effects} label="profile effects" keyOf={item => item.skuId} textOf={item => item.title}
                isSelected={item => currentId === item.skuId} renderImage={item => item.preview} onPick={item => set("profileEffect", { skuId: item.skuId })}
                noneLabel="No effect" noneSelected={!currentId} onNone={() => set("profileEffect", null)} />}
        </div>
    </>;
}

export function ProfileFrameEditor({ data, set }: { data: ProfileAppearance; set: Setter; }) {
    const state = useCatalog();
    const currentId = data.profileFrame?.skuId;
    const current = state.catalog?.frames.find(frame => frame.skuId === currentId);
    return <>
        <div className="cp-cos-section">
            <p className="cp-cos-help">A decorative frame around and above your whole profile card. On mobile only the top part shows.</p>
            <Current label={currentId ? current?.label || "Profile frame" : null} image={current?.preview || undefined} onRemove={() => set("profileFrame", null)} />
            <CatalogState {...state} />
            {state.catalog && (state.catalog.frames.length
                ? <PickerGrid items={state.catalog.frames} label="profile frames" keyOf={item => item.skuId} textOf={item => item.label}
                    isSelected={item => currentId === item.skuId} renderImage={item => item.preview} onPick={item => set("profileFrame", { skuId: item.skuId })}
                    noneLabel="No frame" noneSelected={!currentId} onNone={() => set("profileFrame", null)} />
                : <div className="cp-cos-state">Discord's shop didn't list any profile frames for your account.</div>)}
        </div>
    </>;
}

const PRESENCE_LABELS: Record<string, string> = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" };

export function StatusEditor({ data, set }: { data: ProfileAppearance; set: Setter; }) {
    const activity = data.customActivity;
    const status = data.customStatus;
    const urlProblem = activity?.type === 1 && !!activity.url && !streamURL(activity.url);
    const activityLabel = activity ? ACTIVITY_TYPES.find(type => type.value === activity.type)?.label : null;
    return <>
        <div className="cp-cos-section">
            <p className="cp-cos-help">Seen by people using CloudCord. Everyone else sees your real status.</p>

            <div className="cp-cos-block">
                <div className="cp-section-label">Status</div>
                <div className="cp-cos-segments" role="radiogroup" aria-label="Status">
                    {[["", "Real status"], ...PRESENCE_STATUSES.map(value => [value, PRESENCE_LABELS[value]])].map(([value, label]) =>
                        <button key={value} role="radio" aria-checked={(data.presenceStatus || "") === value} className={`cp-cos-segment ${(data.presenceStatus || "") === value ? "cp-cos-on" : ""}`}
                            onClick={() => set("presenceStatus", (value || null) as any)}>
                            {value && <span className={`cp-cos-dot cp-cos-dot-${value}`} aria-hidden="true" />}{label}
                        </button>)}
                </div>
                <div className="cp-cos-hint">Only changes how you look while you're actually online.</div>
            </div>

            <div className="cp-cos-block">
                <div className="cp-section-label">Custom status</div>
                <div className="cp-cos-row">
                    <input className="cp-input cp-cos-emoji" aria-label="Status emoji" placeholder="Emoji" maxLength={8} value={status?.emoji || ""} onChange={event => set("customStatus", { text: status?.text || "", emoji: event.target.value })} />
                    <input className="cp-input cp-cos-grow" aria-label="Status text" placeholder="What's on your mind?" maxLength={128} value={status?.text || ""} onChange={event => set("customStatus", { text: event.target.value, emoji: status?.emoji })} />
                    {status && <button className="cp-btn cp-btn-ghost" onClick={() => set("customStatus", null)}>Clear</button>}
                </div>
            </div>

            <div className="cp-cos-block">
                <div className="cp-section-label">Activity</div>
                <div className="cp-cos-segments" role="radiogroup" aria-label="Activity type">
                    {[{ value: -1, label: "None" }, ...ACTIVITY_TYPES].map(type =>
                        <button key={type.value} role="radio" aria-checked={(activity ? activity.type : -1) === type.value}
                            className={`cp-cos-segment ${(activity ? activity.type : -1) === type.value ? "cp-cos-on" : ""}`}
                            onClick={() => set("customActivity", type.value < 0 ? null : { name: "", details: "", state: "", ...(activity || {}), type: type.value as any })}>
                            {type.label}
                        </button>)}
                </div>
                {activity && <div className="cp-cos-fields">
                    <label className="cp-cos-label">{activity.type === 1 ? "What you're streaming" : `${activityLabel}…`}
                        <input className="cp-input" placeholder={activity.type === 1 ? "Fortnite, Just Chatting…" : activity.type === 2 ? "Song or artist" : "Game or show"} maxLength={128} value={activity.name} onChange={event => set("customActivity", { ...activity, name: event.target.value })} />
                    </label>
                    <div className="cp-cos-row">
                        <label className="cp-cos-label cp-cos-grow"><span>Details <span className="cp-cos-muted">(optional)</span></span>
                            <input className="cp-input" maxLength={128} value={activity.details || ""} onChange={event => set("customActivity", { ...activity, details: event.target.value })} />
                        </label>
                        <label className="cp-cos-label cp-cos-grow"><span>State <span className="cp-cos-muted">(optional)</span></span>
                            <input className="cp-input" maxLength={128} value={activity.state || ""} onChange={event => set("customActivity", { ...activity, state: event.target.value })} />
                        </label>
                    </div>
                    {activity.type === 1 && <label className="cp-cos-label">Stream link
                        <input className={`cp-input ${urlProblem ? "cp-cos-invalid" : ""}`} aria-invalid={urlProblem} placeholder="https://twitch.tv/yourname" value={activity.url || ""} onChange={event => set("customActivity", { ...activity, url: event.target.value })} />
                        <span className={urlProblem ? "cp-cos-hint cp-cos-error-text" : "cp-cos-hint"} role={urlProblem ? "alert" : undefined}>{urlProblem ? "Not a stream link Discord accepts. Use twitch.tv/yourname or a YouTube video link (youtube.com/watch?v=…)." : "Use twitch.tv/yourname or a YouTube video link (youtube.com/watch?v=…, youtu.be/… or youtube.com/live/…). Channel pages don't count."}</span>
                    </label>}
                    {!activity.name.trim() && <span className="cp-cos-hint cp-cos-error-text">Add a name or the activity won't show.</span>}
                </div>}
            </div>
        </div>
        <RichPresenceBlock />
    </>;
}

/** Real Rich Presence is handled by the CustomRPC plugin; unlike the cosmetics above it is
 * visible to everyone, because Discord broadcasts it. */
function RichPresenceBlock() {
    const plugin = (window as any).Vencord?.Plugins?.plugins?.CustomRPC;
    const [enabled, setEnabled] = React.useState<boolean>(() => !!Settings.plugins.CustomRPC?.enabled);
    const [pendingRestart, setPendingRestart] = React.useState(false);
    if (!plugin) return null;
    return <div className="cp-cos-block cp-cos-rpc">
        <div className="cp-section-label">Rich Presence</div>
        <p className="cp-cos-help">A full game-style activity with images, buttons and a timer. Unlike everything above, Rich Presence is real and <strong>everyone</strong> on Discord can see it.</p>
        <div className="cp-cos-row">
            {enabled && !pendingRestart
                ? <button className="cp-btn cp-btn-primary" onClick={() => openPluginModal(plugin)}>Edit Rich Presence</button>
                : <button className="cp-btn cp-btn-primary" disabled={pendingRestart} onClick={() => {
                    Settings.plugins.CustomRPC = { ...(Settings.plugins.CustomRPC || {}), enabled: true };
                    setEnabled(true); setPendingRestart(true);
                }}>{pendingRestart ? "Restart Discord to finish" : "Turn on Rich Presence"}</button>}
        </div>
        {pendingRestart && <div className="cp-cos-hint" role="status">Rich Presence is turned on. Restart Discord (Ctrl+R) to start using it, then come back here to edit it.</div>}
    </div>;
}

export function TagIconEditor({ tag, onChange }: { tag: NonNullable<ProfileAppearance["serverTag"]>; onChange: (icon: string | undefined) => void; }) {
    const fileRef = React.useRef<HTMLInputElement>(null);
    const [error, setError] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const icon = serverTagCustomIcon(tag.icon);
    return <div className="cp-cos-block">
        <div className="cp-section-label">Custom tag icon</div>
        <div className="cp-cos-row">
            <span className="cp-cos-tag-preview">{icon ? <img src={icon} alt="" /> : <span aria-hidden="true">?</span>}<strong>{tag.tag || "TAG"}</strong></span>
            <button className="cp-btn cp-btn-ghost" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Processing…" : icon ? "Change icon" : "Upload icon"}</button>
            {icon && <button className="cp-btn cp-btn-ghost" onClick={() => onChange(undefined)}>Remove</button>}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }}
                onChange={event => {
                    const file = event.target.files?.[0]; event.target.value = "";
                    if (!file) return;
                    setError(""); setBusy(true);
                    readTagIcon(file).then(onChange, problem => setError(problem.message)).finally(() => setBusy(false));
                }} />
        </div>
        {error && <div className="cp-cos-hint cp-cos-error-text" role="alert">{error}</div>}
        <div className="cp-cos-hint">Resized to 64×64 and shown instead of the server's badge.</div>
    </div>;
}
