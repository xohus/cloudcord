import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";

// Code-native glass styling: no new native module or startup-time blur lookup.
export function GlassCard({ children }: { children: ReactNode; border?: string }) {
    const [opaque, setOpaque] = useState(false);
    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceTransparencyEnabled?.().then(value => { if (alive) setOpaque(value); }).catch(() => {});
        const listener = AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", setOpaque);
        return () => { alive = false; listener?.remove?.(); };
    }, []);
    return <View style={{ borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(194,207,255,0.18)", backgroundColor: opaque ? "#252936" : "rgba(39,44,61,0.80)", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14 }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 18, right: 18, height: 1, backgroundColor: "rgba(255,255,255,0.24)" }} />
        {children}
    </View>;
}
export type ProfileTab = "profile" | "badges" | "custom";
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    return <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
        {(["profile", "badges", "custom"] as ProfileTab[]).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: selected === tab }} onPress={() => onSelect(tab)} style={({ pressed }) => ({ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, paddingHorizontal: 4, backgroundColor: selected === tab ? "#6575ef" : pressed ? "rgba(255,255,255,0.10)" : "transparent" })}>
            <Text allowFontScaling style={{ fontSize: 14, fontWeight: "600", color: selected === tab ? "#fff" : "#b8c0d8" }}>{tab}</Text>
        </Pressable>)}
    </View>;
}
