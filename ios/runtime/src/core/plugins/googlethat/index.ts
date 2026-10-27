import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";

// Mobile version of the GoogleThat plugin by Samwich and KrystalSkull.
const ENGINES: Record<string, string> = {
    Google: "https://www.google.com/search?q=",
    Bing: "https://www.bing.com/search?q=",
    DuckDuckGo: "https://duckduckgo.com/?q=",
    Yahoo: "https://search.yahoo.com/search?p=",
    Ecosia: "https://www.ecosia.org/search?q=",
    Yandex: "https://yandex.com/search/?text=",
    LetMeGoogleThatForYou: "https://letmegooglethat.com/?q=",
};

let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.googlethat",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "GoogleThat",
            description: "Adds /googlethat, which sends a search link",
            authors: [{ name: "Samwich" }, { name: "krystalskullofficial" }],
        },
    },
    start() {
        unregister = registerCommand({
            name: "googlethat",
            description: "Send a search engine link",
            options: [
                { name: "input", displayName: "input", description: "What to search for", type: ApplicationCommandOptionType.STRING, required: true },
                {
                    name: "engine", displayName: "engine", description: "Search engine (Google if empty)", type: ApplicationCommandOptionType.STRING, required: false,
                    choices: Object.keys(ENGINES).map(name => ({ name, displayName: name, label: name, value: name }))
                },
            ],
            execute(args: any[]) {
                const input = String(args.find(arg => arg?.name === "input")?.value ?? "");
                const engine = ENGINES[args.find(arg => arg?.name === "engine")?.value] ?? ENGINES.Google;
                return { content: engine + encodeURIComponent(input) };
            },
        } as any);
    },
    stop() { unregister?.(); unregister = undefined; },
});
