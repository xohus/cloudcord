export function reverseText(text: string) {
    return [...text].reverse().join("");
}

export const messageTransforms = {
    reverse: reverseText,
    // NormalizeMessageLinks by bb010g.
    normalizeDiscordLinks: (text: string) => text.replace(/https:\/\/(?:canary\.|ptb\.)discord(?:app)?\.com\/channels\//g, "https://discord.com/channels/"),
    // Unindent by Vee.
    unindentCode: (text: string) => text.replace(/(```[^\n`]*\n)([\s\S]*?)(```)/g, (_, opening, code: string, closing) => {
        const lines = code.split("\n");
        let minimum = Infinity;
        for (const line of lines) {
            if (line.trim()) minimum = Math.min(minimum, /^[\t ]*/.exec(line)![0].length);
        }
        if (!Number.isFinite(minimum) || minimum === 0) return opening + code + closing;
        return opening + lines.map(line => line.replace(/^[\t ]+/, indent => indent.slice(minimum))).join("\n") + closing;
    }),
    // WriteUpperCase by Samwich and KrystalSkull.
    capitalizeSentences: (text: string, exclusions = "http, https, ok") => {
        const prefixes = exclusions.split(",").map(prefix => prefix.trim().toLowerCase()).filter(Boolean);
        return text.split(/([.!?]+['")\]]*\s+)/).map((part, index) =>
            index % 2 || prefixes.some(prefix => part.toLowerCase().startsWith(prefix)) ? part : part.charAt(0).toUpperCase() + part.slice(1)).join("");
    },
};
