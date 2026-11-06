import { before } from "@lib/api/patcher";
import { findByProps } from "@metro";
import { messageUtil } from "@metro/common";

/**
 * Rewrites outgoing messages: `transform` gets the message and the send options and
 * may change them in place. Every other argument is passed to Discord untouched.
 * Returns the unpatch function.
 */
export function onSendMessage(transform: (message: { content?: string; [key: string]: any; }, options: Record<string, any> | undefined) => void) {
    return before("sendMessage", messageUtil, args => {
        const message = args[1];
        if (message && typeof message === "object") {
            try { transform(message, args[3]); } catch { /* never block a send because of a transform */ }
        }
        return args;
    });
}

export function onEditMessage(transform: (message: { content?: string; }) => void) {
    const editor = findByProps("editMessage", "startEditMessage");
    if (typeof editor?.editMessage !== "function") throw new Error("Discord message edits are unavailable");
    return before("editMessage", editor, args => {
        const message = args[2];
        if (message && typeof message === "object") {
            try { transform(message); } catch { /* never block an edit because of a transform */ }
        }
        return args;
    });
}
