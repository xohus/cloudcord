/*
 * CloudCord
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Add-ons > Discover themes: one list of community themes, a color preview for each,
 * and one tap to install and use. Works with Vendetta / Bunny / Kettu / Raincord themes.
 */

import { getCurrentTheme, installTheme, removeTheme, selectTheme, themes } from "@lib/addons/themes";
import { findAssetId } from "@lib/api/assets";
import safeFetch from "@lib/utils/safeFetch";
import { React } from "@metro/common";
import { Button, Card, FlashList, Stack, Text } from "@metro/common/components";
import Search from "@ui/components/Search";
import { showToast } from "@ui/toasts";
import { View } from "react-native";

const CLOUDCORD_INDEX = "https://raw.githubusercontent.com/cloudcord-mod/cloudcord/main/themes/mobile/index.json";
const MARKETPLACE = "https://raw.githubusercontent.com/kmmiio99o/theme-marketplace/refs/heads/main/themes.json";

interface StoreTheme {
    url: string;
    name: string;
    description: string;
    authors: string[];
    source: string;
    hasBackground?: boolean;
    preview?: { background: string; surface: string; accent: string; text: string; };
}

async function loadThemes(): Promise<StoreTheme[]> {
    const [index, market] = await Promise.allSettled([
        safeFetch(CLOUDCORD_INDEX, { cache: "no-store" }).then(r => r.json()),
        safeFetch(MARKETPLACE, { cache: "no-store" }).then(r => r.json()),
    ]);

    const list: StoreTheme[] = [];
    if (index.status === "fulfilled" && Array.isArray(index.value?.themes)) {
        for (const t of index.value.themes) {
            list.push({ url: t.id, name: t.name, description: t.description ?? "", authors: t.authors ?? [], source: t.source ?? "CloudCord", hasBackground: t.hasBackground, preview: t.preview });
        }
    }
    if (market.status === "fulfilled" && Array.isArray(market.value)) {
        for (const t of market.value) {
            if (typeof t?.installUrl !== "string" || typeof t?.name !== "string") continue;
            list.push({ url: t.installUrl, name: t.name, description: t.description ?? "", authors: Array.isArray(t.authors) ? t.authors : [], source: "Marketplace" });
        }
    }
    if (!list.length) throw new Error("Couldn't load the theme store. Check your connection and try again.");

    // Same theme listed twice: keep the first.
    const seen = new Set<string>();
    return list.filter(t => !seen.has(t.url) && seen.add(t.url));
}

function Swatches({ preview }: { preview?: StoreTheme["preview"]; }) {
    if (!preview) return null;
    const colors = [preview.background, preview.surface, preview.accent, preview.text];
    return (
        <View style={{ flexDirection: "row", gap: 6 }}>
            {colors.map((c, i) => <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }} />)}
        </View>
    );
}

function ThemeRow({ theme, refresh }: { theme: StoreTheme; refresh(): void; }) {
    const [busy, setBusy] = React.useState(false);
    const installed = Boolean(themes[theme.url]);
    const active = getCurrentTheme()?.id === theme.url;

    const use = async () => {
        setBusy(true);
        try {
            if (!themes[theme.url]) await installTheme(theme.url);
            await selectTheme(themes[theme.url]);
            showToast(`Now using ${theme.name}`, findAssetId("CheckIcon"));
        } catch (e) {
            showToast(e instanceof Error ? e.message : String(e), findAssetId("CircleXIcon-primary"));
        } finally { setBusy(false); refresh(); }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await removeTheme(theme.url);
            showToast(`Removed ${theme.name}`, findAssetId("TrashIcon"));
        } catch (e) {
            showToast(e instanceof Error ? e.message : String(e), findAssetId("CircleXIcon-primary"));
        } finally { setBusy(false); refresh(); }
    };

    return (
        <Card style={{ borderRadius: 22 }}>
            <Stack spacing={8}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text variant="heading-md/semibold" numberOfLines={1}>{theme.name}</Text>
                        <Text variant="text-sm/medium" color="text-muted" numberOfLines={1}>
                            {theme.authors.length ? `by ${theme.authors.join(", ")}` : theme.source}
                            {theme.hasBackground ? " · background" : ""}
                        </Text>
                    </View>
                    <Swatches preview={theme.preview} />
                </View>
                {!!theme.description && <Text variant="text-sm/normal" numberOfLines={2}>{theme.description}</Text>}
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                        <Button
                            size="md"
                            variant={active ? "secondary" : "primary"}
                            text={active ? "In use" : busy ? "Working…" : "Use"}
                            disabled={busy || active}
                            onPress={use}
                        />
                    </View>
                    {installed && (
                        <View style={{ flex: 1 }}>
                            <Button size="md" variant="destructive" text="Remove" disabled={busy} onPress={remove} />
                        </View>
                    )}
                </View>
            </Stack>
        </Card>
    );
}

export default function ThemeStore() {
    const [list, setList] = React.useState<StoreTheme[] | null>(null);
    const [error, setError] = React.useState("");
    const [query, setQuery] = React.useState("");
    const [, setTick] = React.useState(0);
    const refresh = () => setTick(t => t + 1);

    React.useEffect(() => {
        loadThemes().then(setList, e => setError(e instanceof Error ? e.message : String(e)));
    }, []);

    const q = query.trim().toLowerCase();
    const shown = (list ?? []).filter(t => !q || [t.name, t.description, t.source, ...t.authors].some(v => v?.toLowerCase().includes(q)));

    return (
        <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 }}>
                <Search placeholder={list ? `Search ${list.length} themes` : "Search themes"} onChangeText={setQuery} />
            </View>
            {error
                ? <Text variant="text-md/medium" color="text-muted" style={{ textAlign: "center", padding: 24 }}>{error}</Text>
                : !list
                    ? <Text variant="text-md/medium" color="text-muted" style={{ textAlign: "center", padding: 24 }}>Loading themes…</Text>
                    : (
                        <FlashList
                            data={shown}
                            estimatedItemSize={150}
                            keyExtractor={(t: StoreTheme) => t.url}
                            contentContainerStyle={{ padding: 12, paddingBottom: 48 }}
                            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                            ListEmptyComponent={<Text variant="text-md/medium" color="text-muted" style={{ textAlign: "center", padding: 24 }}>No themes match “{query}”.</Text>}
                            renderItem={({ item }: { item: StoreTheme; }) => <ThemeRow theme={item} refresh={refresh} />}
                        />
                    )}
        </View>
    );
}
