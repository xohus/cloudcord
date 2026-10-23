import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { Button, Card, Text, TextInput } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";
import { tokens } from "@metro/common";
import { resolveSemanticColor } from "@ui/color";

export function DiscordInput({ value, defaultValue, onChangeText, style, placeholderTextColor, ...props }: any) {
    const [draft, setDraft] = useState(defaultValue ?? "");
    useEffect(() => { setDraft(defaultValue ?? ""); }, [defaultValue]);
    const change = (event: any) => {
        const next = typeof event === "string" ? event : event?.nativeEvent?.text ?? event?.text ?? event?.value;
        if (typeof next !== "string") return;
        setDraft(next); onChangeText?.(next);
    };
    return <View style={{ borderRadius: 12, overflow: "hidden", width: "100%" }}><TextInput {...props} size="lg" value={value ?? draft} onChange={change} onChangeText={change} /></View>;
}

// Compatibility names for existing callers; rendering uses Discord components.
export function GlassCard({ children }: { children: ReactNode; border?: string }) {
    return <View style={{ borderRadius: 16, overflow: "hidden", width: "100%" }}><Card>{children}</Card></View>;
}
export function GlassButton({ label, onPress, muted = false, disabled = false }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean }) {
    return <Button text={label} onPress={onPress} disabled={disabled} variant="secondary" />;
}
export type ProfileTab = "overview" | "profile" | "name" | "cosmetics" | "status" | "badges" | "social" | "dates" | "custom" | "others";
// Every editor section, in the same order as the desktop sidebar.
const SECTIONS: [ProfileTab, string, string][] = [
    ["overview", "Overview", "Your profile at a glance"],
    ["profile", "Profile", "Names, pictures, banner, bio and colors"],
    ["name", "Name & tag", "Name style, font, colors and server tag"],
    ["cosmetics", "Cosmetics", "Decorations, frames, effects and nameplates"],
    ["status", "Status", "Online status, custom status and activity"],
    ["badges", "Badges", "Badges, Nitro, boosting, activity badges and order"],
    ["social", "Connections", "Accounts and domains on your profile"],
    ["dates", "Dates", "Account created and member-since dates"],
    ["custom", "Custom badges · beta", "Upload a badge name and PNG"],
    ["others", "Other profiles", "Changes visible only on this device"]
];

// ---- Dashboard UI: top bar + slide-in drawer + overview, built from plain views ----
const UI = {
    accent: "#5865F2",
    accentSoft: "rgba(88, 101, 242, 0.16)",
    green: "#23A55A",
    radius: 16,
    gap: 12
};
// Discord tokens are semantic colour objects; RN needs a real colour string or it draws nothing.
function solid(token: any, fallback: string) {
    try {
        const value = typeof token === "string" ? token : token ? resolveSemanticColor(token) : null;
        return typeof value === "string" && value && !/^(transparent|#0000|#00000000)$/i.test(value) ? value : fallback;
    } catch { return fallback; }
}
const surface = () => solid(tokens.colors.BACKGROUND_SECONDARY ?? tokens.colors.BACKGROUND_BASE_LOW, "#2B2D31");
const surfaceAlt = () => solid(tokens.colors.BACKGROUND_TERTIARY ?? tokens.colors.BACKGROUND_BASE_LOWEST, "#1E1F22");
const border = () => solid(tokens.colors.BORDER_SUBTLE, "rgba(255,255,255,0.08)");
const textColor = () => solid(tokens.colors.TEXT_NORMAL, "#DBDEE1");

const ICONS: Record<ProfileTab, string[]> = {
    overview: ["GridSquareIcon", "DashboardIcon", "HomeIcon", "AppsIcon"], profile: ["UserIcon"], name: ["TagIcon", "TagsIcon", "PencilIcon"],
    cosmetics: ["SparklesIcon", "SparkleIcon", "StarIcon"], status: ["CircleIcon", "StatusIcon", "UserIcon"], badges: ["BadgeIcon", "StarIcon"],
    social: ["LinkIcon", "PeopleIcon"], dates: ["CalendarIcon", "ClockIcon"], custom: ["ImageIcon", "StarIcon"], others: ["PeopleIcon", "UserIcon"]
};
function iconSource(tab: ProfileTab) {
    for (const name of [...ICONS[tab], "SettingsIcon"]) { try { const id = findAssetId(name); if (id) return id; } catch {} }
    return undefined;
}
/** A square icon tile, tinted like a dashboard nav icon. */
function IconTile({ tab, active = false, size = 36 }: { tab: ProfileTab; active?: boolean; size?: number }) {
    const source = iconSource(tab);
    return <View style={{ width: size, height: size, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: active ? UI.accent : UI.accentSoft }}>
        {source ? <Image source={source} style={{ width: size * 0.5, height: size * 0.5, tintColor: active ? "#FFFFFF" : "#C9CDFB" }} resizeMode="contain" /> : null}
    </View>;
}
/** Three-line menu button, drawn with views so it works on every Discord build. */
function MenuButton({ onPress }: { onPress: () => void }) {
    return <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={onPress} hitSlop={8}
        style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: surfaceAlt() }}>
        <View style={{ width: 18, gap: 4 }}>{[0, 1, 2].map(line => <View key={line} style={{ height: 2, borderRadius: 1, backgroundColor: textColor() }} />)}</View>
    </Pressable>;
}
/** Lays children out two per row so every card has the same width. */
function Grid2({ items }: { items: ReactNode[] }) {
    const rows: ReactNode[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return <View style={{ gap: UI.gap }}>
        {rows.map((row, index) => <View key={index} style={{ flexDirection: "row", gap: UI.gap }}>
            {row.map((item, i) => <View key={i} style={{ flex: 1 }}>{item}</View>)}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>)}
    </View>;
}

const GROUPS: [string, ProfileTab[]][] = [
    ["Account", ["overview"]],
    ["Customize", ["profile", "name", "cosmetics", "status"]],
    ["Badges & links", ["badges", "social", "dates"]],
    ["More", ["custom", "others"]]
];
const sectionOf = (tab: ProfileTab) => SECTIONS.find(([id]) => id === tab) ?? SECTIONS[0];

/** Top bar with the menu on the left, plus a left drawer with every section in groups. */
export function ProfileTabs({ selected, onSelect, status }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void; status?: string }) {
    const [open, setOpen] = useState(false);
    const [, label, sub] = sectionOf(selected);
    const choose = (tab: ProfileTab) => { onSelect(tab); setOpen(false); };
    return <View style={{ gap: UI.gap }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: UI.radius, backgroundColor: surface(), borderWidth: 1, borderColor: border() }}>
            <MenuButton onPress={() => setOpen(true)} />
            <View style={{ flex: 1 }}>
                <Text variant="text-xs/medium" color="text-muted" numberOfLines={1}>Custom Profile</Text>
                <Text variant="text-lg/bold" numberOfLines={1}>{label}</Text>
            </View>
            {status ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: surfaceAlt() }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: UI.green }} />
                <Text variant="text-xs/semibold" color="text-muted">{status}</Text>
            </View> : null}
        </View>
        {selected !== "overview" ? <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 }}>
            <IconTile tab={selected} active size={40} />
            <View style={{ flex: 1 }}>
                <Text variant="heading-lg/bold">{label}</Text>
                <Text variant="text-sm/medium" color="text-muted">{sub}</Text>
            </View>
        </View> : null}
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
            <View style={{ flex: 1, flexDirection: "row" }}>
                <View style={{ width: "78%", maxWidth: 340, height: "100%", paddingTop: 54, paddingHorizontal: 14, paddingBottom: 24, gap: 18, backgroundColor: surface(), borderRightWidth: 1, borderColor: border() }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 }}>
                        <IconTile tab="overview" active size={34} />
                        <Text variant="heading-md/bold" style={{ flex: 1 }}>Custom Profile</Text>
                    </View>
                    <ScrollView contentContainerStyle={{ gap: 18 }}>
                        {GROUPS.map(([title, tabs]) => <View key={title} style={{ gap: 4 }}>
                            <Text variant="text-xs/semibold" color="text-muted" style={{ paddingHorizontal: 8, marginBottom: 2 }}>{title}</Text>
                            {tabs.map(tab => {
                                const on = tab === selected;
                                return <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => choose(tab)}
                                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, backgroundColor: on ? UI.accentSoft : "transparent" }}>
                                    <IconTile tab={tab} active={on} size={32} />
                                    <Text variant={on ? "text-md/bold" : "text-md/medium"} style={{ flex: 1 }}>{sectionOf(tab)[1]}</Text>
                                </Pressable>;
                            })}
                        </View>)}
                    </ScrollView>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
            </View>
        </Modal>
    </View>;
}

type OverviewStat = { label: string; value: string; hint: string };
type OverviewTask = { label: string; done: boolean; tab: ProfileTab };
function Panel({ children, style }: { children: ReactNode; style?: any }) {
    return <View style={[{ borderRadius: UI.radius, padding: 14, backgroundColor: surface(), borderWidth: 1, borderColor: border() }, style]}>{children}</View>;
}
/** Dashboard home: welcome, stat cards, completion checklist and quick actions. */
export function ProfileOverview({ name, subtitle, stats, tasks, onSelect }: { name: string; subtitle: string; stats: OverviewStat[]; tasks: OverviewTask[]; onSelect: (tab: ProfileTab) => void }) {
    const done = tasks.filter(task => task.done).length;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 100;
    return <View style={{ gap: UI.gap + 4 }}>
        <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <Text variant="heading-xl/bold" numberOfLines={1}>Welcome back, {name}</Text>
            <Text variant="text-sm/medium" color="text-muted">{subtitle}</Text>
        </View>
        <Grid2 items={stats.map(stat => <Panel key={stat.label} style={{ gap: 6, minHeight: 96 }}>
            <Text variant="text-xs/semibold" color="text-muted" numberOfLines={1}>{stat.label}</Text>
            <Text variant="heading-xl/bold" numberOfLines={1}>{stat.value}</Text>
            <Text variant="text-xs/medium" color="text-muted" numberOfLines={1}>{stat.hint}</Text>
        </Panel>)} />
        <Panel style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text variant="text-md/bold" style={{ flex: 1 }}>Profile completion</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: UI.accentSoft }}>
                    <Text variant="text-xs/bold" style={{ color: "#C9CDFB" }}>{percent}%</Text>
                </View>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: surfaceAlt(), overflow: "hidden" }}>
                <View style={{ width: `${percent}%`, height: 6, borderRadius: 3, backgroundColor: UI.accent }} />
            </View>
            <View style={{ gap: 2 }}>
                {tasks.map(task => <Pressable key={task.label} accessibilityRole="button" onPress={() => onSelect(task.tab)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: task.done ? UI.green : "transparent", borderWidth: task.done ? 0 : 2, borderColor: "#80848E" }}>
                        {task.done ? <Text variant="text-xs/bold" style={{ color: "#FFFFFF" }}>✓</Text> : null}
                    </View>
                    <Text variant="text-sm/medium" color={task.done ? "text-muted" : undefined} style={{ flex: 1 }}>{task.label}</Text>
                    <Text variant="text-md/medium" color="text-muted">↗</Text>
                </Pressable>)}
            </View>
        </Panel>
        <View style={{ gap: UI.gap }}>
            <Text variant="text-md/bold" style={{ paddingHorizontal: 4 }}>Quick actions</Text>
            <Grid2 items={SECTIONS.filter(([tab]) => tab !== "overview").map(([tab, label, sub]) => <Pressable key={tab} accessibilityRole="button" onPress={() => onSelect(tab)}>
                <Panel style={{ gap: 10, minHeight: 112 }}>
                    <IconTile tab={tab} />
                    <View style={{ gap: 2 }}>
                        <Text variant="text-sm/bold" numberOfLines={1}>{label}</Text>
                        <Text variant="text-xs/medium" color="text-muted" numberOfLines={2}>{sub}</Text>
                    </View>
                </Panel>
            </Pressable>)} />
        </View>
    </View>;
}
