import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { settings } from "@lib/api/settings";
import { BundleUpdaterManager } from "@lib/api/native/modules";
import { isSafeMode, toggleSafeMode } from "@core/debug/safeMode";
import { GlassButton, GlassCard } from "@core/ui/settings/components/FakeProfileGlass";

export default function Recovery({ embedded = false }: { embedded?: boolean }) {
    const [status, setStatus] = useState("Your account and shared profiles are never deleted here.");
    const [busy, setBusy] = useState(false);
    const run = async (task: () => any) => {
        if (busy) return; setBusy(true);
        try { await task(); setStatus("Done. Reopen Discord to apply changes."); }
        catch (error: any) { setStatus(error?.message || "Could not complete this action."); }
        finally { setBusy(false); }
    };
    const controls =
        <GlassCard><View style={{ padding: 16, gap: 14 }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600" }}>Recovery</Text>
            <Text style={{ color: "#b5bac1" }}>{status}</Text>
            <GlassButton disabled={busy} label="Download latest runtime" onPress={() => run(() => BundleUpdaterManager.download())} />
            <GlassButton disabled={busy} label="Update & restart" onPress={() => run(() => BundleUpdaterManager.reload())} />
            <GlassButton muted disabled={busy} label={isSafeMode() ? "Enable add-ons again" : "Start without add-ons"} onPress={() => {
                toggleSafeMode({ to: !isSafeMode(), reload: false });
                setStatus("Safe mode changed. Reopen Discord to apply it.");
            }} />
            <GlassButton muted label="Reset tab layout" onPress={() => Alert.alert("Reset tab layout?", "Show the normal CloudCord tabs again.", [
                { text: "Cancel", style: "cancel" }, { text: "Reset", onPress: () => {
                    (settings as any).cloudcordTabOrder = []; (settings as any).cloudcordHiddenTabs = [];
                    (settings as any).cloudcordSectionHidden = false; setStatus("Layout reset. Reopen Discord.");
                } }
            ])} />
            <GlassButton muted label="Clear local profile edits" onPress={() => Alert.alert("Clear local edits?", "Restores other users' profiles on this device. Your own profile and shared data stay untouched.", [
                { text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: () => {
                    (settings as any).cloudcordLocalProfiles = {}; setStatus("Local edits cleared. Reopen any open profiles.");
                } }
            ])} />
        </View></GlassCard>;
    return embedded ? controls : <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>{controls}</ScrollView>;
}
