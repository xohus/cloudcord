import { defineCorePlugin } from "..";
import { useProxy } from "@core/vendetta/storage";
import { awaitStorage, createStorage } from "@lib/api/storage";
import { Stack, TableRowGroup, TableSwitchRow, Text, TextInput } from "@metro/common/components";
import { View } from "react-native";

import { filterMessages } from "../shared/messageFilter";

// Mobile version of the BlockKeywords plugin by catcraft and secp192k1.
interface Settings { keywords?: string; ignoreCase?: boolean; regex?: boolean; }
const storage = createStorage<Settings>("plugins/storage/cloudcord.blockkeywords.json");

function matchers(): ((text: string) => boolean)[] {
    const words = String(storage.keywords || "").split(",").map(word => word.trim()).filter(Boolean);
    const flags = storage.ignoreCase !== false ? "i" : "";
    return words.map(word => {
        if (storage.regex) { try { const re = new RegExp(word, flags); return (text: string) => re.test(text); } catch { return () => false; } }
        const needle = flags ? word.toLowerCase() : word;
        return (text: string) => (flags ? text.toLowerCase() : text).includes(needle);
    });
}

let stopFilter: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.blockkeywords",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "BlockKeywords",
            description: "Hides messages that contain words you choose",
            authors: [{ name: "catcraft" }, { name: "secp192k1" }],
        },
    },
    start() {
        void awaitStorage(storage).then(() => {
            stopFilter = filterMessages(message => {
                const tests = matchers();
                if (!tests.length) return false;
                const texts = [message.content || "", ...(message.embeds || []).flatMap(embed => [embed.title || "", embed.description || ""])];
                return texts.some(text => text && tests.some(test => test(text)));
            });
        });
    },
    stop() { stopFilter?.(); stopFilter = undefined; },
    SettingsComponent() {
        const state = useProxy(storage);
        return <View style={{ padding: 16 }}>
            <Stack spacing={16}>
                <TextInput size="md" label="Blocked words" value={state.keywords ?? ""} placeholder="spoiler, word two, another"
                    onChange={(value: any) => storage.keywords = typeof value === "string" ? value : value?.nativeEvent?.text ?? ""} />
                <Text variant="text-xs/medium" color="text-muted">Separate words with commas. New and loaded messages containing any of them are hidden.</Text>
                <TableRowGroup>
                    <TableSwitchRow label="Ignore upper and lower case" value={state.ignoreCase !== false} onValueChange={(value: boolean) => storage.ignoreCase = value} />
                    <TableSwitchRow label="Treat words as regular expressions" value={state.regex === true} onValueChange={(value: boolean) => storage.regex = value} />
                </TableRowGroup>
            </Stack>
        </View>;
    },
});
