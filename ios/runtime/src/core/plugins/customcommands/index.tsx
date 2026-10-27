import { defineCorePlugin } from "..";
import { useProxy } from "@core/vendetta/storage";
import { registerCommand } from "@lib/api/commands";
import { awaitStorage, createStorage } from "@lib/api/storage";
import { Button, Stack, TableRowGroup, TableSwitchRow, Text, TextInput } from "@metro/common/components";
import { messageUtil } from "@metro/common";
import { View } from "react-native";

// Mobile version of the CustomCommands plugin by Ven and Luny.
interface CustomCommand { name: string; response: string; onlyMe?: boolean; }
const storage = createStorage<{ commands?: CustomCommand[]; }>("plugins/storage/cloudcord.customcommands.json");
const textOf = (value: any) => typeof value === "string" ? value : value?.nativeEvent?.text ?? "";
const cleanName = (name: string) => name.trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 32);

let unregisters: (() => void)[] = [];
function registerAll() {
    unregisters.forEach(unregister => unregister());
    unregisters = (storage.commands ?? []).filter(command => cleanName(command.name) && command.response).map(command => registerCommand({
        name: cleanName(command.name),
        description: command.onlyMe ? "Custom command (only you see it)" : "Custom command",
        options: [],
        execute(_: any[], ctx: any) {
            if (command.onlyMe) { messageUtil.sendBotMessage(ctx.channel.id, command.response); return; }
            return { content: command.response };
        },
    } as any));
}

let running = false;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.customcommands",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "CustomCommands",
            description: "Make your own slash commands that send a saved reply",
            authors: [{ name: "Ven" }, { name: "Luny" }],
        },
    },
    start() { running = true; void awaitStorage(storage).then(() => { if (running) registerAll(); }); },
    stop() { running = false; unregisters.forEach(unregister => unregister()); unregisters = []; },
    SettingsComponent() {
        const state = useProxy(storage);
        const list = state.commands ?? [];
        const save = (next: CustomCommand[]) => { storage.commands = next; if (running) registerAll(); };
        const update = (index: number, change: Partial<CustomCommand>) => save(list.map((command, i) => i === index ? { ...command, ...change } : command));
        return <View style={{ padding: 16 }}>
            <Stack spacing={12}>
                <Text variant="text-sm/medium" color="text-muted">Type / and the name to use a command. It sends its reply as your message, or only to you.</Text>
                {list.map((command, index) => <Stack key={index} spacing={8}>
                    <TextInput size="md" label={`Command ${index + 1} name`} value={command.name} placeholder="hello" onChange={(value: any) => update(index, { name: textOf(value) })} />
                    <TextInput size="md" label="Reply" value={command.response} placeholder="Hi everyone!" onChange={(value: any) => update(index, { response: textOf(value) })} />
                    <TableRowGroup><TableSwitchRow label="Only I see the reply" value={!!command.onlyMe} onValueChange={(value: boolean) => update(index, { onlyMe: value })} /></TableRowGroup>
                    <Button size="sm" variant="destructive" text="Remove command" onPress={() => save(list.filter((_, i) => i !== index))} />
                </Stack>)}
                <Button size="md" variant="primary" text="Add command" onPress={() => save([...list, { name: "", response: "" }])} />
            </Stack>
        </View>;
    },
});
