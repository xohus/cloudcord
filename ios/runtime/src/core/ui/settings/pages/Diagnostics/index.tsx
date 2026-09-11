import { PupuIcon } from "@core/ui/settings";
import { useProxy } from "@core/vendetta/storage";
import { findAssetId } from "@lib/api/assets";
import { getDebugInfo } from "@lib/api/debug";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { loaderConfig, settings } from "@lib/api/settings";
import { clipboard } from "@metro/common";
import { Button, Stack, TableRow, TableRowGroup, TableSwitchRow, Text, TextInput } from "@metro/common/components";
import { showToast } from "@ui/toasts";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

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

const TAB_KEYS = ["BUNNY_PLUGINS", "BUNNY_THEMES", "BUNNY_FONTS", "CLOUDCORD_BROWSER", "STORE_CLOUD", "BOTCORD"] as const;
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
    const [movingKey, setMovingKey] = useState<string | null>(null);
    const [versions, setVersions] = useState<Array<{ sha: string; date: string; title: string; }>>([]);
    useEffect(() => enableSanitizedRequestCapture(), []);
    useEffect(() => {
        fetch("https://api.github.com/repos/xohus/cloudcord/commits?path=dist/cc.js&per_page=10")
            .then(response => response.ok ? response.json() : [])
            .then((items: any[]) => setVersions(items.slice(0, 10).map(item => ({
                sha: String(item.sha),
                date: String(item.commit?.committer?.date ?? ""),
                title: String(item.commit?.message ?? "CloudCord runtime").split("\n")[0],
            }))))
            .catch(() => setVersions([]));
    }, []);

    const setVisible = (key: string, visible: boolean) => {
        settings.cloudcordHiddenTabs = visible ? hidden.filter(item => item !== key) : [...new Set([...hidden, key])];
    };
    const placeBefore = (targetKey: string) => {
        if (!movingKey || movingKey === targetKey) return setMovingKey(null);
        const next = order.filter(key => key !== movingKey);
        next.splice(next.indexOf(targetKey), 0, movingKey);
        settings.cloudcordTabOrder = next;
        setMovingKey(null);
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
                {versions.map((version, index) => <TableRow
                    key={version.sha}
                    label={index === 0 ? "Current stable" : `Previous version ${index}`}
                    subLabel={`${version.sha.slice(0, 7)} · ${version.date.slice(0, 10)} · ${version.title}`}
                    trailing={<Button size="sm" variant="secondary" text="Use" onPress={() => {
                        loaderConfig.customLoadUrl.enabled = true;
                        loaderConfig.customLoadUrl.url = `https://raw.githubusercontent.com/xohus/cloudcord/${version.sha}/dist/cc.js`;
                        showToast("Version selected. Apply and reload when ready.", findAssetId("Check"));
                    }} />}
                />)}
            </TableRowGroup>

            <TableRowGroup title="CloudCord tabs">
                {movingKey && <TableRow label={<Text variant="text-sm/semibold" color="text-brand">Moving {TAB_LABELS[movingKey]}. Tap another tab to place it there.</Text>} />}
                {order.map(key => <Pressable key={key} delayLongPress={350} onLongPress={() => setMovingKey(key)} onPress={() => movingKey && placeBefore(key)}>
                    <View style={movingKey === key ? { borderWidth: 1, borderColor: "#5865f2", borderRadius: 8 } : undefined}>
                        <TableRow
                            label={TAB_LABELS[key] ?? key}
                            subLabel={movingKey === key ? "Selected—tap a destination" : "Hold to move"}
                            trailing={<Button size="sm" variant="secondary" text={hidden.includes(key) ? "Show" : "Hide"} onPress={() => setVisible(key, hidden.includes(key))} />}
                        />
                    </View>
                </Pressable>)}
                <TableRow arrow label="Apply tab layout" subLabel="Reload CloudCord to apply ordering and visibility" icon={<TableRow.Icon source={findAssetId("RetryIcon")} />} onPress={() => BundleUpdaterManager.reload()} />
            </TableRowGroup>
        </Stack>
    </ScrollView>;
}
