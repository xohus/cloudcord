/*
 * CloudCord, a Discord client mod
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Building blocks for the Custom Profile editor. Every control uses the same
// spacing tokens (see editor.css), so sections can't drift or overlap.

import { ACTIVITY_TYPES, serverTagCustomIcon, serverTagIconURL } from "@utils/profileAppearance";
import { React } from "@webpack/common";

let idCounter = 0;
const useId = (prefix: string) => React.useMemo(() => `${prefix}-${++idCounter}`, []);

export function Section({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode; }) {
    const id = useId("cpx-section");
    return <section className="cpx-section" aria-labelledby={id}>
        <header className="cpx-section-head">
            <div>
                <h3 id={id} className="cpx-section-title">{title}</h3>
                {description && <p className="cpx-section-desc">{description}</p>}
            </div>
            {actions && <div className="cpx-section-actions">{actions}</div>}
        </header>
        <div className="cpx-section-body">{children}</div>
    </section>;
}

export function TextField({ label, value, onChange, placeholder, hint, maxLength, type = "text", multiline, error }: {
    label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string; maxLength?: number; type?: string; multiline?: boolean; error?: string;
}) {
    const id = useId("cpx-field");
    const describedBy = hint || error ? `${id}-hint` : undefined;
    const props = { id, className: `cpx-input ${error ? "cpx-input-invalid" : ""}`, value, placeholder, maxLength, "aria-invalid": !!error, "aria-describedby": describedBy, onChange: (event: any) => onChange(event.target.value) };
    return <div className="cpx-field">
        <div className="cpx-label-row">
            <label className="cpx-label" htmlFor={id}>{label}</label>
            {maxLength && <span className="cpx-count">{[...value].length}/{maxLength}</span>}
        </div>
        {multiline ? <textarea {...props} rows={4} /> : <input {...props} type={type} />}
        {(error || hint) && <span id={describedBy} className={error ? "cpx-hint cpx-error" : "cpx-hint"} role={error ? "alert" : undefined}>{error || hint}</span>}
    </div>;
}

export function Switch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; }) {
    return <button type="button" role="switch" aria-checked={checked} className="cpx-switch-row" onClick={() => onChange(!checked)}>
        <span className="cpx-switch-text"><span className="cpx-switch-label">{label}</span>{description && <span className="cpx-hint">{description}</span>}</span>
        <span className={`cpx-switch ${checked ? "cpx-switch-on" : ""}`} aria-hidden="true"><span className="cpx-switch-thumb" /></span>
    </button>;
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; dot?: string; }[]; value: T; onChange: (value: T) => void; }) {
    return <div className="cpx-field">
        <span className="cpx-label">{label}</span>
        <div className="cpx-segmented" role="radiogroup" aria-label={label}>
            {options.map(option => <button key={String(option.value)} type="button" role="radio" aria-checked={option.value === value}
                className={`cpx-segment ${option.value === value ? "cpx-on" : ""}`} onClick={() => onChange(option.value)}>
                {option.dot && <span className="cpx-dot" style={{ background: option.dot }} aria-hidden="true" />}{option.label}
            </button>)}
        </div>
    </div>;
}

export function SelectField<T extends string | number>({ label, options, value, onChange, hint }: { label: string; options: { value: T; label: string; }[]; value: T; onChange: (value: T) => void; hint?: string; }) {
    const id = useId("cpx-select");
    return <div className="cpx-field">
        <label className="cpx-label" htmlFor={id}>{label}</label>
        <select id={id} className="cpx-input cpx-select" value={String(value)} onChange={event => { const picked = options.find(option => String(option.value) === event.target.value); if (picked) onChange(picked.value); }}>
            {options.map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
        </select>
        {hint && <span className="cpx-hint">{hint}</span>}
    </div>;
}

const hex = (value: number | undefined | null, fallback: string) => value == null ? fallback : `#${value.toString(16).padStart(6, "0")}`;

export function ColorField({ label, value, onChange, fallback, optional }: { label: string; value: number | undefined | null; onChange: (value: number | undefined) => void; fallback: string; optional?: boolean; }) {
    const id = useId("cpx-color");
    const [text, setText] = React.useState(value == null ? "" : hex(value, fallback));
    React.useEffect(() => { setText(value == null ? "" : hex(value, fallback)); }, [value]);
    return <div className="cpx-field">
        <label className="cpx-label" htmlFor={id}>{label}</label>
        <div className="cpx-inline">
            <input type="color" aria-label={`${label} picker`} className="cpx-swatch" value={hex(value, fallback)} onChange={event => onChange(parseInt(event.target.value.slice(1), 16))} />
            <input id={id} className="cpx-input" placeholder={optional ? `${fallback} (optional)` : fallback} value={text}
                onChange={event => {
                    const next = event.target.value; setText(next);
                    const clean = next.replace("#", "");
                    if (/^[0-9a-f]{6}$/i.test(clean)) onChange(parseInt(clean, 16));
                    else if (!clean) onChange(undefined);
                }} />
            {value != null && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => onChange(undefined)}>Clear</button>}
        </div>
    </div>;
}

export function ImageField({ label, value, onChange, shape = "circle", hint }: { label: string; value: string; onChange: (value: string) => void; shape?: "circle" | "banner"; hint?: string; }) {
    const fileRef = React.useRef<HTMLInputElement>(null);
    const readRevision = React.useRef(0);
    React.useEffect(() => {
        readRevision.current++;
        return () => { readRevision.current++; };
    }, [value]);
    const [error, setError] = React.useState("");
    const id = useId("cpx-image");
    const change = (next: string) => { readRevision.current++; setError(""); onChange(next); };
    const pick = (file?: File) => {
        setError("");
        if (!file) return;
        const revision = ++readRevision.current;
        if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
        if (file.size > 8 * 1024 * 1024) { setError("Choose an image under 8 MB."); return; }
        const reader = new FileReader();
        reader.onload = () => { if (revision === readRevision.current) onChange(String(reader.result || "")); };
        reader.onerror = () => { if (revision === readRevision.current) setError("That file couldn't be read."); };
        reader.readAsDataURL(file);
    };
    return <div className="cpx-field">
        <label className="cpx-label" htmlFor={id}>{label}</label>
        <div className="cpx-image">
            <div className={`cpx-image-preview cpx-image-${shape}`}>{value ? <img src={value} alt="" /> : <span aria-hidden="true">+</span>}</div>
            <div className="cpx-image-controls">
                <div className="cpx-inline">
                    <button type="button" className="cpx-btn" onClick={() => fileRef.current?.click()}>{value ? "Change" : "Upload"}</button>
                    {value && <button type="button" className="cpx-btn cpx-btn-ghost" onClick={() => change("")}>Remove</button>}
                </div>
                <input id={id} className="cpx-input" placeholder="…or paste an image link" value={value.startsWith("data:") ? "" : value} onChange={event => change(event.target.value.trim())} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={event => { pick(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        {(error || hint) && <span className={error ? "cpx-hint cpx-error" : "cpx-hint"} role={error ? "alert" : undefined}>{error || hint}</span>}
    </div>;
}

export function Grid2({ children }: { children: React.ReactNode; }) {
    return <div className="cpx-grid2">{children}</div>;
}

export type TabId = "profile" | "name" | "cosmetics" | "status" | "badges" | "connections" | "saved" | "others";
export const TABS: { id: TabId; label: string; }[] = [
    { id: "profile", label: "Profile" },
    { id: "name", label: "Name & tag" },
    { id: "cosmetics", label: "Cosmetics" },
    { id: "status", label: "Status" },
    { id: "badges", label: "Badges" },
    { id: "connections", label: "Connections" },
    { id: "saved", label: "Saved profiles" },
    { id: "others", label: "Other profiles" }
];

const TAB_ICONS: Record<TabId, string> = { "profile":"<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-4 4-6 8-6s8 2 8 6\"/>","name":"<path d=\"M3 12V4h8l10 10-8 8L3 12z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.5\"/>","cosmetics":"<path d=\"M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z\"/>","status":"<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","badges":"<circle cx=\"12\" cy=\"9\" r=\"6\"/><path d=\"M8.5 14 7 22l5-3 5 3-1.5-8\"/>","connections":"<path d=\"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1\"/><path d=\"M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1\"/>","saved":"<rect x=\"4\" y=\"3\" width=\"13\" height=\"17\" rx=\"2\"/><path d=\"M8 3v6l2.5-1.5L13 9V3\"/><path d=\"M20 7v12a2 2 0 0 1-2 2H8\"/>","others":"<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M17 14.5c2.5 0 4.5 1.5 4.5 4\"/>" };

function TabIcon({ id }: { id: TabId; }) {
    return <svg className="cpx-tab-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TAB_ICONS[id] }} />;
}

export function TabList({ value, onChange }: { value: TabId; onChange: (tab: TabId) => void; }) {
    const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
    const move = (offset: number) => {
        const index = (TABS.findIndex(tab => tab.id === value) + offset + TABS.length) % TABS.length;
        onChange(TABS[index].id);
        refs.current[TABS[index].id]?.focus();
    };
    return <nav className="cpx-tabs" role="tablist" aria-orientation="vertical" aria-label="Profile editor sections"
        onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); move(1); } if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); move(-1); } }}>
        {TABS.map(tab => <button key={tab.id} ref={node => { refs.current[tab.id] = node; }} type="button" role="tab" id={`cpx-tab-${tab.id}`} aria-controls="cpx-panel"
            aria-selected={tab.id === value} tabIndex={tab.id === value ? 0 : -1} className={`cpx-tab ${tab.id === value ? "cpx-on" : ""}`} onClick={() => onChange(tab.id)}>
            <TabIcon id={tab.id} /><span>{tab.label}</span>
        </button>)}
    </nav>;
}

const STATUS_COLORS: Record<string, string> = { online: "#23a55a", idle: "#f0b232", dnd: "#f23f43", invisible: "#80848e" };

/** Approximation of how the profile will look; Discord draws the real thing. */
export function ProfilePreview({ data, fallbackName, fallbackUsername, fallbackAvatar, decorationUrl, nameplateUrl, effectName, frameName, bare }: {
    data: any; fallbackName: string; fallbackUsername: string; fallbackAvatar: string;
    decorationUrl?: string; nameplateUrl?: string; effectName?: string; frameName?: string; bare?: boolean;
}) {
    const name = data.globalName || fallbackName;
    const username = data.username || fallbackUsername;
    const avatar = data.avatar || fallbackAvatar;
    const banner = data.nitro && data.banner ? data.banner : "";
    const color = data.accentColor != null ? `#${Number(data.accentColor).toString(16).padStart(6, "0")}` : "#5865f2";
    const color2 = data.accentColor2 != null ? `#${Number(data.accentColor2).toString(16).padStart(6, "0")}` : color;
    const tag = data.serverTag;
    const tagIcon = tag ? serverTagCustomIcon(tag.icon) || serverTagIconURL(tag) : "";
    const status = data.presenceStatus || "online";
    const activity = data.customActivity;
    const activityVerb = activity ? ACTIVITY_TYPES.find(type => type.value === activity.type)?.label : "";
    return <aside className={bare ? "cpx-preview cpx-preview-bare" : "cpx-preview"} aria-label="Preview">
        {!bare && <div className="cpx-preview-title">Preview</div>}
        <div className={`cpx-card ${frameName ? "cpx-card-framed" : ""}`} style={{ "--cpx-accent": color, "--cpx-accent2": color2 } as any}>
            <div className="cpx-card-banner" style={banner ? { backgroundImage: `url("${banner.replace(/"/g, "%22")}")` } : undefined} />
            <div className="cpx-card-avatar">
                <img className="cpx-card-avatar-img" src={avatar} alt="" />
                {decorationUrl && <img className="cpx-card-decoration" src={decorationUrl} alt="" />}
                <span className="cpx-card-status" style={{ background: activity?.type === 1 && activity.url ? "#593695" : STATUS_COLORS[status] }} aria-label={`Status: ${status}`} />
            </div>
            <div className="cpx-card-body">
                <div className="cpx-card-name" style={nameplateUrl ? { backgroundImage: `url("${nameplateUrl}")` } : undefined}>
                    <span className="cpx-card-display">{name}</span>
                    {tag?.tag && <span className="cpx-card-tag">{tagIcon && <img src={tagIcon} alt="" />}{tag.tag}</span>}
                </div>
                <div className="cpx-card-username">@{username}{data.pronouns ? ` · ${data.pronouns}` : ""}</div>
                {data.customStatus && <div className="cpx-card-custom">{data.customStatus.emoji} {data.customStatus.text}</div>}
                {activity?.name && <div className="cpx-card-activity"><span>{activityVerb}</span><strong>{activity.name}</strong>{activity.details && <span>{activity.details}</span>}</div>}
                {data.bio && <p className="cpx-card-bio">{data.bio}</p>}
                {(effectName || frameName) && <div className="cpx-card-chips">
                    {frameName && <span className="cpx-chip">Frame: {frameName}</span>}
                    {effectName && <span className="cpx-chip">Effect: {effectName}</span>}
                </div>}
            </div>
        </div>
        {!bare && <p className="cpx-hint">A rough preview. Frames and effects are drawn by Discord on your real profile.</p>}
    </aside>;
}

/** A card drawn like Discord's profile popout: banner, ringed avatar, badge pill, names, status and bio. */
export function DiscordProfileCard({ data, fallbackName, fallbackUsername, fallbackAvatar, decorationUrl, badges = [] }: {
    data: any; fallbackName: string; fallbackUsername: string; fallbackAvatar: string; decorationUrl?: string; badges?: { id: string; icon: string; label: string; }[];
}) {
    const hexOf = (value: any) => value != null ? `#${Number(value).toString(16).padStart(6, "0")}` : null;
    const primary = hexOf(data.accentColor);
    const secondary = hexOf(data.accentColor2) || primary;
    const themed = !!primary;
    const banner = data.banner || "";
    const status = data.customActivity?.type === 1 && data.customActivity?.url ? "streaming" : data.presenceStatus || "online";
    const tag = data.serverTag;
    const tagIcon = tag ? serverTagCustomIcon(tag.icon) || serverTagIconURL(tag) : "";
    const activity = data.customActivity;
    return <div className={`cpx-dc ${themed ? "cpx-dc-themed" : ""}`} style={themed ? { "--dc-primary": primary, "--dc-secondary": secondary } as any : undefined}>
        <div className="cpx-dc-inner">
            <div className="cpx-dc-banner" style={banner ? { backgroundImage: `url("${banner.replace(/"/g, "%22")}")` } : { background: primary || "#5865f2" }} />
            <div className="cpx-dc-avatar">
                <img className="cpx-dc-avatar-img" src={data.avatar || fallbackAvatar} alt="" />
                {decorationUrl && <img className="cpx-dc-decoration" src={decorationUrl} alt="" />}
                <span className={`cpx-dc-status cpx-dc-status-${status}`} />
            </div>
            {badges.length > 0 && <div className="cpx-dc-badges">{badges.slice(0, 8).map(badge => <img key={badge.id} src={badge.icon} alt={badge.label} title={badge.label} />)}</div>}
            <div className="cpx-dc-body">
                <div className="cpx-dc-names">
                    <div className="cpx-dc-display">{data.globalName || fallbackName}</div>
                    <div className="cpx-dc-username">
                        <span>{data.username || fallbackUsername}</span>
                        {tag?.tag && <span className="cpx-dc-tag">{tagIcon && <img src={tagIcon} alt="" />}{tag.tag}</span>}
                        {data.pronouns && <span className="cpx-dc-dot">•</span>}
                        {data.pronouns && <span>{data.pronouns}</span>}
                    </div>
                </div>
                {data.customStatus?.text || data.customStatus?.emoji ? <div className="cpx-dc-bubble">{data.customStatus.emoji} {data.customStatus.text}</div> : null}
                {(data.bio || activity?.name) && <div className="cpx-dc-section">
                    {data.bio && <div className="cpx-dc-bio">{data.bio}</div>}
                    {activity?.name && <div className="cpx-dc-activity"><span className="cpx-dc-activity-verb">{ACTIVITY_TYPES.find(type => type.value === activity.type)?.label || "Playing"}</span><strong>{activity.name}</strong>{activity.details && <span>{activity.details}</span>}</div>}
                </div>}
            </div>
        </div>
    </div>;
}
