import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";
import { pluginSettings, SettingsPage } from "../shared/settings";

// Mobile version of the PolishWording plugin by Samwich and WKoA.
const settings = pluginSettings("cloudcord.polishwording", { fixApostrophes: true, expandContractions: false, fixCapitalization: false, fixPunctuation: false });

const CONTRACTIONS: Record<string, string> = {
    "wasn't": "was not", "can't": "cannot", "don't": "do not", "won't": "will not", "isn't": "is not", "aren't": "are not",
    "haven't": "have not", "hasn't": "has not", "hadn't": "had not", "doesn't": "does not", "didn't": "did not",
    "shouldn't": "should not", "wouldn't": "would not", "couldn't": "could not", "that's": "that is", "what's": "what is",
    "there's": "there is", "how's": "how is", "where's": "where is", "when's": "when is", "who's": "who is", "why's": "why is",
    "you'll": "you will", "i'll": "I will", "they'll": "they will", "it'll": "it will", "i'm": "I am", "you're": "you are",
    "they're": "they are", "he's": "he is", "she's": "she is", "i've": "I have", "you've": "you have", "we've": "we have",
    "they've": "they have", "you'd": "you would", "he'd": "he would", "she'd": "she would", "it'd": "it would",
    "we'd": "we would", "they'd": "they would", "y'all": "you all", "here's": "here is",
};
const MISSING: Record<string, string> = Object.fromEntries(Object.keys(CONTRACTIONS).map(c => [c.replace(/'/g, ""), c]));

// Keeps the original word's capitalisation pattern on its replacement.
function restoreCap(text: string, original: string) {
    const caps = [...original].filter(c => /[a-z]/i.test(c)).map(c => c === c.toUpperCase());
    let i = 0;
    return [...text].map(c => {
        if (!/[a-z]/i.test(c)) return c;
        const upper = caps[Math.min(i, caps.length - 1)];
        if (i < caps.length - 1) i++;
        return upper ? c.toUpperCase() : c.toLowerCase();
    }).join("");
}
const replaceWords = (text: string, map: Record<string, string>) =>
    text.replace(new RegExp(`\\b(${Object.keys(map).map(k => k.replace(/'/g, "'")).join("|")})\\b`, "gi"), match => {
        const to = map[match.toLowerCase()];
        return to ? restoreCap(to, match) : match;
    });
const capitalise = (text: string) => text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, before, letter) => before + letter.toUpperCase()).replace(/\bi\b/g, "I");
const addPeriod = (text: string) => /[.!?…:;)\]"'*_~`]\s*$|https?:\/\/\S+\s*$|[\p{Extended_Pictographic}]\s*$/u.test(text) ? text : text.replace(/\s*$/, ".");

export function polish(input: string, options: { fixApostrophes?: boolean; expandContractions?: boolean; fixCapitalization?: boolean; fixPunctuation?: boolean; }) {
    const blocks: string[] = [];
    let text = input.replace(/```[\s\S]*?```|`[\s\S]*?`/g, match => `\u0000${blocks.push(match) - 1}\u0000`);
    if (options.fixApostrophes || options.expandContractions) text = replaceWords(text, MISSING);
    if (options.fixCapitalization) text = capitalise(text);
    if (options.fixPunctuation && text.trim()) text = addPeriod(text);
    if (options.expandContractions) text = replaceWords(text, CONTRACTIONS);
    return text.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.polishwording",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "PolishWording",
            description: "Tidies your messages: apostrophes, capital letters and full stops (see settings)",
            authors: [{ name: "Samwich" }, { name: "WKoA" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content !== "string") return;
            message.content = polish(message.content, {
                fixApostrophes: settings.get("fixApostrophes"), expandContractions: settings.get("expandContractions"),
                fixCapitalization: settings.get("fixCapitalization"), fixPunctuation: settings.get("fixPunctuation"),
            });
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
    SettingsComponent: () => SettingsPage({
        store: settings.store,
        fields: [
            { key: "fixApostrophes", type: "switch", label: "Add missing apostrophes", hint: "dont becomes don't" },
            { key: "expandContractions", type: "switch", label: "Expand contractions", hint: "don't becomes do not" },
            { key: "fixCapitalization", type: "switch", label: "Capitalise sentences" },
            { key: "fixPunctuation", type: "switch", label: "End messages with a full stop" },
        ],
    }),
});
