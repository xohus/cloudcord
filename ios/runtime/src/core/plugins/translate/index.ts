import { defineCorePlugin } from "..";
import { registerCommand } from "@lib/api/commands";
import { ApplicationCommandOptionType } from "@lib/api/commands/types";
import { messageUtil } from "@metro/common";

// Mobile version of the Translate plugin by Vee, AshtonMemer and koish1, as /translate.
export async function googleTranslate(text: string, target: string, fetchImpl: typeof fetch = fetch) {
    // Built by hand: React Native's URLSearchParams is only partly implemented.
    const query = Object.entries({ client: "gtx", sl: "auto", tl: target, dt: "t", q: text }).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
    const url = "https://translate.googleapis.com/translate_a/single?" + query;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Translation failed (${response.status})`);
    const data = await response.json();
    return { text: (data?.[0] ?? []).map((part: any) => part?.[0] ?? "").join(""), from: String(data?.[2] ?? "auto") };
}

let unregister: (() => void) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.translate",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "Translate",
            description: "Adds /translate to translate text, sent as your message or shown only to you",
            authors: [{ name: "Vee" }, { name: "AshtonMemer" }, { name: "koish1" }],
        },
    },
    start() {
        unregister = registerCommand({
            name: "translate",
            description: "Translate text",
            options: [
                { name: "text", displayName: "text", description: "What to translate", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "to", displayName: "to", description: "Language code, like en, es, ar, fr (default en)", type: ApplicationCommandOptionType.STRING, required: false },
                { name: "send", displayName: "send", description: "Send it as your message instead of only showing you", type: ApplicationCommandOptionType.BOOLEAN, required: false },
            ],
            async execute(args: any[], ctx: any) {
                const value = (name: string) => args.find(arg => arg?.name === name)?.value;
                try {
                    const result = await googleTranslate(String(value("text") ?? ""), String(value("to") || "en").trim().toLowerCase());
                    if (value("send")) return { content: result.text };
                    messageUtil.sendBotMessage(ctx.channel.id, `**Translated from ${result.from}:** ${result.text}`);
                } catch (error: any) {
                    messageUtil.sendBotMessage(ctx.channel.id, error?.message || "Translation failed.");
                }
            },
        } as any);
    },
    stop() { unregister?.(); unregister = undefined; },
});
