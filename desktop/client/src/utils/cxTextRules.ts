type TextRule =
    | { kind: "replace"; pattern: RegExp; replacement: string; }
    | { kind: "prefix"; value: string; }
    | { kind: "alternate-case"; }
    | { kind: "shorten-run"; pattern: RegExp; fill: string; };

const quotedText = '"(?:[^"\\\\]|\\\\.)*"';
const replace = new RegExp(`^    replace (\\[.{1,1800}\\]) with (${quotedText})( ignore-case)?( whole-word)?$`);
const prefix = new RegExp(`^    prefix (${quotedText})$`);
const shortenRun = new RegExp(`^    shorten-run (${quotedText}) with (${quotedText})$`);
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const links = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function parseCxTextRule(line: string, quoted: (value: string, limit: number, allowEmpty?: boolean) => string): TextRule {
    const replacement = replace.exec(line);
    if (replacement) {
        const [, alternatives, value, ignoreCase, wholeWord] = replacement;
        let words: unknown;
        try { words = JSON.parse(alternatives); } catch { throw new Error("Use a list of literal text alternatives"); }
        if (!Array.isArray(words) || words.length < 1 || words.length > 16 || new Set(words).size !== words.length
            || words.some(word => typeof word !== "string" || !word.trim() || word.length > 64 || /[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/u.test(word)))
            throw new Error("Use up to 16 distinct, nonempty text alternatives");
        if (wholeWord && words.some(word => !/^\w(?:.*\w)?$/u.test(word))) throw new Error("Whole-word alternatives must begin and end with word characters");
        const boundary = wholeWord ? "\\b" : "";
        return { kind: "replace", pattern: new RegExp(boundary + "(?:" + words.map(escape).join("|") + ")" + boundary, ignoreCase ? "gi" : "g"),
            replacement: quoted(value, 64, true) };
    }
    const prepend = prefix.exec(line);
    if (prepend) return { kind: "prefix", value: quoted(prepend[1], 64) };
    if (line === "    alternate-case") return { kind: "alternate-case" };
    const shorten = shortenRun.exec(line);
    if (shorten) {
        const letter = quoted(shorten[1], 1);
        return { kind: "shorten-run", pattern: new RegExp(escape(letter) + "+", "g"), fill: quoted(shorten[2], 1) };
    }
    throw new Error("Unknown text rewrite rule");
}

export function applyCxTextRules(text: string, rules: readonly TextRule[]) {
    if (!text.trim()) return text;
    // Odd positions are intact URLs. All other positions are rewritten in source order.
    const parts = text.split(links);
    for (const rule of rules) {
        if (rule.kind === "prefix") {
            parts[0] = rule.value + parts[0];
            continue;
        }
        let upper = true;
        let length = 0;
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                if (rule.kind === "replace") parts[i] = parts[i].replace(rule.pattern, () => rule.replacement);
                else if (rule.kind === "shorten-run") parts[i] = parts[i].replace(rule.pattern, run => rule.fill.repeat(Math.max(1, run.length - 1)) + run[0]);
                else parts[i] = parts[i].replace(/[a-z]/gi, letter => {
                    const value = upper ? letter.toUpperCase() : letter.toLowerCase();
                    upper = !upper;
                    return value;
                });
            }
            length += parts[i].length;
            if (length > 4000) return text;
        }
    }
    return parts.join("");
}
