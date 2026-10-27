import { defineCorePlugin } from "..";
import { onSendMessage } from "../shared/sendMessage";

// Mobile version of the Ingtoninator plugin by zyqunix and BioTomateDE.
const isLegal = (word: string) => !(word === "i" || word === "I" || ["a", "e", "o", "u", "y"].includes(word.slice(-1).toLowerCase()));
const ington = (upper: string) =>
    upper.endsWith("INGTON") ? "" : upper.endsWith("INGTO") ? "N" : upper.endsWith("INGT") ? "ON" : upper.endsWith("ING") ? "TON"
        : upper.endsWith("IN") ? "GTON" : upper.endsWith("I") ? "NGTON" : "INGTON";

export function ingtonify(message: string, random = Math.random) {
    const links = [...message.matchAll(/https?:\/\/[^\s]+\.[^\s]+/g)].map(m => [m.index!, m.index! + m[0].length]);
    const words = [...message.matchAll(/[\p{L}]+/gu)]
        .filter(m => !links.some(([start, end]) => m.index! >= start && m.index! < end) && isLegal(m[0]));
    if (!words.length) return message;
    const match = words[Math.floor(random() * words.length)];
    const word = match[0];
    const insertion = ington(word.toUpperCase());
    const end = match.index! + word.length;
    return message.slice(0, end) + (word === word.toUpperCase() ? insertion : insertion.toLowerCase()) + message.slice(end);
}

let unpatch: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.ingtoninator",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "Ingtoninator",
            description: "Adds \"ington\" to a random word in each message you send",
            authors: [{ name: "zyqunix" }, { name: "BioTomateDE" }],
        },
    },
    start() {
        unpatch = onSendMessage(message => {
            if (typeof message.content === "string" && message.content.trim()) message.content = ingtonify(message.content);
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
