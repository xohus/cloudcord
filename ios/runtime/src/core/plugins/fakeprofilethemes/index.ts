import { defineCorePlugin } from "..";

import { onProfileLoad } from "../shared/profiles";

// Mobile version of the FakeProfileThemes plugin by Alyxia and Remty: reads profile colours
// hidden in a bio with invisible "3y3" text, the same encoding desktop writes.
export function decode(bio: string | null | undefined): number[] | null {
    const match = bio?.match(/\u{e005b}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e002c}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e005d}/u);
    if (!match) return null;
    const plain = [...match[0]].map(c => String.fromCodePoint(c.codePointAt(0)! - 0xe0000)).join("");
    const colors = plain.slice(1, -1).split(",").map(part => parseInt(part.replace("#", ""), 16));
    return colors.length === 2 && colors.every(Number.isFinite) ? colors : null;
}

let stop: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.fakeprofilethemes",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "FakeProfileThemes",
            description: "Shows profile theme colours hidden in bios with invisible 3y3 text",
            authors: [{ name: "Alyxia Sother" }, { name: "Remty" }],
        },
    },
    start() {
        stop = onProfileLoad(profile => {
            if (Array.isArray(profile.theme_colors) && profile.theme_colors.length) return; // real Nitro themes win
            const colors = decode(profile.bio);
            if (colors) profile.theme_colors = colors;
        });
    },
    stop() { stop?.(); stop = undefined; },
});
