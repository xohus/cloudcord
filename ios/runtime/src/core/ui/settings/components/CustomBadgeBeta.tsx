import { Alert, Linking, View } from "react-native";
import { Button, Text } from "@metro/common/components";

export default function CustomBadgeBeta() {
    const open = async () => {
        try { await Linking.openURL("https://getcloudcord.com/upload"); }
        catch { Alert.alert("Couldn't open uploads", "Open getcloudcord.com/upload in your browser."); }
    };
    return <View style={{ gap: 14 }}>
        <Text variant="heading-md/semibold">Custom badges · beta</Text>
        <Text variant="text-sm/medium" color="text-muted">Choose your badge name and PNG on the website. Sign in with the same Discord account. Approved badges appear in CloudCord.</Text>
        <Button text="Upload" variant="secondary" onPress={open} />
    </View>;
}
