// CloudCord Profile Studio: the mobile Custom Profile editor UI.
// Everything here is drawn from plain React Native views so it looks the same on
// every Discord build: a hero header, a scrolling section bar, panels, fields,
// switches, chips, picture grids, badge cards and a live preview card.
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { Text } from "@metro/common/components";
import { tokens } from "@metro/common";
import { findAssetId } from "@lib/api/assets";
import { resolveSemanticColor } from "@ui/color";

// ---- Theme ----
// Discord's tokens are semantic colour objects; RN needs real colour strings.
function solid(token: any, fallback: string) {
    try {
        const value = typeof token === "string" ? token : token ? resolveSemanticColor(token) : null;
        return typeof value === "string" && value && !/^(transparent|#0000|#00000000)$/i.test(value) ? value : fallback;
    } catch { return fallback; }
}
const C = {
    page: () => solid(tokens.colors.BACKGROUND_BASE_LOWEST ?? tokens.colors.BACKGROUND_TERTIARY, "#111214"),
    panel: () => solid(tokens.colors.BACKGROUND_BASE_LOWER ?? tokens.colors.BACKGROUND_SECONDARY, "#1E1F22"),
    raised: () => solid(tokens.colors.BACKGROUND_BASE_LOW ?? tokens.colors.BACKGROUND_PRIMARY, "#2B2D31"),
    line: () => solid(tokens.colors.BORDER_SUBTLE, "rgba(255,255,255,0.08)"),
    text: () => solid(tokens.colors.TEXT_NORMAL, "#DBDEE1"),
    muted: () => solid(tokens.colors.TEXT_MUTED, "#949BA4"),
    brand: "#5865F2",
    brandSoft: "rgba(88,101,242,0.18)",
    brandText: "#C9CDFB",
    green: "#23A55A",
    red: "#F23F43",
    off: "#4E5058"
};
const R = { sm: 10, md: 14, lg: 20 };
const GAP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

function icon(names: string[]) {
    for (const name of names) { try { const id = findAssetId(name); if (id) return id; } catch {} }
    return undefined;
}

// ---- Sections ----
export type StudioTab = "overview" | "profile" | "name" | "cosmetics" | "status" | "badges" | "social" | "dates" | "custom" | "saved" | "others";
export const STUDIO_TABS: { id: StudioTab; label: string; blurb: string; icons: string[] }[] = [
    { id: "overview", label: "Home", blurb: "Your profile at a glance", icons: ["HomeIcon", "GridSquareIcon"] },
    { id: "profile", label: "Profile", blurb: "Names, pictures, banner, bio and colours", icons: ["UserIcon"] },
    { id: "name", label: "Name & tag", blurb: "Name style, font and server tag", icons: ["TagIcon", "PencilIcon"] },
    { id: "cosmetics", label: "Cosmetics", blurb: "Decorations, frames, effects, nameplates", icons: ["SparklesIcon", "StarIcon"] },
    { id: "status", label: "Status", blurb: "Online status, custom status, activity", icons: ["CircleIcon", "StatusIcon"] },
    { id: "badges", label: "Badges", blurb: "Badges, Nitro, boosting and order", icons: ["BadgeIcon", "StarIcon"] },
    { id: "social", label: "Connections", blurb: "Accounts and domains on your profile", icons: ["LinkIcon"] },
    { id: "dates", label: "Dates", blurb: "Account created and member since", icons: ["CalendarIcon", "ClockIcon"] },
    { id: "custom", label: "Custom badges", blurb: "Upload your own badge (beta)", icons: ["ImageIcon", "StarIcon"] },
    { id: "saved", label: "Saved", blurb: "Switch between saved copies of your profile", icons: ["BookmarkIcon", "FolderIcon", "StarIcon"] },
    { id: "others", label: "Others", blurb: "Other profiles, fake server and extras", icons: ["PeopleIcon", "UserIcon"] }
];
const tabInfo = (tab: StudioTab) => STUDIO_TABS.find(item => item.id === tab) ?? STUDIO_TABS[0];

function TabIcon({ tab, active, size = 18 }: { tab: StudioTab; active?: boolean; size?: number }) {
    const source = icon([...tabInfo(tab).icons, "SettingsIcon"]);
    return source ? <Image source={source} style={{ width: size, height: size, tintColor: active ? "#FFFFFF" : C.muted() }} resizeMode="contain" /> : null;
}

// ---- Shell ----
const STATUS_COLORS: Record<string, string> = { online: "#23A55A", idle: "#F0B232", dnd: "#F23F43", invisible: "#80848E", streaming: "#593695" };

/** Hero header: banner, avatar, names, the main switch and preview buttons. */
export function StudioHero({ name, username, avatar, banner, accent, status, enabled, onToggle, syncLabel, onPreview, quickLook, onQuickLook }: {
    name: string; username: string; avatar?: string; banner?: string; accent?: string; status?: string;
    enabled: boolean; onToggle: () => void; syncLabel: string; onPreview: () => void; quickLook: boolean; onQuickLook: () => void;
}) {
    const tint = accent || C.brand;
    return <View style={{ borderRadius: R.lg, overflow: "hidden", backgroundColor: C.panel(), borderWidth: 1, borderColor: C.line() }}>
        <View style={{ height: 96, backgroundColor: tint }}>
            {banner ? <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
            <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: enabled ? C.green : C.off }} />
                <Text variant="text-xs/bold" style={{ color: "#FFFFFF" }}>{enabled ? syncLabel : "Off"}</Text>
            </View>
        </View>
        <View style={{ paddingHorizontal: GAP.lg, paddingBottom: GAP.lg, gap: GAP.md }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: GAP.md, marginTop: -36 }}>
                <View style={{ width: 80, height: 80 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: C.panel(), backgroundColor: C.raised(), overflow: "hidden" }}>
                        {avatar ? <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} /> : null}
                    </View>
                    <View style={{ position: "absolute", right: 2, bottom: 2, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: C.panel(), backgroundColor: STATUS_COLORS[status || "online"] || STATUS_COLORS.online }} />
                </View>
                <View style={{ flex: 1, paddingBottom: 4 }}>
                    <Text variant="heading-lg/extrabold" numberOfLines={1} style={{ color: C.text() }}>{name}</Text>
                    <Text variant="text-sm/medium" numberOfLines={1} style={{ color: C.muted() }}>@{username}</Text>
                </View>
            </View>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={onToggle}
                style={{ flexDirection: "row", alignItems: "center", gap: GAP.md, padding: GAP.md, borderRadius: R.md, backgroundColor: enabled ? C.brandSoft : C.raised() }}>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="text-md/bold" style={{ color: C.text() }}>Custom profile</Text>
                    <Text variant="text-xs/medium" style={{ color: C.muted() }}>{enabled ? "On: your edits are showing" : "Off: you see your real profile"}</Text>
                </View>
                <Switch value={enabled} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: GAP.sm }}>
                <Action label="Preview in Discord" onPress={onPreview} primary grow />
                <Action label={quickLook ? "Hide quick look" : "Quick look"} onPress={onQuickLook} grow />
            </View>
        </View>
    </View>;
}

function Action({ label, onPress, primary, danger, disabled, grow }: { label: string; onPress: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; grow?: boolean }) {
    return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
        style={({ pressed }) => ({ flex: grow ? 1 : undefined, alignItems: "center", justifyContent: "center", minHeight: 40, paddingHorizontal: GAP.lg, borderRadius: R.sm, backgroundColor: danger ? C.red : primary ? C.brand : C.raised(), opacity: disabled ? 0.45 : pressed ? 0.8 : 1 })}>
        <Text variant="text-sm/bold" style={{ color: primary || danger ? "#FFFFFF" : C.text() }}>{label}</Text>
    </Pressable>;
}
export { Action as Button };

/** Section bar: every section as a pill, scrolling sideways, the open one filled. */
export function StudioNav({ selected, onSelect }: { selected: StudioTab; onSelect: (tab: StudioTab) => void }) {
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP.sm, paddingVertical: 2 }}>
        {STUDIO_TABS.map(tab => {
            const on = tab.id === selected;
            return <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onSelect(tab.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: on ? C.brand : C.panel(), borderWidth: 1, borderColor: on ? C.brand : C.line() }}>
                <TabIcon tab={tab.id} active={on} size={16} />
                <Text variant="text-sm/bold" style={{ color: on ? "#FFFFFF" : C.text() }}>{tab.label}</Text>
            </Pressable>;
        })}
    </ScrollView>;
}

/** Title for the open section. */
export function StudioTitle({ tab }: { tab: StudioTab }) {
    const info = tabInfo(tab);
    return <View style={{ flexDirection: "row", alignItems: "center", gap: GAP.md, paddingHorizontal: 2 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.brand }}><TabIcon tab={tab} active size={20} /></View>
        <View style={{ flex: 1 }}>
            <Text variant="heading-lg/bold" style={{ color: C.text() }}>{info.label}</Text>
            <Text variant="text-sm/medium" style={{ color: C.muted() }}>{info.blurb}</Text>
        </View>
    </View>;
}

/** A rounded surface that holds a section's content. */
export function Panel({ children, padded = true }: { children: ReactNode; padded?: boolean; border?: string }) {
    return <View style={{ borderRadius: R.lg, backgroundColor: C.panel(), borderWidth: 1, borderColor: C.line(), padding: padded ? GAP.lg : 0, gap: GAP.lg, overflow: "hidden" }}>{children}</View>;
}

type HomeStat = { label: string; value: string; hint: string };
type HomeTask = { label: string; done: boolean; tab: StudioTab };
/** Home: stats, a completion ring-style meter, next steps and every section as a tile. */
export function StudioHome({ stats, tasks, onSelect }: { stats: HomeStat[]; tasks: HomeTask[]; onSelect: (tab: StudioTab) => void }) {
    const done = tasks.filter(task => task.done).length;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 100;
    const todo = tasks.filter(task => !task.done);
    const rows: HomeStat[][] = [];
    for (let i = 0; i < stats.length; i += 2) rows.push(stats.slice(i, i + 2));
    const tiles = STUDIO_TABS.filter(tab => tab.id !== "overview");
    const tileRows: typeof tiles[] = [];
    for (let i = 0; i < tiles.length; i += 3) tileRows.push(tiles.slice(i, i + 3));
    return <View style={{ gap: GAP.lg }}>
        <View style={{ gap: GAP.sm }}>
            {rows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: GAP.sm }}>
                {row.map(stat => <View key={stat.label} style={{ flex: 1, padding: GAP.md, borderRadius: R.md, backgroundColor: C.panel(), borderWidth: 1, borderColor: C.line(), gap: 4 }}>
                    <Text variant="text-xs/bold" numberOfLines={1} style={{ color: C.muted() }}>{stat.label.toUpperCase()}</Text>
                    <Text variant="heading-lg/extrabold" numberOfLines={1} style={{ color: C.text() }}>{stat.value}</Text>
                    <Text variant="text-xs/medium" numberOfLines={1} style={{ color: C.muted() }}>{stat.hint}</Text>
                </View>)}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>)}
        </View>
        <Panel>
            <View style={{ flexDirection: "row", alignItems: "center", gap: GAP.md }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 5, borderColor: percent === 100 ? C.green : C.brand, alignItems: "center", justifyContent: "center" }}>
                    <Text variant="text-sm/extrabold" style={{ color: C.text() }}>{percent}%</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="text-md/bold" style={{ color: C.text() }}>{percent === 100 ? "Profile complete" : "Finish your profile"}</Text>
                    <Text variant="text-xs/medium" style={{ color: C.muted() }}>{done} of {tasks.length} done</Text>
                </View>
            </View>
            {todo.length ? <View style={{ gap: GAP.xs }}>
                {todo.map(task => <Pressable key={task.label} accessibilityRole="button" onPress={() => onSelect(task.tab)}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: GAP.md, padding: GAP.md, borderRadius: R.sm, backgroundColor: pressed ? C.raised() : "transparent" })}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.muted() }} />
                    <Text variant="text-sm/semibold" style={{ flex: 1, color: C.text() }}>{task.label}</Text>
                    <Text variant="text-sm/bold" style={{ color: C.brandText }}>Go</Text>
                </Pressable>)}
            </View> : null}
        </Panel>
        <View style={{ gap: GAP.sm }}>
            {tileRows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: GAP.sm }}>
                {row.map(tab => <Pressable key={tab.id} accessibilityRole="button" onPress={() => onSelect(tab.id)}
                    style={({ pressed }) => ({ flex: 1, minHeight: 92, padding: GAP.md, borderRadius: R.md, backgroundColor: pressed ? C.raised() : C.panel(), borderWidth: 1, borderColor: C.line(), gap: GAP.sm, justifyContent: "space-between" })}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.brandSoft }}><TabIcon tab={tab.id} size={16} /></View>
                    <Text variant="text-xs/bold" numberOfLines={2} style={{ color: C.text() }}>{tab.label}</Text>
                </Pressable>)}
                {Array.from({ length: 3 - row.length }, (_, i) => <View key={"pad" + i} style={{ flex: 1 }} />)}
            </View>)}
        </View>
    </View>;
}

// ---- Controls ----
/** A switch drawn with views. */
export function Switch({ value }: { value: boolean }) {
    return <View style={{ width: 44, height: 26, borderRadius: 13, padding: 3, backgroundColor: value ? C.green : C.off, alignItems: value ? "flex-end" : "flex-start" }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
    </View>;
}

/** A labelled on/off row. */
export function Toggle({ label, subLabel, value, onPress }: { label: string; subLabel?: string; value: boolean; onPress: () => void }) {
    return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} onPress={onPress}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: GAP.md, paddingVertical: GAP.md, paddingHorizontal: GAP.md, borderRadius: R.md, backgroundColor: pressed ? C.raised() : C.page() })}>
        <View style={{ flex: 1, gap: 2 }}>
            <Text variant="text-md/semibold" style={{ color: C.text() }}>{label}</Text>
            {subLabel ? <Text variant="text-xs/medium" style={{ color: C.muted() }}>{subLabel}</Text> : null}
        </View>
        <Switch value={value} />
    </Pressable>;
}

/** A tappable row with a value on the right, for pickers. */
export function PickRow({ label, subLabel, value, onPress }: { label: string; subLabel?: string; value?: string; onPress: () => void }) {
    return <Pressable accessibilityRole="button" onPress={onPress}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: GAP.md, padding: GAP.md, borderRadius: R.md, backgroundColor: pressed ? C.raised() : C.page() })}>
        <View style={{ flex: 1, gap: 2 }}>
            <Text variant="text-md/semibold" style={{ color: C.text() }}>{label}</Text>
            {subLabel ? <Text variant="text-xs/medium" style={{ color: C.muted() }}>{subLabel}</Text> : null}
        </View>
        {value ? <Text variant="text-sm/medium" numberOfLines={1} style={{ maxWidth: "50%", color: C.muted() }}>{value}</Text> : null}
        <Text variant="text-md/bold" style={{ color: C.muted() }}>›</Text>
    </Pressable>;
}

/** Text box. Keeps typing local so slow saves never fight the keyboard. */
export function Input({ value, defaultValue, onChangeText, style, multiline, ...props }: any) {
    const [focused, setFocused] = useState(false);
    return <TextInput {...props} value={value} defaultValue={value === undefined ? defaultValue : undefined} multiline={multiline}
        onChangeText={(text: string) => onChangeText?.(text)} onFocus={(event: any) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event: any) => { setFocused(false); props.onBlur?.(event); }}
        placeholderTextColor={props.placeholderTextColor ?? C.muted()}
        style={[{ minHeight: multiline ? 96 : 44, paddingHorizontal: GAP.md, paddingVertical: multiline ? GAP.md : 0, borderRadius: R.md, borderWidth: 2, borderColor: focused ? C.brand : "transparent", backgroundColor: C.page(), color: C.text(), fontSize: 16, textAlignVertical: multiline ? "top" : "center" }, style]} />;
}

/** A list row: optional icon, label and sub-label, then a value, custom trailing content or an arrow. */
export function Row({ label, subLabel, icon, trailing, value, arrow, selected, onPress }: { label: string; subLabel?: string; icon?: ReactNode; trailing?: ReactNode; value?: string; arrow?: boolean; selected?: boolean; onPress?: () => void }) {
    return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} disabled={!onPress} onPress={onPress}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: GAP.md, padding: GAP.md, borderRadius: R.md, borderWidth: selected ? 2 : 0, borderColor: C.brand, backgroundColor: pressed ? C.raised() : selected ? C.brandSoft : C.page() })}>
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
            <Text variant="text-md/semibold" numberOfLines={2} style={{ color: C.text() }}>{label}</Text>
            {subLabel ? <Text variant="text-xs/medium" style={{ color: C.muted() }}>{subLabel}</Text> : null}
        </View>
        {trailing}
        {value ? <Text variant="text-sm/medium" numberOfLines={1} style={{ maxWidth: "45%", color: C.muted() }}>{value}</Text> : null}
        {selected ? <Text variant="text-md/bold" style={{ color: C.brandText }}>✓</Text> : arrow ? <Text variant="text-md/bold" style={{ color: C.muted() }}>›</Text> : null}
    </Pressable>;
}
export function RowIcon({ source }: { source: any }) {
    return source ? <Image source={source} style={{ width: 24, height: 24, borderRadius: 4, tintColor: typeof source === "number" ? C.muted() : undefined }} resizeMode="contain" /> : null;
}
export function RowText({ text }: { text: string }) {
    return <Text variant="text-sm/medium" numberOfLines={1} style={{ maxWidth: 160, color: C.muted() }}>{text}</Text>;
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return <View style={{ gap: GAP.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: GAP.sm }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: C.brand }} />
            <Text variant="text-md/bold" style={{ flex: 1, color: C.text() }}>{title}</Text>
        </View>
        {description ? <Text variant="text-sm/medium" style={{ color: C.muted() }}>{description}</Text> : null}
        <View style={{ gap: GAP.md }}>{children}</View>
    </View>;
}

export function Divider() {
    return <View style={{ height: 1, backgroundColor: C.line() }} />;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
    return <View style={{ gap: 6 }}>
        <Text variant="text-xs/bold" style={{ color: C.muted(), letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
        {children}
        {error ? <Text variant="text-xs/semibold" style={{ color: C.red }}>{error}</Text> : hint ? <Text variant="text-xs/medium" style={{ color: C.muted() }}>{hint}</Text> : null}
    </View>;
}

export function Chips<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string; dot?: string }[]; value: T; onChange: (value: T) => void }) {
    return <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP.sm }}>
        {options.map(option => {
            const on = option.value === value;
            return <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(option.value)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? C.brand : C.page(), borderWidth: 1, borderColor: on ? C.brand : C.line() }}>
                {option.dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: option.dot }} /> : null}
                <Text variant="text-sm/bold" style={{ color: on ? "#FFFFFF" : C.text() }}>{option.label}</Text>
            </Pressable>;
        })}
    </View>;
}

function Tick() {
    return <View style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
        <Text variant="text-xs/bold" style={{ color: "#FFFFFF" }}>✓</Text>
    </View>;
}

export function CurrentRow({ label, image, wide, onRemove }: { label: string | null; image?: string; wide?: boolean; onRemove: () => void }) {
    return <View style={{ flexDirection: "row", alignItems: "center", gap: GAP.md, padding: GAP.md, borderRadius: R.md, backgroundColor: C.page(), borderWidth: 1, borderColor: label ? C.brand : C.line(), minHeight: 56 }}>
        {label && image ? <Image source={{ uri: image }} resizeMode={wide ? "cover" : "contain"} style={{ width: wide ? 96 : 36, height: 36, borderRadius: 8 }} /> : null}
        <View style={{ flex: 1, gap: 2 }}>
            <Text variant="text-xs/bold" style={{ color: C.muted() }}>CURRENT</Text>
            <Text variant="text-sm/semibold" numberOfLines={1} style={{ color: label ? C.text() : C.muted() }}>{label || "Nothing selected"}</Text>
        </View>
        {label ? <Pressable accessibilityRole="button" onPress={onRemove} style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,63,67,0.15)" }}>
            <Text variant="text-xs/bold" style={{ color: C.red }}>Remove</Text>
        </Pressable> : null}
    </View>;
}

/** Picture grid: search, "None" first, tick on the selection, "Show more". */
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
    const cells: ReactNode[] = [];
    const cell = (key: string, label: string, image: string | undefined, selected: boolean, onPress: () => void, none = false) =>
        <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
            style={{ flex: 1, padding: 6, borderRadius: R.md, borderWidth: 2, borderColor: selected ? C.brand : "transparent", backgroundColor: selected ? C.brandSoft : C.page(), gap: 6 }}>
            <View style={{ width: "100%", aspectRatio: wide ? 4 : 1, borderRadius: R.sm, overflow: "hidden", backgroundColor: C.raised(), alignItems: "center", justifyContent: "center" }}>
                {none ? <Text variant="heading-lg/bold" style={{ color: C.muted() }}>∅</Text> : image ? <Image source={{ uri: image }} resizeMode={wide ? "cover" : "contain"} style={{ width: "100%", height: "100%" }} /> : null}
            </View>
            <Text variant="text-xs/semibold" numberOfLines={1} style={{ color: C.text() }}>{label}</Text>
            {selected ? <Tick /> : null}
        </Pressable>;
    if (status?.loading) return <Text variant="text-sm/medium" style={{ color: C.muted() }}>Loading Discord's catalog…</Text>;
    if (status?.error) return <View style={{ gap: GAP.sm }}>
        <Text variant="text-sm/medium" style={{ color: C.red }}>{status.error}</Text>
        {onRetry ? <Action label="Try again" onPress={onRetry} /> : null}
    </View>;
    if (!needle) cells.push(cell("__none", noneLabel, undefined, noneSelected, onNone, true));
    for (const item of filtered.slice(0, limit)) cells.push(cell(keyOf(item), labelOf(item), imageOf(item), isSelected(item), () => onPick(item)));
    const rows: ReactNode[][] = [];
    for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
    return <View style={{ gap: GAP.md }}>
        <SearchInput value={query} placeholder={`Search ${items.length}`} autoCorrect={false} onChangeText={(value: string) => { setQuery(value); setLimit(18); }} />
        <View style={{ gap: GAP.sm }}>
            {rows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: GAP.sm }}>
                {row}
                {Array.from({ length: columns - row.length }, (_, i) => <View key={"pad" + i} style={{ flex: 1 }} />)}
            </View>)}
        </View>
        {!filtered.length ? <Text variant="text-sm/medium" style={{ color: C.muted() }}>Nothing matches “{query}”.</Text> : null}
        {limit < filtered.length ? <Action label={`Show more (${filtered.length - limit} left)`} onPress={() => setLimit(value => value + 18)} /> : null}
    </View>;
}

export type BadgeChoice = { key: string; label: string; icon?: string; active: boolean; onPress: () => void };
export function BadgeGrid({ items }: { items: BadgeChoice[] }) {
    const rows: BadgeChoice[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return <View style={{ gap: GAP.sm }}>
        {rows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: GAP.sm }}>
            {row.map(item => <Pressable key={item.key} accessibilityRole="checkbox" accessibilityState={{ checked: item.active }} accessibilityLabel={item.label} onPress={item.onPress}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: GAP.sm, minHeight: 48, paddingHorizontal: GAP.md, borderRadius: R.md, borderWidth: 2, borderColor: item.active ? C.brand : "transparent", backgroundColor: item.active ? C.brandSoft : C.page() }}>
                {item.icon ? <Image source={{ uri: item.icon }} style={{ width: 24, height: 24 }} resizeMode="contain" /> : <View style={{ width: 24, height: 24 }} />}
                <Text variant="text-sm/semibold" numberOfLines={2} style={{ flex: 1, color: C.text() }}>{item.label}</Text>
            </Pressable>)}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>)}
    </View>;
}

/** A quick look at the edits; Discord draws the real profile, frames and effects included. */
export function PreviewCard({ name, username, pronouns, avatar, banner, primary, accent, decoration, nameplate, tagText, tagIcon, status, customStatus, activity, bio, frame, effect }: {
    name: string; username: string; pronouns?: string; avatar?: string; banner?: string; primary?: string; accent?: string; decoration?: string; nameplate?: string;
    tagText?: string; tagIcon?: string; status?: string; customStatus?: string; activity?: { verb: string; name: string; details?: string } | null; bio?: string; frame?: string; effect?: string;
}) {
    const edge = primary || C.brand;
    const card = C.page();
    return <View style={{ gap: GAP.sm }}>
        <View style={{ borderRadius: R.lg, padding: 3, backgroundColor: edge }}>
            <View style={{ height: 88, borderTopLeftRadius: R.lg - 3, borderTopRightRadius: R.lg - 3, overflow: "hidden", backgroundColor: accent || edge }}>
                {banner ? <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
            </View>
            <View style={{ backgroundColor: card, borderBottomLeftRadius: R.lg - 3, borderBottomRightRadius: R.lg - 3, padding: GAP.md, paddingTop: 50, gap: 6 }}>
                <View style={{ position: "absolute", top: -42, left: 14, width: 84, height: 84 }}>
                    <Image source={{ uri: avatar }} style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 6, borderColor: card }} />
                    {decoration ? <Image source={{ uri: decoration }} style={{ position: "absolute", top: -10, left: -10, width: 104, height: 104 }} resizeMode="contain" /> : null}
                    <View style={{ position: "absolute", right: 2, bottom: 4, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: card, backgroundColor: STATUS_COLORS[status || "online"] || STATUS_COLORS.online }} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, overflow: "hidden", paddingVertical: 2 }}>
                    {nameplate ? <Image source={{ uri: nameplate }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" /> : null}
                    <Text variant="heading-lg/bold" numberOfLines={1} style={{ color: C.text() }}>{name}</Text>
                    {tagText ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.35)" }}>
                        {tagIcon ? <Image source={{ uri: tagIcon }} style={{ width: 12, height: 12 }} resizeMode="contain" /> : null}
                        <Text variant="text-xs/bold" style={{ color: C.text() }}>{tagText}</Text>
                    </View> : null}
                </View>
                <Text variant="text-sm/medium" numberOfLines={1} style={{ color: C.muted() }}>@{username}{pronouns ? ` · ${pronouns}` : ""}</Text>
                {customStatus ? <Text variant="text-sm/medium" numberOfLines={2} style={{ color: C.text() }}>{customStatus}</Text> : null}
                {activity?.name ? <View style={{ padding: GAP.sm, borderRadius: R.sm, backgroundColor: C.panel(), gap: 2 }}>
                    <Text variant="text-xs/bold" style={{ color: C.muted() }}>{activity.verb.toUpperCase()}</Text>
                    <Text variant="text-sm/bold" numberOfLines={1} style={{ color: C.text() }}>{activity.name}</Text>
                    {activity.details ? <Text variant="text-xs/medium" numberOfLines={1} style={{ color: C.muted() }}>{activity.details}</Text> : null}
                </View> : null}
                {bio ? <Text variant="text-sm/medium" numberOfLines={4} style={{ color: C.text() }}>{bio}</Text> : null}
                {frame || effect ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {frame ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: C.panel() }}><Text variant="text-xs/semibold" style={{ color: C.muted() }}>Frame: {frame}</Text></View> : null}
                    {effect ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: C.panel() }}><Text variant="text-xs/semibold" style={{ color: C.muted() }}>Effect: {effect}</Text></View> : null}
                </View> : null}
            </View>
        </View>
        <Text variant="text-xs/medium" style={{ color: C.muted() }}>Quick look only. Discord draws frames and effects on your real profile.</Text>
    </View>;
}

// ---- Drop-in replacements for the Discord components the sub-editors used ----
export function DiscordButton({ text, variant, disabled, onPress }: { text: string; variant?: string; size?: string; disabled?: boolean; onPress: () => void }) {
    return <Action label={text} primary={variant === "primary"} danger={variant === "destructive"} disabled={disabled} onPress={onPress} />;
}
export function GlassButton({ label, onPress, disabled }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean }) {
    return <Action label={label} onPress={onPress} disabled={disabled} />;
}
export function TableRow(props: any) { return <Row {...props} />; }
TableRow.Icon = RowIcon;
TableRow.TrailingText = RowText;
export { Input as DiscordInput };


/** A card drawn like Discord's profile popout: banner, ringed avatar, badge pill, names, status and bio. */
export function DiscordProfileCard({ name, username, pronouns, avatar, banner, primary, secondary, decoration, status, customStatus, bio, activity, tagText, badges = [] }: {
    name: string; username: string; pronouns?: string; avatar?: string; banner?: string; primary?: string; secondary?: string; decoration?: string; status?: string;
    customStatus?: string; bio?: string; activity?: { verb: string; name: string; details?: string } | null; tagText?: string; badges?: string[];
}) {
    const themed = !!primary;
    const base = "#111214";
    const ring = themed ? "#1A1B1E" : base;
    const inner = <View style={{ borderRadius: themed ? 6 : 10, overflow: "hidden", backgroundColor: themed ? "rgba(0,0,0,0.5)" : base }}>
        <View style={{ height: 96, backgroundColor: primary || C.brand }}>
            {banner ? <Image source={{ uri: banner }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
        </View>
        <View style={{ position: "absolute", top: 54, left: 14, width: 84, height: 84 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 6, borderColor: ring, backgroundColor: ring, overflow: "hidden" }}>
                {avatar ? <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} /> : null}
            </View>
            {decoration ? <Image source={{ uri: decoration }} style={{ position: "absolute", top: -6, left: -6, width: 96, height: 96 }} resizeMode="contain" /> : null}
            <View style={{ position: "absolute", right: 2, bottom: 4, width: 22, height: 22, borderRadius: 11, borderWidth: 5, borderColor: ring, backgroundColor: STATUS_COLORS[status || "online"] || STATUS_COLORS.online }} />
        </View>
        {badges.length ? <View style={{ alignSelf: "flex-end", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 2, maxWidth: "58%", marginTop: 8, marginRight: 10, paddingHorizontal: 4, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.35)" }}>
            {badges.slice(0, 8).map((icon, index) => <Image key={index} source={{ uri: icon }} style={{ width: 20, height: 20 }} resizeMode="contain" />)}
        </View> : null}
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: badges.length ? 22 : 46, gap: 10 }}>
            <View style={{ gap: 2 }}>
                <Text variant="heading-lg/extrabold" numberOfLines={1} style={{ color: "#FFFFFF" }}>{name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                    <Text variant="text-sm/medium" numberOfLines={1} style={{ color: "#DBDEE1" }}>{username}</Text>
                    {tagText ? <View style={{ paddingHorizontal: 5, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.35)" }}><Text variant="text-xs/bold" style={{ color: "#DBDEE1" }}>{tagText}</Text></View> : null}
                    {pronouns ? <Text variant="text-sm/medium" numberOfLines={1} style={{ color: "#DBDEE1", opacity: 0.8 }}>• {pronouns}</Text> : null}
                </View>
            </View>
            {customStatus ? <View style={{ alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" }}>
                <Text variant="text-sm/medium" numberOfLines={1} style={{ color: "#DBDEE1" }}>{customStatus}</Text>
            </View> : null}
            {bio || activity?.name ? <View style={{ gap: 8, padding: 10, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)" }}>
                {bio ? <Text variant="text-sm/medium" numberOfLines={3} style={{ color: "#DBDEE1" }}>{bio}</Text> : null}
                {activity?.name ? <View style={{ gap: 1 }}>
                    <Text variant="text-xs/bold" style={{ color: "#B5BAC1" }}>{(activity.verb || "Playing").toUpperCase()}</Text>
                    <Text variant="text-sm/bold" numberOfLines={1} style={{ color: "#F2F3F5" }}>{activity.name}</Text>
                    {activity.details ? <Text variant="text-xs/medium" numberOfLines={1} style={{ color: "#B5BAC1" }}>{activity.details}</Text> : null}
                </View> : null}
            </View> : null}
        </View>
    </View>;
    if (!themed) return <View style={{ borderRadius: 10, overflow: "hidden" }}>{inner}</View>;
    // Themed profiles: a two-colour frame like Discord's (top colour, bottom colour).
    return <View style={{ borderRadius: 10, overflow: "hidden", padding: 4, backgroundColor: primary }}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", backgroundColor: secondary || primary }} />
        {inner}
    </View>;
}
