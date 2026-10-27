import { defineCorePlugin } from "..";
import { instead } from "@lib/api/patcher";
import { findByProps, findByStoreName } from "@metro";
import { messageUtil } from "@metro/common";

// Mobile version of the SedEnhanced plugin by dawn, Willow and kat: send s/old/new/ to fix
// your last message (flags: g for all, i to ignore case).
export function applySed(command: string, text: string) {
    const match = command.match(/^s\/((?:\\.|[^/])+)\/((?:\\.|[^/])*)\/([gi]*)$/);
    if (!match) return null;
    const [, find, replace, flags] = match;
    let pattern: RegExp;
    try { pattern = new RegExp(find, flags); } catch { pattern = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags); }
    return text.replace(pattern, replace.replace(/\\\//g, "/"));
}
let unpatch: (() => unknown) | undefined;

export default defineCorePlugin({
    manifest: {
        id: "cloudcord.sedenhanced",
        version: "1.0.0",
        type: "plugin",
        spec: 3,
        main: "",
        display: {
            name: "SedEnhanced",
            description: "Send s/old/new/ to edit your last message",
            authors: ["dawn","Willow","kat"].map(name => ({ name })),
        },
    },
    start() {
        unpatch = instead("sendMessage", messageUtil, (args: any[], original: Function) => {
            const [channelId, message] = args;
            const content = message?.content;
            if (typeof content !== "string" || !content.startsWith("s/")) return original(...args);
            const me = findByStoreName("UserStore")?.getCurrentUser?.()?.id;
            const list: any[] = (() => { const m = findByStoreName("MessageStore")?.getMessages?.(channelId); return m?.toArray?.() ?? m?._array ?? []; })();
            const mine = [...list].reverse().find(m => m.author?.id === me);
            const edited = mine ? applySed(content.trim(), mine.content) : null;
            const editor = findByProps("editMessage", "startEditMessage");
            if (edited == null || !editor || edited === mine.content) return original(...args);
            editor.editMessage(channelId, mine.id, { content: edited });
            return Promise.resolve();
        });
    },
    stop() { unpatch?.(); unpatch = undefined; },
});
