import PupuIcon from "@assets/icons/cloudcord.png";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { NavigationNative } from "@metro/common";
import { Button, Stack, TableRow, TableRowGroup, Text, TextInput } from "@metro/common/components";
import { showToast } from "@ui/toasts";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

const VERIFY_URL = "https://getcloudcord.com/api/mobile/developer-access";

export default function DeveloperAccess() {
    const navigation = NavigationNative.useNavigation();
    const [pin, setPin] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const verify = async () => {
        if (submitting || !pin.trim()) return;
        setSubmitting(true);

        try {
            const response = await fetch(VERIFY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ pin: pin.trim() }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || typeof payload?.accessToken !== "string") {
                throw new Error(response.status === 429 ? "Too many attempts. Try again later." : "Incorrect access PIN.");
            }

            settings.developerSettings = true;
            settings.developerAccessToken = payload.accessToken;
            settings.developerAccessExpiresAt = payload.expiresAt;
            setPin("");
            showToast("Developer access unlocked", findAssetId("Check"));

            const Developer = (await import("@core/ui/settings/pages/Developer")).default;
            navigation.replace("PUPU_CUSTOM_PAGE", {
                title: "Developer",
                render: () => <Developer />,
            });
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Could not verify access.", findAssetId("Small"));
        } finally {
            setSubmitting(false);
        }
    };

    return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="CloudCord Access">
                    <TableRow
                        label="Developer panel"
                        subLabel="Enter the access PIN to continue. Verification is performed securely by CloudCord."
                        icon={<TableRow.Icon source={{ uri: PupuIcon }} />}
                    />
                    <TableRow label={<Stack spacing={12} style={{ width: "100%" }}>
                        <Text variant="text-sm/medium" color="text-muted">Access PIN</Text>
                        <TextInput
                            size="lg"
                            value={pin}
                            placeholder="Enter PIN"
                            secureTextEntry
                            keyboardType="number-pad"
                            maxLength={12}
                            onChange={(value: any) => setPin(typeof value === "string" ? value : value?.nativeEvent?.text ?? "")}
                            onSubmitEditing={verify}
                        />
                        <Button text={submitting ? "Checking…" : "Unlock"} disabled={submitting || !pin.trim()} onPress={verify} />
                    </Stack>} />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    </KeyboardAvoidingView>;
}
