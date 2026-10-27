import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { messageUtil } from "@metro/common";

// Mobile version of the MoreCommands plugin by Arjix, amy, Samu, zyqunix, ShadyGoat, thororen,
// Korbo, nyx, Samwich, Fafa, JacobTm and voidbbg.
const option = (name: string, description: string, type: number, required = true, extra: Record<string, any> = {}) =>
    ({ name, displayName: name, description, type, required, ...extra });
const valueOf = (args: any[], name: string) => args.find(arg => arg?.name === name)?.value;
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const COMMANDS = [
    {
        name: "choose", description: "Pick one of several choices",
        options: [option("choices", "Choices separated by commas", ApplicationCommandOptionType.STRING)],
        execute: (args: any[]) => {
            const choices = String(valueOf(args, "choices") ?? "").split(",").map(choice => choice.trim()).filter(Boolean);
            return { content: choices.length ? choices[random(0, choices.length - 1)] : "Give me some choices, separated by commas." };
        }
    },
    { name: "flipcoin", description: "Flip a coin", options: [], execute: () => ({ content: Math.random() < 0.5 ? "Heads" : "Tails" }) },
    { name: "rolldice", description: "Roll a six-sided die", options: [], execute: () => ({ content: `You rolled a ${random(1, 6)}` }) },
    {
        name: "randomnumber", description: "A random number between two numbers",
        options: [option("min", "Lowest number", ApplicationCommandOptionType.INTEGER), option("max", "Highest number", ApplicationCommandOptionType.INTEGER)],
        execute: (args: any[]) => {
            const [low, high] = [Number(valueOf(args, "min")), Number(valueOf(args, "max"))].sort((a, b) => a - b);
            return { content: Number.isFinite(low) && Number.isFinite(high) ? String(random(low, high)) : "Enter two numbers." };
        }
    },
    {
        name: "wordcount", description: "Count the words in some text (only you see the result)",
        options: [option("text", "The text to count", ApplicationCommandOptionType.STRING)],
        execute: (args: any[], ctx: any) => {
            const text = String(valueOf(args, "text") ?? "");
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            messageUtil.sendBotMessage(ctx.channel.id, `${words} word${words === 1 ? "" : "s"}, ${text.length} character${text.length === 1 ? "" : "s"}`);
        }
    },
    {
        name: "transform", description: "Send text in upper case, lower case or reversed",
        options: [
            option("text", "The text to send", ApplicationCommandOptionType.STRING),
            option("style", "How to change it", ApplicationCommandOptionType.STRING, true, {
                choices: ["upper", "lower", "reverse"].map(value => ({ name: value, displayName: value, label: value, value }))
            })
        ],
        execute: (args: any[]) => {
            const text = String(valueOf(args, "text") ?? "");
            const style = valueOf(args, "style");
            return { content: style === "upper" ? text.toUpperCase() : style === "lower" ? text.toLowerCase() : [...text].reverse().join("") };
        }
    },
];

let unregisters: (() => void)[] = [];

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.morecommands",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "MoreCommands",
            description: "Adds /choose, /flipcoin, /rolldice, /randomnumber, /wordcount and /transform",
            authors: ["ArjixWasTaken", "Amy", "Samu", "zyqunix", "Shady Goat", "thororen", "Korbo", "verticalsync.", "Samwich", "Fafa", "Jacob.Tm", "voidbbg"].map(name => ({ name })),
        },
    },
    start() { unregisters = COMMANDS.map(command => registerCommand(command as any)); },
    stop() { unregisters.forEach(unregister => unregister()); unregisters = []; },
});
