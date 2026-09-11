import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { gitHashShort } from "@shared/vencordUserAgent";
import { copyWithToast } from "@utils/discord";
import { Margins } from "@utils/margins";
import { React, useState } from "@webpack/common";

type Capture = { id: number; feature: string; method: string; target: string; queryKeys: string[]; status: number; ok: boolean; durationMs: number; at: string; error?: string; };
const captures: Capture[] = [];
let sequence = 0;
let wrapped = false;
const CAPTURE_KEY = "CloudCord_diagnosticsCapture";

function captureEnabled() {
    try { return localStorage.getItem(CAPTURE_KEY) === "1"; } catch { return false; }
}

function describe(raw: string) {
    try {
        const url = new URL(raw);
        return {
            target: `${url.origin}${url.pathname}`,
            queryKeys: [...url.searchParams.keys()],
            feature: url.hostname.includes("cloudcord-profiles") ? "Shared Profile" : url.hostname.includes("discord") ? "Discord" : "External"
        };
    } catch { return { target: "unknown", queryKeys: [], feature: "Runtime" }; }
}

function installCapture() {
    if (wrapped) return;
    wrapped = true;
    const original = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const started = Date.now();
        const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const info = describe(raw);
        const method = String(init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
        try {
            const response = await original(input, init);
            if (captureEnabled()) captures.push({ id: ++sequence, ...info, method, status: response.status, ok: response.ok, durationMs: Date.now() - started, at: new Date().toISOString() });
            if (captures.length > 200) captures.splice(0, captures.length - 200);
            return response;
        } catch (error) {
            if (captureEnabled()) captures.push({ id: ++sequence, ...info, method, status: 0, ok: false, durationMs: Date.now() - started, at: new Date().toISOString(), error: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 180) : "Request failed" });
            throw error;
        }
    };
}

installCapture();

function CloudCordDiagnostics() {
    const [enabled, setEnabled] = useState(captureEnabled());
    const [, refresh] = useState(0);
    const toggle = () => {
        const next = !enabled;
        localStorage.setItem(CAPTURE_KEY, next ? "1" : "0");
        setEnabled(next);
    };
    const copy = () => copyWithToast(JSON.stringify({
        cloudCord: gitHashShort,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        diagnosticsCapture: enabled,
        recentRequests: captures.slice(-50)
    }, null, 2));

    return <SettingsTab>
        <Heading className={Margins.top16}>CloudCord Diagnostics</Heading>
        <Paragraph className={Margins.bottom20}>Safe runtime and request diagnostics for CloudCord. Authorization headers, cookies, request bodies and query values are never recorded.</Paragraph>
        <Flex gap="8px" className={Margins.bottom20} style={{ flexWrap: "wrap" }}>
            <Button size="small" variant={enabled ? "positive" : "secondary"} onClick={toggle}>{enabled ? "Interception enabled" : "Enable interception"}</Button>
            <Button size="small" variant="secondary" onClick={copy}>Copy diagnostics</Button>
            <Button size="small" variant="secondary" onClick={() => { captures.splice(0); refresh(value => value + 1); }}>Clear events</Button>
        </Flex>
        <Divider className={Margins.bottom20} />
        <Heading>Runtime</Heading>
        <Paragraph>CloudCord {gitHashShort}<br />Platform: {navigator.platform}<br />Captured events: {captures.length}</Paragraph>
        <Heading className={Margins.top20}>Recent activity</Heading>
        <pre style={{ background: "var(--background-secondary)", border: "1px solid var(--background-modifier-accent)", borderRadius: 8, padding: 12, overflow: "auto", fontSize: 12 }}>
            {captures.length ? JSON.stringify(captures.slice(-10), null, 2) : "No events captured yet."}
        </pre>
    </SettingsTab>;
}

export default wrapTab(CloudCordDiagnostics, "CloudCord Diagnostics");
