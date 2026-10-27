import { defineCorePlugin } from "..";
import { instead } from "@lib/api/patcher";
import { findByProps, findByStoreName } from "@metro";
import { messageUtil } from "@metro/common";

// Mobile version of the BetterPlusReacts plugin by Joona: "+:emoji:" reacts to the last
// message instead of sending, and each extra "+" goes one message further back.
export function parsePlusReact(content: string) {
    const match = content.trim().match(/^(\++)(?::([\w~-]+):|(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*))$/u);
    return match ? { back: match[1].length, name: match[2] ?? match[3] } : null;
}

let unpatch: (() => unknown) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.betterplusreacts",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "BetterPlusReacts",
            description: "Send +:emoji: to react to the last message, ++:emoji: for the one before, and so on",
            authors: [{ name: "Joona" }],
        },
    },
    start() {
        unpatch = instead("sendMessage", messageUtil, (args: any[], original: Function) => {
            const [channelId, message] = args;
            const plus = typeof message?.content === "string" ? parsePlusReact(message.content) : null;
            const reactions = findByProps("addReaction");
            const messages = findByStoreName("MessageStore")?.getMessages?.(channelId);
            const list: any[] = messages?.toArray?.() ?? messages?._array ?? [];
            const target = plus ? list[list.length - plus.back] : null;
            if (!plus || !target || !reactions) return original(...args);
            // Custom emoji by name from your servers; standard emoji converted from their name.
            const emojiStore = findByStoreName("EmojiStore");
            const custom = Object.values<any>(emojiStore?.getGuilds?.() ?? {}).flatMap(guild => guild?._emojis ?? guild?.emojis ?? []).find((e: any) => e?.name === plus.name);
            const unicode = /\p{Extended_Pictographic}/u.test(plus.name) ? plus.name : findByProps("convertNameToSurrogate")?.convertNameToSurrogate?.(plus.name);
            if (!custom && !unicode) return original(...args);
            const emoji = custom ? { id: custom.id, name: custom.name, animated: !!custom.animated } : { id: null, name: unicode };
            reactions.addReaction(channelId, target.id, emoji);
            return Promise.resolve();
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
