import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { messageUtil } from "@metro/common";

// Mobile version of the UnitConverter plugin by sadan, as /convert.
const UNITS: Record<string, [string, number, number?]> = {
    km: ["mi", 0.621371], mi: ["km", 1.609344], m: ["ft", 3.28084], ft: ["m", 0.3048], cm: ["in", 0.393701], in: ["cm", 2.54],
    kg: ["lb", 2.20462], lb: ["kg", 0.453592], g: ["oz", 0.035274], oz: ["g", 28.3495], l: ["gal", 0.264172], gal: ["l", 3.78541],
    ml: ["floz", 0.033814], floz: ["ml", 29.5735], "km/h": ["mph", 0.621371], mph: ["km/h", 1.609344],
};
export function convert(input: string) {
    const match = input.trim().toLowerCase().match(/^(-?\d+(?:[.,]\d+)?)\s*(°?[cf]|km\/h|[a-z]+)$/);
    if (!match) return null;
    const value = parseFloat(match[1].replace(",", "."));
    const unit = match[2].replace("°", "");
    if (unit === "c") return `${value}°C = ${+(value * 9 / 5 + 32).toFixed(2)}°F`;
    if (unit === "f") return `${value}°F = ${+((value - 32) * 5 / 9).toFixed(2)}°C`;
    const rule = UNITS[unit];
    return rule ? `${value} ${unit} = ${+(value * rule[1]).toFixed(2)} ${rule[0]}` : null;
}
let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.unitconverter",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "UnitConverter",
            description: "Adds /convert for metric and imperial units, like 5 km or 70 F",
            authors: ["sadan"].map(name => ({ name })),
        },
    },
    start() {
        unregister = registerCommand({
            name: "convert",
            description: "Convert between metric and imperial (e.g. 5 km, 70 F, 2 lb)",
            options: [
                { name: "value", displayName: "value", description: "Number and unit", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "send", displayName: "send", description: "Send the result as your message", type: ApplicationCommandOptionType.BOOLEAN, required: false },
            ],
            execute(args: any[], ctx: any) {
                const result = convert(String(args.find(arg => arg?.name === "value")?.value ?? ""));
                if (result && args.find(arg => arg?.name === "send")?.value) return { content: result };
                messageUtil.sendBotMessage(ctx.channel.id, result ?? "Try something like 5 km, 70 F or 2 lb.");
            },
        } as any);
    },
    stop() { unregister?.(); unregister = undefined; },
});
