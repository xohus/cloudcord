// CloudCord mobile profile editor building blocks. Mirrors the desktop editor
// (sections, chips, picture grids with "None" first and a check on the
// selection, badge cards, a live preview card) with one spacing scale.
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "@metro/common/components";
import { tokens } from "@metro/common";

const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const color = (name: string, fallback: string) => {
    try { return (tokens as any).colors?.[name] ?? fallback; } catch { return fallback; }
};
const BRAND = "#5865F2";
const surface = () => color("BACKGROUND_SECONDARY", "#2b2d31");
const surfaceAlt = () => color("BACKGROUND_TERTIARY", "#1e1f22");

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return <View style={{ gap: SPACE.md }}>
        <View style={{ gap: SPACE.xs }}>
            <Text variant="heading-md/bold" color="text-normal">{title}</Text>
            {description ? <Text variant="text-sm/medium" color="text-muted">{description}</Text> : null}
        </View>
        <View style={{ gap: SPACE.md }}>{children}</View>
    </View>;
}

export function Divider() {
    return <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: SPACE.sm }} />;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
    return <View style={{ gap: SPACE.xs + 2 }}>
        <Text variant="text-xs/bold" color="text-muted">{label.toUpperCase()}</Text>
        {children}
        {error ? <Text variant="text-xs/medium" color="text-danger">{error}</Text> : hint ? <Text variant="text-xs/medium" color="text-muted">{hint}</Text> : null}
    </View>;
}

export function Chips<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string; dot?: string }[]; value: T; onChange: (value: T) => void }) {
    return <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACE.sm }}>
        {options.map(option => {
            const on = option.value === value;
            return <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(option.value)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderColor: on ? BRAND : "transparent", backgroundColor: on ? "rgba(88,101,242,0.16)" : surfaceAlt() }}>
                {option.dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: option.dot }} /> : null}
                <Text variant="text-sm/semibold" color="text-normal">{option.label}</Text>
            </Pressable>;
        })}
    </View>;
}

function Check() {
    return <View style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }}>
        <Text variant="text-xs/bold" style={{ color: "#fff" }}>✓</Text>
    </View>;
}

export function CurrentRow({ label, image, wide, onRemove }: { label: string | null; image?: string; wide?: boolean; onRemove: () => void }) {
    return <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE.md, padding: SPACE.sm + 2, borderRadius: 12, backgroundColor: surfaceAlt(), minHeight: 52 }}>
        {label && image ? <Image source={{ uri: image }} resizeMode={wide ? "cover" : "contain"} style={{ width: wide ? 96 : 36, height: 36, borderRadius: 6 }} /> : null}
        <View style={{ flex: 1 }}><Text variant="text-sm/semibold" color={label ? "text-normal" : "text-muted"} lineClamp={1}>{label || "Nothing selected"}</Text></View>
        {label ? <Pressable accessibilityRole="button" onPress={onRemove} style={{ paddingVertical: 6, paddingHorizontal: 10 }}><Text variant="text-sm/semibold" color="text-danger">Remove</Text></Pressable> : null}
    </View>;
}

/** Picture grid: search, "None" card first, check on the selection, "Show more". */
export function ChoiceGrid<T>({ items, keyOf, labelOf, imageOf, isSelected, onPick, noneLabel, noneSelected, onNone, wide, status, onRetry, SearchInput }: {
    items: T[]; keyOf: (item: T) => string; labelOf: (item: T) => string; imageOf: (item: T) => string | undefined;
    isSelected: (item: T) => boolean; onPick: (item: T) => void; noneLabel: string; noneSelected: boolean; onNone: () => void;
    wide?: boolean; status?: { loading?: boolean; error?: string }; onRetry?: () => void; SearchInput: any;
}) {
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(18);
    const needle = query.trim().toLowerCase();
    const filtered = useMemo(() => needle ? items.filter(item => labelOf(item).toLowerCase().includes(needle)) : items, [items, needle]);
    const columns = wide ? 2 : 3;
    const cardWidth = `${100 / columns - 2}%` as any;
    const card = (key: string, label: string, image: string | undefined, selected: boolean, onPress: () => void, none = false) =>
        <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
            style={{ width: cardWidth, padding: 6, borderRadius: 12, borderWidth: 2, borderColor: selected ? BRAND : "transparent", backgroundColor: selected ? "rgba(88,101,242,0.14)" : surfaceAlt(), gap: 6 }}>
            <View style={{ width: "100%", aspectRatio: wide ? 4 : 1, borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" }}>
                {none ? <Text variant="heading-lg/bold" color="text-muted">∅</Text> : image ? <Image source={{ uri: image }} resizeMode={wide ? "cover" : "contain"} style={{ width: "100%", height: "100%" }} /> : null}
            </View>
            <Text variant="text-xs/semibold" color="text-normal" lineClamp={1}>{label}</Text>
            {selected ? <Check /> : null}
        </Pressable>;
    if (status?.loading) return <Text variant="text-sm/medium" color="text-muted">Loading Discord's catalog…</Text>;
    if (status?.error) return <View style={{ gap: SPACE.sm }}>
        <Text variant="text-sm/medium" color="text-danger">{status.error}</Text>
        {onRetry ? <Pressable accessibilityRole="button" onPress={onRetry}><Text variant="text-sm/semibold" color="text-link">Try again</Text></Pressable> : null}
    </View>;
    return <View style={{ gap: SPACE.md }}>
        <SearchInput value={query} placeholder={`Search ${items.length}`} autoCorrect={false} onChangeText={(value: string) => { setQuery(value); setLimit(18); }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
            {!needle ? card("__none", noneLabel, undefined, noneSelected, onNone, true) : null}
            {filtered.slice(0, limit).map(item => card(keyOf(item), labelOf(item), imageOf(item), isSelected(item), () => onPick(item)))}
        </View>
        {!filtered.length ? <Text variant="text-sm/medium" color="text-muted">Nothing matches “{query}”.</Text> : null}
        {limit < filtered.length ? <Pressable accessibilityRole="button" onPress={() => setLimit(value => value + 18)} style={{ alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: surfaceAlt() }}>
            <Text variant="text-sm/semibold" color="text-normal">Show more ({filtered.length - limit} left)</Text>
        </Pressable> : null}
    </View>;
}

export type BadgeChoice = { key: string; label: string; icon?: string; active: boolean; onPress: () => void };
export function BadgeGrid({ items }: { items: BadgeChoice[] }) {
    return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map(item => <Pressable key={item.key} accessibilityRole="checkbox" accessibilityState={{ checked: item.active }} accessibilityLabel={item.label} onPress={item.onPress}
            style={{ width: "48.5%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 2, borderColor: item.active ? BRAND : "transparent", backgroundColor: item.active ? "rgba(88,101,242,0.16)" : surfaceAlt() }}>
            {item.icon ? <Image source={{ uri: item.icon }} style={{ width: 22, height: 22 }} resizeMode="contain" /> : <View style={{ width: 22, height: 22 }} />}
            <View style={{ flex: 1 }}><Text variant="text-sm/medium" color="text-normal" lineClamp={1}>{item.label}</Text></View>
        </Pressable>)}
    </View>;
}

const STATUS_COLORS: Record<string, string> = { online: "#23a55a", idle: "#f0b232", dnd: "#f23f43", invisible: "#80848e", streaming: "#593695" };

/** A rough preview card; Discord draws the real profile (frames and effects included). */
export function PreviewCard({ name, username, pronouns, avatar, banner, primary, accent, decoration, nameplate, tagText, tagIcon, status, customStatus, activity, bio, frame, effect }: {
    name: string; username: string; pronouns?: string; avatar?: string; banner?: string; primary?: string; accent?: string; decoration?: string; nameplate?: string;
    tagText?: string; tagIcon?: string; status?: string; customStatus?: string; activity?: { verb: string; name: string; details?: string } | null; bio?: string; frame?: string; effect?: string;
}) {
    const edge = primary || BRAND;
    return <View style={{ gap: SPACE.sm }}>
        <Text variant="text-xs/bold" color="text-muted">PREVIEW</Text>
        <View style={{ borderRadius: 16, padding: 3, backgroundColor: edge, borderWidth: frame ? 2 : 0, borderColor: "#f0b232" }}>
            <View style={{ height: 80, borderTopLeftRadius: 13, borderTopRightRadius: 13, overflow: "hidden", backgroundColor: accent || edge }}>
                {banner ? <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
            </View>
            <View style={{ backgroundColor: surfaceAlt(), borderBottomLeftRadius: 13, borderBottomRightRadius: 13, padding: SPACE.md, paddingTop: 48, gap: 6 }}>
                <View style={{ position: "absolute", top: -40, left: 14, width: 80, height: 80 }}>
                    <Image source={{ uri: avatar }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: surfaceAlt() }} />
                    {decoration ? <Image source={{ uri: decoration }} style={{ position: "absolute", top: -10, left: -10, width: 100, height: 100 }} resizeMode="contain" /> : null}
                    <View style={{ position: "absolute", right: 2, bottom: 4, width: 20, height: 20, borderRadius: 10, borderWidth: 4, borderColor: surfaceAlt(), backgroundColor: STATUS_COLORS[status || "online"] || STATUS_COLORS.online }} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, overflow: "hidden", paddingVertical: 2 }}>
                    {nameplate ? <Image source={{ uri: nameplate }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" /> : null}
                    <Text variant="heading-lg/bold" color="text-normal" lineClamp={1}>{name}</Text>
                    {tagText ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.35)" }}>
                        {tagIcon ? <Image source={{ uri: tagIcon }} style={{ width: 12, height: 12 }} resizeMode="contain" /> : null}
                        <Text variant="text-xs/bold" color="text-normal">{tagText}</Text>
                    </View> : null}
                </View>
                <Text variant="text-sm/medium" color="text-muted" lineClamp={1}>@{username}{pronouns ? ` · ${pronouns}` : ""}</Text>
                {customStatus ? <Text variant="text-sm/medium" color="text-normal" lineClamp={2}>{customStatus}</Text> : null}
                {activity?.name ? <View style={{ padding: 8, borderRadius: 8, backgroundColor: surface(), gap: 2 }}>
                    <Text variant="text-xs/medium" color="text-muted">{activity.verb}</Text>
                    <Text variant="text-sm/bold" color="text-normal" lineClamp={1}>{activity.name}</Text>
                    {activity.details ? <Text variant="text-xs/medium" color="text-muted" lineClamp={1}>{activity.details}</Text> : null}
                </View> : null}
                {bio ? <Text variant="text-sm/medium" color="text-normal" lineClamp={4}>{bio}</Text> : null}
                {frame || effect ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {frame ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: surface() }}><Text variant="text-xs/medium" color="text-muted">Frame: {frame}</Text></View> : null}
                    {effect ? <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: surface() }}><Text variant="text-xs/medium" color="text-muted">Effect: {effect}</Text></View> : null}
                </View> : null}
            </View>
        </View>
        <Text variant="text-xs/medium" color="text-muted">A rough preview. Frames and effects are drawn by Discord on your real profile.</Text>
    </View>;
}
