import { _colorRef } from "@lib/addons/themes/colors/updater";
import { NativeThemeModule } from "@lib/api/native/modules";
import { before, instead } from "@lib/api/patcher";
import { findByProps } from "@metro";
import chroma from "chroma-js";
const tokenReference = findByProps("SemanticColor");
export default function patchDefinitionAndResolver() {
    const undo: Array<() => void> = [];
    const raw = tokenReference?.RawColor;
    if (raw) for (const key of Object.keys(raw)) {
        const descriptor = Object.getOwnPropertyDescriptor(raw, key);
        if (!descriptor?.configurable) continue;
        Object.defineProperty(raw, key, { configurable: true, enumerable: descriptor.enumerable,
            get: () => _colorRef.current?.raw[key] ?? _colorRef.origRaw[key] });
        undo.push(() => Object.defineProperty(raw, key, descriptor));
    }
    if (typeof NativeThemeModule?.updateTheme === "function") {
        undo.push(before("updateTheme", NativeThemeModule, (args: any[]) => {
            if (typeof args[0] === "string" && args[0].startsWith("bn-theme-"))
                return [_colorRef.current?.reference ?? _colorRef.lastSetDiscordTheme, ...args.slice(1)];
        }));
    }
    const resolver = tokenReference?.default?.meta ?? tokenReference?.default?.internal;
    if (typeof resolver?.resolveSemanticColor === "function") {
        undo.push(instead("resolveSemanticColor", resolver, (args: any[], original: any) => {
            const current = _colorRef.current;
            if (!current) return original(...args);
            const object = args[1];
            if (!object || (typeof object !== "object" && typeof object !== "function")) return original(...args);
            const symbol = Object.getOwnPropertySymbols(object)[0];
            const name = symbol ? object[symbol] : object.name;
            const semantic = typeof name === "string" ? current.semantic[name] : undefined;
            if (semantic?.value) return semantic.opacity === 1 ? semantic.value : chroma(semantic.value).alpha(semantic.opacity).hex();
            return original(...args);
        }));
    }
    return () => undo.reverse().forEach(fn => fn());
}
