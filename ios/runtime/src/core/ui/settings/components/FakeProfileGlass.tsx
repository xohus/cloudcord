import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";
import { tokens } from "@metro/common";

function tabIcon(tab: ProfileTab) {
    // Same icons as the desktop editor's sidebar (person, tag, sparkle, status ring, badge, link).
    const names = { profile: ["UserIcon"], name: ["TagIcon", "TagsIcon", "PencilIcon"], cosmetics: ["SparklesIcon", "SparkleIcon", "StarIcon"], status: ["CircleIcon", "StatusIcon", "UserIcon"], badges: ["BadgeIcon", "StarIcon"], social: ["LinkIcon", "PeopleIcon"], dates: ["CalendarIcon", "ClockIcon"], custom: ["ImageIcon", "StarIcon"], others: ["PeopleIcon", "UserIcon"] }[tab];
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
export type ProfileTab = "profile" | "name" | "cosmetics" | "status" | "badges" | "social" | "dates" | "custom" | "others";
// Every editor section, in the same order as the desktop sidebar.
const SECTIONS: [ProfileTab, string, string][] = [
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

/** Desktop-style section menu, stacked vertically: a ☰ bar shows where you are and opens the full list. */
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    const [open, setOpen] = useState(false);
    const current = SECTIONS.find(([tab]) => tab === selected) ?? SECTIONS[0];
    return <View style={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? "Close sections menu" : "Open sections menu"} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: tokens.colors.BACKGROUND_TERTIARY }}>
            <MenuIcon color={open ? "#5865F2" : "#B5BAC1"} />
            <View style={{ flex: 1 }}>
                <Text variant="text-md/bold">{current[1]}</Text>
                <Text variant="text-xs/medium" color="text-muted" numberOfLines={1}>{open ? "Choose a section" : current[2]}</Text>
            </View>
            <Text variant="text-xs/semibold" color="text-muted">{SECTIONS.findIndex(([tab]) => tab === current[0]) + 1}/{SECTIONS.length}</Text>
        </Pressable>
        {open ? <View accessibilityRole="menu" style={{ borderRadius: 16, overflow: "hidden" }}>
            <TableRowGroup>
                {SECTIONS.map(([tab, label, sub]) => <View key={tab} style={{ borderLeftWidth: 3, borderLeftColor: tab === selected ? "#5865F2" : "transparent" }}>
                    <TableRow label={label} subLabel={sub} icon={tabIcon(tab)} arrow onPress={() => { onSelect(tab); setOpen(false); }} />
                </View>)}
            </TableRowGroup>
        </View> : null}
    </View>;
}
