import { ModalContent as NativeModalContent, ModalHeader as NativeModalHeader, ModalRoot as NativeModalRoot, openModal } from "@utils/modal";
import { connectionDomain, CustomConnectionPreview, customConnectionServiceName, CustomFriendPreview, customPreviewUsername, customSocialValidationErrors, fetchConnectionPreview, mergeCustomSocialLookup, normalizeCustomSocial, ProfileAppearance,searchConnectionItems } from "@utils/profileAppearance";
import { ChannelActionCreators, React } from "@webpack/common";
import type { CSSProperties } from "react";

import { SERVICE_ICON_PATHS } from "./serviceIcons";
const ModalRoot = NativeModalRoot as any;
const ModalHeader = NativeModalHeader as any;
const ModalContent = NativeModalContent as any;

type Entry = CustomFriendPreview | CustomConnectionPreview;
const panel: CSSProperties = { padding: 12, borderRadius: 12, background: "var(--background-secondary)", color: "var(--text-normal)", marginBottom: 10 };
const button: CSSProperties = { padding: "8px 12px", borderRadius: 8, background: "var(--background-tertiary)", color: "var(--text-normal)", cursor: "pointer" };
const fields: CSSProperties = { display: "grid", gap: 10 };

function Picture({ url, banner = false }: { url: string; banner?: boolean; }) {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => setFailed(false), [url]);
    return url && !failed ? <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} style={{ width: banner ? "100%" : 48, height: banner ? 120 : 48, borderRadius: banner ? 8 : "50%", objectFit: "cover" }} /> : banner ? null : <span aria-hidden style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--background-tertiary)", display: "grid", placeItems: "center" }}>👤</span>;
}

export function SocialDetail({ entry, onRemove }: { entry: Entry; onRemove?: () => void; }) {
    const connection = "service" in entry;
    const [actionError, setActionError] = React.useState("");
    return <div style={panel}>
        <Picture url={entry.banner} banner />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}><Picture url={entry.avatar} /><div><strong>{entry.displayName || entry.username || (connection ? entry.accountId : entry.userId)}</strong><div>{customPreviewUsername(entry.username)}</div></div></div>
        <p style={{ color: "var(--text-muted)" }}>Custom {connection ? `${customConnectionServiceName(entry.service)} connection` : "friend"} preview · Not verified</p>
        {!connection && entry.userId && <p>User ID: {entry.userId}</p>}
        {!connection && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            <button style={button} disabled={!/^\d{15,22}$/.test(entry.userId || "")} onClick={() => { setActionError(""); try { Promise.resolve(ChannelActionCreators.openPrivateChannel(entry.userId!)).catch(() => setActionError("Couldn't open this conversation.")); } catch { setActionError("Couldn't open this conversation."); } }}>Message</button>
            {onRemove && <button style={{...button,color:"var(--text-danger)"}} onClick={onRemove}>Remove friend preview</button>}
            {!entry.userId && <p style={{color:"var(--text-muted)"}}>Add a real Discord user ID to open a conversation.</p>}
        </div>}
        {actionError && <p role="alert">{actionError}</p>}
        {connection && entry.accountId && <p>Account ID: {entry.accountId}</p>}
        {entry.bio && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.bio}</p>}
        {!connection && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{entry.badges.map((badge, i) => <span key={i} title={badge.name} style={{ display: "flex", gap: 4, alignItems: "center" }}>{badge.icon && <img src={badge.icon} alt="" referrerPolicy="no-referrer" width={20} height={20} onError={e => { e.currentTarget.hidden = true; }} />}{badge.name}</span>)}</div>}
        {connection && <><dl>{entry.details.map((detail, i) => <div key={i} style={{ marginBottom: 8 }}><dt style={{ color: "var(--text-muted)" }}>{detail.label}</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{detail.value}</dd></div>)}</dl>{entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-link)" }}>Open external account page ↗</a>}</>}
        {connection && !!entry.items?.length && <div style={{display:"grid",gap:8,marginTop:12}}><h4>{entry.service === "youtube" ? "Selected videos" : "Selected games / content"}</h4>{entry.items.map((item,index)=><div key={`${item.id}-${index}`} style={{display:"flex",alignItems:"center",gap:8}}>{item.image&&<img src={item.image} alt="" referrerPolicy="no-referrer" width={64} height={40} style={{objectFit:"cover",borderRadius:6}}/>}<div>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer" style={{color:"var(--text-link)"}}>{item.title}</a>:<strong>{item.title}</strong>}<div style={{color:"var(--text-muted)"}}>{item.subtitle}</div></div></div>)}</div>}
    </div>;
}

export function openSocialDetail(entry: Entry, onRemove?: () => void) {
    openModal(props => <ModalRoot {...props}><ModalHeader><strong>{"service" in entry ? "Connection details" : "Friend profile"}</strong><button style={{ ...button, marginLeft: "auto" }} onClick={props.onClose}>Close</button></ModalHeader><ModalContent><SocialDetail entry={entry} onRemove={onRemove ? () => { onRemove(); props.onClose(); } : undefined} /></ModalContent></ModalRoot>);
}

/** Actions for an imported friend opened through their real Discord profile. */
export function FriendProfileActions({ userId, data, onRemove }: { userId: string; data?: ProfileAppearance | null; onRemove: (entry: CustomFriendPreview) => void; }) {
    const [removed, setRemoved] = React.useState(false);
    const [error, setError] = React.useState("");
    React.useEffect(() => setRemoved(false), [userId, data]);
    const friend = data?.customFriends?.find(entry => entry.userId === userId);
    if (!friend || removed) return null;
    return <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"12px 0"}} aria-label="Custom friend actions">
        <button style={button} onClick={() => { setError(""); try { Promise.resolve(ChannelActionCreators.openPrivateChannel(userId)).catch(() => setError("Couldn't open this conversation.")); } catch { setError("Couldn't open this conversation."); } }}>Message</button>
        <button style={button} onClick={() => openSocialDetail(friend, () => { onRemove(friend); setRemoved(true); })}>Friend details</button>
        <button style={{...button,color:"var(--text-danger)"}} onClick={() => { onRemove(friend); setRemoved(true); }}>Remove friend preview</button>
        {error && <p role="alert">{error}</p>}
    </div>;
}

const makeId = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const SERVICES: CustomConnectionPreview["service"][] = ["steam", "youtube", "roblox", "twitch", "github", "spotify", "x", "reddit", "tiktok", "instagram", "domain", "other"];
const contentLabel = (service: string) => service === "steam" ? "Search Steam games" : service === "youtube" ? "Search YouTube or paste a video link" : service === "roblox" ? "Roblox game link or universe ID" : service === "github" ? "GitHub repo link or owner/repo" : "Search content";

function SocialField({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; }) {
    const id = React.useMemo(() => `cpx-social-${Math.random().toString(36).slice(2, 9)}`, []);
    return <div className="cpx-field">
        <label className="cpx-label" htmlFor={id}>{label}</label>
        {multiline
            ? <textarea id={id} className="cpx-input" rows={3} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
            : <input id={id} className="cpx-input" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />}
    </div>;
}

function ServiceMark({ service }: { service: string; }) {
    const path = SERVICE_ICON_PATHS[service];
    return <span className={`cpx-service cpx-service-${service}`} aria-hidden="true">
        {path ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={path} /></svg> : customConnectionServiceName(service).slice(0, 2)}
    </span>;
}

export function CustomSocialEditor({ data, onChange }: { data: ProfileAppearance; onChange: (value: ProfileAppearance) => void; resolveUser?: (id: string) => Promise<Partial<CustomFriendPreview> | null>; }) {
    const [selected, setSelected] = React.useState<string | null>(null);
    const [error, setError] = React.useState("");
    const [accountQuery, setAccountQuery] = React.useState("");
    const [itemQuery, setItemQuery] = React.useState("");
    const [matches, setMatches] = React.useState<NonNullable<CustomConnectionPreview["items"]>>([]);
    const [fetching, setFetching] = React.useState<"" | "account" | "content">("");
    const connections = data.customConnections || [];
    const entry = connections.find(item => item.id === selected);
    const latest = React.useRef(data);
    latest.current = data;
    const activeSelection = React.useRef(selected);
    activeSelection.current = selected;
    const alive = React.useRef(true);
    React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    React.useEffect(() => { setAccountQuery(""); setItemQuery(""); setMatches([]); setError(""); }, [selected]);
    // Lookups finish asynchronously; only apply them to the same, still-selected entry.
    const reportLookupError = (before: CustomConnectionPreview, message: string) => {
        const current = latest.current.customConnections?.find(item => item.id === before.id);
        if (alive.current && activeSelection.current === before.id && current?.service === before.service) setError(message);
    };
    const showMatches = (before: CustomConnectionPreview, items: NonNullable<CustomConnectionPreview["items"]>) => {
        const current = latest.current.customConnections?.find(item => item.id === before.id);
        if (alive.current && activeSelection.current === before.id && current?.service === before.service) setMatches(items);
    };
    const change = (updated: CustomConnectionPreview) => {
        if (!alive.current || !entry) return;
        const items = latest.current.customConnections || [];
        const merged = mergeCustomSocialLookup(entry, items.find(item => item.id === updated.id), updated) as CustomConnectionPreview | null;
        if (merged) onChange({ customConnections: items.map(item => item.id === merged.id ? merged : item) });
    };
    const patch = (value: Partial<CustomConnectionPreview>) => { if (entry) change({ ...entry, mode: "manual", fetchedAt: "", ...value }); };
    const remove = (item: CustomConnectionPreview) => { onChange({ customConnections: connections.filter(other => other.id !== item.id) }); if (selected === item.id) setSelected(null); };
    const move = (item: CustomConnectionPreview, direction: number) => {
        const items = [...connections];
        const index = items.findIndex(other => other.id === item.id), target = index + direction;
        if (target < 0 || target >= items.length) return;
        [items[index], items[target]] = [items[target], items[index]];
        onChange({ customConnections: items });
    };
    const add = () => {
        const created: CustomConnectionPreview = { id: makeId(), service: "steam", accountId: "", username: "", displayName: "", avatar: "", banner: "", bio: "", url: "", details: [] };
        onChange({ customConnections: [...connections, created] });
        setSelected(created.id); setError("");
    };
    const issues = customSocialValidationErrors(data);

    return <div className="cpx-social">
        <div className="cpx-inline cpx-social-top">
            <span className="cpx-hint">{connections.length ? `${connections.length} of 30 connections` : "No connections yet."}</span>
            <button type="button" className="cpx-btn cpx-btn-primary" disabled={connections.length >= 30} onClick={add}>Add connection</button>
        </div>

        {connections.length > 0 && <ul className="cpx-social-list" aria-label="Connections">
            {connections.map((item, index) => <li key={item.id} className={`cpx-social-row ${selected === item.id ? "cpx-on" : ""}`}>
                <button type="button" className="cpx-social-main" aria-expanded={selected === item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>
                    <ServiceMark service={item.service} />
                    <span className="cpx-social-names">
                        <strong>{item.displayName || item.username || "New connection"}</strong>
                        <span className="cpx-hint">{customConnectionServiceName(item.service)}{item.username ? ` · ${customPreviewUsername(item.username)}` : ""}</span>
                    </span>
                </button>
                <div className="cpx-inline">
                    <button type="button" className="cpx-btn cpx-btn-ghost cpx-icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => move(item, -1)}>↑</button>
                    <button type="button" className="cpx-btn cpx-btn-ghost cpx-icon-btn" aria-label="Move down" disabled={index === connections.length - 1} onClick={() => move(item, 1)}>↓</button>
                    <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => openSocialDetail(normalizeCustomSocial({ customConnections: [{ ...item, username: item.username || "Preview" }] }).customConnections![0])}>Preview</button>
                    <button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => remove(item)}>Remove</button>
                </div>
            </li>)}
        </ul>}

        {entry && <div className="cpx-social-editor">
            <div className="cpx-field">
                <span className="cpx-label">Service</span>
                <div className="cpx-segmented" role="radiogroup" aria-label="Service">
                    {SERVICES.map(service => <button key={service} type="button" role="radio" aria-checked={entry.service === service}
                        className={`cpx-segment ${entry.service === service ? "cpx-on" : ""}`} onClick={() => { patch({ service }); setMatches([]); }}>{SERVICE_ICON_PATHS[service] && <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d={SERVICE_ICON_PATHS[service]} /></svg>}{customConnectionServiceName(service)}</button>)}
                </div>
            </div>

            {entry.service === "domain" && <div className="cpx-field">
                <SocialField label="Domain" placeholder="example.com" value={entry.accountId || entry.url} onChange={value => { const domain = connectionDomain({ url: "", accountId: value, username: "", displayName: "" }); patch({ accountId: value.trim(), url: domain ? `https://${domain}` : "", displayName: domain || entry.displayName }); }} />
                <span className={connectionDomain(entry) ? "cpx-hint" : "cpx-hint cpx-error"}>{connectionDomain(entry) ? `Shows as ${connectionDomain(entry)} with Discord's domain connection style.` : "Enter a domain like example.com."}</span>
            </div>}

            {entry.service !== "domain" && <div className="cpx-field">
                <span className="cpx-label">Fill in automatically</span>
                <div className="cpx-inline">
                    <input className="cpx-input" aria-label="Public account link, username or ID" placeholder="Public account link, username or ID" value={accountQuery} onChange={event => setAccountQuery(event.target.value)} />
                    <button type="button" className="cpx-btn" disabled={!!fetching} onClick={async () => {
                        const current = entry; setFetching("account"); setError("");
                        try { const found = await fetchConnectionPreview(current.service, accountQuery || current.url || current.accountId || current.username); change({ ...found, id: current.id }); }
                        catch (problem) { reportLookupError(current, problem instanceof Error ? problem.message : "Couldn't fetch public information."); }
                        finally { if (alive.current) setFetching(""); }
                    }}>{fetching === "account" ? "Fetching…" : "Fetch"}</button>
                </div>
                <span className="cpx-hint">Uses public information only, or fill the fields yourself. This doesn't prove you own the account.</span>
            </div>}

            <div className="cpx-grid2">
                <SocialField label="Display name" value={entry.displayName} onChange={displayName => patch({ displayName })} />
                <SocialField label="Username" value={entry.username} onChange={username => patch({ username })} />
                <SocialField label="Account ID" value={entry.accountId} onChange={accountId => patch({ accountId })} />
                <SocialField label="Account link" placeholder="https://" value={entry.url} onChange={url => patch({ url })} />
                <label className="cpx-check" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={entry.verified === true} onChange={event => patch({ verified: event.currentTarget.checked })} />
                    <span>Show the verified checkmark</span>
                </label>
                <SocialField label="Avatar image link" placeholder="https://" value={entry.avatar} onChange={avatar => patch({ avatar })} />
                <SocialField label="Banner image link" placeholder="https://" value={entry.banner} onChange={banner => patch({ banner })} />
            </div>
            <SocialField label="Bio" multiline value={entry.bio} onChange={bio => patch({ bio })} />

            <div className="cpx-field">
                <div className="cpx-label-row"><span className="cpx-label">Account details</span>
                    <button type="button" className="cpx-btn cpx-btn-ghost" disabled={entry.details.length >= 20} onClick={() => patch({ details: [...entry.details, { label: "", value: "" }] })}>Add detail</button></div>
                {!entry.details.length && <span className="cpx-hint">Things like level, hours played or member since.</span>}
                {entry.details.map((detail, index) => <div className="cpx-inline cpx-detail-row" key={index}>
                    <input className="cpx-input" aria-label="Detail label" placeholder="Label" value={detail.label} onChange={event => patch({ details: entry.details.map((old, i) => i === index ? { ...old, label: event.target.value } : old) })} />
                    <input className="cpx-input" aria-label="Detail value" placeholder="Value" value={detail.value} onChange={event => patch({ details: entry.details.map((old, i) => i === index ? { ...old, value: event.target.value } : old) })} />
                    <button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => patch({ details: entry.details.filter((_, i) => i !== index) })}>Remove</button>
                </div>)}
            </div>

            <div className="cpx-field">
                <div className="cpx-label-row"><span className="cpx-label">Games, videos & content</span>
                    <button type="button" className="cpx-btn cpx-btn-ghost" disabled={(entry.items?.length || 0) >= 30} onClick={() => patch({ items: [...(entry.items || []), { id: makeId(), title: "Custom content", image: "", url: "", subtitle: "" }] })}>Add manually</button></div>
                <div className="cpx-inline">
                    <input className="cpx-input" aria-label={contentLabel(entry.service)} placeholder={contentLabel(entry.service)} value={itemQuery} onChange={event => setItemQuery(event.target.value)} />
                    <button type="button" className="cpx-btn" disabled={!!fetching || !itemQuery.trim()} onClick={async () => {
                        const current = entry; setFetching("content"); setError("");
                        try { showMatches(current, await searchConnectionItems(current.service, itemQuery)); }
                        catch (problem) { reportLookupError(current, problem instanceof Error ? problem.message : "Couldn't load content."); }
                        finally { if (alive.current) setFetching(""); }
                    }}>{fetching === "content" ? "Searching…" : "Search"}</button>
                </div>
                {matches.length > 0 && <ul className="cpx-results" aria-label="Search results">
                    {matches.map(item => {
                        const added = !!entry.items?.some(existing => existing.id === item.id);
                        return <li key={item.id} className="cpx-result">
                            {item.image ? <img src={item.image} alt="" referrerPolicy="no-referrer" /> : <span className="cpx-result-blank" aria-hidden="true" />}
                            <span className="cpx-result-text"><strong>{item.title}</strong>{item.subtitle && <span className="cpx-hint">{item.subtitle}</span>}</span>
                            <button type="button" className="cpx-btn cpx-btn-ghost" disabled={added || (entry.items?.length || 0) >= 30} onClick={() => patch({ items: [...(entry.items || []), item] })}>{added ? "Added" : "Add"}</button>
                        </li>;
                    })}
                </ul>}
                {(entry.items || []).map((item, index) => <div key={`${item.id}-${index}`} className="cpx-content-item">
                    <div className="cpx-grid2">
                        <SocialField label="Title" value={item.title} onChange={title => patch({ items: entry.items!.map((old, i) => i === index ? { ...old, title } : old) })} />
                        <SocialField label="Description or playtime" value={item.subtitle} onChange={subtitle => patch({ items: entry.items!.map((old, i) => i === index ? { ...old, subtitle } : old) })} />
                        <SocialField label="Image link" placeholder="https://" value={item.image} onChange={image => patch({ items: entry.items!.map((old, i) => i === index ? { ...old, image } : old) })} />
                        <SocialField label="Content link" placeholder="https://" value={item.url} onChange={url => patch({ items: entry.items!.map((old, i) => i === index ? { ...old, url } : old) })} />
                    </div>
                    <div className="cpx-inline"><button type="button" className="cpx-btn cpx-btn-ghost cpx-btn-danger-text" onClick={() => patch({ items: entry.items!.filter((_, i) => i !== index) })}>Remove this item</button></div>
                </div>)}
            </div>
            <div className="cpx-inline"><button type="button" className="cpx-btn" onClick={() => setSelected(null)}>Done</button></div>
        </div>}

        {error && <p className="cpx-hint cpx-error" role="alert">{error}</p>}
        {issues.map(issue => <p key={issue} className="cpx-hint cpx-error" role="status">{issue}</p>)}
    </div>;
}
