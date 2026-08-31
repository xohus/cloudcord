import { settings } from "@lib/api/settings";
import { after } from "@lib/api/patcher";
import { _lazyContextSymbol } from "@metro/lazy";
import type { LazyModuleContext } from "@metro/types";
import { findByNameLazy } from "@metro/wrappers";
import { findByProps } from "@metro";
import { useEffect, useRef, useState } from "react";
import { Linking, Modal, Pressable, SafeAreaView, Text, View } from "react-native";

const CONFIG_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/config";
const START_URL = "https://cloudcord.xohus.lol/api/cloudcord/onboarding/start";
let initialized = false;

type GateMode = "join" | "blacklisted";

async function getRootBoundary() {
    const context: LazyModuleContext = findByNameLazy("ErrorBoundary")[_lazyContextSymbol];
    return new Promise<any>(resolve => context.getExports(exp => resolve(exp.prototype)));
}

function CloudCordGate() {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState<GateMode>("join");
    const oauthState = useRef<string | undefined>(undefined);
    const oauthStartedAt = useRef(0);
    const busy = useRef(false);

    useEffect(() => {
        let alive = true;

        const check = async () => {
            if (!alive || busy.current) return;
            busy.current = true;
            try {
                const configResponse = await fetch(CONFIG_URL, { cache: "no-store" } as any);
                if (!configResponse.ok) {
                    setVisible(false);
                    return;
                }
                const config = await configResponse.json();
                if (config?.oauth2Off || !config?.enabled || !config?.guildId) {
                    setVisible(false);
                    return;
                }

                if ((settings as any).cloudcordBlacklisted) {
                    setMode("blacklisted");
                    setVisible(true);
                    return;
                }

                if (oauthState.current) {
                    const response = await fetch(`https://cloudcord.xohus.lol/api/cloudcord/onboarding/status/${encodeURIComponent(oauthState.current)}`, { cache: "no-store" } as any);
                    const result = response.ok ? await response.json() : { status: "pending" };
                    if (result.status === "complete") {
                        oauthState.current = undefined;
                        setVisible(false);
                        return;
                    }
                    if (result.status === "blacklisted") {
                        (settings as any).cloudcordBlacklisted = true;
                        oauthState.current = undefined;
                        setMode("blacklisted");
                        setVisible(true);
                        return;
                    }
                    if (result.status !== "error" && Date.now() - oauthStartedAt.current < 60_000) {
                        setVisible(false);
                        return;
                    }
                    oauthState.current = undefined;
                }

                const guildStore = findByProps("getGuilds", "getGuild") as any;
                if (guildStore?.getGuild?.(String(config.guildId))) {
                    setVisible(false);
                    return;
                }
                setMode("join");
                setVisible(true);
            } catch {
                setVisible(false);
            } finally {
                busy.current = false;
            }
        };

        void check();
        const timer = setInterval(() => void check(), 2000);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);

    const authorize = async () => {
        if (busy.current) return;
        busy.current = true;
        setVisible(false);
        try {
            await new Promise(resolve => setTimeout(resolve, 350));
            const response = await fetch(START_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accepted: true, termsVersion: "2026-08-27" })
            });
            const result = await response.json();
            if (!response.ok || !result?.authorizeUrl || !result?.state) throw new Error("OAuth unavailable");
            oauthState.current = String(result.state);
            oauthStartedAt.current = Date.now();
            const discordUrl = String(result.authorizeUrl).replace("https://discord.com/oauth2/authorize", "discord://-/oauth2/authorize");
            await Linking.openURL(discordUrl);
        } catch {
            setMode("join");
            setVisible(true);
        } finally {
            busy.current = false;
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#111214", justifyContent: "center", padding: 24 }}>
                <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", padding: 24, borderRadius: 16, borderWidth: 1, borderColor: "#3f4147", backgroundColor: "#1e1f22" }}>
                    <Text style={{ color: "#f2f3f5", fontSize: 25, fontWeight: "800", marginBottom: 10, textAlign: "center" }}>
                        {mode === "blacklisted" ? "Access Blacklisted" : "Join CloudCord"}
                    </Text>
                    <Text style={{ color: "#b5bac1", fontSize: 15, lineHeight: 22, marginBottom: mode === "join" ? 20 : 0, textAlign: "center" }}>
                        {mode === "blacklisted"
                            ? "Discord authorization was denied, so this device cannot access CloudCord."
                            : "Join the official CloudCord server to finish setup. By continuing, you accept the Terms of Service."}
                    </Text>
                    {mode === "join" && (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => void authorize()}
                            style={({ pressed }) => ({ paddingVertical: 14, borderRadius: 8, alignItems: "center", backgroundColor: pressed ? "#4752c4" : "#5865f2" })}
                        >
                            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Accept Terms & Continue</Text>
                        </Pressable>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

export function initializeCloudCordVerification() {
    if (initialized) return;
    initialized = true;
    after.await("render", getRootBoundary(), (_args, result) => <>{result}<CloudCordGate /></>);
}
