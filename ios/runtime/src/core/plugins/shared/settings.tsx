import { useProxy } from "@core/vendetta/storage";
import { awaitStorage, createStorage } from "@lib/api/storage";
import { Stack, TableRowGroup, TableSwitchRow, Text, TextInput } from "@metro/common/components";
import { View } from "react-native";

export type SettingField =
    | { key: string; type: "text"; label: string; placeholder?: string; hint?: string; }
    | { key: string; type: "switch"; label: string; hint?: string; };

/** Persistent settings for a ported plugin, with defaults applied once storage has loaded. */
export function pluginSettings<T extends object>(id: string, defaults: T) {
    const store = createStorage<T>(`plugins/storage/${id}.json`);
    const ready = awaitStorage(store).then(() => {
        for (const [key, value] of Object.entries(defaults)) if ((store as any)[key] === undefined) (store as any)[key] = value;
    });
    // Reads before storage has loaded fall back to the defaults instead of throwing.
    const get = <K extends keyof T>(key: K): T[K] => { try { return (store as any)[key] ?? defaults[key]; } catch { return defaults[key]; } };
    return { store, ready, get };
}

const textOf = (value: any) => typeof value === "string" ? value : value?.nativeEvent?.text ?? "";

/** A plain settings page for a list of text and switch fields. */
export function SettingsPage({ store, fields, intro }: { store: any; fields: SettingField[]; intro?: string; }) {
    const state = useProxy(store) as any;
    const switches = fields.filter(field => field.type === "switch");
    return <View style={{ padding: 16 }}>
        <Stack spacing={12}>
            {intro ? <Text variant="text-sm/medium" color="text-muted">{intro}</Text> : null}
            {fields.filter(field => field.type === "text").map(field => <Stack key={field.key} spacing={4}>
                <TextInput size="md" label={field.label} value={String(state[field.key] ?? "")} placeholder={(field as any).placeholder}
                    onChange={(value: any) => store[field.key] = textOf(value)} />
                {field.hint ? <Text variant="text-xs/medium" color="text-muted">{field.hint}</Text> : null}
            </Stack>)}
            {switches.length ? <TableRowGroup>
                {switches.map(field => <TableSwitchRow key={field.key} label={field.label} subLabel={field.hint} value={!!state[field.key]} onValueChange={(value: boolean) => store[field.key] = value} />)}
            </TableRowGroup> : null}
        </Stack>
    </View>;
}
