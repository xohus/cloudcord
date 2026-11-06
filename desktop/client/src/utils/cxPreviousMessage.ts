export type CxPreviousRule = { kind: "correct" } | { kind: "merge"; seconds: number; space: boolean; };

type PreviousMessage = {
    id?: string;
    author?: { id?: string; };
    content?: string;
    channel_id?: string;
    channelId?: string;
    timestamp?: unknown;
    attachments?: readonly unknown[];
    type?: number;
};

export function parseCxPreviousRule(line: string): CxPreviousRule | undefined {
    if (line === "  before send correct-previous") return { kind: "correct" };
    const match = /^  before send merge-previous ([1-9]|[12][0-9]|30)( space)?$/.exec(line);
    if (match) return { kind: "merge", seconds: Number(match[1]), space: Boolean(match[2]) };
}

const correction = /^s\/((?:\\.|[^/])+)\/((?:\\.|[^/])*)\/([gi]*)$/;
const unescapeSed = (text: string) => text.replace(/\\([/\\])/g, "$1");

export function planCxPreviousEdit(rule: CxPreviousRule, channel: string, currentUser: string | undefined, draft: string,
    previous: () => PreviousMessage | undefined, now: number) {
    if (!currentUser || !draft.trim() || draft.length > 2000) return;
    const sed = correction.exec(draft.trim());
    if (rule.kind === "correct" && (!sed || sed[1].length > 240 || sed[3].length !== new Set(sed[3]).size)) return;
    if (rule.kind === "merge" && sed) return;
    const message = previous();
    if (!message?.id || message.author?.id !== currentUser || typeof message.content !== "string" || message.attachments?.length
        || (message.channel_id ?? message.channelId ?? channel) !== channel) return;
    let content;
    if (rule.kind === "correct" && sed) {
        const literal = unescapeSed(sed[1]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        content = message.content.replace(new RegExp(literal, sed[3]), () => unescapeSed(sed[2]));
    } else if (rule.kind === "merge") {
        if (message.type !== undefined && message.type !== 0) return;
        const time = Number(new Date(message.timestamp as string | number | Date));
        const age = now - time;
        if (!(age >= 0 && age < rule.seconds * 1000)) return;
        content = message.content + (rule.space ? " " : "\n") + draft;
    }
    if (!content?.trim() || content.length > 2000 || content === message.content) return;
    return { id: message.id, content };
}

export function createCxPreviousSendHandler(rule: CxPreviousRule, host: {
    currentUser: () => string | undefined;
    previous: (channel: string, own: boolean) => PreviousMessage | undefined;
    edit: (channel: string, id: string, content: string) => unknown;
    error: () => void;
}) {
    const editing = new Set<string>();
    return (channel: string, draft: unknown, hasExtraContent: boolean) => {
        if (hasExtraContent || typeof draft !== "string" || editing.has(channel)) return;
        const plan = planCxPreviousEdit(rule, channel, host.currentUser(), draft,
            () => host.previous(channel, rule.kind === "correct"), Date.now());
        if (!plan) return;
        editing.add(channel);
        return Promise.resolve().then(() => host.edit(channel, plan.id, plan.content))
            .catch(() => { try { host.error(); } catch { /* Keep a failed edit from turning into a send. */ } })
            .finally(() => editing.delete(channel));
    };
}
