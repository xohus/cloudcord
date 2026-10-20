import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button, Card, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";
import { tokens } from "@metro/common";

function tabIcon(tab: ProfileTab) {
    const names = { profile: ["UserIcon"], style: ["PaintPaletteIcon", "SparklesIcon", "StarIcon"], dates: ["CalendarIcon", "ClockIcon"], status: ["CircleIcon", "StatusIcon", "UserIcon"], social: ["LinkIcon", "PeopleIcon"], badges: ["StarIcon"], custom: ["ImageIcon", "StarIcon"], others: ["PeopleIcon", "UserIcon"] }[tab];
    for (const name of [...names, "SettingsIcon"]) {
        try { const id = findAssetId(name); if (id) return <TableRow.Icon source={id} />; } catch {}
    }
}

export function DiscordInput({ value, defaultValue, onChangeText, style, placeholderTextColor, ...props }: any) {
    const [draft, setDraft] = useState(defaultValue ?? "");
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
export type ProfileTab = "profile" | "style" | "status" | "badges" | "social" | "dates" | "custom" | "others";
const MAIN_TABS: [ProfileTab, string][] = [["profile", "Profile"], ["style", "Style"], ["status", "Status"], ["badges", "Badges"]];
const MORE_TABS: [ProfileTab, string, string][] = [
    ["social", "Connections", "Accounts and domains on your profile"],
    ["dates", "Dates", "Account created and member-since dates"],
    ["custom", "Custom badges · beta", "Upload a badge name and PNG"],
    ["others", "Other profiles", "Changes visible only on this device"]
];
/** Four main tabs in one compact row; everything else lives under a collapsible More. */
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    const inMore = MORE_TABS.some(([tab]) => tab === selected);
    const [moreOpen, setMoreOpen] = useState(inMore);
    return <View style={{ gap: 12 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, gap: 4, borderRadius: 14, backgroundColor: tokens.colors.BACKGROUND_TERTIARY }}>
            {MAIN_TABS.map(([tab, label]) => {
                const on = tab === selected;
                return <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onSelect(tab)}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: on ? tokens.colors.BACKGROUND_MODIFIER_SELECTED : "transparent" }}>
                    <Text variant="text-sm/semibold" color={on ? "text-normal" : "text-muted"}>{label}</Text>
                </Pressable>;
            })}
        </View>
        <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <TableRow arrow label={moreOpen ? "Hide more options" : "More options"} subLabel={inMore && !moreOpen ? MORE_TABS.find(([tab]) => tab === selected)?.[1] : "Connections, dates, custom badges, other profiles"} icon={tabIcon("others")} onPress={() => setMoreOpen(!moreOpen)} />
            {moreOpen ? MORE_TABS.map(([tab, label, sub]) => <View key={tab} style={{ borderLeftWidth: 3, borderLeftColor: tab === selected ? "#5865F2" : "transparent" }}>
                <TableRow label={label} subLabel={sub} icon={tabIcon(tab)} onPress={() => onSelect(tab)} />
            </View>) : null}
        </View>
    </View>;
}
