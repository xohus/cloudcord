import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { settings } from "@lib/api/settings";
import { GlassButton } from "./FakeProfileGlass";

export default function LocalProfiles({ badges, refresh }: { badges: any[]; refresh: () => void }) {
    const [id, setId] = useState("");
    const [draft, setDraft] = useState<any>({});
    const state = settings as any;
    const load = (value: string) => {
        setId(value);
        setDraft({ ...(state.cloudcordLocalProfiles?.[value] || {}) });
    };
    const save = () => {
        if (!/^\d{15,22}$/.test(id)) return Alert.alert("User ID needed", "Paste the Discord user ID.");
        for (const field of ["avatar", "banner"]) {
            if (draft[field] && !/^https:\/\//i.test(draft[field])) return Alert.alert("Image link needed", "Use an HTTPS image link.");
        }
        state.cloudcordLocalProfiles = { ...(state.cloudcordLocalProfiles || {}), [id]: { ...draft, __localOnly: true } };
        refresh();
        Alert.alert("Saved on this device", "Reopen their profile to see your changes. Nobody else sees these edits.");
    };
    const remove = () => Alert.alert("Restore this profile?", "Only your local changes will be removed.", [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: () => {
            const next = { ...(state.cloudcordLocalProfiles || {}) }; delete next[id];
            state.cloudcordLocalProfiles = next; setDraft({}); refresh();
        } }
    ]);
    const input = (label: string, key: string, multiline = false) => <View style={{ gap: 6 }}>
        <Text style={{ color: "#cbd3e7", fontSize: 13 }}>{label}</Text>
        <TextInput accessibilityLabel={label} value={draft[key] ?? ""} onChangeText={value => setDraft({ ...draft, [key]: value })}
            multiline={multiline} autoCapitalize="none" maxLength={key === "bio" ? 500 : 2048}
            style={{ color: "#fff", padding: 14, borderRadius: 16, backgroundColor: "rgba(15,19,32,0.55)", minHeight: multiline ? 90 : 48 }} />
    </View>;
    return <View style={{ gap: 14, padding: 16 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>Other profiles</Text>
        <Text style={{ color: "#b8c0d8" }}>Only on this device. This does not change their Discord account or shared profile.</Text>
        <TextInput accessibilityLabel="Discord user ID" placeholder="Discord user ID" placeholderTextColor="#9faac4" keyboardType="number-pad" value={id} onChangeText={load}
            style={{ color: "#fff", padding: 14, borderRadius: 16, backgroundColor: "rgba(15,19,32,0.55)" }} />
        {input("Display name", "displayName")}{input("Username", "username")}
        {input("Profile picture link", "avatar")}{input("Banner link", "banner")}{input("Bio", "bio", true)}{input("Pronouns", "pronouns")}
        <Text style={{ color: "#cbd3e7" }}>Badges · local preview</Text>
        {badges.map(([key, label, flag, , customId]) => {
            const selected = flag ? Boolean((draft.badgeFlags || 0) & flag) : (draft.customBadgeIds || []).includes(customId || key);
            return <GlassButton key={key} muted={!selected} label={(selected ? "✓ " : "") + label} onPress={() => {
                if (flag) setDraft({ ...draft, badgeFlags: (draft.badgeFlags || 0) ^ flag });
                else {
                    const name = customId || key, list = draft.customBadgeIds || [];
                    setDraft({ ...draft, customBadgeIds: selected ? list.filter((item: string) => item !== name) : [...list, name] });
                }
            }} />;
        })}
        <GlassButton label="Save locally" onPress={save} />
        <GlassButton label="Restore original" muted onPress={remove} />
    </View>;
}
