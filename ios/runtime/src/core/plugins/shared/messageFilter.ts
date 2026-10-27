import { intercept } from "@lib/api/flux";

type Message = { author?: { id?: string; }; content?: string; embeds?: { title?: string; description?: string; }[]; };

/**
 * Hides messages for which `hide` returns true: new ones as they arrive and ones
 * loaded from history. Returns the function that stops filtering.
 */
export function filterMessages(hide: (message: Message) => boolean) {
    const safeHide = (message: Message) => { try { return !!message && hide(message); } catch { return false; } };
    return intercept(payload => {
        if (payload.type === "MESSAGE_CREATE" || payload.type === "MESSAGE_UPDATE") {
            return safeHide(payload.message) ? false : undefined;
        }
        if (payload.type === "LOAD_MESSAGES_SUCCESS" && Array.isArray(payload.messages)) {
            const kept = payload.messages.filter((message: Message) => !safeHide(message));
            return kept.length === payload.messages.length ? undefined : { messages: kept };
        }
        return undefined;
    });
}
