import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import { Button, Card, TableRow, TableRowGroup, TextInput } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";

function tabIcon(tab: ProfileTab) {
    const names = { profile: ["UserIcon"], badges: ["StarIcon"], custom: ["ImageIcon", "StarIcon"], others: ["PeopleIcon", "UserIcon"] }[tab];
    for (const name of [...names, "SettingsIcon"]) {
        try { const id = findAssetId(name); if (id) return <TableRow.Icon source={id} />; } catch {}
    }
}

export function DiscordInput({ value, defaultValue, onChangeText, style, placeholderTextColor, ...props }: any) {
    const [draft, setDraft] = useState(defaultValue ?? "");
    return <View style={{ borderRadius: 12, overflow: "hidden", width: "100%" }}><TextInput {...props} size="lg" value={value ?? draft} onChange={(event: any) => {
        const next = typeof event === "string" ? event : event?.nativeEvent?.text ?? "";
        setDraft(next); onChangeText?.(next);
    }} /></View>;
}

// Compatibility names for existing callers; rendering uses Discord components.
export function GlassCard({ children }: { children: ReactNode; border?: string }) {
    return <View style={{ borderRadius: 16, overflow: "hidden", width: "100%" }}><Card>{children}</Card></View>;
}
export function GlassButton({ label, onPress, muted = false, disabled = false }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean }) {
    return <Button text={label} onPress={onPress} disabled={disabled} variant="secondary" />;
}
export type ProfileTab = "profile" | "badges" | "custom" | "others";
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    return <View><TableRowGroup>
        {(["profile", "badges", "custom", "others"] as ProfileTab[]).map(tab => <TableRow key={tab}
            label={{ profile: "My profile", badges: "Badges", custom: "Custom badges · beta", others: "Other profiles" }[tab]}
            subLabel={{ profile: "Name, pictures, bio and profile appearance", badges: "Choose which badges appear on your profile", custom: "Upload a badge name and PNG", others: "Changes visible only on this device" }[tab]}
            icon={tabIcon(tab)}
            trailing={<TableRow.TrailingText text={selected === tab ? "Selected" : ""} />}
            onPress={() => onSelect(tab)} />)}
    </TableRowGroup></View>;
}
