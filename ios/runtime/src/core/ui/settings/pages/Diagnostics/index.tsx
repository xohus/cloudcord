import { PupuIcon } from "@core/ui/settings";
import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { getDebugInfo } from "@lib/api/debug";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { loaderConfig, settings } from "@lib/api/settings";
import { clipboard } from "@metro/common";
import { Button, Stack, TableRow, TableRowGroup, TableSwitchRow, TextInput } from "@metro/common/components";
import { showToast } from "@ui/toasts";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";

type RequestEvent = { method: string; target: string; status: number; durationMs: number; at: string; };
const requestEvents: RequestEvent[] = [];
let fetchWrapped = false;

function enableSanitizedRequestCapture() {
    if (fetchWrapped) return;
    fetchWrapped = true;
    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async (input: any, init?: any) => {
        const started = Date.now();
        try {
            const response = await originalFetch(input, init);
            if (settings.cloudcordDiagnosticsCapture === true) {
                const raw = typeof input === "string" ? input : input?.url ?? "unknown";
                let target = "unknown";
                try { const url = new URL(raw); target = `${url.origin}${url.pathname}`; } catch {}
                requestEvents.push({ method: String(init?.method ?? "GET").toUpperCase(), target, status: response.status, durationMs: Date.now() - started, at: new Date().toISOString() });
                if (requestEvents.length > 200) requestEvents.splice(0, requestEvents.length - 200);
            }
            return response;
        } catch (error) {
            if (settings.cloudcordDiagnosticsCapture === true) requestEvents.push({ method: String(init?.method ?? "GET").toUpperCase(), target: "request-failed", status: 0, durationMs: Date.now() - started, at: new Date().toISOString() });
            throw error;
        }
    };
}

const TAB_KEYS = ["BOTCORD", "STORE_CLOUD", "BUNNY_PLUGINS", "BUNNY_THEMES", "BUNNY_FONTS", "CLOUDCORD_BROWSER"] as const;
const TAB_LABELS: Record<string, string> = {
    BOTCORD: "BotCord", STORE_CLOUD: "CloudSync", BUNNY_PLUGINS: "Plugins",
    BUNNY_THEMES: "Themes", BUNNY_FONTS: "Fonts", CLOUDCORD_BROWSER: "Browser",
};

export default function Diagnostics() {
    useProxy(settings);
    useProxy(loaderConfig);
    const debug = getDebugInfo();
    const hidden = settings.cloudcordHiddenTabs ?? [];
    const order = settings.cloudcordTabOrder?.length ? settings.cloudcordTabOrder : [...TAB_KEYS];
    useEffect(() => enableSanitizedRequestCapture(), []);

    const setVisible = (key: string, visible: boolean) => {
        settings.cloudcordHiddenTabs = visible ? hidden.filter(item => item !== key) : [...new Set([...hidden, key])];
    };
    const move = (key: string, delta: number) => {
        const next = [...order];
        const from = next.indexOf(key);
        const to = Math.max(0, Math.min(next.length - 1, from + delta));
        if (from < 0 || from === to) return;
        next.splice(to, 0, next.splice(from, 1)[0]);
        settings.cloudcordTabOrder = next;
    };
    const copySnapshot = () => {
        const snapshot = {
            cloudCord: debug.bunny.version,
            discord: `${debug.discord.version} (${debug.discord.build})`,
            platform: debug.os,
            loader: debug.bunny.loader,
            diagnosticsCapture: settings.cloudcordDiagnosticsCapture === true,
            runtimeUrl: loaderConfig.customLoadUrl.enabled ? loaderConfig.customLoadUrl.url : "stable",
            tabOrder: order,
            hiddenTabs: hidden,
            recentRequests: requestEvents.slice(-50),
        };
        clipboard.setString(JSON.stringify(snapshot, null, 2));
        showToast("Diagnostics copied", findAssetId("toast_copy_link"));
    };

    return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
        <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
            <TableRowGroup title="Runtime diagnostics">
                <TableSwitchRow
                    label="Intercept CloudCord events"
                    subLabel="Records sanitized runtime, UI, and request timing metadata only"
                    icon={<TableRow.Icon source={findAssetId("LogsIcon") || findAssetId("WrenchIcon")} />}
                    value={settings.cloudcordDiagnosticsCapture === true}
                    onValueChange={(value: boolean) => settings.cloudcordDiagnosticsCapture = value}
                />
                <TableRow arrow label="Copy diagnostics" subLabel="Copies build, loader, platform, and tab state" icon={<TableRow.Icon source={findAssetId("CopyIcon")} />} onPress={copySnapshot} />
            </TableRowGroup>

            <TableRowGroup title="CloudCord version">
                <TableSwitchRow
                    label="Use custom runtime"
                    subLabel="Switch between the stable runtime and a specific CloudCord bundle URL"
                    icon={<TableRow.Icon source={{ uri: PupuIcon }} />}
                    value={loaderConfig.customLoadUrl.enabled}
                    onValueChange={(value: boolean) => loaderConfig.customLoadUrl.enabled = value}
                />
                {loaderConfig.customLoadUrl.enabled && <TableRow label={<View style={{ width: "100%", gap: 10 }}>
                    <TextInput size="lg" value={loaderConfig.customLoadUrl.url} placeholder="https://…/cc.js" onChange={(value: any) => loaderConfig.customLoadUrl.url = typeof value === "string" ? value : value?.nativeEvent?.text ?? ""} />
                    <Button text="Apply and reload" onPress={() => BundleUpdaterManager.reload()} />
                </View>} />}
            </TableRowGroup>

            <TableRowGroup title="CloudCord tabs">
                {order.map(key => <TableRow key={key} label={TAB_LABELS[key] ?? key} subLabel="Use arrows to reorder; switch to hide/show" trailing={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Button size="sm" variant="secondary" text="↑" onPress={() => move(key, -1)} />
                    <Button size="sm" variant="secondary" text="↓" onPress={() => move(key, 1)} />
                    <TableSwitchRow value={!hidden.includes(key)} onValueChange={(value: boolean) => setVisible(key, value)} />
                </View>} />)}
                <TableRow arrow label="Apply tab layout" subLabel="Reload CloudCord to apply ordering and visibility" icon={<TableRow.Icon source={findAssetId("RetryIcon")} />} onPress={() => BundleUpdaterManager.reload()} />
            </TableRowGroup>
        </Stack>
    </ScrollView>;
}
