/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { isSettingDisabled } from "@api/PluginManager";
import { OptionType, PluginSettingBigIntDef, PluginSettingNumberDef } from "@utils/types";
import { React, TextInput, useState } from "@webpack/common";

import { resolveError, SettingProps, SettingsSection } from "./Common";

export function NumberSetting({ setting, pluginSettings, definedSettings, id, onChange }: SettingProps<PluginSettingNumberDef | PluginSettingBigIntDef>) {
    function serialize(value: any) {
        if (setting.type === OptionType.BIGINT) return BigInt(value);
        return Number(value);
    }

    const [state, setState] = useState<any>(`${pluginSettings[id] ?? setting.default ?? 0}`);
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: any) {
        const draft = String(typeof newValue === "object" && newValue !== null ? newValue.currentTarget?.value ?? newValue.target?.value ?? "" : newValue);
        setState(draft);
        if (!draft.trim() || draft === "-" || draft === "+") { setError(null); return; }
        try {
            const parsed = serialize(draft);
            if (typeof parsed === "number" && !Number.isFinite(parsed)) { setError("Enter a valid number."); return; }
            if (typeof parsed === "number" && Math.abs(parsed) > Number.MAX_SAFE_INTEGER) { setError("Number exceeds the supported range."); return; }
            const isValid = setting.isValid?.call(definedSettings, draft) ?? true;
            setError(resolveError(isValid));
            if (isValid === true) onChange(parsed);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Enter a valid number.");
        }
    }

    return (
        <SettingsSection name={id} description={setting.description} error={error}>
            <TextInput
                {...setting.componentProps}
                type="number"
                pattern="-?[0-9]+"
                placeholder={setting.placeholder ?? "Enter a number"}
                value={state}
                onChange={handleChange}
                disabled={isSettingDisabled(definedSettings, setting)}
            />
        </SettingsSection>
    );
}
