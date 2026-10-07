import { FocusLock, React } from "@webpack/common";
import ErrorBoundary from "@components/ErrorBoundary";
import type { PropsWithChildren, ReactNode } from "react";

interface SettingsModalProps extends PropsWithChildren {
    title?: ReactNode;
    subtitle?: ReactNode;
    onClose(): void;
    size?: string;
    transitionState?: unknown;
}

// CloudCord-owned dialog: Discord's experimental Modal export is not present
// on every desktop build. Keep settings independent from that webpack lookup.
export function SettingsModal({ title, subtitle, children, onClose }: SettingsModalProps) {
    const root = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const previous = document.activeElement;
        root.current?.focus();
        return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
    }, []);
    function onKeyDown(event: React.KeyboardEvent) {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
        if (event.key !== "Tab") return;
        const items = [...(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]') || [])].filter(item => item.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); root.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first.focus(); }
    }
    // Register this dialog as Discord's active focus scope. Without it, the
    // underlying Settings layer can immediately steal focus from our inputs.
    const dialog = <div style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "auto", background: "rgba(0,0,0,.65)", display: "grid", placeItems: "center", padding: 16 }}>
        <div ref={root} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "cloudcord settings"} tabIndex={-1} onKeyDown={onKeyDown}
            style={{ pointerEvents: "auto", userSelect: "text", width: "min(960px, 94vw)", maxHeight: "85vh", overflowY: "auto", borderRadius: 16, padding: 24, background: "var(--background-base-low, #202024)", color: "var(--text-normal, #f2f3f5)", boxShadow: "0 20px 70px rgba(0,0,0,.5)" }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
                <button type="button" aria-label="Close" title="Close" onClick={onClose} style={{ border: 0, borderRadius: "50%", width: 36, height: 36, flexShrink: 0, fontSize: 26, lineHeight: 1, cursor: "pointer", background: "transparent", color: "var(--text-danger, #ed4245)" }}>×</button>
            </header>
            {subtitle}
            {children}
        </div>
    </div>;
    // Some Discord versions no longer expose the native focus scope. Keep the
    // dialog usable with its own keyboard trap instead of failing to open it.
    return <ErrorBoundary fallback={() => dialog}>
        <FocusLock containerRef={root}>{dialog}</FocusLock>
    </ErrorBoundary>;
}
