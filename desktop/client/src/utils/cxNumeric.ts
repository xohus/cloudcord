// UnitConverter by sadan, adapted from the CloudCord mobile plugin.
const units: Record<string, [string, number]> = {
    km: ["mi", 0.621371], mi: ["km", 1.609344], m: ["ft", 3.28084], ft: ["m", 0.3048],
    cm: ["in", 0.393701], in: ["cm", 2.54], kg: ["lb", 2.20462], lb: ["kg", 0.453592],
    g: ["oz", 0.035274], oz: ["g", 28.3495], l: ["gal", 0.264172], gal: ["l", 3.78541],
    ml: ["floz", 0.033814], floz: ["ml", 29.5735], "km/h": ["mph", 0.621371], mph: ["km/h", 1.609344],
};

export function convertUnits(input: string) {
    if (input.length > 192) return;
    const match = /^(-?\d+(?:[.,]\d+)?)\s*(°?[cf]|km\/h|[a-z]+)$/.exec(input.trim().toLowerCase());
    if (!match) return;
    const value = Number(match[1].replace(",", "."));
    const unit = match[2].replace("°", "");
    if (unit === "c") return `${value}°C = ${+(value * 9 / 5 + 32).toFixed(2)}°F`;
    if (unit === "f") return `${value}°F = ${+((value - 32) * 5 / 9).toFixed(2)}°C`;
    if (!Object.prototype.hasOwnProperty.call(units, unit)) return;
    const [target, multiplier] = units[unit];
    return `${value} ${unit} = ${+(value * multiplier).toFixed(2)} ${target}`;
}

const operators = {
    "+": { precedence: 1, apply: (left: number, right: number) => left + right },
    "-": { precedence: 1, apply: (left: number, right: number) => left - right },
    "*": { precedence: 2, apply: (left: number, right: number) => left * right },
    "/": { precedence: 2, apply: (left: number, right: number) => left / right },
    "%": { precedence: 2, apply: (left: number, right: number) => left % right },
    "**": { precedence: 3, apply: (left: number, right: number) => left ** right },
};

// Calculator command adapted from Endcord (Vendicated and contributors, GPL-3.0-or-later).
export function calculate(input: string) {
    if (input.length > 192 || !/^[\d\s+*/().%\-]+$/.test(input)) return;
    const tokens = input.match(/\d+(?:\.\d*)?|\.\d+|\*\*|\+\+|--|[^\s]/g) ?? [];
    let cursor = 0;

    function operand(): number {
        const token = tokens[cursor++];
        if (token === "(") {
            const value = expression(1);
            if (tokens[cursor++] !== ")") throw new Error("Unclosed expression");
            return value;
        }
        if (token === "+" || token === "-") {
            const value = operand();
            if (tokens[cursor] === "**") throw new Error("Use parentheses around a signed base");
            return token === "-" ? -value : value;
        }
        if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error("Expected a number");
        return Number(token);
    }

    function expression(minimum: number): number {
        let value = operand();
        while (cursor < tokens.length) {
            const symbol = tokens[cursor] as keyof typeof operators;
            const operator = operators[symbol];
            if (!operator || operator.precedence < minimum) break;
            cursor++;
            const right = expression(operator.precedence + (symbol === "**" ? 0 : 1));
            value = operator.apply(value, right);
        }
        return value;
    }

    try {
        const value = expression(1);
        if (cursor === tokens.length && Number.isFinite(value)) return `\`${input.trim()}\` = **${value}**`;
    } catch {
        // Invalid syntax is shown through the command's local fallback.
    }
}
