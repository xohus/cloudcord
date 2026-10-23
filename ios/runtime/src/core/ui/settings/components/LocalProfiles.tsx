// Other profiles: change how other people look, only on this device.
import { useReducer, useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { Text } from "@metro/common/components";
import { findByStoreName } from "@metro";
import { settings } from "@lib/api/settings";
import { BadgeGrid, Button, Chips, DiscordInput as TextInput, Field, Section } from "./ProfileStudio";

type Option = { value: number; label: string };
type LocalProfile = Record<string, any>;

function userStore() { try { return findByStoreName("UserStore") as any; } catch { return null; } }
function avatarOf(id: string, data?: LocalProfile) {
    if (data?.avatar) return data.avatar;
    try { return userStore()?.getUser?.(id)?.getAvatarURL?.(undefined, 64) || undefined; } catch { return undefined; }
}
function labelOf(id: string, data?: LocalProfile) {
    let user: any = null;
    try { user = userStore()?.getUser?.(id); } catch {}
    return { name: data?.displayName || user?.globalName || user?.username || "Unknown user", username: data?.username || user?.username || id };
}
const hexToNumber = (text: string) => { const clean = text.trim().replace(/^#/, ""); return /^[0-9a-f]{6}$/i.test(clean) ? parseInt(clean, 16) : undefined; };
const numberToHex = (value: any) => typeof value === "number" && Number.isFinite(value) ? "#" + value.toString(16).padStart(6, "0").toUpperCase() : "";

export default function LocalProfiles({ badges, refresh, nitroOptions = [], boostOptions = [], giftOptions = [] }: {
    badges: any[]; refresh: () => void; nitroOptions?: Option[]; boostOptions?: Option[]; giftOptions?: Option[];
}) {
    const state = settings as any;
    const [, redraw] = useReducer((x: number) => x + 1, 0);
    const [id, setId] = useState("");
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState<LocalProfile>({});
    const saved: Record<string, LocalProfile> = state.cloudcordLocalProfiles || {};
    const ids = Object.keys(saved);
    const validId = /^\d{15,22}$/.test(id.trim());
    const set = (key: string, value: any) => setDraft(previous => ({ ...previous, [key]: value }));

    const open = (target: string) => {
        const clean = target.trim();
        setId(clean); setEditing(clean);
        setDraft({ ...(saved[clean] || {}) });
    };
    const save = () => {
        if (!editing) return;
        for (const field of ["avatar", "banner"]) {
            if (draft[field] && !/^https:\/\//i.test(draft[field])) return Alert.alert("Image link needed", "Use an HTTPS image link for the picture and banner.");
        }
        const clean = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== undefined && value !== null));
        state.cloudcordLocalProfiles = { ...saved, [editing]: { ...clean, __localOnly: true } };
        refresh(); redraw();
        Alert.alert("Saved on this device", "Open their profile to see it. Nobody else sees these changes.");
    };
    const restore = (target: string) => Alert.alert("Restore this profile?", "Your changes for this person are removed. Their real profile stays as it is.", [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", style: "destructive", onPress: () => {
            const next = { ...saved }; delete next[target];
            state.cloudcordLocalProfiles = next;
            if (editing === target) { setEditing(null); setDraft({}); }
            refresh(); redraw();
        } }
    ]);

    const input = (label: string, key: string, options: { multiline?: boolean; placeholder?: string; max?: number } = {}) =>
        <Field label={label}>
            <TextInput accessibilityLabel={label} value={draft[key] ?? ""} placeholder={options.placeholder} onChangeText={(value: string) => set(key, value)}
                multiline={options.multiline} autoCapitalize="none" autoCorrect={false} maxLength={options.max ?? 2048} />
        </Field>;
    const color = (label: string, key: string) => <Field label={label} hint="Hex colour, like #5865F2. Empty keeps theirs.">
        <TextInput accessibilityLabel={label} defaultValue={numberToHex(draft[key])} placeholder="#5865F2" autoCapitalize="characters" autoCorrect={false} maxLength={7}
            onChangeText={(value: string) => set(key, value.trim() ? hexToNumber(value) : undefined)} />
    </Field>;
    const target = editing ? labelOf(editing, draft) : null;

    return <View style={{ gap: 24 }}>
        <Section title="Other profiles" description="Change how other people's profiles look, only on this device. Nobody else sees it, and their Discord account doesn't change.">
            <Field label="Discord user ID" hint="Long-press someone → Copy User ID">
                <TextInput accessibilityLabel="Discord user ID" placeholder="123456789012345678" keyboardType="number-pad" value={id} onChangeText={(value: string) => setId(value.replace(/\D/g, ""))} />
            </Field>
            <Button label={validId && saved[id.trim()] ? "Edit this person" : "Add this person"} primary disabled={!validId} onPress={() => open(id)} />
        </Section>

        <Section title={`People you edited (${ids.length})`}>
            {!ids.length ? <Text variant="text-sm/medium" color="text-muted">Nobody yet. Add someone's user ID above.</Text> : null}
            {ids.map(userId => {
                const data = saved[userId];
                const label = labelOf(userId, data);
                const avatar = avatarOf(userId, data);
                const extras = [data.nitro && Number(data.nitroLevel ?? -1) >= 0 ? "Nitro" : "", Number(data.boostMonths ?? -1) >= 0 ? "Booster" : "", data.badgeFlags || data.customBadgeIds?.length ? "Badges" : "", data.avatar ? "Picture" : "", data.bio ? "Bio" : ""].filter(Boolean).join(" · ");
                return <Pressable key={userId} accessibilityRole="button" onPress={() => open(userId)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: editing === userId ? "#5865F2" : "transparent", backgroundColor: "rgba(0,0,0,0.25)" }}>
                    {avatar ? <Image source={{ uri: avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#4E5058" }} />}
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="text-md/bold" color="text-normal" numberOfLines={1}>{label.name}</Text>
                        <Text variant="text-xs/medium" color="text-muted" numberOfLines={1}>@{label.username}{extras ? " · " + extras : ""}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={"Restore " + label.name} onPress={() => restore(userId)} hitSlop={8}
                        style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,63,67,0.15)" }}>
                        <Text variant="text-xs/bold" style={{ color: "#F23F43" }}>Restore</Text>
                    </Pressable>
                </Pressable>;
            })}
        </Section>

        {editing && target ? <>
            <Section title={"Editing " + target.name} description={"User ID " + editing + ". Empty fields keep their real (or synced) value."}>
                {input("Display name", "displayName", { placeholder: target.name, max: 32 })}
                {input("Username", "username", { placeholder: target.username, max: 32 })}
                {input("Profile picture link", "avatar", { placeholder: "https://…" })}
                {input("Banner link", "banner", { placeholder: "https://…" })}
                {input("Pronouns", "pronouns", { max: 40 })}
                {input("About me", "bio", { multiline: true, max: 190 })}
                {color("Profile colour", "primaryColor")}
                {color("Second colour", "accentColor")}
                {input("Account created", "createdAt", { placeholder: "YYYY-MM-DD", max: 10 })}
            </Section>
            <Section title="Nitro, boosting and gifts" description="Shown on their profile on this device.">
                <Field label="Nitro"><Chips options={[{ value: -1, label: "None" }, ...nitroOptions]} value={draft.nitro === false ? -1 : Number(draft.nitroLevel ?? -1)} onChange={(value: number) => setDraft(previous => ({ ...previous, nitroLevel: value, nitro: value >= 0 }))} /></Field>
                {Number(draft.nitroLevel ?? -1) >= 0 ? input("Nitro since", "nitroSince", { placeholder: "YYYY-MM-DD", max: 10 }) : null}
                <Field label="Server boosting"><Chips options={[{ value: -1, label: "None" }, ...boostOptions]} value={Number(draft.boostMonths ?? -1)} onChange={(value: number) => set("boostMonths", value)} /></Field>
                <Field label="Gift badge"><Chips options={[{ value: -1, label: "None" }, ...giftOptions]} value={Number(draft.giftLevel ?? -1)} onChange={(value: number) => set("giftLevel", value)} /></Field>
            </Section>
            <Section title="Badges">
                <BadgeGrid items={badges.map(([key, label, flag, icon, customId]: any[]) => {
                    const active = flag ? Boolean((draft.badgeFlags || 0) & flag) : (draft.customBadgeIds || []).includes(customId || key);
                    return { key, label, icon: typeof icon === "string" ? icon : undefined, active, onPress: () => {
                        if (flag) set("badgeFlags", (draft.badgeFlags || 0) ^ flag);
                        else { const name = customId || key, list: string[] = draft.customBadgeIds || []; set("customBadgeIds", active ? list.filter(item => item !== name) : [...list, name]); }
                    } };
                })} />
            </Section>
            <View style={{ gap: 8 }}>
                <Button label={"Save for " + target.name} primary onPress={save} />
                {saved[editing] ? <Button label="Restore original" danger onPress={() => restore(editing)} /> : null}
                <Button label="Close" onPress={() => { setEditing(null); setDraft({}); }} />
            </View>
        </> : null}
    </View>;
}
