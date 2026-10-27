import { defineCorePlugin } from "..";
import { useProxy } from "@core/vendetta/storage";
import { awaitStorage, createStorage } from "@lib/api/storage";
import { Button, Stack, Text, TextInput } from "@metro/common/components";
import { View } from "react-native";

import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the TextReplace plugin by AutumnVN, TheKodeToad, Etorix and Ape.
interface Rule { find: string; replace: string; }
const storage = createStorage<{ rules?: Rule[]; }>("plugins/storage/cloudcord.textreplace.json");
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const textOf = (value: any) => typeof value === "string" ? value : value?.nativeEvent?.text ?? "";

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.textreplace",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "TextReplace",
            description: "Replaces words in messages you send with your own rules",
            authors: [{ name: "AutumnVN" }, { name: "TheKodeToad" }, { name: "Etorix" }, { name: "Ape" }],
        },
    },
    start() {
        void awaitStorage(storage).then(() => {
            unpatch = onSendMessage(message => {
                if (typeof message.content !== "string") return;
                for (const rule of storage.rules ?? []) {
                    if (rule?.find) message.content = message.content.replace(new RegExp(escape(rule.find), "g"), rule.replace ?? "");
                }
            });
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
    SettingsComponent() {
        const state = useProxy(storage);
        const rules = state.rules ?? [];
        const update = (index: number, change: Partial<Rule>) => storage.rules = rules.map((rule, i) => i === index ? { ...rule, ...change } : rule);
        return <View style={{ padding: 16 }}>
            <Stack spacing={12}>
                <Text variant="text-sm/medium" color="text-muted">Each rule swaps the exact text in "Find" for "Replace with" when you send a message.</Text>
                {rules.map((rule, index) => <Stack key={index} spacing={8}>
                    <TextInput size="md" label={`Rule ${index + 1}: find`} value={rule.find} onChange={(value: any) => update(index, { find: textOf(value) })} />
                    <TextInput size="md" label="Replace with" value={rule.replace} onChange={(value: any) => update(index, { replace: textOf(value) })} />
                    <Button size="sm" variant="destructive" text="Remove rule" onPress={() => storage.rules = rules.filter((_, i) => i !== index)} />
                </Stack>)}
                <Button size="md" variant="primary" text="Add rule" onPress={() => storage.rules = [...rules, { find: "", replace: "" }]} />
            </Stack>
        </View>;
    },
});
