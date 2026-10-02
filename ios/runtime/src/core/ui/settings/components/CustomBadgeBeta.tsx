import { useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, Text, TextInput, View } from "react-native";
import { GlassButton } from "./FakeProfileGlass";
import { settings } from "@lib/api/settings";
import { findByProps } from "@metro";

const API = "https://getcloudcord.com";
export default function CustomBadgeBeta() {
    const [name, setName] = useState("");
    const [png, setPng] = useState("");
    const [message, setMessage] = useState("beta — AI-approved badges go live, then admins can keep or remove them.");
    const [busy, setBusy] = useState(false);
    const [state, setState] = useState<string | null>(null);
    const [verified, setVerified] = useState(Boolean((settings as any).customBadgeDeviceToken));
    const polling = useRef(false);
    useEffect(() => {
        if (!state) return;
        let alive = true;
        const started = Date.now();
        const timer = setInterval(async () => {
            if (polling.current || !alive) return;
            if (Date.now() - started > 600000) { setState(null); setMessage("verification expired — try again"); return; }
            polling.current = true;
            try {
                const r = await fetch(`${API}/api/cloudcord/onboarding/status/${encodeURIComponent(state)}`);
                const result = await r.json();
                if (alive && result.status === "complete" && result.deviceToken) {
                    (settings as any).customBadgeDeviceToken = result.deviceToken;
                    setVerified(true); setState(null); setMessage("verified — choose a name and PNG");
                } else if (alive && ["error", "expired", "blacklisted"].includes(result.status)) { setState(null); setMessage("verification failed — try again"); }
            } catch { /* Keep waiting until expiry. */ }
            finally { polling.current = false; }
        }, 3000);
        return () => { alive = false; clearInterval(timer); };
    }, [state]);
    const verify = () => Alert.alert("custom badges beta", "verify your Discord account and accept the CloudCord terms. your name and PNG are sent to OpenAI for safety checks. AI-approved badges publish immediately, then CloudCord admins review and can remove them.", [
        { text: "cancel", style: "cancel" },
        { text: "view terms", onPress: () => Linking.openURL(`${API}/tos`) },
        { text: "accept & verify", onPress: async () => {
            try {
                const config = await (await fetch(`${API}/api/cloudcord/onboarding/config`)).json();
                const r = await fetch(`${API}/api/cloudcord/onboarding/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: true, termsVersion: config.termsVersion }) });
                const result = await r.json();
                if (!r.ok || !result.state || !result.authorizeUrl) throw new Error(result.error || "verification unavailable");
                setState(result.state); await Linking.openURL(result.authorizeUrl);
            } catch (e: any) { setMessage(e.message || "verification unavailable"); }
        } }
    ]);
    const pick = async () => {
        try {
            const picker = findByProps("pickSingle", "isCancel") as any;
            if (!picker?.pickSingle) throw new Error("file picker unavailable");
            const asset = await picker.pickSingle({ type: "image/png", mode: "import", copyTo: "documentDirectory" });
            if (asset.size > 524288) throw new Error("PNG must be under 512 KB");
            const native = require("@lib/api/native/modules");
            const files = native.NativeFileModule || native.FileManager;
            if (!files?.readFile) throw new Error("PNG reader unavailable on this Discord build");
            const data = await files.readFile((asset.fileCopyUri || asset.uri).replace(/^file:\/\//, ""), "base64");
            if (data.length > 700000) throw new Error("PNG must be under 512 KB");
            setPng(data); setMessage("PNG selected — ready for the AI safety check");
        } catch (e: any) { setMessage(e.message || "could not read PNG"); }
    };
    const submit = async () => {
        if (busy || !png || !name.trim()) return;
        setBusy(true);
        try {
            const r = await fetch(`${API}/v1/badge-submissions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${(settings as any).customBadgeDeviceToken}` }, body: JSON.stringify({ name, png }) });
            const result = await r.json();
            if (r.status === 401) { (settings as any).customBadgeDeviceToken = null; setVerified(false); }
            setMessage(result.message || "could not submit — nothing was published");
        } catch { setMessage("connection failed — nothing was published"); }
        finally { setBusy(false); }
    };
    const button = (label: string, action: () => void, disabled = false) => <GlassButton label={label} onPress={action} disabled={disabled} />;
    return <View style={{ gap: 14, padding: 2 }}>
        <Text style={{ color: "white", fontWeight: "bold" }}>custom badges · beta</Text>
        <Text style={{ color: "#b5bac1" }}>no staff/verified impersonation, unsafe content, links or personal information. custom badges do not prove staff status.</Text>
        {!verified ? button(state ? "waiting for verification…" : "verify Discord", verify, Boolean(state)) : <>
            <TextInput accessibilityLabel="Custom badge name" value={name} onChangeText={setName} maxLength={40} placeholder="badge name" placeholderTextColor="#9faac4" style={{ color: "white", minHeight: 50, padding: 14, backgroundColor: "rgba(15,19,32,0.55)", borderWidth: 1, borderColor: "rgba(190,202,255,0.16)", borderRadius: 16 }} />
            {png ? <Image source={{ uri: `data:image/png;base64,${png}` }} style={{ width: 48, height: 48 }} /> : null}
            {button("choose PNG", pick, busy)}
            {button(busy ? "checking with AI…" : "submit badge", submit, busy || !png || !name.trim())}
        </>}
        <Text accessibilityLiveRegion="polite" style={{ color: "#b5bac1" }}>{message}</Text>
    </View>;
}
