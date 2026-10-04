import { View, Text, ScrollView } from "react-native";
import { NavigationNative } from "@metro/common";
import { isFontSupported, isThemeSupported } from "@lib/api/native/loader";
import { GlassButton, GlassCard } from "@core/ui/settings/components/FakeProfileGlass";

export default function Addons() {
    const navigation = NavigationNative.useNavigation();
    const open = (title: string, load: () => any) => navigation.push("PUPU_CUSTOM_PAGE", {
        title, render: () => { const Page = load().default; return <Page />; }
    });
    return <ScrollView style={{ backgroundColor: "#313338" }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <GlassCard><View style={{ padding: 20, gap: 14 }}>
            <Text style={{ color: "#f2f3f5", fontSize: 22, fontWeight: "600" }}>Add-ons</Text>
            <Text style={{ color: "#b5bac1" }}>Manage what you use, or find something new.</Text>
            <GlassButton label="Installed plugins" onPress={() => open("Plugins", () => require("@core/ui/settings/pages/Plugins"))} />
            <GlassButton label="Discover plugins" onPress={() => open("Discover plugins", () => require("@core/ui/settings/pages/PluginBrowser"))} />
            {isThemeSupported() && <GlassButton muted label="Themes" onPress={() => open("Themes", () => require("@core/ui/settings/pages/Themes"))} />}
            {isFontSupported() && <GlassButton muted label="Fonts" onPress={() => open("Fonts", () => require("@core/ui/settings/pages/Fonts"))} />}
        </View></GlassCard>
    </ScrollView>;
}
