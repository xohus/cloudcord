// Adapted from CloudCord's existing GPL-3.0-or-later command plugins.
// GoogleThat by Samwich and KrystalSkull.
const searchEngines = new Map([
    ["Google", "https://www.google.com/search?q="],
    ["Bing", "https://www.bing.com/search?q="],
    ["Yahoo", "https://search.yahoo.com/search?p="],
    ["DuckDuckGo", "https://duckduckgo.com/?q="],
    ["Baidu", "https://www.baidu.com/s?wd="],
    ["Yandex", "https://yandex.com/search/?text="],
    ["Ecosia", "https://www.ecosia.org/search?q="],
    ["Ask", "https://www.ask.com/web?q="],
    ["AOL", "https://search.aol.com/aol/search?q="],
    ["LetMeGoogleThatForYou", "https://letmegooglethat.com/?q="],
]);

export function chooseOne<T>(items: readonly T[]): T | undefined {
    return items[Math.floor(Math.random() * items.length)];
}

const morseCodes = new Map(Object.entries({
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
    G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
    S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
    5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.", " ": "/",
}));
const morseLetters = new Map([...morseCodes].map(([letter, code]) => [code, letter]));
const normalizations = ["NFC", "NFD", "NFKC", "NFKD"];

function randomInteger(low: number, high: number) {
    const range = high - low + 1;
    if (Number.isSafeInteger(range) && range > 0) return low + Math.floor(Math.random() * range);
}

export const cxCommandFunctions = {
    searchLink(input: string, engine: string, hyperlink: string, hideEmbed: string) {
        if (!input.trim()) return;
        try {
            const encoded = encodeURIComponent(input).replaceAll("(", "%28").replaceAll(")", "%29");
            const url = (searchEngines.get(engine) ?? searchEngines.get("Google")!) + encoded;
            const destination = hideEmbed === "true" ? "<" + url + ">" : url;
            return hyperlink === "true" ? "[" + input.replace(/[\\[\]]/g, "\\$&") + "](" + destination + ")" : destination;
        } catch {
            return;
        }
    },
    // ShipCalc by rootpoi, kraethis, and ewlle.
    ship(a: string, b: string) {
        const pair = [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("💕");
        let hash = 0;
        for (let i = 0; i < pair.length; i++) hash = (hash * 31 + pair.charCodeAt(i)) >>> 0;
        const score = hash % 101;
        const heart = score > 80 ? "💞" : score > 50 ? "💖" : score > 25 ? "💗" : "💔";
        return `${heart} **${a}** + **${b}** = **${score}%**`;
    },
    choose: (choices: string) => chooseOne(choices.split(",").map(choice => choice.trim()).filter(Boolean)),
    roll(sides: string) {
        const result = randomInteger(1, sides ? Number(sides) : 6);
        if (result !== undefined) return `You rolled a ${result}`;
    },
    randomNumber(minimum: string, maximum: string) {
        const min = Number(minimum);
        const max = Number(maximum);
        const number = randomInteger(Math.min(min, max), Math.max(min, max));
        if (number !== undefined) return String(number);
    },
    wordCount(text: string) {
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        return `${words} word${words === 1 ? "" : "s"}, ${text.length} character${text.length === 1 ? "" : "s"}`;
    },
    transform(text: string, style: string, repeat: string, reverse: string, normalize: string) {
        if (style === "upper") text = text.toUpperCase();
        if (style === "lower") text = text.toLowerCase();
        if (style === "locale-upper") text = text.toLocaleUpperCase();
        if (style === "locale-lower") text = text.toLocaleLowerCase();
        if (normalizations.includes(normalize)) text = text.normalize(normalize);
        if ((style === "reverse") !== (reverse === "true")) text = [...text].reverse().join("");
        const count = repeat ? Number(repeat) : 1;
        if (count > 0 && count <= 4000 && text.length * count <= 4000) return text.repeat(count);
    },
    ask(question: string) {
        return question + " - " + chooseOne(["Yes", "No", "Maybe", "Ask again later", "Definitely not", "It is certain"]);
    },
    currentTime() { return "> **Current Time**: " + new Date().toLocaleString(); },
    mock(text: string) {
        return text.split("").map((char, i) => i % 2 ? char.toUpperCase() : char.toLowerCase()).join("");
    },
    morse(text: string) {
        if (!/^[.\-/ ]+$/.test(text)) return [...text.toUpperCase()].map(char => morseCodes.get(char) ?? "").join(" ");
        const decoded = text.split(" ").map(code => morseLetters.get(code) ?? "").join("").toLowerCase();
        return decoded.charAt(0).toUpperCase() + decoded.slice(1);
    },
};
