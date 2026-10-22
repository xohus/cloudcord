import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";
import { tokens } from "@metro/common";

function tabIcon(tab: ProfileTab) {
    // Same icons as the desktop editor's sidebar (person, tag, sparkle, status ring, badge, link).
    const names = { overview: ["GridSquareIcon", "DashboardIcon", "HomeIcon", "AppsIcon"], profile: ["UserIcon"], name: ["TagIcon", "TagsIcon", "PencilIcon"], cosmetics: ["SparklesIcon", "SparkleIcon", "StarIcon"], status: ["CircleIcon", "StatusIcon", "UserIcon"], badges: ["BadgeIcon", "StarIcon"], social: ["LinkIcon", "PeopleIcon"], dates: ["CalendarIcon", "ClockIcon"], custom: ["ImageIcon", "StarIcon"], others: ["PeopleIcon", "UserIcon"] }[tab];
    for (const name of [...names, "SettingsIcon"]) {
        try { const id = findAssetId(name); if (id) return <TableRow.Icon source={id} />; } catch {}
    }
}

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

// The three-line menu icon, drawn with plain views so it works on every Discord build.
function MenuIcon({ color }: { color: string }) {
    return <View style={{ width: 20, gap: 4 }}>
        {[0, 1, 2].map(line => <View key={line} style={{ height: 2.5, borderRadius: 2, backgroundColor: color }} />)}
    </View>;
}

// Menu groups, like the desktop dashboard's sidebar.
const GROUPS: [string, ProfileTab[]][] = [
    ["Account", ["overview"]],
    ["Customize", ["profile", "name", "cosmetics", "status"]],
    ["Badges & links", ["badges", "social", "dates"]],
    ["More", ["custom", "others"]]
];
const section = (tab: ProfileTab) => SECTIONS.find(([id]) => id === tab) ?? SECTIONS[0];

/** Dashboard-style menu: a ☰ bar shows where you are and opens the grouped section list. */
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    const [open, setOpen] = useState(false);
    const current = section(selected);
    return <View style={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? "Close menu" : "Open menu"} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: tokens.colors.BACKGROUND_TERTIARY }}>
            <MenuIcon color={open ? "#5865F2" : "#B5BAC1"} />
            <View style={{ flex: 1 }}>
                <Text variant="text-xs/medium" color="text-muted">Custom Profile / {current[1]}</Text>
                <Text variant="text-md/bold">{current[1]}</Text>
            </View>
        </Pressable>
        {open ? <View accessibilityRole="menu" style={{ gap: 10 }}>
            {GROUPS.map(([title, tabs]) => <View key={title} style={{ gap: 4 }}>
                <Text variant="text-xs/semibold" color="text-muted" style={{ paddingHorizontal: 6 }}>{title}</Text>
                <View style={{ borderRadius: 14, overflow: "hidden" }}>
                    <TableRowGroup>
                        {tabs.map(tab => { const [, label, sub] = section(tab); return <View key={tab} style={{ borderLeftWidth: 3, borderLeftColor: tab === selected ? "#5865F2" : "transparent" }}>
                            <TableRow label={label} subLabel={sub} icon={tabIcon(tab)} onPress={() => { onSelect(tab); setOpen(false); }} />
                        </View>; })}
                    </TableRowGroup>
                </View>
            </View>)}
        </View> : null}
    </View>;
}

type OverviewStat = { label: string; value: string; hint: string };
type OverviewTask = { label: string; done: boolean; tab: ProfileTab };
/** Dashboard home: welcome, stat cards, completion checklist and quick actions. */
export function ProfileOverview({ name, subtitle, stats, tasks, onSelect }: { name: string; subtitle: string; stats: OverviewStat[]; tasks: OverviewTask[]; onSelect: (tab: ProfileTab) => void }) {
    const done = tasks.filter(task => task.done).length;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 100;
    const card = { borderRadius: 14, padding: 14, gap: 4, backgroundColor: tokens.colors.BACKGROUND_SECONDARY } as const;
    return <View style={{ gap: 14 }}>
        <View style={{ gap: 2, paddingHorizontal: 4 }}>
            <Text variant="heading-xl/bold">Welcome back, {name}</Text>
            <Text variant="text-sm/medium" color="text-muted">{subtitle}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {stats.map(stat => <View key={stat.label} style={{ ...card, width: "48%", flexGrow: 1 }}>
                <Text variant="text-xs/semibold" color="text-muted">{stat.label}</Text>
                <Text variant="heading-lg/bold" numberOfLines={1}>{stat.value}</Text>
                <Text variant="text-xs/medium" color="text-muted" numberOfLines={1}>{stat.hint}</Text>
            </View>)}
        </View>
        <View style={{ ...card, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text variant="text-md/bold">Profile completion</Text>
                <Text variant="text-xs/bold" style={{ color: "#5865F2" }}>{percent}%</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: tokens.colors.BACKGROUND_TERTIARY, overflow: "hidden" }}>
                <View style={{ width: `${percent}%`, height: 6, borderRadius: 3, backgroundColor: "#5865F2" }} />
            </View>
            {tasks.map(task => <Pressable key={task.label} accessibilityRole="button" onPress={() => onSelect(task.tab)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: task.done ? "#23A55A" : "transparent", borderWidth: task.done ? 0 : 2, borderColor: "#80848E" }}>
                    {task.done ? <Text variant="text-xs/bold" style={{ color: "#FFFFFF" }}>✓</Text> : null}
                </View>
                <Text variant="text-sm/medium" color={task.done ? "text-muted" : undefined} style={{ flex: 1 }}>{task.label}</Text>
                <Text variant="text-sm/medium" color="text-muted">›</Text>
            </Pressable>)}
        </View>
        <View style={{ gap: 8 }}>
            <Text variant="text-md/bold" style={{ paddingHorizontal: 4 }}>Quick actions</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {SECTIONS.filter(([tab]) => tab !== "overview").map(([tab, label, sub]) => <Pressable key={tab} accessibilityRole="button" onPress={() => onSelect(tab)} style={{ ...card, width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 32, alignItems: "center" }}>{tabIcon(tab)}</View>
                    <View style={{ flex: 1 }}>
                        <Text variant="text-sm/bold" numberOfLines={1}>{label}</Text>
                        <Text variant="text-xs/medium" color="text-muted" numberOfLines={2}>{sub}</Text>
                    </View>
                </Pressable>)}
            </View>
        </View>
    </View>;
}
