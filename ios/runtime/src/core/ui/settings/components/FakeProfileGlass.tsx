import type { ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { findAssetId } from "@lib/api/assets";

function ProfileTabIcon({ tab, color }: { tab: ProfileTab; color: string }) {
    let icon: number | undefined;
    for (const name of tab === "profile" ? ["UserIcon"] : tab === "badges" ? ["StarIcon"] : ["PaintPaletteIcon", "SparklesIcon"]) {
        try { icon = findAssetId(name); } catch {}
        if (icon) break;
    }
    return icon ? <Image accessible={false} source={icon} style={{ width: 18, height: 18, tintColor: color }} /> : <Text accessible={false} style={{ color, fontSize: 17 }}>{tab === "profile" ? "◉" : tab === "badges" ? "✦" : "✧"}</Text>;
}

// Code-native glass styling: no new native module or startup-time blur lookup.
export function GlassCard({ children }: { children: ReactNode; border?: string }) {
    // No AccessibilityInfo/TurboModule lookup during early Rain injection.
    const opaque = false;
    return <View style={{ borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(194,207,255,0.18)", backgroundColor: opaque ? "#252936" : "rgba(39,44,61,0.80)", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 14 }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 18, right: 18, height: 1, backgroundColor: "rgba(255,255,255,0.24)" }} />
        {children}
    </View>;
}
export type ProfileTab = "profile" | "badges" | "custom" | "others";
export function GlassButton({ label, onPress, muted = false, disabled = false }: { label: string; onPress: () => void; muted?: boolean; disabled?: boolean }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ width: "100%", minHeight: 50, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: muted ? "rgba(190,202,255,0.24)" : "rgba(255,255,255,0.30)", alignItems: "center", justifyContent: "center", backgroundColor: disabled ? "#303647" : muted ? "#30394e" : pressed ? "#5261cc" : "#6575ef", opacity: disabled ? 0.6 : 1 })}>
        {({ pressed }) => <>
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "48%", backgroundColor: pressed ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)" }} />
            <View pointerEvents="none" style={{ position: "absolute", top: 1, left: 14, right: 14, height: 1, backgroundColor: "rgba(255,255,255,0.35)" }} />
            <View pointerEvents="none" style={{ position: "absolute", bottom: 1, left: 12, right: 12, height: 1, backgroundColor: "rgba(0,0,0,0.16)" }} />
            <Text style={{ color: muted ? "#d5ddff" : "#fff", textAlign: "center", fontSize: 14, fontWeight: "600" }}>{label}</Text>
        </>}
    </Pressable>;
}
export function ProfileTabs({ selected, onSelect }: { selected: ProfileTab; onSelect: (tab: ProfileTab) => void }) {
    return <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
        {(["profile", "badges", "custom", "others"] as ProfileTab[]).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={tab === "custom" ? "custom badges beta" : tab} accessibilityState={{ selected: selected === tab }} onPress={() => onSelect(tab)} style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 15, paddingHorizontal: 4, gap: 3, backgroundColor: selected === tab ? "#6575ef" : pressed ? "rgba(255,255,255,0.10)" : "transparent" })}>
            <ProfileTabIcon tab={tab} color={selected === tab ? "#fff" : "#b8c0d8"} />
            <Text allowFontScaling style={{ fontSize: 12, fontWeight: "600", color: selected === tab ? "#fff" : "#b8c0d8" }}>{tab === "custom" ? "custom · beta" : tab}</Text>
        </Pressable>)}
    </View>;
}
