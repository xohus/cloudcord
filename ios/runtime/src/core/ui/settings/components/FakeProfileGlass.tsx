import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
import { Button, TableRow, TableRowGroup, TextInput } from "@metro/common/components";

export function DiscordInput({ value, defaultValue, onChangeText, style, placeholderTextColor, ...props }: any) {
    const [draft, setDraft] = useState(defaultValue ?? "");
    return <TextInput {...props} size="lg" value={value ?? draft} onChange={(event: any) => {
        const next = typeof event === "string" ? event : event?.nativeEvent?.text ?? "";
        setDraft(next); onChangeText?.(next);
    }} />;
}

// Compatibility names for existing callers; rendering uses Discord components.
export function GlassCard({ children }: { children: ReactNode; border?: string }) {
    return <TableRowGroup>{children}</TableRowGroup>;
}
export function GlassButton({ label, onPress, muted = false, disabled = false }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean }) {
    return <Button text={label} onPress={onPress} disabled={disabled} variant={muted ? "secondary" : "primary"} />;
}
export type ProfileTab = "profile" | "badges" | "custom" | "others";
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    return <View><TableRowGroup>
        {(["profile", "badges", "custom", "others"] as ProfileTab[]).map(tab => <TableRow key={tab}
            label={{ profile: "My profile", badges: "Badges", custom: "Custom badges · beta", others: "Other profiles" }[tab]}
            trailing={<TableRow.TrailingText text={selected === tab ? "Selected" : ""} />}
            onPress={() => onSelect(tab)} />)}
    </TableRowGroup></View>;
}
