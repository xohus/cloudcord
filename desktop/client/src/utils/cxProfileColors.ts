// 3y3 profile colors, compatible with the GPL-3.0-or-later FakeProfileThemes
// implementation by Alyxia and Remty.
const tagOffset = 0xe0000;
const taggedPalette = /\u{e005b}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e002c}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e005d}/u;

export function decodeCxProfileColors(bio: unknown) {
    if (typeof bio !== "string") return;
    const match = taggedPalette.exec(bio.slice(0, 4096));
    if (!match) return;
    return match.slice(1).map(hex => parseInt([...hex].map(char => String.fromCodePoint(char.codePointAt(0)! - tagOffset)).join(""), 16));
}

export function formatCxProfileColors(primary: string, accent: string) {
    const colors = [primary, accent].map(color => color.trim().replace(/^#/, "").toLowerCase());
    if (!colors.every(color => /^[a-f0-9]{6}$/.test(color))) return;
    const encoded = [...("[#" + colors.join(",#") + "]")].map(char => String.fromCodePoint(char.charCodeAt(0) + tagOffset)).join("");
    return "Copy the code block into your Discord bio. The color code is invisible.\n```\n" + encoded + "\n```";
}
