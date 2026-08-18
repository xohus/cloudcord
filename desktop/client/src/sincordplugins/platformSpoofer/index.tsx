/*
 * Sincord, a Discord client mod
 * Copyright (c) 2026 Sincord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { addHeaderBarButton, HeaderBarButton, removeHeaderBarButton } from "@api/HeaderBar";
import { Notice } from "@components/Notice";
import { SincordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStore } from "@webpack";
import { FluxDispatcher, React, UserStore } from "@webpack/common";

// ─── Icons ───────────────────────────────────────────────────────────────────

function DesktopIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="13" rx="2" />
            <path d="M8 21h8M12 16v5" />
        </svg>
    );
}

function WebIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    );
}

function MobileIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" strokeWidth="2.5" />
        </svg>
    );
}

function AndroidIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5z" />
            <path d="M9 10v1M15 10v1M7.5 3 9 5M16.5 3 15 5" />
            <path d="M5 17l-1 4M19 17l1 4" />
        </svg>
    );
}

function XboxIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M6.5 7c1.5 2.5 4 5 5.5 6.5C13.5 12 16 9.5 17.5 7" />
            <path d="M7 17c1.5-2 3-4 5-5.5 2 1.5 3.5 3.5 5 5.5" />
            <circle cx="8" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

function PlayStationIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21V4l2.5.8C13.5 5.4 15 6.8 15 9c0 2-1.2 3.4-3.5 4L9 14" />
            <path d="M9 21l6-2.5M3 18l6 2.5" />
        </svg>
    );
}

function VRIcon({ size = 18 }: { size?: number; }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z" />
            <circle cx="8.5" cy="12" r="2.5" />
            <circle cx="15.5" cy="12" r="2.5" />
            <path d="M11 12h2" />
        </svg>
    );
}

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORMS = [
    { label: "Desktop",     value: "desktop",    icon: DesktopIcon,     client: "desktop"  },
    { label: "Web",         value: "web",         icon: WebIcon,         client: "web"      },
    { label: "iOS",         value: "ios",         icon: MobileIcon,      client: "mobile"   },
    { label: "Android",     value: "android",     icon: AndroidIcon,     client: "mobile"   },
    { label: "Xbox",        value: "xbox",        icon: XboxIcon,        client: "embedded" },
    { label: "PlayStation", value: "playstation", icon: PlayStationIcon, client: "embedded" },
    { label: "VR",          value: "vr",          icon: VRIcon,          client: "vr"       },
] as const;

type PlatformValue = typeof PLATFORMS[number]["value"];

// ─── Settings ─────────────────────────────────────────────────────────────────

const settings = definePluginSettings({
    platforms: {
        type: OptionType.STRING,
        description: "Selected platforms (JSON array)",
        default: '["desktop"]',
        hidden: true,
    }
});

function getSelectedPlatforms(): PlatformValue[] {
    const raw = settings.store.platforms ?? '["desktop"]';
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0)
            return parsed.filter((v): v is PlatformValue => PLATFORMS.some(p => p.value === v));
        if (typeof parsed === "string" && PLATFORMS.some(p => p.value === parsed))
            return [parsed as PlatformValue];
    } catch {
        if (PLATFORMS.some(p => p.value === raw)) return [raw as PlatformValue];
    }
    return ["desktop"];
}

function setSelectedPlatforms(platforms: PlatformValue[]) {
    settings.store.platforms = JSON.stringify(platforms.length ? platforms : ["desktop"]);
}

// ─── Session injection ────────────────────────────────────────────────────────

let origGetSessions: (() => Record<string, any>) | null = null;

function patchSessions() {
    const store = findStore("SessionsStore") as any;
    if (!store || origGetSessions) return;
    origGetSessions = store.getSessions.bind(store);
    store.getSessions = () => {
        const sessions = { ...origGetSessions!() };
        for (const platform of getSelectedPlatforms()) {
            const entry = PLATFORMS.find(p => p.value === platform);
            if (!entry) continue;
            const id = `sp_fake_${platform}`;
            sessions[id] = {
                sessionId: id,
                status: "online",
                active: true,
                clientInfo: { version: 0, os: "Windows", client: entry.client },
            };
        }
        return sessions;
    };
}

function unpatchSessions() {
    const store = findStore("SessionsStore") as any;
    if (!store || !origGetSessions) return;
    store.getSessions = origGetSessions;
    origGetSessions = null;
}

function refreshPresence() {
    try {
        FluxDispatcher.dispatch({ type: "SESSIONS_REPLACE", sessions: [] });
    } catch { }
}

// ─── Gateway reconnect ────────────────────────────────────────────────────────

function reconnect() {
    try {
        const ws = (window as any)._ws;
        if (ws && ws.readyState === WebSocket.OPEN) ws.close(1000);
    } catch { }
}

// ─── Picker UI ────────────────────────────────────────────────────────────────

function resolvePickerBg(): string {
    // CSS var fallbacks only trigger when the var is *undefined*.
    // Some themes define --background-floating as transparent, so we probe it at runtime.
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;pointer-events:none;opacity:0;background-color:var(--background-floating)";
    document.body.appendChild(probe);
    const bg = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const transparent = !bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)";
    if (!transparent) return "var(--background-floating)";
    // Try --background-secondary-alt as secondary candidate
    probe.style.backgroundColor = "var(--background-secondary-alt)";
    document.body.appendChild(probe);
    const bg2 = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const transparent2 = !bg2 || bg2 === "transparent" || bg2 === "rgba(0, 0, 0, 0)";
    return transparent2 ? "#2b2d31" : "var(--background-secondary-alt)";
}

function PlatformPicker({ onClose }: { onClose: () => void; }) {
    const [selected, setSelected] = React.useState<PlatformValue[]>(() => getSelectedPlatforms());
    const pickerBg = React.useMemo(resolvePickerBg, []);

    function toggle(value: PlatformValue) {
        setSelected(prev => {
            const next = prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev, value];
            return next.length ? next : prev;
        });
    }

    function apply() {
        const prev = getSelectedPlatforms();
        setSelectedPlatforms(selected);
        refreshPresence();
        if (selected[0] !== prev[0]) reconnect();
        onClose();
    }

    return (
        <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: pickerBg,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 8, boxShadow: "0 8px 24px rgb(0 0 0 / 55%)",
            padding: "6px", display: "flex", flexDirection: "column", gap: "2px",
            zIndex: 1000, minWidth: 180,
            border: "1px solid rgb(255 255 255 / 10%)",
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "rgb(255 255 255 / 50%)", padding: "4px 8px 6px" }}>
                Platforms
            </div>
            {PLATFORMS.map(({ label, value, icon: Icon }) => {
                const on = selected.includes(value);
                return (
                    <button
                        key={value}
                        onClick={() => toggle(value)}
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "7px 10px", borderRadius: 4, border: "none",
                            cursor: "pointer", width: "100%", textAlign: "left",
                            background: on
                                ? "var(--background-modifier-selected, rgb(255 255 255 / 12%))"
                                : "transparent",
                            color: "var(--header-primary, #fff)",
                            fontSize: 14, fontWeight: on ? 600 : 400,
                            transition: "background 0.1s",
                        }}
                        onMouseEnter={e => {
                            if (!on) (e.currentTarget as HTMLButtonElement).style.background =
                                "var(--background-modifier-hover, rgb(255 255 255 / 6%))";
                        }}
                        onMouseLeave={e => {
                            if (!on) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                    >
                        <Icon size={15} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <div style={{
                            width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                            border: `1.5px solid ${on ? "var(--header-primary, #fff)" : "var(--text-muted, rgb(255 255 255 / 35%))"}`,
                            background: on ? "var(--header-primary, #fff)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {on && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6 9 17l-5-5" stroke={pickerBg} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                    </button>
                );
            })}
            <div style={{ height: 1, background: "var(--background-modifier-accent, rgb(255 255 255 / 8%))", margin: "4px 0" }} />
            <button
                onClick={apply}
                style={{
                    padding: "7px 10px", borderRadius: 4, border: "none",
                    background: "var(--background-modifier-accent, rgb(255 255 255 / 10%))",
                    color: "var(--header-primary, #fff)", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", width: "100%",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--background-modifier-hover, rgb(255 255 255 / 16%))"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--background-modifier-accent, rgb(255 255 255 / 10%))"; }}
            >
                Apply
            </button>
        </div>
    );
}

// ─── Header bar button ────────────────────────────────────────────────────────

function PlatformSpooferButton() {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const raw = settings.use(["platforms"]).platforms ?? '["desktop"]';
    const selected = React.useMemo(() => getSelectedPlatforms(), [raw]);

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const tooltip = `Platforms: ${selected.map(v => PLATFORMS.find(p => p.value === v)?.label).join(", ")}`;

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <HeaderBarButton
                icon={() => {
                    const primary = PLATFORMS.find(p => p.value === selected[0]) ?? PLATFORMS[0];
                    const Icon = primary.icon;
                    return <Icon size={18} />;
                }}
                tooltip={tooltip}
                selected={open}
                onClick={() => setOpen(o => !o)}
            />
            {open && <PlatformPicker onClose={() => setOpen(false)} />}
        </div>
    );
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "PlatformSpoofer",
    enabledByDefault: true,
    description: "Spoof what platform(s) you appear on simultaneously",
    tags: ["Utility"],
    authors: [SincordDevs.Drag, SincordDevs.neoarz],
    dependencies: ["HeaderBarAPI"],
    settingsAboutComponent: () => (
        <Notice.Warning>
            We can't guarantee this plugin won't get you warned or banned.
        </Notice.Warning>
    ),
    settings,
    patches: [
        {
            find: "_doIdentify(){",
            replacement: [
                {
                    match: /window._ws=null,null!=\i/,
                    replace: "false"
                },
                {
                    match: /(?<="GatewaySocket"\)\}\),properties:)(\i)/,
                    replace: "{...$1,...$self.getPlatform(true)}"
                },
            ]
        },
    ],

    start() {
        addHeaderBarButton("platform-spoofer-btn", () => <PlatformSpooferButton />, 9);
        patchSessions();
    },

    stop() {
        removeHeaderBarButton("platform-spoofer-btn");
        unpatchSessions();
    },

    getPlatform(bypass: boolean, userId?: any) {
        if (!bypass && userId !== UserStore.getCurrentUser()?.id) return null;
        const [primary] = getSelectedPlatforms();
        switch (primary) {
            case "desktop":     return { browser: "Discord Client" };
            case "web":         return { browser: "Discord Web" };
            case "ios":         return { browser: "Discord iOS" };
            case "android":     return { browser: "Discord Android" };
            case "xbox":        return { browser: "Discord Embedded" };
            case "playstation": return { browser: "Discord Embedded" };
            case "vr":          return { browser: "Discord VR" };
            default:            return null;
        }
    }
});
